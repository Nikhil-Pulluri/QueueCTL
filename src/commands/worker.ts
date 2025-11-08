import type { Command } from 'commander';
import chalk from 'chalk';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../db/database';
import { getActiveWorkers, unregisterWorker } from '../db/jobs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workers: any[] = [];

export const workerCommand = (program: Command): void => {
  const workerCmd = program
    .command('worker')
    .description('Manage worker processes');

  workerCmd
    .command('start')
    .description('Start worker process(es)')
    .option('--count <number>', 'Number of workers to start', '1')
    .action((options) => {
      const count = parseInt(options.count);

      if (isNaN(count) || count < 1) {
        console.error(chalk.red('Error:'), 'Worker count must be a positive number');
        process.exit(1);
      }

      console.log('\n' + chalk.bold(`Starting ${count} worker(s)...`));
      console.log(chalk.gray('─'.repeat(50)));

      const workerPath = path.join(__dirname, '../queue/worker-process.ts');

      for (let i = 0; i < count; i++) {
        const worker = fork(workerPath, [], {
          execPath: 'bun',
          stdio: 'inherit'
        });

        workers.push(worker);
        console.log(`Worker ${worker.pid} started`);

        worker.on('exit', (code) => {
          console.log(`Worker ${worker.pid} exited with code ${code}`);
        });
      }

      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.green(`${count} worker(s) started successfully`));
      console.log('Press Ctrl+C to stop all workers\n');

      process.on('SIGINT', () => {
        console.log('\nStopping all workers...');
        workers.forEach(w => w.kill('SIGTERM'));
        setTimeout(() => process.exit(0), 1000);
      });
    });

  workerCmd
    .command('stop')
    .description('Stop all running workers gracefully')
    .action(() => {
      try {
        const activeWorkers = getActiveWorkers(db);

        if (activeWorkers.length === 0) {
          console.log('\nNo active workers to stop\n');
          return;
        }

        console.log('\n' + chalk.bold('Stopping workers...'));
        console.log(chalk.gray('─'.repeat(50)));

        activeWorkers.forEach((worker) => {
          try {
            process.kill(worker.pid, 'SIGTERM');
            unregisterWorker(db, worker.pid);
            console.log(`Sent SIGTERM to worker ${worker.pid}`);
          } catch (error) {
            console.log(`Worker ${worker.pid} not found (already stopped)`);
            unregisterWorker(db, worker.pid);
          }
        });

        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.green('All workers stopped\n'));
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        }
        process.exit(1);
      }
    });
};
