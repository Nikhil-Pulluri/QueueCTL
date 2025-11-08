import type { Command } from 'commander';
import chalk from 'chalk';
import db from '../db/database';
import { getAllJobs } from '../db/jobs';
import type { JobState } from '../types';

export const listCommand = (program: Command): void => {
  program
    .command('list')
    .description('List jobs by state')
    .option('--state <state>', 'Filter by state (pending|processing|completed|failed|dead|all)', 'all')
    .option('--limit <number>', 'Maximum number of jobs to display', '10')
    .option('--offset <number>', 'Number of jobs to skip', '0')
    .action((options) => {
      try {
        const state = options.state as JobState | 'all';
        const limit = parseInt(options.limit);
        const offset = parseInt(options.offset);

        const validStates = ['pending', 'processing', 'completed', 'failed', 'dead', 'all'];
        if (!validStates.includes(state)) {
          console.error(chalk.red('Error:'), `Invalid state. Must be one of: ${validStates.join(', ')}`);
          process.exit(1);
        }

        if (isNaN(limit) || limit < 1) {
          console.error(chalk.red('Error:'), 'Limit must be a positive number');
          process.exit(1);
        }

        if (isNaN(offset) || offset < 0) {
          console.error(chalk.red('Error:'), 'Offset must be a non-negative number');
          process.exit(1);
        }

        const queryState = state === 'all' ? undefined : state;
        const jobs = getAllJobs(db, queryState, limit, offset);

        console.log('\n' + chalk.bold('Job List'));
        console.log(chalk.gray('─'.repeat(120)));

        if (jobs.length === 0) {
          console.log('No jobs found');
          console.log(chalk.gray('─'.repeat(120)) + '\n');
          return;
        }

        const getStateColor = (jobState: string) => {
          switch (jobState) {
            case 'pending': return chalk.yellow(jobState);
            case 'processing': return chalk.blue(jobState);
            case 'completed': return chalk.green(jobState);
            case 'failed': return chalk.red(jobState);
            case 'dead': return chalk.gray(jobState);
            default: return jobState;
          }
        };

        console.log(
          chalk.bold('ID').padEnd(37) +
          chalk.bold('Command').padEnd(40) +
          chalk.bold('State').padEnd(12) +
          chalk.bold('Attempts') +
          chalk.bold('Created At') +
          chalk.bold('Duration').padEnd(10) +
          chalk.bold('Output/Error')
        );
        console.log(chalk.gray('─'.repeat(120)));

        jobs.forEach((job) => {
          const id = (job.id as string).substring(0, 36);
          const command = (job.command as string).substring(0, 39);
          const attempts = `${job.attempts}/${job.max_retries}`;
          const outputOrError = (job.output || job.error || '-').substring(0, 40);

          console.log(
            chalk.cyan(id).padEnd(37) +
            command.padEnd(40) +
            getStateColor(job.state as string).padEnd(12) +
            attempts.padEnd(10) +
            chalk.gray(outputOrError) +
            chalk.gray(new Date(job.created_at as string).toLocaleString())
          );
        });

        console.log(chalk.gray('─'.repeat(120)));
        
        const stateFilter = state === 'all' ? 'all states' : state;
        console.log(`Showing ${jobs.length} job(s) (${stateFilter}) | Offset: ${offset}`);
        console.log(`Use --limit <number> and --offset <number> for pagination\n`);

      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        } else {
          console.error(chalk.red('Error:'), 'Failed to list jobs');
        }
        process.exit(1);
      }
    });
};
