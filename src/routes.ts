import { Router } from 'express';
import { JobController } from './controllers/JobController';

const router = Router();

/**
 * Job Management Routes
 * Base Path: /api/v1
 */

// POST /jobs: Schedule a new cron job
router.post('/jobs', JobController.addJob);

// GET /jobs?jobId=X: List all jobs or search by ID
router.get('/jobs', JobController.listJobs);

// DELETE /jobs/:jobId: Delete a specific job
router.delete('/jobs/:jobId', JobController.deleteJob);

export default router;