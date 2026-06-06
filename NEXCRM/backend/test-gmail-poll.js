const { GmailPollerService } = require('./src/modules/tracking/services/gmailPollerService');

(async () => {
  console.log('🔍 Manually triggering Gmail poll...\n');
  const poller = new GmailPollerService();
  
  try {
    const result = await poller.poll();
    console.log('\n✅ Poll complete:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
