/**
 * gmailPollerService.ts
 *
 * Polls the configured Gmail inbox via IMAP every N minutes.
 * Any UNSEEN email from a known lead email address is:
 *   1. Parsed into a LeadQuery record (inbound reply)
 *   2. Marked as SEEN so it is never imported twice
 *
 * Deduplication: we also store the Gmail UID in metadata.gmail_uid so
 * even if the SEEN flag is lost (e.g. reconnect) we don't double-insert.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Readable } from 'stream';
import { Lead, LeadQuery } from '../../../database/models';
import { config } from '../../../config';
import { msOAuthService } from '../../../services/msOAuthService';

export class GmailPollerService {
  private isRunning = false;
  private readonly maxUnseenScan = parseInt(process.env.IMAP_MAX_UNSEEN_SCAN || '500', 10);
  private readonly maxImportPerTick = parseInt(process.env.IMAP_MAX_IMPORT_PER_TICK || '10', 10);
  private readonly includeRecentSeen = (process.env.IMAP_INCLUDE_RECENT_SEEN || 'true').toLowerCase() === 'true';
  private readonly seenLookbackHours = parseInt(process.env.IMAP_SEEN_LOOKBACK_HOURS || '720', 10);
  private readonly maxSeenScan = parseInt(process.env.IMAP_MAX_SEEN_SCAN || '1500', 10);
  private readonly backfillMaxImport = parseInt(process.env.IMAP_BACKFILL_MAX_IMPORT || '2000', 10);
  private readonly backfillMaxSeenScan = parseInt(process.env.IMAP_BACKFILL_MAX_SEEN_SCAN || '10000', 10);

  private async getImapConfig() {
    const accessToken = await msOAuthService.getImapAccessToken();
    return {
      host: process.env.IMAP_HOST || 'outlook.office365.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: true,
      auth: {
        user: process.env.IMAP_USER || config.smtp.user,
        accessToken,
      },
      logger: process.env.IMAP_DEBUG === 'true' ? (console as any) : false,
      socketTimeout: 90000,
      connectionTimeout: 30000,
      tls: {
        servername: process.env.IMAP_HOST || 'outlook.office365.com',
        rejectUnauthorized: true,
      },
    };
  }

  async poll(): Promise<{ inserted: number; skipped: number; errors: number }> {
    return this.pollInternal(false);
  }

  async backfill(hours: number = 24 * 30): Promise<{ inserted: number; skipped: number; errors: number }> {
    return this.pollInternal(true, hours);
  }

  private async pollInternal(allMailBackfill: boolean, backfillHours?: number): Promise<{ inserted: number; skipped: number; errors: number }> {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    if (this.isRunning) {
      console.log('[GmailPoller] Already running, skipping this tick.');
      return { inserted: 0, skipped: 0, errors: 0 };
    }
    this.isRunning = true;

    const client = new ImapFlow(await this.getImapConfig());

    // Absorb socket-level errors so they don't crash the process
    client.on('error', (err: Error) => {
      console.error('[GmailPoller] IMAP client error event:', err.message);
    });

    try {
      await client.connect();
      const mailboxName = allMailBackfill ? '[Gmail]/All Mail' : 'INBOX';
      const importLimit = allMailBackfill ? this.backfillMaxImport : this.maxImportPerTick;
      const unseenScanLimit = allMailBackfill ? this.backfillMaxSeenScan : this.maxUnseenScan;
      const seenScanLimit = allMailBackfill ? this.backfillMaxSeenScan : this.maxSeenScan;
      const lock = await client.getMailboxLock(mailboxName);

      try {
        // Pre-fetch all known lead emails → map email → lead record
        // This avoids one DB query per inbox message (N+1 problem)
        const allLeads = await Lead.findAll({
          attributes: ['id', 'tenant_id', 'email', 'assigned_rep_id'],
        });
        const leadByEmail = new Map<string, typeof allLeads[0]>();
        for (const l of allLeads) {
          leadByEmail.set((l as any).email.toLowerCase().trim(), l);
        }

        // Pre-fetch already-imported gmail_uids so we can skip without extra queries
        const existingUids = new Set<string>();
        const seenRows = await LeadQuery.findAll({
          attributes: ['metadata'],
          where: { source: 'email' },
        });
        for (const row of seenRows) {
          const uid = ((row as any).metadata as any)?.gmail_uid;
          if (uid) existingUids.add(String(uid));
        }
        const existingMsgIds = new Set<string>();
        for (const row of seenRows) {
          const mid = ((row as any).metadata as any)?.message_id;
          if (mid) existingMsgIds.add(String(mid));
        }

        console.log(`[GmailPoller] Connected. Known leads: ${leadByEmail.size}, existing UIDs: ${existingUids.size}, existing msgIds: ${existingMsgIds.size}`);

        // Stage 1: quickly scan envelopes only (no body parse)
        const candidateUids: number[] = [];
        const candidateUidSet = new Set<number>();

        const collectCandidates = async (
          criteria: any,
          maxScan: number,
          label: string
        ): Promise<void> => {
          const envelopeScan = client.fetch(criteria, {
            uid: true,
            envelope: true,
            flags: true,
          });

          let scanned = 0;
          for await (const msg of envelopeScan) {
            if (scanned >= maxScan || candidateUids.length >= importLimit) break;
            scanned++;

            const uid = Number((msg as any).uid);
            const fromAddress = msg.envelope?.from?.[0]?.address?.toLowerCase().trim() || '';
            console.log(`[GmailPoller] ${label} uid=${uid} from=${fromAddress || '(empty)'} alreadyImported=${existingUids.has(String(uid))} knownLead=${leadByEmail.has(fromAddress)}`);

            if (!uid || candidateUidSet.has(uid) || existingUids.has(String(uid))) {
              skipped++;
              continue;
            }

            if (!fromAddress || !leadByEmail.has(fromAddress)) {
              skipped++;
              continue;
            }

            candidateUidSet.add(uid);
            candidateUids.push(uid);
          }
          console.log(`[GmailPoller] ${label} scan done — scanned: ${scanned}, candidates so far: ${candidateUids.length}`);
        };

        // Only scan unseen emails from the last 30 days — avoids trawling through
        // hundreds of old unread newsletters before reaching recent lead replies.
        const unseenSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await collectCandidates({ seen: false, since: unseenSince }, unseenScanLimit, 'UNSEEN');

        // Also scan recently seen emails to backfill missed replies
        if (this.includeRecentSeen && candidateUids.length < importLimit) {
          const lookback = allMailBackfill ? (backfillHours || this.seenLookbackHours) : this.seenLookbackHours;
          const since = new Date(Date.now() - lookback * 60 * 60 * 1000);
          await collectCandidates({ seen: true, since }, seenScanLimit, 'SEEN');
        }

        if (candidateUids.length === 0) {
          return { inserted, skipped, errors };
        }

        // Stage 2: fetch and parse only candidate messages
        const messages = client.fetch(candidateUids.join(','), {
          uid: true,
          envelope: true,
          source: true,
          flags: true,
        }, { uid: true });

        for await (const msg of messages) {
          try {
            if (!msg.source) {
              skipped++;
              continue;
            }

            // Parse the raw message
            const parsed = await simpleParser(
              Readable.from(msg.source)
            );

            const fromAddress = (
              parsed.from?.value?.[0]?.address
              || msg.envelope?.from?.[0]?.address
              || ''
            ).toLowerCase().trim();
            const subject = parsed.subject?.trim() || '(no subject)';
            const gmailUid = String((msg as any).uid ?? '');
            const messageId = parsed.messageId?.trim() || '';

            if (!fromAddress) {
              skipped++;
              continue;
            }

            // Only process emails from known leads
            const lead = leadByEmail.get(fromAddress);

            if (!lead) {
              skipped++;
              continue;
            }

            // Deduplication using pre-fetched sets
            if (gmailUid && existingUids.has(gmailUid)) {
              skipped++;
              continue;
            }
            if (messageId && existingMsgIds.has(messageId)) {
              skipped++;
              continue;
            }

            // Extract clean plain-text reply (strip quoted thread)
            const rawPlain =
              parsed.text ||
              (parsed.html ? this.stripHtml(parsed.html) : '') ||
              '';
            const replyText = this.extractReplyOnly(rawPlain) || rawPlain.trim() || '(no body)';

            // Create LeadQuery for the incoming reply
            await LeadQuery.create({
              tenant_id: lead.tenant_id,
              lead_id: lead.id,
              source: 'email',
              subject,
              body: replyText,
              status: 'pending',
              owner_user_id: (lead as any).assigned_rep_id || undefined,
              metadata: {
                gmail_uid: gmailUid,
                message_id: messageId,
                in_reply_to: parsed.inReplyTo || null,
                references: parsed.references || null,
                lead_reply_text: replyText,
                raw_body: rawPlain.slice(0, 4000),
                provider: 'gmail_imap',
                from_address: fromAddress,
              },
            });

            // Status stays 'pending' — only an admin reply via the CRM marks it 'answered'.

            // Mark as SEEN on Gmail so we never process it again
            if (gmailUid) {
              try {
                await client.messageFlagsAdd(
                  { uid: parseInt(gmailUid, 10) },
                  ['\\Seen'],
                  { uid: true }
                );
                existingUids.add(gmailUid);
              } catch {
                // best-effort
              }
            }

            inserted++;
            console.log(`[GmailPoller] Imported reply from ${fromAddress}: "${subject}"`);
          } catch (msgErr: any) {
            console.error('[GmailPoller] Error processing message:', msgErr.message);
            errors++;
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      console.error('[GmailPoller] IMAP connection error:', err.message);
      if (err.response)       console.error('[GmailPoller] Server response:', err.response);
      if (err.responseCode)   console.error('[GmailPoller] Response code:', err.responseCode);
      if (err.authenticationFailed) console.error('[GmailPoller] Authentication failed — check IMAP_USER / IMAP_PASS');
      if (err.code)           console.error('[GmailPoller] Error code:', err.code);
      errors++;
    } finally {
      this.isRunning = false;
      try { client.close(); } catch { /* already closed */ }
    }

    if (inserted > 0 || errors > 0) {
      console.log(`[GmailPoller] Done — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors}`);
    }

    return { inserted, skipped, errors };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractReplyOnly(text: string): string {
    const lines = text.replace(/\r/g, '').split('\n');
    const stopPatterns = [
      /^On .+ wrote:$/i,
      /^From:\s.+/i,
      /^Sent:\s.+/i,
      /^Subject:\s.+/i,
      /^To:\s.+/i,
      /^-{2,}\s*(Original Message|Forwarded message)\s*-{2,}/i,
      /^>+\s*/,
    ];
    const replyLines: string[] = [];
    for (const line of lines) {
      if (stopPatterns.some((p) => p.test(line.trim()))) break;
      replyLines.push(line);
    }
    return replyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
}