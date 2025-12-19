/**
 * Mock DataClient Implementation
 *
 * In-memory data client for testing without cloud resources.
 * Simulates SQL-like operations with in-memory data.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { DataClient } from '../../../core/clients/DataClient';
import type { Transaction, ExecuteResult } from '../../../core/types/datastore';
import { ValidationError } from '../../../core/types/common';

interface TableData {
  rows: Record<string, unknown>[];
  autoIncrementId: number;
}

export class MockDataClient implements DataClient {
  private tables = new Map<string, TableData>();
  private inTransaction = false;
  private transactionData: Map<string, TableData> | null = null;

  /**
   * Reset all mock data
   */
  reset(): void {
    this.tables.clear();
    this.inTransaction = false;
    this.transactionData = null;
  }

  /**
   * Pre-populate a table for testing
   */
  setTableData(tableName: string, rows: Record<string, unknown>[]): void {
    this.tables.set(tableName, { rows: [...rows], autoIncrementId: rows.length + 1 });
  }

  /**
   * Get table data (for test assertions)
   */
  getTableData(tableName: string): Record<string, unknown>[] {
    const table = this.tables.get(tableName);
    return table ? [...table.rows] : [];
  }

  private getActiveData(): Map<string, TableData> {
    return this.transactionData ?? this.tables;
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!sql) {
      throw new ValidationError('SQL query is required');
    }

    // Simple SQL parser for mock purposes
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (selectMatch) {
      const tableName = selectMatch[2]!;
      const whereClause = selectMatch[3];

      const data = this.getActiveData();
      const table = data.get(tableName);
      if (!table) {
        return [];
      }

      let results = [...table.rows];

      // Apply simple WHERE clause if present
      if (whereClause && params && params.length > 0) {
        results = results.filter((row) => this.matchesWhereClause(row, whereClause, params));
      }

      return results as T[];
    }

    return [];
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    if (!sql) {
      throw new ValidationError('SQL statement is required');
    }

    const data = this.getActiveData();

    // INSERT
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1]!;
      const columns = insertMatch[2]!.split(',').map((c) => c.trim());

      let table = data.get(tableName);
      if (!table) {
        table = { rows: [], autoIncrementId: 1 };
        data.set(tableName, table);
      }

      const row: Record<string, unknown> = { id: table.autoIncrementId++ };
      columns.forEach((col, idx) => {
        row[col] = params?.[idx];
      });

      table.rows.push(row);
      return { rowsAffected: 1, insertId: row['id'] as number };
    }

    // UPDATE
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1]!;
      const setClause = updateMatch[2]!;
      const whereClause = updateMatch[3];

      const table = data.get(tableName);
      if (!table) {
        return { rowsAffected: 0 };
      }

      let affectedRows = 0;
      const setColumns = setClause.split(',').map((s) => s.split('=')[0]?.trim());

      table.rows.forEach((row) => {
        if (
          !whereClause ||
          this.matchesWhereClause(row, whereClause, params?.slice(setColumns.length))
        ) {
          setColumns.forEach((col, idx) => {
            if (col && params?.[idx] !== undefined) {
              row[col] = params[idx];
            }
          });
          affectedRows++;
        }
      });

      return { rowsAffected: affectedRows };
    }

    // DELETE
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1]!;
      const whereClause = deleteMatch[2];

      const table = data.get(tableName);
      if (!table) {
        return { rowsAffected: 0 };
      }

      const initialLength = table.rows.length;
      if (whereClause) {
        table.rows = table.rows.filter((row) => !this.matchesWhereClause(row, whereClause, params));
      } else {
        table.rows = [];
      }

      return { rowsAffected: initialLength - table.rows.length };
    }

    return { rowsAffected: 0 };
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      throw new ValidationError('Nested transactions are not supported');
    }

    // Create a copy of the data for the transaction
    this.transactionData = new Map();
    for (const [key, value] of this.tables.entries()) {
      this.transactionData.set(key, {
        rows: value.rows.map((r) => ({ ...r })),
        autoIncrementId: value.autoIncrementId,
      });
    }
    this.inTransaction = true;

    const tx: Transaction = {
      query: <T>(sql: string, params?: unknown[]) => this.query<T>(sql, params),
      execute: (sql: string, params?: unknown[]) => this.execute(sql, params),
      commit: async () => {
        // Copy transaction data back to main tables
        if (this.transactionData) {
          this.tables = this.transactionData;
          this.transactionData = null;
        }
        this.inTransaction = false;
      },
      rollback: async () => {
        this.transactionData = null;
        this.inTransaction = false;
      },
    };

    try {
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  private matchesWhereClause(
    row: Record<string, unknown>,
    whereClause: string,
    params?: unknown[]
  ): boolean {
    // Very simple WHERE clause matching for mock purposes
    // Supports: column = ? or column = $1
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const condition of conditions) {
      const eqMatch = condition.match(/(\w+)\s*=\s*(\?|\$\d+)/);
      if (eqMatch) {
        const column = eqMatch[1]!;
        const paramValue = params?.[paramIndex++];
        if (row[column] !== paramValue) {
          return false;
        }
      }
    }

    return true;
  }
}
