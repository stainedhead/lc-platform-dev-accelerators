/**
 * Mock DataStoreService Implementation
 *
 * In-memory SQL implementation for testing.
 * Provides basic SQL parsing and query execution for common operations.
 */

import type { DataStoreService } from '../../core/services/DataStoreService';
import type { Connection, ExecuteResult, Migration, Transaction } from '../../core/types/datastore';
import { ValidationError } from '../../core/types/common';

interface TableSchema {
  columns: string[];
}

export class MockDataStoreService implements DataStoreService {
  private connected = false;
  private data = new Map<string, Record<string, unknown>[]>();
  private schemas = new Map<string, TableSchema>();
  private appliedMigrations: string[] = [];

  async connect(_connectionString?: string): Promise<void> {
    this.connected = true;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureConnected();

    const tableName = this.extractTableName(sql);
    const table = this.data.get(tableName) ?? [];

    // Parse SELECT columns
    const selectMatch = sql.match(/select\s+(.*?)\s+from/i);
    const columns = selectMatch?.[1]?.trim();
    const isSelectAll = columns === '*';
    const selectedColumns = isSelectAll ? [] : (columns?.split(',').map((c) => c.trim()) ?? []);

    // Apply WHERE clause filtering
    const whereMatch = sql.match(/where\s+(.+?)(?:order|limit|$)/i);
    let filtered = table;

    if (whereMatch?.[1] && params) {
      const whereClause = whereMatch[1].trim();
      filtered = table.filter((row) => this.evaluateWhere(row, whereClause, params));
    }

    // Apply ORDER BY
    const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
    if (orderMatch?.[1]) {
      const orderColumn = orderMatch[1];
      const orderDir = orderMatch[2]?.toLowerCase() === 'desc' ? -1 : 1;
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[orderColumn];
        const bVal = b[orderColumn];
        if (aVal === undefined && bVal === undefined) {
          return 0;
        }
        if (aVal === undefined) {
          return 1;
        }
        if (bVal === undefined) {
          return -1;
        }
        if (aVal === null && bVal === null) {
          return 0;
        }
        if (aVal === null) {
          return 1;
        }
        if (bVal === null) {
          return -1;
        }
        if (aVal < bVal) {
          return -1 * orderDir;
        }
        if (aVal > bVal) {
          return 1 * orderDir;
        }
        return 0;
      });
    }

    // Project columns
    if (!isSelectAll && selectedColumns.length > 0) {
      return filtered.map((row) => {
        const result: Record<string, unknown> = {};
        selectedColumns.forEach((col) => {
          result[col] = row[col];
        });
        return result as T;
      });
    }

    return filtered as T[];
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    this.ensureConnected();

    const sqlLower = sql.toLowerCase().trim();

    // CREATE TABLE
    if (sqlLower.startsWith('create table')) {
      const tableName = this.extractTableName(sql);
      this.data.set(tableName, []);

      // Extract column definitions
      const columnsMatch = sql.match(/\((.*)\)/s);
      if (columnsMatch?.[1]) {
        const columnDefs = columnsMatch[1]
          .split(',')
          .map((def) => {
            const colMatch = def.trim().match(/^(\w+)/);
            return colMatch?.[1] ?? '';
          })
          .filter(Boolean);
        this.schemas.set(tableName, { columns: columnDefs });
      }

      return { rowsAffected: 0 };
    }

    // INSERT
    if (sqlLower.startsWith('insert')) {
      const tableName = this.extractTableName(sql);
      if (!this.data.has(tableName)) {
        this.data.set(tableName, []);
      }

      const table = this.data.get(tableName)!;
      const schema = this.schemas.get(tableName);

      // Parse column names from INSERT statement
      const columnsMatch = sql.match(/\((.*?)\)\s*values/i);
      const columns = columnsMatch?.[1]
        ? columnsMatch[1].split(',').map((c) => c.trim())
        : (schema?.columns ?? []);

      // Create row object
      const row: Record<string, unknown> = { id: table.length + 1 };
      if (params) {
        columns.forEach((col, index) => {
          row[col] = params[index];
        });
      }

      table.push(row);
      return { rowsAffected: 1, insertId: table.length };
    }

    // UPDATE
    if (sqlLower.startsWith('update')) {
      const tableName = this.extractTableName(sql);
      const table = this.data.get(tableName) ?? [];

      // Parse SET clause
      const setMatch = sql.match(/set\s+(.*?)(?:where|$)/i);
      const whereMatch = sql.match(/where\s+(.+)$/i);

      let rowsAffected = 0;

      table.forEach((row) => {
        if (whereMatch?.[1] && params && setMatch?.[1]) {
          const whereClause = whereMatch[1].trim();
          // For UPDATE, params are [setValue1, setValue2, ..., whereValue1, whereValue2, ...]
          // We need to split them
          const setCount = (setMatch[1].match(/=/g) ?? []).length;
          const whereParams = params.slice(setCount);

          if (this.evaluateWhere(row, whereClause, whereParams)) {
            // Apply SET updates
            const setParams = params.slice(0, setCount);
            const setColumns = setMatch[1]
              .split(',')
              .map((s) => s.trim().split('=')[0]?.trim() ?? '')
              .filter(Boolean);

            setColumns.forEach((col, index) => {
              row[col] = setParams[index];
            });
            rowsAffected++;
          }
        }
      });

      return { rowsAffected };
    }

    // DELETE
    if (sqlLower.startsWith('delete')) {
      const tableName = this.extractTableName(sql);
      const table = this.data.get(tableName);

      if (!table) {
        return { rowsAffected: 0 };
      }

      const whereMatch = sql.match(/where\s+(.+)$/i);
      let rowsAffected = 0;

      if (whereMatch?.[1] && params) {
        const whereClause = whereMatch[1].trim();
        const filtered = table.filter((row) => {
          const shouldDelete = this.evaluateWhere(row, whereClause, params);
          if (shouldDelete) {
            rowsAffected++;
          }
          return !shouldDelete;
        });
        this.data.set(tableName, filtered);
      }

      return { rowsAffected };
    }

    return { rowsAffected: 0 };
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    this.ensureConnected();

    // Create a snapshot for rollback
    const snapshot = new Map(
      Array.from(this.data.entries()).map(([key, value]) => [key, [...value]])
    );

    const tx: Transaction = {
      query: this.query.bind(this),
      execute: this.execute.bind(this),
      commit: async () => {
        // Transaction is already committed (we're modifying in place)
      },
      rollback: async () => {
        // Restore snapshot
        this.data = snapshot;
        throw new Error('Transaction rolled back');
      },
    };

    try {
      const result = await fn(tx);
      return result;
    } catch (error) {
      // Restore snapshot on error
      this.data = snapshot;
      throw error;
    }
  }

  async migrate(migrations: Migration[]): Promise<void> {
    this.ensureConnected();

    for (const migration of migrations) {
      if (!this.appliedMigrations.includes(migration.version)) {
        await this.execute(migration.up);
        this.appliedMigrations.push(migration.version);
      }
    }
  }

  getConnection(): Connection {
    this.ensureConnected();

    return {
      query: this.query.bind(this),
      execute: this.execute.bind(this),
      close: async () => {},
    };
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new ValidationError('Not connected to database');
    }
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/(?:from|into|update|table)\s+(\w+)/i);
    return match?.[1] ?? 'default';
  }

  private evaluateWhere(
    row: Record<string, unknown>,
    whereClause: string,
    params: unknown[]
  ): boolean {
    // Simple WHERE evaluation - supports column = $N style placeholders
    let paramIndex = 0;

    // Handle multiple conditions with AND
    const conditions = whereClause.split(/\s+and\s+/i);

    return conditions.every((condition) => {
      const trimmed = condition.trim();

      // Match: column = $1 or column > $1, etc.
      const match = trimmed.match(/(\w+)\s*([=<>!]+)\s*\$\d+/);
      if (match?.[1] && match[2]) {
        const column = match[1];
        const operator = match[2];
        const value = params[paramIndex++];
        const rowValue = row[column];

        switch (operator) {
          case '=':
            return rowValue === value;
          case '>':
            return (rowValue as number) > (value as number);
          case '<':
            return (rowValue as number) < (value as number);
          case '>=':
            return (rowValue as number) >= (value as number);
          case '<=':
            return (rowValue as number) <= (value as number);
          case '!=':
          case '<>':
            return rowValue !== value;
          default:
            return false;
        }
      }

      return true; // If we can't parse the condition, assume it matches
    });
  }
}
