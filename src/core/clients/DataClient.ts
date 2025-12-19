/**
 * DataClient Interface - Data Plane
 *
 * Runtime interface for relational database operations in hosted applications.
 * Provides query and transaction operations without database management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { Transaction, ExecuteResult } from '../types/datastore';

export interface DataClient {
  /**
   * Execute a SQL query and return results
   * @param sql - SQL query string
   * @param params - Query parameters for prepared statements
   * @returns Array of result rows
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   * @param sql - SQL statement
   * @param params - Query parameters for prepared statements
   * @returns Execute result with affected row count
   */
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;

  /**
   * Execute multiple operations in a transaction
   * @param fn - Transaction function receiving a transaction context
   * @returns Result of the transaction function
   */
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
