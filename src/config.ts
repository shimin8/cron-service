import * as dotenv from 'dotenv';

// Loading environment variables from .env file
dotenv.config();

export const config = {
  db: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  queueName: process.env.QUEUE_NAME || 'cron-tasks',
  schedulerIntervalMs: 5000,
};

// Simple check to ensure critical variables are loaded
if (!config.db.user || !config.redis.host) {
    console.error("FATAL: Database or Redis configuration is missing. Check your .env file.");
    process.exit(1);
}