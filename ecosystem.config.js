module.exports = {
    apps: [
      {
        name: "cron-api",
        script: "dist/index-api.js",
        exec_mode: "fork",
        instances: 1,
        // Environment variables for this process (if different from .env)
        env: {
          NODE_ENV: "production",
        }
      },
      {
        name: "cron-scheduler",
        script: "dist/index-scheduler.js",
        exec_mode: "fork",
        instances: 1,
        env: {
          NODE_ENV: "production",
        }
      },
      {
        name: "cron-worker",
        script: "dist/index-worker.js",
        // Set to run multiple instances for load balancing and resilience
        exec_mode: "cluster", 
        instances: 2, // Start 2 workers to handle jobs concurrently
        env: {
          NODE_ENV: "production",
        }
      }
    ]
  };