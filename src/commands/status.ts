import type { Command } from 'commander';
import chalk from 'chalk';
import db from '../db/database';
import { getAllJobCounts, getActiveWorkerCount, getActiveWorkers } from '../db/jobs';

export const statusCommand = (program: Command): void => {
  program
    .command('status')
    .description('Show queue status and active workers')
    .action(() => {
      try {
        const jobCounts = getAllJobCounts(db);
        const activeWorkers = getActiveWorkerCount(db);
        const workers = getActiveWorkers(db);

        const totalJobs = 
          jobCounts.pending + 
          jobCounts.processing + 
          jobCounts.completed + 
          jobCounts.failed + 
          jobCounts.dead;

        console.log('\n' + chalk.bold('Queue Status'));
        console.log(chalk.gray('─'.repeat(50)));

        console.log('\nJobs Overview:');
        console.log('  ' + chalk.yellow('Pending:'), `${jobCounts.pending} job${jobCounts.pending !== 1 ? 's' : ''}`);
        console.log('  ' + chalk.blue('Processing:'), `${jobCounts.processing} job${jobCounts.processing !== 1 ? 's' : ''}`);
        console.log('  ' + chalk.green('Completed:'), `${jobCounts.completed} job${jobCounts.completed !== 1 ? 's' : ''}`);
        console.log('  ' + chalk.red('Failed:'), `${jobCounts.failed} job${jobCounts.failed !== 1 ? 's' : ''}`);
        console.log('  ' + chalk.gray('Dead:'), `${jobCounts.dead} job${jobCounts.dead !== 1 ? 's' : ''}`);

        console.log('\nSummary:');
        console.log('  Total Jobs:', totalJobs);
        
        const queueHealth = totalJobs === 0 
          ? 'Empty'
          : jobCounts.completed === 0
          ? 'No completions yet'
          : `${Math.round((jobCounts.completed / totalJobs) * 100)}% completed`;
        
        console.log('  Queue Health:', queueHealth);

        console.log('\nWorkers:');
        console.log('  Active Workers:', activeWorkers);

        if (activeWorkers > 0 && workers.length > 0) {
          console.log('\nActive Worker Details:');
          workers.forEach((worker, index) => {
            console.log(`  ${index + 1}. PID: ${worker.pid}`);
            console.log(`     Started: ${worker.started_at}`);
            console.log(`     Last Heartbeat: ${worker.last_heartbeat}`);
          });
        }

        console.log('\n' + chalk.gray('─'.repeat(50)));
        if (jobCounts.pending > 0 && activeWorkers === 0) {
          console.log('No active workers! Start workers with: ' + chalk.bold('queuectl worker start --count 1'));
        } else if (jobCounts.pending === 0 && activeWorkers > 0) {
          console.log('All jobs processed. Workers are idle.');
        } else if (jobCounts.pending > 0 && activeWorkers > 0) {
          console.log(`Processing ${jobCounts.processing} job(s) with ${activeWorkers} worker(s).`);
        } else {
          console.log('Queue is healthy.');
        }

        console.log('');

      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        } else {
          console.error(chalk.red('Error:'), 'Failed to fetch status');
        }
        process.exit(1);
      }
    });
};
