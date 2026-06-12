import cron from 'node-cron';
import { SchedulerService } from '../modules/scheduler/services/schedulerService';
import { GmailPollerService } from '../modules/tracking/services/gmailPollerService';
import { SequenceAutomationService } from '../modules/sequences/services/sequenceAutomationService';
import { CallbackService } from '../modules/callbacks/services/callbackService';

const schedulerService = new SchedulerService();
const gmailPoller = new GmailPollerService();
const sequenceAutomation = new SequenceAutomationService();
const callbackService = new CallbackService();

/**
 * Initialize all cron jobs for the application.
 * Called once on server startup.
 */
export function initCronJobs(): void {
  // Poll Gmail inbox every 2 minutes for new lead replies
  cron.schedule('*/2 * * * *', async () => {
    try {
      await gmailPoller.poll();
    } catch (error: any) {
      console.error('[CRON] Gmail poller error:', error.message);
    }
  });

  // Process due sequence steps every 10 minutes (dedicated, not tied to email scheduler)
  cron.schedule('*/10 * * * *', async () => {
    try {
      const result = await sequenceAutomation.processDueEnrollments();
      if (result.processed > 0) {
        console.log(`[CRON] Sequence steps processed: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      console.error('[CRON] Sequence automation error:', error.message);
    }
  });

  // Run an immediate first poll on startup (don't await so server starts fast)
  setImmediate(() => {
    gmailPoller.poll().catch((err) =>
      console.error('[CRON] Initial Gmail poll error:', err.message)
    );
  });

  // Run email scheduler every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily email scheduler...');
    try {
      await schedulerService.runAllSchedules();
      console.log('[CRON] Daily email scheduler completed.');
    } catch (error: any) {
      console.error('[CRON] Scheduler error:', error.message);
    }
  });

  // Run a check every hour during business hours (10 AM - 6 PM) for any missed schedules
  cron.schedule('0 10-18 * * 1-6', async () => {
    console.log('[CRON] Hourly schedule check...');
    try {
      await schedulerService.runAllSchedules();
    } catch (error: any) {
      console.error('[CRON] Hourly check error:', error.message);
    }
  });

  // Callback reminders: check every 15 minutes for callbacks due within 1 hour
  cron.schedule('*/15 * * * *', async () => {
    try {
      const sent = await callbackService.sendUpcomingReminders();
      if (sent > 0) console.log(`[CRON] Sent ${sent} callback reminder(s).`);
    } catch (error: any) {
      console.error('[CRON] Callback reminder error:', error.message);
    }
  });

  // SLA breach + missed callbacks: check hourly
  cron.schedule('0 * * * *', async () => {
    try {
      await callbackService.processMissedAndSla();
    } catch (error: any) {
      console.error('[CRON] SLA/missed callback error:', error.message);
    }
  });

  console.log('[CRON] Cron jobs initialized: Gmail poll every 2min, sequence steps every 10min, email scheduler 9AM + hourly 10AM-6PM Mon-Sat, callback reminders every 15min, SLA check hourly.');
}
