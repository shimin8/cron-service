import { Pool, QueryResult, PoolClient } from 'pg';
import { config } from './config';

export interface JobDefinition {
    id: number;
    name: string;
    cron_expression: string;
    task_payload: any;
}

export class Database {
    private pool: Pool;
    private static instance: Database;

    private constructor() {
        // Use the centralized config
        this.pool = new Pool({
            user: config.db.user,
            host: config.db.host,
            database: config.db.database,
            password: config.db.password,
            port: config.db.port,
        });
        console.log("PostgreSQL Pool Initialized.");
    }

    // Singleton pattern ensures only one DB connection pool exists
    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async query(text: string, params?: any[]): Promise<QueryResult> {
        return this.pool.query(text, params);
    }

    public async getClient(): Promise<PoolClient> {
        return this.pool.connect();
    }

    // Convenience method to fetch active jobs
    public async getActiveJobs(): Promise<JobDefinition[]> {
        const result = await this.query(
            'SELECT id, name, cron_expression, task_payload FROM jobs WHERE is_active = TRUE'
        );
        return result.rows as JobDefinition[];
    }

    // Method to update job execution status (used by the Worker)
    public async updateExecutionStatus(
        executionId: string,
        status: string,
        startTime: Date | null,
        endTime: Date | null,
        logDetails: any = null
    ): Promise<void> {
        let updateParts: string[] = ['status = $2'];
        let params: any[] = [executionId, status];
        let paramIndex = 3;

        if (startTime) {
            updateParts.push(`start_time = $${paramIndex++}`);
            params.push(startTime);
        }
        if (endTime) {
            updateParts.push(`end_time = $${paramIndex++}`);
            params.push(endTime);
        }
        if (logDetails) {
             updateParts.push(`log_details = log_details || $${paramIndex++}`);
             params.push(logDetails);
        }

        const queryText = `UPDATE job_executions SET ${updateParts.join(', ')} WHERE id = $1`;
        
        await this.query(queryText, params);
    }
}