import type { Command } from 'commander';
import chalk from 'chalk';
import db from '../db/database';
import { getDLQJobs, getDLQCount, retryDLQJob } from '../db/jobs';

export const dlqCommand = (program: Command): void => {
  const dlqCmd = program
    .command('dlq')
    .description('Manage Dead Letter Queue');

  dlqCmd
    .command('list')
    .description('List all jobs in the Dead Letter Queue')
    .option('--limit <number>', 'Maximum number of jobs to display', '10')
    .option('--offset <number>', 'Number of jobs to skip', '0')
    .action((options) => {
      try {
        const limit = parseInt(options.limit);
        const offset = parseInt(options.offset);

        if (isNaN(limit) || limit < 1) {
          console.error(chalk.red('Error:'), 'Limit must be a positive number');
          process.exit(1);
        }

        if (isNaN(offset) || offset < 0) {
          console.error(chalk.red('Error:'), 'Offset must be a non-negative number');
          process.exit(1);
        }

        const jobs = getDLQJobs(db, limit, offset);
        const totalCount = getDLQCount(db);

        console.log('\n' + chalk.bold('Dead Letter Queue'));
        console.log(chalk.gray('─'.repeat(120)));

        if (jobs.length === 0) {
          console.log('No jobs in DLQ');
          console.log(chalk.gray('─'.repeat(120)) + '\n');
          return;
        }

        console.log(
          chalk.bold('ID').padEnd(37) +
          chalk.bold('Command').padEnd(40) +
          chalk.bold('Attempts') +
          chalk.bold('  Failed At')
        );
        console.log(chalk.gray('─'.repeat(120)));

        jobs.forEach((job) => {
          const id = (job.id as string).substring(0, 36);
          const command = (job.command as string).substring(0, 39);

          console.log(
            chalk.cyan(id).padEnd(37) +
            command.padEnd(40) +
            `${job.attempts}`.padEnd(10) +
            chalk.gray(new Date(job.failed_at as string).toLocaleString())
          );
        });

        console.log(chalk.gray('─'.repeat(120)));
        console.log(`Showing ${jobs.length} of ${totalCount} dead job(s) | Offset: ${offset}`);
        console.log(`Use: queuectl dlq retry <job-id>  to retry a job\n`);

      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        } else {
          console.error(chalk.red('Error:'), 'Failed to list DLQ jobs');
        }
        process.exit(1);
      }
    });

  dlqCmd
    .command('retry')
    .description('Retry a job from the Dead Letter Queue')
    .argument('<job-id>', 'Job ID to retry')
    .action((jobId: string) => {
      try {
        if (!jobId || jobId.trim() === '') {
          console.error(chalk.red('Error:'), 'Job ID cannot be empty');
          process.exit(1);
        }

        retryDLQJob(db, jobId);

        console.log('\n' + chalk.bold('Job Retried'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`  Job ID: ${chalk.cyan(jobId)}`);
        console.log('  Status: Moved back to pending');
        console.log(chalk.gray('─'.repeat(50)) + '\n');

      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        } else {
          console.error(chalk.red('Error:'), 'Failed to retry job');
        }
        process.exit(1);
      }
    });
};
