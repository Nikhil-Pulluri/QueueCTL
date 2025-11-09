import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  getNextPendingJob,
  registerWorker,
  unregisterWorker,
  updateWorkerHeartbeat,
  markJobCompleted,
  markJobFailed
} from '../db/jobs';
import { executeCommand } from './job-executor';
import { createLogger } from '../logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/jobs.db');
const db = new Database(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

let isRunning = true;
const workerPid = process.pid;

const logger = createLogger(`Worker-${workerPid}`);

registerWorker(db, workerPid);
logger.info(`Worker ${workerPid} started`);

process.on('SIGTERM', () => {
  logger.info(`Received SIGTERM, shutting down gracefully`);
  isRunning = false;
});

process.on('SIGINT', () => {
  logger.info(`Received SIGINT, shutting down gracefully`);
  isRunning = false;
});

const heartbeatInterval = setInterval(() => {
  if (isRunning) {
    updateWorkerHeartbeat(db, workerPid);
  }
}, 5000);

async function pollAndProcessJobs() {
  while (isRunning) {
    try {
      const job = getNextPendingJob(db);

      if (job) {
        logger.info(`Processing job ${job.id} - Command: ${job.command}`);
        
        const result = await executeCommand(job.command);
        
        if (result.success) {
          const output = [result.stdout, result.stderr]
            .filter(Boolean)
            .map(s => s?.trim())
            .filter(s => s)
            .join('\n');
          
          markJobCompleted(db, job.id, output, result.duration);
          logger.info(`Job ${job.id} completed successfully (${result.duration}ms)`);
          
          if (output) {
            logger.info(`Job ${job.id} output: ${output.substring(0, 200)}${output.length > 200 ? '...' : ''}`);
          }
        } else {
          const newAttempts = job.attempts + 1;
          const errorMsg = result.error || result.stderr || `Command failed with exit code ${result.exitCode}`;
          
          markJobFailed(db, job.id, errorMsg, newAttempts, job.max_retries);
          
          if (newAttempts >= job.max_retries) {
            logger.error(`Job ${job.id} moved to DLQ after ${newAttempts} attempts - Error: ${errorMsg}`);
          } else {
            logger.warn(`Job ${job.id} failed (attempt ${newAttempts}/${job.max_retries}) - Error: ${errorMsg}`);
          }
        }
      } else {
        await Bun.sleep(1000);
      }
    } catch (error) {
      logger.error(`Error processing job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await Bun.sleep(2000);
    }
  }

  clearInterval(heartbeatInterval);
  unregisterWorker(db, workerPid);
  db.close();
  logger.info(`Worker ${workerPid} stopped`);
  process.exit(0);
}

pollAndProcessJobs();
