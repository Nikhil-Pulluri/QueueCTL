export type JobState = 'pending' | 'processing' | 'completed' | 'failed' | 'dead';

export type ISODateString = string; 

export interface Job {
  id: string;
  command: string;
  state: JobState;
  attempts: number;
  max_retries: number;
  created_at: ISODateString;
  updated_at: ISODateString;
  retry_at?: ISODateString | null;      
  completed_at?: ISODateString | null;  
  error?: string | null;                 
}

export interface JobInput {
  id?: string;
  command: string;
  max_retries?: number; 
}

export interface JobCreate {
  id: string;
  command: string;
  state: 'pending';
  attempts: 0;
  max_retries: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface DLQEntry {
  id: string;
  command: string;
  attempts: number;
  created_at: ISODateString;  
  failed_at: ISODateString;   
  error?: string | null;   
}

export type ConfigKey = 'max-retries' | 'backoff-base';

export interface Config {
  key: ConfigKey;
  value: string;
  updated_at: ISODateString;
}

export interface ConfigValues {
  'max-retries': number;
  'backoff-base': number;
}


export interface WorkerInfo {
  pid: number;
  started_at: ISODateString;
  last_heartbeat: ISODateString;
}


export interface WorkerStartOptions {
  count: number;
}

export interface JobResult {
  success: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  duration?: number; 
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead: number;
  activeWorkers: number;
}

export interface ListOptions {
  state?: JobState | 'all';
  limit?: number;
  offset?: number;
}

export type JobRow = Job;
export type DLQRow = DLQEntry;
export type ConfigRow = Config;
export type WorkerRow = WorkerInfo;

export interface RetryInfo {
  shouldRetry: boolean;
  retryAt?: ISODateString;
  delaySeconds?: number;
}

export interface CommandOptions {
  timeout?: number; 
  cwd?: string;     
  env?: Record<string, string>; 
}
