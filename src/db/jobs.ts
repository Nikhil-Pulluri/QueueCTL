import type { Database } from 'bun:sqlite';
import type { Job, ISODateString } from '../types';

export const getCurrentTimestamp = (): ISODateString => {
  return new Date().toISOString();
};

export const generateJobId = (): string => {
  return crypto.randomUUID();
};

export const getConfigValue = (db: Database, key: string, defaultValue: string): string => {
  try {
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key) as { value: string } | null;
    return result?.value || defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

export const createJob = (
  db: Database,
  command: string,
  jobId?: string,
  maxRetries?: number
): Job => {
  try {
    const id = jobId || generateJobId();

    const configMaxRetries = parseInt(getConfigValue(db, 'max-retries', '3'));
    const finalMaxRetries = maxRetries || configMaxRetries;

    const now = getCurrentTimestamp();

    const insertStmt = db.prepare(`
      INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      command,
      'pending',
      0,
      finalMaxRetries,
      now,
      now
    );

    const getStmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const job = getStmt.get(id) as Job | null;

    if (!job) {
      throw new Error('Failed to retrieve created job');
    }

    return job;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }
    throw new Error('Failed to create job: Unknown error');
  }
};

export const getJobById = (db: Database, jobId: string): Job | null => {
  try {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const job = stmt.get(jobId) as Job | null;
    return job;
  } catch (error) {
    throw new Error(`Failed to get job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getAllJobs = (
  db: Database,
  state?: string,
  limit: number = 10,
  offset: number = 0
): Job[] => {
  try {
    let query = 'SELECT * FROM jobs';
    const params: any[] = [];

    if (state && state !== 'all') {
      query += ' WHERE state = ?';
      params.push(state);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const jobs = stmt.all(...params) as Job[];
    return jobs;
  } catch (error) {
    throw new Error(`Failed to get jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getJobCountByState = (db: Database, state: string): number => {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE state = ?');
    const result = stmt.get(state) as { count: number } | null;
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const getAllJobCounts = (
  db: Database
): { pending: number; processing: number; completed: number; failed: number; dead: number } => {
  try {
    const pendingStmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE state = "pending"');
    const processingStmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE state = "processing"');
    const completedStmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE state = "completed"');
    const failedStmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE state = "failed"');
    const deadStmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE state = "dead"');

    return {
      pending: (pendingStmt.get() as { count: number }).count || 0,
      processing: (processingStmt.get() as { count: number }).count || 0,
      completed: (completedStmt.get() as { count: number }).count || 0,
      failed: (failedStmt.get() as { count: number }).count || 0,
      dead: (deadStmt.get() as { count: number }).count || 0
    };
  } catch (error) {
    return { pending: 0, processing: 0, completed: 0, failed: 0, dead: 0 };
  }
};

export const updateJobState = (
  db: Database,
  jobId: string,
  state: string,
  additionalUpdates?: Record<string, any>
): Job | null => {
  try {
    const now = getCurrentTimestamp();
    let query = 'UPDATE jobs SET state = ?, updated_at = ?';
    const params: any[] = [state, now];

    if (additionalUpdates) {
      Object.entries(additionalUpdates).forEach(([key, value]) => {
        query += `, ${key} = ?`;
        params.push(value);
      });
    }

    query += ' WHERE id = ?';
    params.push(jobId);

    const stmt = db.prepare(query);
    stmt.run(...params);

    return getJobById(db, jobId);
  } catch (error) {
    throw new Error(`Failed to update job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getNextPendingJob = (db: Database): Job | null => {
  try {
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE jobs
      SET state = 'processing', updated_at = ?
      WHERE id = (
        SELECT id FROM jobs
        WHERE state = 'pending' OR (state = 'failed' AND retry_at IS NOT NULL AND retry_at <= ?)
        ORDER BY created_at ASC
        LIMIT 1
      )
      RETURNING *
    `);

    const job = stmt.get(now, now) as Job | null;
    return job;
  } catch (error) {
    console.error('Failed to get next job:', error);
    return null;
  }
};

export const getActiveWorkerCount = (db: Database): number => {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM workers');
    const result = stmt.get() as { count: number } | null;
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const getActiveWorkers = (db: Database) => {
  try {
    const stmt = db.prepare('SELECT pid, started_at, last_heartbeat FROM workers ORDER BY started_at DESC');
    const workers = stmt.all() as Array<{ pid: number; started_at: string; last_heartbeat: string }>;
    return workers;
  } catch (error) {
    return [];
  }
};

export const setConfigValue = (db: Database, key: string, value: string): void => {
  try {
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO config (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, value, now);
  } catch (error) {
    throw new Error(`Failed to set config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getDLQJobs = (db: Database, limit: number = 10, offset: number = 0) => {
  try {
    const stmt = db.prepare(`
      SELECT id, command, attempts, created_at, failed_at, error 
      FROM dead_letter_queue 
      ORDER BY failed_at DESC 
      LIMIT ? OFFSET ?
    `);
    const jobs = stmt.all(limit, offset) as any[];
    return jobs;
  } catch (error) {
    throw new Error(`Failed to get DLQ jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


export const getDLQCount = (db: Database): number => {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM dead_letter_queue');
    const result = stmt.get() as { count: number } | null;
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const retryDLQJob = (db: Database, jobId: string): boolean => {
  try {
    const getDLQStmt = db.prepare('SELECT * FROM dead_letter_queue WHERE id = ?');
    const dlqJob = getDLQStmt.get(jobId) as any;

    if (!dlqJob) {
      throw new Error('Job not found in DLQ');
    }

    const now = getCurrentTimestamp();

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      jobId,
      dlqJob.command,
      'pending',
      0,
      3,
      dlqJob.created_at,
      now
    );

    const deleteStmt = db.prepare('DELETE FROM dead_letter_queue WHERE id = ?');
    deleteStmt.run(jobId);

    return true;
  } catch (error) {
    throw new Error(`Failed to retry job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


