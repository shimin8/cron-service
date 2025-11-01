# Cron Service

A robust, distributed cron job scheduling service built with Node.js, TypeScript, PostgreSQL, and Redis. This service provides reliable job scheduling with distributed locking, queue management, and comprehensive job execution tracking.

## Features

- **Distributed Scheduling**: PostgreSQL advisory locks prevent duplicate job scheduling across multiple instances
- **Queue Management**: BullMQ with Redis for reliable job queuing and processing
- **Job Execution Tracking**: Complete audit trail of job executions with status tracking
- **RESTful API**: HTTP endpoints for job management
- **Concurrent Processing**: Multiple worker instances for high throughput
- **Fault Tolerance**: Automatic retries and error handling
- **TypeScript**: Full type safety and modern development experience

## Architecture

The service consists of three main components:

1. **Scheduler Service** (`src/scheduler.ts`): Evaluates cron expressions and queues jobs
2. **Worker Service** (`src/worker.ts`): Processes queued jobs and executes tasks
3. **API Service** (`src/routes.ts`): RESTful endpoints for job management

## Prerequisites

**For Docker (Recommended):**
- Docker 20+ 
- Docker Compose 2+

**For Manual Setup:**
- Node.js 18+ 
- PostgreSQL 12+
- Redis 6+
- TypeScript 5+

## Installation

### Docker Installation (Recommended)

The easiest way to get started is using Docker Compose, which automatically sets up PostgreSQL, Redis, and all application services.

1. Clone the repository:
```bash
git clone <repository-url>
cd cron-service
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file:
```env
# Database Configuration
DB_USER=your_db_user
DB_HOST=db
DB_DATABASE=cron_service
DB_PASSWORD=your_db_password
DB_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Queue Configuration
QUEUE_NAME=cron-tasks
```

4. Start all services with Docker Compose:
```bash
docker-compose up -d
```

This will:
- Start PostgreSQL with automatic schema initialization via `db-init/init.sql`
- Start Redis for queue management
- Build and start the API service (port 3000)
- Start the Scheduler service
- Start the Worker service

**Note:** The database schema is automatically initialized from `db-init/init.sql` when the PostgreSQL container starts for the first time. The `init.sql` file creates all necessary tables, indexes, and constraints.

### Manual Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cron-service
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
# Database Configuration
DB_USER=your_db_user
DB_HOST=localhost
DB_DATABASE=cron_service
DB_PASSWORD=your_db_password
DB_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Queue Configuration
QUEUE_NAME=cron-tasks
```

5. Set up the database schema:
```sql
-- Create jobs table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    task_payload JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create job_executions table
CREATE TABLE job_executions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id),
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    log_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, scheduled_time)
);

-- Create indexes for performance
CREATE INDEX idx_job_executions_job_id ON job_executions(job_id);
CREATE INDEX idx_job_executions_status ON job_executions(status);
CREATE INDEX idx_job_executions_scheduled_time ON job_executions(scheduled_time);
```

Alternatively, you can use the SQL from `db-init/init.sql` for manual database setup.

## Usage

### Docker Usage

**Start all services:**
```bash
docker-compose up -d
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f scheduler
docker-compose logs -f worker
```

**Stop all services:**
```bash
docker-compose down
```

**Stop services and remove volumes (clean slate):**
```bash
docker-compose down -v
```

**Rebuild services after code changes:**
```bash
docker-compose up -d --build
```

### Manual Development Mode

Start the services individually:

```bash
# Terminal 1: Start the scheduler
npm run start:scheduler

# Terminal 2: Start the worker
npm run start:worker

# Terminal 3: Start the API server
npm run start:api
```

### Production Mode

Build the project:
```bash
npm run build
```

Use PM2 for process management:
```bash
pm2 start ecosystem.config.js
```

Or use Docker Compose for production deployments.

## API Endpoints

### Job Management

#### Create a Job
```http
POST /api/v1/jobs
Content-Type: application/json

{
  "name": "Daily Report",
  "cronExpression": "0 9 * * *",
  "taskPayload": {
    "type": "API_CALL",
    "config": {
      "url": "https://api.example.com/generate-report",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer your-token"
      },
      "data": {
        "reportType": "daily"
      }
    }
  }
}
```

#### List Jobs
```http
GET /api/v1/jobs
GET /api/v1/jobs?jobId=123
```

#### Delete a Job
```http
DELETE /api/v1/jobs/123
```

## Job Types

### API Call Jobs
Execute HTTP requests to external services:

```json
{
  "type": "API_CALL",
  "config": {
    "url": "https://api.example.com/endpoint",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer token"
    },
    "data": {
      "key": "value"
    },
    "params": {
      "query": "param"
    }
  }
}
```

## Configuration

The service can be configured through environment variables and the `config.ts` file:

- `schedulerIntervalMs`: How often the scheduler checks for due jobs (default: 5000ms)
- `concurrency`: Number of concurrent workers (default: 5)
- Database and Redis connection settings

## Monitoring

### Job Execution Status

Jobs can have the following statuses:
- `QUEUED`: Job is queued for execution
- `RUNNING`: Job is currently being executed
- `SUCCESS`: Job completed successfully
- `FAILED`: Job failed after all retries

### Logs

The service provides comprehensive logging:
- Scheduler logs job queuing events
- Worker logs job execution progress
- Database tracks all execution attempts

## Development

### Project Structure

```
.
├── db-init/
│   └── init.sql      # Database schema initialization (auto-executed by Docker)
├── src/
│   ├── config.ts          # Configuration management
│   ├── database.ts        # Database connection and queries
│   ├── queue.ts          # Redis queue setup
│   ├── scheduler.ts      # Cron job scheduler
│   ├── worker.ts         # Job execution worker
│   ├── executor.ts       # Job execution logic
│   ├── routes.ts         # API routes
│   ├── controllers/      # API controllers
│   ├── index-scheduler.ts # Scheduler entry point
│   ├── index-worker.ts   # Worker entry point
│   └── index-api.ts      # API server entry point
├── docker-compose.yml    # Docker Compose configuration
└── Dockerfile            # Docker image definition
```

### Adding New Job Types

1. Extend the `JobPayload` interface in `executor.ts`
2. Add execution logic in the `executeJob` function
3. Update the API to support the new job type

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: 
   - Docker: Verify `DB_HOST=db` in your `.env` file and that the database container is running
   - Manual: Verify PostgreSQL is running and credentials are correct
2. **Redis Connection Errors**: 
   - Docker: Verify `REDIS_HOST=redis` in your `.env` file and that Redis container is running
   - Manual: Ensure Redis is running and accessible
3. **Job Not Executing**: Check cron expression validity and job status
4. **Lock Issues**: Multiple scheduler instances may cause lock conflicts
5. **Database Schema Not Created (Docker)**: 
   - Ensure `db-init/init.sql` exists and contains the schema
   - Remove the PostgreSQL volume and restart: `docker-compose down -v && docker-compose up -d`

### Debugging

Enable debug logging by setting the log level in your environment:
```bash
DEBUG=cron-service:* npm run start:scheduler
```

## License

ISC
