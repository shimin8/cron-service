-- Ensure UUID extension is available if needed (for job_executions UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Job Definitions (jobs)
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cron_expression VARCHAR(50) NOT NULL,
    task_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Data passed to the worker
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Execution History and Status (job_executions)
CREATE TABLE IF NOT EXISTS job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Use UUID for globally unique IDs
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL, -- E.g., 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'MISSED'
    log_details JSONB,

    -- Crucial composite unique index to prevent the same scheduled time from being executed twice
    CONSTRAINT uq_job_scheduled_time UNIQUE (job_id, scheduled_time)
);

-- Index for faster lookup of running/failed/queued jobs
CREATE INDEX IF NOT EXISTS idx_job_executions_status ON job_executions (status);
