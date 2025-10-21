/**
 * DataStoreService Interface
 *
 * Cloud-agnostic interface for relational database operations (SQL).
 * No AWS/Azure-specific types - pure abstraction.
 *
 * FR-026 to FR-030
 * Constitution Principle I: Provider Independence
 */

import type { Connection, ExecuteResult, Migration, Transaction } from '../types/datastore';

export interface DataStoreService {
  /**
   * Connect to the database
   * FR-026: Connect to relational database
   */
  connect(connectionString?: string): Promise<void>;

  /**
   * Execute a SELECT query
   * FR-027: Execute queries with prepared statements
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute an INSERT/UPDATE/DELETE statement
   * FR-027: Execute statements with prepared statements
   */
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;

  /**
   * Execute operations within a transaction
   * FR-028: Support transactions with isolation levels
   */
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  /**
   * Apply database migrations
   * FR-030: Apply schema migrations
   */
  migrate(migrations: Migration[]): Promise<void>;

  /**
   * Get a connection from the pool
   * FR-029: Connection pooling for concurrent queries
   */
  getConnection(): Connection;
}
