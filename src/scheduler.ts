import parseExpression from 'cron-parser';
import { PoolClient } from 'pg';
import { Database, JobDefinition } from './database';
import { jobQueue } from './queue';
import { config } from './config';

const SCHEDULER_LOCK_ID = 12345;

export class SchedulerService {
    private db: Database;
    private lockClient: PoolClient | null = null;
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.db = Database.getInstance();
    }

    private async acquireLock(): Promise<boolean> {
        if (this.lockClient) return true; // Already holding the lock

        const client = await this.db.getClient();
        try {
            const result = await client.query('SELECT pg_try_advisory_lock($1) as locked', [SCHEDULER_LOCK_ID]);
            const locked = result.rows[0].locked;

            if (locked) {
                this.lockClient = client; // Store the client holding the lock
                return true;
            } else {
                client.release(); // Release the connection if we didn't get the lock
                return false;
            }
        } catch (error) {
            console.error("Error acquiring lock:", error);
            client.release();
            return false;
        }
    }

    private async releaseLock(): Promise<void> {
        if (this.lockClient) {
            try {
                await this.lockClient.query('SELECT pg_advisory_unlock($1)', [SCHEDULER_LOCK_ID]);
            } catch(error) {
                console.error("Error releasing lock:", error);
            } finally {
                this.lockClient.release(); // Release the connection back to the pool
                this.lockClient = null;
            }
        }
    }

    private getNextScheduledTime(cronExpression: string): Date | null {
        try {
            return parseExpression.parse(cronExpression, { utc: true } as any).next().toDate();
        } catch (e) {
            console.error(`Invalid cron expression: ${cronExpression}`, e);
            return null;
        }
    }

    private async runSchedulingCycle() {
        // Trying to acquire the lock.
        if (!await this.acquireLock()) {
            console.log("Another scheduler instance is running. Skipping this cycle.");
            return;
        }

        console.log(`[${new Date().toLocaleTimeString()}] Lock acquired. Running scheduling cycle...`);

        try {
            // Fetching all active jobs
            const activeJobs = await this.db.getActiveJobs();
            const currentTime = new Date();

            for (const job of activeJobs) {
                const nextTime = this.getNextScheduledTime(job.cron_expression);

                if (!nextTime) continue;

                // Queue anything scheduled between now and 10 seconds ago (for catchup and avoid duplicate jobs)
                // The DB unique constraint handles actual duplicates.
                const tenSecondsAgo = new Date(currentTime.getTime() - 10000);
                
                if (nextTime >= tenSecondsAgo) {
                    
                    try {
                        // Attempting to create the execution record. Fails if UNIQUE constraint violated.
                        const executionResult = await this.db.query(
                            `INSERT INTO job_executions 
                             (job_id, scheduled_time, status, log_details) 
                             VALUES ($1, $2, 'QUEUED', $3) RETURNING id`,
                            [
                                job.id, 
                                nextTime.toISOString(),
                                { cron_payload: job.task_payload }
                            ]
                        );

                        const executionId = executionResult.rows[0].id;
                        
                        // Pushing the execution record ID and task payload to BullMQ
                        await jobQueue.add('execute-task', {
                            executionId: executionId,
                            jobId: job.id,
                            taskPayload: job.task_payload,
                            jobName: job.name
                        });
                        
                        console.log(`   -> Queued job ${job.id} (${job.name}) for ${nextTime.toLocaleTimeString()}.`);

                    } catch (e: any) {
                        if (e.constraint === 'uq_job_scheduled_time') {
                            // Expected failure: job already queued or executed for this time.
                            // console.log(`   -> Job ${job.id} already processed for ${nextTime.toLocaleTimeString()}.`);
                        } else {
                            console.error(`Error processing job ${job.id}:`, e.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Fatal error during scheduling cycle:", error);
        } finally {
            // Releasing the lock
            await this.releaseLock();
        }
    }

    public start() {
        if (!this.intervalId) {
            this.intervalId = setInterval(() => this.runSchedulingCycle(), config.schedulerIntervalMs);
            console.log(`SchedulerService started, checking jobs every ${config.schedulerIntervalMs}ms...`);
            // Running once immediately on start
            this.runSchedulingCycle();
        }
    }

    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.releaseLock();
            console.log("SchedulerService stopped.");
        }
    }
}