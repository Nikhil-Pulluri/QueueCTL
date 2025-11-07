import type { Command } from 'commander';
import chalk from 'chalk';
import type { JobInput } from '../types';
import db from '../db/database';
import { createJob } from '../db/jobs';

export const enqueueCommand = (program: Command): void => {
  program
    .command('enqueue')
    .description('Add a new job to the queue')
    .argument('<job>', 'Job JSON string (e.g., \'{"command":"echo hello"}\' or \'{"id":"job1","command":"sleep 2"}\')')
    .action((jobString: string) => {
      try {
        const jobInput: JobInput = JSON.parse(jobString);

        if (!jobInput.command) {
          throw new Error('Job must have a "command" field');
        }

        if (jobInput.command.trim() === '') {
          throw new Error('Command cannot be empty');
        }

        const createdJob = createJob(db, jobInput.command, jobInput.id, jobInput.max_retries);

        console.log('Job enqueued successfully');
        console.log(chalk.gray('  ID:'), createdJob.id);
        console.log(chalk.gray('  Command:'), createdJob.command);
        console.log(chalk.gray('  Max Retries:'), createdJob.max_retries);
        console.log(chalk.gray('  State:'), chalk.cyan(createdJob.state));
        console.log(chalk.gray('  Created At:'), createdJob.created_at);

      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error(chalk.red('✗ Invalid JSON:'), error.message);
          console.error(chalk.gray('  Example: \'{"command":"echo hello"}\' or \'{"id":"job1","command":"sleep 2"}\''));
        } else if (error instanceof Error) {
          console.error(chalk.red('✗ Error:'), error.message);
        }
        process.exit(1);
      }
    });
};
