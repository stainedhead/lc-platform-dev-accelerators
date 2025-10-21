/**
 * Mock DataStoreService Implementation
 *
 * In-memory SQL implementation for testing.
 * Uses a simple in-memory store with basic SQL parsing simulation.
 */

import type { DataStoreService } from '../../core/services/DataStoreService';
import type { Connection, ExecuteResult, Migration, Transaction } from '../../core/types/datastore';
import { ValidationError } from '../../core/types/common';

export class MockDataStoreService implements DataStoreService {
  private connected = false;
  private data = new Map<string, unknown[]>();
  private appliedMigrations: string[] = [];

  async connect(_connectionString?: string): Promise<void> {
    this.connected = true;
  }

  async query<T>(sql: string, _params?: unknown[]): Promise<T[]> {
    this.ensureConnected();

    // Simple mock: return empty array (real implementation would parse SQL)
    const tableName = this.extractTableName(sql);
    return (this.data.get(tableName) as T[]) ?? [];
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    this.ensureConnected();

    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.startsWith('insert')) {
      const tableName = this.extractTableName(sql);
      if (!this.data.has(tableName)) {
        this.data.set(tableName, []);
      }

      const table = this.data.get(tableName)!;
      const row = params ? { id: table.length + 1, ...params } : { id: table.length + 1 };
      table.push(row);

      return { rowsAffected: 1, insertId: table.length };
    }

    if (sqlLower.startsWith('update') || sqlLower.startsWith('delete')) {
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    this.ensureConnected();

    const tx: Transaction = {
      query: this.query.bind(this),
      execute: this.execute.bind(this),
      commit: async () => {},
      rollback: async () => {
        throw new Error('Transaction rolled back');
      },
    };

    return fn(tx);
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
    const match = sql.match(/(?:from|into|update)\s+(\w+)/i);
    return match?.[1] ?? 'default';
  }
}
