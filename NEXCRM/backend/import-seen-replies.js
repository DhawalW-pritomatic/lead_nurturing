/**
 * One-time script to import SEEN email replies from known leads
 * Run with: node import-seen-replies.js
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { Readable } = require('stream');

// Database setup
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('nexcrm', 'nexcrm', 'nexcrm_secret', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres',
  logging: false
});

// IMAP config
const imapConfig = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'ameykuljay@gmail.com',
    pass: 'onlymztfqzosukig'
  },
  logger: false
};

async function importSeenReplies() {
  console.log('\n🔍 Starting one-time import of SEEN email replies...\n');
  
  const client = new ImapFlow(imapConfig);
  let imported = 0;
  let skipped = 0;

  try {
    await client.connect();
    console.log('✅ Connected to Gmail IMAP');
    
    const lock = await client.getMailboxLock('INBOX');
    
    try {
      // Get all leads from database
      const [leads] = await sequelize.query(
        'SELECT id, tenant_id, email, first_name, last_name, assigned_rep_id FROM leads'
      );
      
      const leadByEmail = new Map();
      for (const lead of leads) {
        leadByEmail.set(lead.email.toLowerCase().trim(), lead);
      }
      
      console.log(`📋 Loaded ${leads.length} lead emails from database\n`);
      
      // Get already imported UIDs
      const [existingQueries] = await sequelize.query(
        "SELECT metadata FROM lead_queries WHERE source = 'email'"
      );
      const existingUids = new Set();
      const existingMsgIds = new Set();
      for (const row of existingQueries) {
        if (row.metadata?.gmail_uid) existingUids.add(String(row.metadata.gmail_uid));
        if (row.metadata?.message_id) existingMsgIds.add(String(row.metadata.message_id));
      }
      
      console.log(`📝 Found ${existingUids.size} already imported emails\n`);
      
      // Scan emails from last 30 days (both seen and unseen)
      const since = new Date();
      since.setDate(since.getDate() - 30);
      
      console.log(`📥 Scanning emails since ${since.toDateString()}...\n`);
      
      const messages = client.fetch({ since }, {
        uid: true,
        envelope: true,
        source: true,
        flags: true
      }, { uid: true });
      
      let scanned = 0;
      const foundFromAddresses = [];
      
      for await (const msg of messages) {
        scanned++;
        if (scanned > 500) break; // Safety limit
        
        try {
          const uid = String(msg.uid ?? '');
          
          // Skip if already imported
          if (existingUids.has(uid)) {
            skipped++;
            continue;
          }
          
          if (!msg.source) {
            skipped++;
            continue;
          }
          
          // Parse email
          const parsed = await simpleParser(Readable.from(msg.source));
          
          const fromAddress = (
            parsed.from?.value?.[0]?.address || 
            msg.envelope?.from?.[0]?.address || 
            ''
          ).toLowerCase().trim();
          
          const subject = parsed.subject?.trim() || '(no subject)';
          const messageId = parsed.messageId?.trim() || '';
          
          // Skip if already imported by message ID
          if (messageId && existingMsgIds.has(messageId)) {
            skipped++;
            continue;
          }
          
          // Only process if from a known lead
          const lead = leadByEmail.get(fromAddress);
          if (!lead) {
            skipped++;
            continue;
          }
          
          // Track found addresses
          if (!foundFromAddresses.includes(fromAddress)) {
            foundFromAddresses.push(fromAddress);
          }
          
          // Extract reply text
          const rawPlain = parsed.text || (parsed.html ? stripHtml(parsed.html) : '') || '';
          const replyText = extractReplyOnly(rawPlain) || rawPlain.trim() || '(no body)';
          
          // Create LeadQuery record
          await sequelize.query(
            `INSERT INTO lead_queries 
             (id, tenant_id, lead_id, source, subject, body, status, owner_user_id, metadata, created_at, updated_at)
             VALUES (gen_random_uuid(), :tenant_id, :lead_id, 'email', :subject, :body, 'pending', :owner_user_id, :metadata, NOW(), NOW())`,
            {
              replacements: {
                tenant_id: lead.tenant_id,
                lead_id: lead.id,
                subject,
                body: replyText,
                owner_user_id: lead.assigned_rep_id || null,
                metadata: JSON.stringify({
                  gmail_uid: uid,
                  message_id: messageId,
                  lead_reply_text: replyText,
                  raw_body: rawPlain.slice(0, 4000),
                  provider: 'gmail_imap_manual',
                  from_address: fromAddress,
                  imported_at: new Date().toISOString(),
                  imported_by: 'manual_script'
                })
              }
            }
          );
          
          imported++;
          console.log(`✅ Imported: ${fromAddress} - "${subject}"`);
          
          // Mark as SEEN if it wasn't already
          try {
            await client.messageFlagsAdd({ uid: parseInt(uid, 10) }, ['\\Seen'], { uid: true });
          } catch {}
          
        } catch (msgErr) {
          console.error(`❌ Error processing message:`, msgErr.message);
        }
      }
      
      console.log(`\n📊 Scan complete:`);
      console.log(`   - Scanned: ${scanned} emails`);
      console.log(`   - Imported: ${imported} new replies`);
      console.log(`   - Skipped: ${skipped} (duplicates or non-leads)`);
      
      if (foundFromAddresses.length > 0) {
        console.log(`\n📧 Found replies from these lead emails:`);
        foundFromAddresses.forEach(addr => console.log(`   - ${addr}`));
      } else {
        console.log(`\n⚠️  No replies found from any known lead emails in the last 30 days`);
      }
      
    } finally {
      lock.release();
    }
    
    await client.logout();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await sequelize.close();
  }
  
  console.log('\n✅ Import complete!\n');
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractReplyOnly(text) {
  const lines = text.split('\n');
  const result = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Stop at common quote markers
    if (
      trimmed.startsWith('>') ||
      trimmed.startsWith('On ') && (trimmed.includes(' wrote:') || trimmed.includes(' said:')) ||
      trimmed.match(/^-+\s*Original Message\s*-+/i) ||
      trimmed.match(/^From:/i) && result.length > 0
    ) {
      break;
    }
    
    result.push(line);
  }
  
  return result.join('\n').trim();
}

// Run the import
importSeenReplies().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
