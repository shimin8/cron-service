import { Worker, Job } from 'bullmq';
import { Database } from './database';
import { config, } from './config';
import { connection } from './queue';
import { executeJob } from './executor';

// Define the type for the data sent by the scheduler
interface TaskData {
    executionId: string;
    jobId: number;
    jobName: string;
    taskPayload: any;
}

class TaskExecutor {
    static async execute(data: TaskData): Promise<string> {
        console.log(`[Worker] Starting job ${data.jobId} (${data.jobName}) (Execution ID: ${data.executionId})`);
        
        // Actual business logic goes here: Example: Send email, run a report, call an external API
        
        const duration = Math.random() * 5000 + 1000; // 1 to 6 seconds mock duration
        await new Promise(resolve => setTimeout(resolve, duration));
        
        // if (Math.random() < 0.1) { // 10% chance of failure (for testing)
        //     throw new Error("Simulated task failure during execution.");
        // }

        console.log(`[Worker] Job ${data.jobId} completed successfully in ${duration.toFixed(0)}ms.`);
        return `Task completed successfully at ${new Date().toISOString()}.`;
    }
}

export class WorkerService {
    private worker: Worker | null = null;
    private db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    private async processJob(job: Job<TaskData>) {
        const { executionId, jobId, taskPayload } = job.data;
        const startTime = new Date();
        
        try {
            // 1. Mark the execution record as 'RUNNING' in PostgreSQL
            await this.db.updateExecutionStatus(
                executionId, 
                'RUNNING', 
                startTime, 
                null,
                { type: 'start', message: 'Job started by worker.' }
            );

            // 2. Execute the task
            // const resultLog = await TaskExecutor.execute(job.data); 
            const resultLog = await executeJob(taskPayload);

            // 3. Mark the execution record as 'SUCCESS'
            const endTime = new Date();
            await this.db.updateExecutionStatus(
                executionId, 
                'SUCCESS', 
                null, 
                endTime,
                { type: 'success', message: resultLog }
            );

        } catch (error: any) {
            console.error(`[Worker] Job ${jobId} failed! Retries: ${job.attemptsMade}/${job.opts.attempts}`, error.message);
            
            // 4. Mark the execution record as 'FAILED'
            const endTime = new Date();
            await this.db.updateExecutionStatus(
                executionId, 
                'FAILED', 
                null, 
                endTime,
                { type: 'failure', message: error.message, stack: error.stack }
            );
            
            // Re-throw the error to let BullMQ handle the retry mechanism
            throw error;
        }
    }

    public start() {
        if (!this.worker) {
            this.worker = new Worker<TaskData>(
                config.queueName, 
                (job) => this.processJob(job), // Use the class method as the job handler
                { connection, concurrency: 5 } // Process up to 5 jobs simultaneously
            );
            
            this.worker.on('failed', (job, err) => {
                // This is the final fail state after all retries are exhausted
                if (job) {
                    console.error(`[Worker] Job ${job.id} officially failed after all retries. Error: ${err.message}`);
                    // Note: The DB status is already 'FAILED' from the catch block above.
                }
            });

            console.log(`WorkerService started, listening to queue '${config.queueName}'...`);
        }
    }

    public stop() {
        if (this.worker) {
            this.worker.close();
            this.worker = null;
            console.log("WorkerService stopped.");
        }
    }
}