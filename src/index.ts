#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { enqueueCommand } from './commands/enqueue';
import { workerCommand } from './commands/worker';
import { statusCommand } from './commands/status';
import { listCommand } from './commands/list';
import { dlqCommand } from './commands/dlq';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('queuectl')
  .description('CLI-based background job queue system powered by Bun')
  .version('1.0.0')
  .option('--verbose', 'Enable verbose logging');

enqueueCommand(program);
workerCommand(program);
statusCommand(program);
listCommand(program);
dlqCommand(program);
configCommand(program);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof Error) {
    if (!error.message.includes('commander.help') && !error.message.includes('commander.version')) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  }
}
