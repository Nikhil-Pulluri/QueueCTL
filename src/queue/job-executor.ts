import type { JobResult } from '../types';

export const executeCommand = async (command: string): Promise<JobResult> => {
  const startTime = Date.now();

  try {
    const proc = Bun.spawn(['cmd', '/c', command], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const duration = Date.now() - startTime;
    if (stdout) console.log(`  Stdout: ${stdout.trim()}`);
    if (stderr) console.log(`  Stderr: ${stderr.trim()}`);

    return {
      success: exitCode === 0,
      exitCode: exitCode,
      stdout: stdout,
      stderr: stderr,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`  Exception: ${error}`);
    return {
      success: false,
      exitCode: 1,
      error: error instanceof Error ? error.message : 'Command execution failed',
      duration
    };
  }
};
