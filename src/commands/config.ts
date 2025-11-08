import type { Command } from 'commander';
import chalk from 'chalk';
import type { ConfigKey } from '../types';
import db from '../db/database';
import { getConfigValue, setConfigValue } from '../db/jobs';

export const configCommand = (program: Command): void => {
  const configCmd = program
    .command('config')
    .description('Manage configuration');

  configCmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key (max-retries | backoff-base)')
    .argument('<value>', 'Configuration value')
    .action((key: string, value: string) => {
      try {
        const validKeys: ConfigKey[] = ['max-retries', 'backoff-base'];
        if (!validKeys.includes(key as ConfigKey)) {
          console.error(chalk.red('Error:'), `Invalid config key. Must be one of: ${validKeys.join(', ')}`);
          process.exit(1);
        }

        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
          console.error(chalk.red('Error:'), 'Value must be a positive number');
          process.exit(1);
        }

        setConfigValue(db, key, value);

        console.log('\n' + chalk.bold('Configuration Updated'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`  ${key}: ${chalk.green(value)}`);
        console.log(chalk.gray('─'.repeat(50)) + '\n');

      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        } else {
          console.error(chalk.red('Error:'), 'Failed to set config');
        }
        process.exit(1);
      }
    });

  configCmd
    .command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key (max-retries | backoff-base)')
    .action((key: string) => {
      try {
        const validKeys: ConfigKey[] = ['max-retries', 'backoff-base'];
        if (!validKeys.includes(key as ConfigKey)) {
          console.error(chalk.red('Error:'), `Invalid config key. Must be one of: ${validKeys.join(', ')}`);
          process.exit(1);
        }

        const value = getConfigValue(db, key, 'N/A');

        console.log('\n' + chalk.bold('Configuration'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`  ${key}: ${chalk.cyan(value)}`);
        console.log(chalk.gray('─'.repeat(50)) + '\n');

      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
        } else {
          console.error(chalk.red('Error:'), 'Failed to get config');
        }
        process.exit(1);
      }
    });
};
