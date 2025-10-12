import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from './config';

// Shared Redis connection configuration
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

// Queue Producer (used by the Scheduler)
export const jobQueue = new Queue(config.queueName, {
  connection,
  defaultJobOptions: {
    attempts: 3, 
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000, 
    removeOnFail: 5000, 
  }
});

console.log(`BullMQ Queue '${config.queueName}' Initialized.`);

export { connection }; // Exporting the connection for the Worker