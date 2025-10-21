/**
 * DataStore Types
 *
 * Types for DataStoreService - relational database operations
 * Provider-agnostic abstractions for AWS RDS, Azure Database for PostgreSQL, etc.
 */

export enum IsolationLevel {
  READ_UNCOMMITTED = 'read_uncommitted',
  READ_COMMITTED = 'read_committed',
  REPEATABLE_READ = 'repeatable_read',
  SERIALIZABLE = 'serializable',
}

export interface ExecuteResult {
  rowsAffected: number;
  insertId?: string | number;
}

export interface Migration {
  version: string;
  description: string;
  up: string;
  down: string;
  appliedAt?: Date;
}

export interface Transaction {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface Connection {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  close(): Promise<void>;
}
