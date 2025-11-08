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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/jobs.db');
const db = new Database(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

let isRunning = true;
const workerPid = process.pid;

registerWorker(db, workerPid);

process.on('SIGTERM', () => {
  console.log(`Worker ${workerPid}: Received SIGTERM, shutting down gracefully...`);
  isRunning = false;
});

process.on('SIGINT', () => {
  console.log(`Worker ${workerPid}: Received SIGINT, shutting down gracefully...`);
  isRunning = false;
});

const heartbeatInterval = setInterval(() => {
  if (isRunning) {
    updateWorkerHeartbeat(db, workerPid);
  }
}, 5000);

async function pollAndProcessJobs() {
  console.log(`Worker ${workerPid}: Started`);

  while (isRunning) {
    try {
      const job = getNextPendingJob(db);

      if (job) {
        console.log(`Worker ${workerPid}: Processing job ${job.id} - Command: ${job.command}`);
        
        const result = await executeCommand(job.command);
        
        if (result.success) {
          const output = [result.stdout, result.stderr]
            .filter(Boolean)
            .map(s => s?.trim())
            .filter(s => s)
            .join('\n');

          
          markJobCompleted(db, job.id, output, result.duration);
          console.log(`Worker ${workerPid}: Job ${job.id} completed successfully (${result.duration}ms)`);

          if (output) {
            console.log(`  Output: ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
          }
       } else {
          const newAttempts = job.attempts + 1;
          const errorMsg = result.error || result.stderr || `Command failed with exit code ${result.exitCode}`;
          
          console.log(`Worker ${workerPid}: Job ${job.id} FAILED!`);
          console.log(`  Exit Code: ${result.exitCode}`);
          console.log(`  Error: ${errorMsg}`);
          console.log(`  Stdout: ${result.stdout || '(empty)'}`);
          console.log(`  Stderr: ${result.stderr || '(empty)'}`);
          
          markJobFailed(db, job.id, errorMsg, newAttempts, job.max_retries);
          
          if (newAttempts >= job.max_retries) {
            console.log(`Worker ${workerPid}: Job ${job.id} moved to DLQ after ${newAttempts} attempts`);
          } else {
            console.log(`Worker ${workerPid}: Job ${job.id} will retry (attempt ${newAttempts}/${job.max_retries})`);
          }
        }
      } else {
        await Bun.sleep(1000);
      }
    } catch (error) {
      console.error(`Worker ${workerPid}: Error:`, error);
      await Bun.sleep(2000);
    }
  }

  clearInterval(heartbeatInterval);
  unregisterWorker(db, workerPid);
  db.close();
  console.log(`Worker ${workerPid}: Stopped`);
  process.exit(0);
}

pollAndProcessJobs();
