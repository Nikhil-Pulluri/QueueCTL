import { $ } from 'bun';
import type { JobResult } from '../types';

export const executeCommand = async (command: string): Promise<JobResult> => {
  const startTime = Date.now();

  try {
    const result = await $`${command}`.nothrow().quiet();
    const duration = Date.now() - startTime;

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout?.toString(),
      stderr: result.stderr?.toString(),
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      exitCode: 1,
      error: error instanceof Error ? error.message : 'Command execution failed',
      duration
    };
  }
};
