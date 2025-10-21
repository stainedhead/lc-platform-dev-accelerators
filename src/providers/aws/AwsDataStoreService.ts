/**
 * AWS DataStoreService Implementation
 *
 * PostgreSQL-based relational database service using node-postgres (pg).
 * Implements FR-026 to FR-030.
 *
 * Note: This uses the standard PostgreSQL client library (pg), not AWS SDK,
 * as RDS PostgreSQL is accessed via standard PostgreSQL protocol.
 */

import { Pool, type PoolClient, type QueryResult } from 'pg';
import type { DataStoreService } from '../../core/services/DataStoreService';
import type { Connection, ExecuteResult, Migration, Transaction } from '../../core/types/datastore';
import { ServiceUnavailableError, ValidationError } from '../../core/types/common';
import { withRetry } from '../../utils/retry';
import { getErrorMessage } from '../../utils/error';

export interface AwsDataStoreConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  maxConnections?: number;
  connectionTimeout?: number;
}

/**
 * AWS DataStoreService using PostgreSQL (via RDS or compatible)
 */
export class AwsDataStoreService implements DataStoreService {
  private pool: Pool | null = null;
  private config: AwsDataStoreConfig;

  constructor(config?: AwsDataStoreConfig) {
    this.config = config ?? {};
  }

  async connect(connectionString?: string): Promise<void> {
    try {
      if (connectionString !== undefined && connectionString !== null && connectionString !== '') {
        // Use connection string
        this.pool = new Pool({
          connectionString,
          max: this.config.maxConnections ?? 100,
          connectionTimeoutMillis: this.config.connectionTimeout ?? 30000,
        });
      } else {
        // Use config object
        this.pool = new Pool({
          host: this.config.host ?? process.env.DB_HOST ?? 'localhost',
          port: this.config.port ?? parseInt(process.env.DB_PORT ?? '5432'),
          database: this.config.database ?? process.env.DB_NAME ?? 'postgres',
          user: this.config.user ?? process.env.DB_USER ?? 'postgres',
          password: this.config.password ?? process.env.DB_PASSWORD,
          max: this.config.maxConnections ?? 100,
          connectionTimeoutMillis: this.config.connectionTimeout ?? 30000,
        });
      }

      // Test connection
      const client = await this.pool.connect();
      client.release();
    } catch (error: unknown) {
      throw new ServiceUnavailableError(`Failed to connect to database: ${getErrorMessage(error)}`);
    }
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return withRetry(async () => {
      this.ensureConnected();

      try {
        const result: QueryResult = await this.pool!.query(sql, params);
        return result.rows as T[];
      } catch (error: unknown) {
        throw new ServiceUnavailableError(`Query failed: ${getErrorMessage(error)}`);
      }
    });
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    return withRetry(async () => {
      this.ensureConnected();

      try {
        const result: QueryResult = await this.pool!.query(sql, params);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const insertId: string | undefined =
          result.rows.length > 0 &&
          result.rows[0] !== null &&
          result.rows[0] !== undefined &&
          typeof result.rows[0] === 'object' &&
          'id' in result.rows[0]
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              String(result.rows[0].id)
            : undefined;

        return {
          rowsAffected: result.rowCount ?? 0,
          ...(insertId !== undefined && { insertId }),
        };
      } catch (error: unknown) {
        throw new ServiceUnavailableError(`Execute failed: ${getErrorMessage(error)}`);
      }
    });
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    this.ensureConnected();

    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');

      const tx: Transaction = {
        query: async <R>(sql: string, params?: unknown[]): Promise<R[]> => {
          const result = await client.query(sql, params);
          return result.rows as R[];
        },

        execute: async (sql: string, params?: unknown[]): Promise<ExecuteResult> => {
          const result = await client.query(sql, params);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const insertId: string | undefined =
            result.rows.length > 0 &&
            result.rows[0] !== null &&
            result.rows[0] !== undefined &&
            typeof result.rows[0] === 'object' &&
            'id' in result.rows[0]
              ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                String(result.rows[0].id)
              : undefined;
          return {
            rowsAffected: result.rowCount ?? 0,
            ...(insertId !== undefined && { insertId }),
          };
        },

        commit: async (): Promise<void> => {
          await client.query('COMMIT');
        },

        rollback: async (): Promise<void> => {
          await client.query('ROLLBACK');
        },
      };

      const result = await fn(tx);
      await client.query('COMMIT');

      return result;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate(migrations: Migration[]): Promise<void> {
    this.ensureConnected();

    // Create migrations table if it doesn't exist
    await this.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(255) PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = await this.query<{ version: string }>(
      'SELECT version FROM migrations ORDER BY version'
    );
    const appliedVersions = new Set(applied.map((m) => m.version));

    // Apply pending migrations in order
    for (const migration of migrations.sort((a, b) => a.version.localeCompare(b.version))) {
      if (appliedVersions.has(migration.version)) {
        continue; // Already applied
      }

      try {
        await this.transaction(async (tx) => {
          // Execute migration
          await tx.execute(migration.up);

          // Record migration
          await tx.execute(
            'INSERT INTO migrations (version, description, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
            [migration.version, migration.description]
          );
        });

        // eslint-disable-next-line no-console
        console.log(`Applied migration ${migration.version}: ${migration.description}`);
      } catch (error: unknown) {
        throw new ValidationError(
          `Migration ${migration.version} failed: ${getErrorMessage(error)}`
        );
      }
    }
  }

  getConnection(): Connection {
    this.ensureConnected();

    let client: PoolClient | null = null;

    const connection: Connection = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (client === null || client === undefined) {
          client = await this.pool!.connect();
        }
        const result = await client.query(sql, params);
        return result.rows as T[];
      },

      execute: async (sql: string, params?: unknown[]): Promise<ExecuteResult> => {
        if (client === null || client === undefined) {
          client = await this.pool!.connect();
        }
        const result = await client.query(sql, params);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const insertId: string | undefined =
          result.rows.length > 0 &&
          result.rows[0] !== null &&
          result.rows[0] !== undefined &&
          typeof result.rows[0] === 'object' &&
          'id' in result.rows[0]
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              String(result.rows[0].id)
            : undefined;
        return {
          rowsAffected: result.rowCount ?? 0,
          ...(insertId !== undefined && { insertId }),
        };
      },

      close: (): Promise<void> => {
        if (client !== null && client !== undefined) {
          client.release();
          client = null;
        }
        return Promise.resolve();
      },
    };

    return connection;
  }

  private ensureConnected(): void {
    if (this.pool === null || this.pool === undefined) {
      throw new ServiceUnavailableError('Database not connected. Call connect() first.');
    }
  }
}
