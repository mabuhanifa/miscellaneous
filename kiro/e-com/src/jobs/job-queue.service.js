const Queue = require("bull");
const { setupLogger } = require("../utils/logger");
const redisClient = require("../config/redis");

/**
 * Job Queue Service
 * Centralized job queue management using Bull with Redis
 */

const logger = setupLogger();

class JobQueueService {
  constructor() {
    this.queues = new Map();
    this.redisConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_JOB_DB) || 1, // Separate DB for jobs
    };
    this.isInitialized = false;
  }

  /**
   * Initialize the job queue service
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Create default queues
      await this.createQueue("email", {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      await this.createQueue("sms", {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      });

      await this.createQueue("inventory", {
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: "fixed",
            delay: 5000,
          },
        },
      });

      await this.createQueue("analytics", {
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 1,
        },
      });

      await this.createQueue("cleanup", {
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 1,
        },
      });

      this.setupGlobalEventListeners();
      this.isInitialized = true;

      logger.info("Job queue service initialized successfully", {
        queues: Array.from(this.queues.keys()),
      });
    } catch (error) {
      logger.error("Failed to initialize job queue service", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Create a new queue
   */
  async createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Queue(name, {
      redis: this.redisConfig,
      ...options,
    });

    this.queues.set(name, queue);
    this.setupQueueEventListeners(queue, name);

    logger.info(`Queue '${name}' created successfully`);
    return queue;
  }

  /**
   * Get a queue by name
   */
  getQueue(name) {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue '${name}' not found`);
    }
    return queue;
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.add(jobType, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts,
        backoff: options.backoff,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail,
        ...options,
      });

      logger.debug(`Job added to queue '${queueName}'`, {
        jobId: job.id,
        jobType,
        priority: options.priority || 0,
        delay: options.delay || 0,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue '${queueName}'`, {
        jobType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process jobs in a queue
   */
  process(queueName, jobType, concurrency, processor) {
    try {
      const queue = this.getQueue(queueName);

      if (typeof concurrency === "function") {
        // If concurrency is not provided, it's the processor function
        processor = concurrency;
        concurrency = 1;
      }

      queue.process(jobType, concurrency, async (job) => {
        const startTime = Date.now();

        try {
          logger.debug(`Processing job ${job.id} of type '${jobType}'`, {
            queueName,
            jobId: job.id,
            attempts: job.attemptsMade + 1,
          });

          const result = await processor(job);

          const duration = Date.now() - startTime;
          logger.info(`Job ${job.id} completed successfully`, {
            queueName,
            jobType,
            jobId: job.id,
            duration: `${duration}ms`,
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Job ${job.id} failed`, {
            queueName,
            jobType,
            jobId: job.id,
            duration: `${duration}ms`,
            error: error.message,
            attempts: job.attemptsMade + 1,
          });
          throw error;
        }
      });

      logger.debug(
        `Processor registered for queue '${queueName}', job type '${jobType}'`,
        {
          concurrency,
        }
      );
    } catch (error) {
      logger.error(`Failed to register processor for queue '${queueName}'`, {
        jobType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule a recurring job
   */
  async scheduleRecurring(queueName, jobType, data, cronPattern, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.add(jobType, data, {
        repeat: { cron: cronPattern },
        ...options,
      });

      logger.info(`Recurring job scheduled in queue '${queueName}'`, {
        jobType,
        cronPattern,
        jobId: job.id,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to schedule recurring job in queue '${queueName}'`, {
        jobType,
        cronPattern,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    try {
      const queue = this.getQueue(queueName);

      const [waiting, active, completed, failed, delayed, paused] =
        await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
          queue.isPaused(),
        ]);

      return {
        name: queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused,
        total:
          waiting.length +
          active.length +
          completed.length +
          failed.length +
          delayed.length,
      };
    } catch (error) {
      logger.error(`Failed to get stats for queue '${queueName}'`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = {};

    for (const queueName of this.queues.keys()) {
      try {
        stats[queueName] = await this.getQueueStats(queueName);
      } catch (error) {
        stats[queueName] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Clean old jobs from a queue
   */
  async cleanQueue(
    queueName,
    grace = 24 * 60 * 60 * 1000,
    status = "completed"
  ) {
    try {
      const queue = this.getQueue(queueName);
      const cleaned = await queue.clean(grace, status);

      logger.info(
        `Cleaned ${cleaned.length} ${status} jobs from queue '${queueName}'`,
        {
          grace: `${grace}ms`,
          cleaned: cleaned.length,
        }
      );

      return cleaned.length;
    } catch (error) {
      logger.error(`Failed to clean queue '${queueName}'`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean all queues
   */
  async cleanAllQueues(grace = 24 * 60 * 60 * 1000) {
    const results = {};

    for (const queueName of this.queues.keys()) {
      try {
        const completedCleaned = await this.cleanQueue(
          queueName,
          grace,
          "completed"
        );
        const failedCleaned = await this.cleanQueue(queueName, grace, "failed");

        results[queueName] = {
          completed: completedCleaned,
          failed: failedCleaned,
          total: completedCleaned + failedCleaned,
        };
      } catch (error) {
        results[queueName] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.pause();

      logger.info(`Queue '${queueName}' paused`);
    } catch (error) {
      logger.error(`Failed to pause queue '${queueName}'`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.resume();

      logger.info(`Queue '${queueName}' resumed`);
    } catch (error) {
      logger.error(`Failed to resume queue '${queueName}'`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Setup event listeners for a specific queue
   */
  setupQueueEventListeners(queue, queueName) {
    queue.on("completed", (job, result) => {
      logger.debug(`Job completed in queue '${queueName}'`, {
        jobId: job.id,
        jobType: job.name,
        result: typeof result === "object" ? JSON.stringify(result) : result,
      });
    });

    queue.on("failed", (job, err) => {
      logger.error(`Job failed in queue '${queueName}'`, {
        jobId: job.id,
        jobType: job.name,
        error: err.message,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });
    });

    queue.on("stalled", (job) => {
      logger.warn(`Job stalled in queue '${queueName}'`, {
        jobId: job.id,
        jobType: job.name,
      });
    });

    queue.on("progress", (job, progress) => {
      logger.debug(`Job progress in queue '${queueName}'`, {
        jobId: job.id,
        jobType: job.name,
        progress,
      });
    });

    queue.on("waiting", (jobId) => {
      logger.debug(`Job waiting in queue '${queueName}'`, {
        jobId,
      });
    });

    queue.on("active", (job, jobPromise) => {
      logger.debug(`Job active in queue '${queueName}'`, {
        jobId: job.id,
        jobType: job.name,
      });
    });
  }

  /**
   * Setup global event listeners
   * Note: Signal handlers are now managed centrally in server.js
   */
  setupGlobalEventListeners() {
    // Signal handlers removed to prevent duplicate listeners
    // Shutdown is now handled centrally via StartupSequence.shutdown()
  }

  /**
   * Close all queues
   */
  async closeAll() {
    const closePromises = [];

    for (const [name, queue] of this.queues) {
      closePromises.push(
        queue
          .close()
          .then(() => {
            logger.info(`Queue '${name}' closed`);
          })
          .catch((error) => {
            logger.error(`Failed to close queue '${name}'`, {
              error: error.message,
            });
          })
      );
    }

    await Promise.allSettled(closePromises);
    this.queues.clear();
    this.isInitialized = false;

    logger.info("All job queues closed");
  }

  /**
   * Health check for job queue service
   */
  async healthCheck() {
    try {
      const stats = await this.getAllQueueStats();
      const health = {
        status: "healthy",
        queues: Object.keys(stats).length,
        totalJobs: Object.values(stats).reduce(
          (sum, stat) => sum + (stat.total || 0),
          0
        ),
        activeJobs: Object.values(stats).reduce(
          (sum, stat) => sum + (stat.active || 0),
          0
        ),
        failedJobs: Object.values(stats).reduce(
          (sum, stat) => sum + (stat.failed || 0),
          0
        ),
        stats,
      };

      // Check if any queue has too many failed jobs
      const maxFailedJobs = 100;
      const hasHighFailureRate = Object.values(stats).some(
        (stat) => stat.failed > maxFailedJobs
      );

      if (hasHighFailureRate) {
        health.status = "degraded";
        health.warning = "High failure rate detected in one or more queues";
      }

      return health;
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }
}

module.exports = new JobQueueService();
