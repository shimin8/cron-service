import { WorkerService } from './worker';

console.log("--- Starting CRON WORKER SERVICE ---");
const worker = new WorkerService();
worker.start();

process.on('SIGINT', () => {
    console.log("Received SIGINT. Shutting down worker...");
    worker.stop();
    process.exit(0);
});