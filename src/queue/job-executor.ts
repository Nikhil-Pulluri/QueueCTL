import type { JobResult } from '../types';
import { createLogger } from '../logger';

const logger = createLogger('JobExecutor');

export const executeCommand = async (command: string): Promise<JobResult> => {
  const startTime = Date.now();

  try {
    logger.info(`Executing command: ${command}`);
    
    const proc = Bun.spawn(['cmd', '/c', command], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const duration = Date.now() - startTime;

    if (exitCode === 0) {
      logger.info(`Command completed successfully (${duration}ms) - Exit code: ${exitCode}`);
    } else {
      logger.error(`Command failed (${duration}ms) - Exit code: ${exitCode}${stderr ? ` - ${stderr.substring(0, 100)}` : ''}`);
    }

    return {
      success: exitCode === 0,
      exitCode: exitCode,
      stdout: stdout,
      stderr: stderr,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Command execution failed';
    
    logger.error(`Exception during command execution (${duration}ms): ${errorMsg}`);

    return {
      success: false,
      exitCode: 1,
      error: errorMsg,
      duration
    };
  }
};
