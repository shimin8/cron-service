// src/controllers/JobController.ts
import { Request, Response } from 'express';
import { Database } from '../database';
import parseExpression from 'cron-parser';

const db = Database.getInstance();

export class JobController {

    // --- 1. POST /jobs: Add a new cron job ---
    public static async addJob(req: Request, res: Response): Promise<Response> {
        const { name, cron_expression, task_payload, is_active } = req.body;

        if (!name || !cron_expression || !task_payload) {
            return res.status(400).json({ error: "Missing required fields: name, cron_expression, and task_payload." });
        }

        // Basic Cron Validation
        try {
            parseExpression.parse(cron_expression);
        } catch (e) {
            return res.status(400).json({ error: "Invalid cron_expression format." });
        }
        
        // Ensure payload is a JSON object
        const payloadJson = typeof task_payload === 'object' ? task_payload : {};

        try {
            const result = await db.query(
                `INSERT INTO jobs (name, cron_expression, task_payload, is_active)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, name, cron_expression, is_active`,
                [name, cron_expression, payloadJson, is_active === undefined ? true : is_active]
            );

            console.log(`[${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}] [POST /jobs] Scheduled new job:`, { id: result.rows[0].id, name: result.rows[0].name });
            return res.status(201).json({ 
                message: "Job scheduled successfully.", 
                job: result.rows[0] 
            });
        } catch (error: any) {
            if (error.code === '23505') { // PostgreSQL unique violation error code
                 return res.status(409).json({ error: `Job with name '${name}' already exists.` });
            }
            console.error("Database error adding job:", error);
            return res.status(500).json({ error: "Internal server error while adding job." });
        }
    }

    // --- 2. GET /jobs: List all jobs (with optional search by ID) ---
    public static async listJobs(req: Request, res: Response): Promise<Response> {
        const { jobId } = req.query; // Query parameter for searching

        let queryText = 'SELECT id, name, cron_expression, is_active, created_at FROM jobs';
        let params: any[] = [];

        if (jobId) {
            // Support searching by specific job ID
            if (isNaN(parseInt(jobId as string))) {
                 return res.status(400).json({ error: "jobId must be a valid integer." });
            }
            queryText += ' WHERE id = $1';
            params.push(parseInt(jobId as string));
        }

        queryText += ' ORDER BY id ASC';

        try {
            const result = await db.query(queryText, params);
            if (jobId && result.rows.length === 0) {
                 return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
            }

            console.log(`[${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}] [GET /jobs] Listed jobs`);
            return res.status(200).json(result.rows);
        } catch (error) {
            console.error("Database error listing jobs:", error);
            return res.status(500).json({ error: "Internal server error while listing jobs." });
        }
    }

    // --- 3. DELETE /jobs/:jobId: Delete a job ---
    public static async deleteJob(req: Request, res: Response): Promise<Response> {
        const jobId = parseInt(req.params.jobId);

        if (isNaN(jobId)) {
            return res.status(400).json({ error: "Invalid job ID provided." });
        }

        try {
            // Note: ON DELETE CASCADE in the DB schema will automatically delete 
            // the associated entries in the job_executions table.
            const result = await db.query('DELETE FROM jobs WHERE id = $1 RETURNING id', [jobId]);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
            }

            console.log(`[${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}] [DELETE /jobs/:jobId] Deleted job:`, { id: jobId });
            return res.status(200).json({ message: `Job ID ${jobId} and all its execution history deleted successfully.` });
        } catch (error) {
            console.error("Database error deleting job:", error);
            return res.status(500).json({ error: "Internal server error while deleting job." });
        }
    }
}