import { SchedulerService } from './scheduler';

console.log("--- Starting CRON SCHEDULER SERVICE ---");
const scheduler = new SchedulerService();
scheduler.start();

process.on('SIGINT', () => {
    console.log("Received SIGINT. Shutting down scheduler...");
    scheduler.stop();
    process.exit(0);
});