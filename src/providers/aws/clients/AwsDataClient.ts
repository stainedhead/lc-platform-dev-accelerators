/**
 * AWS Data Client Implementation
 * Uses Amazon RDS Data API for SQL database operations
 *
 * Constitution Principle I: Provider Independence
 */

import {
  RDSDataClient,
  ExecuteStatementCommand,
  BeginTransactionCommand,
  CommitTransactionCommand,
  RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data';
import type { DataClient } from '../../../core/clients/DataClient';
import type { Transaction, ExecuteResult } from '../../../core/types/datastore';
import type { ProviderConfig } from '../../../core/types/common';
import { ServiceUnavailableError, ValidationError } from '../../../core/types/common';

export class AwsDataClient implements DataClient {
  private rdsClient: RDSDataClient;
  private resourceArn: string;
  private secretArn: string;
  private database: string;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
    } = {};

    if (config.region) {
      clientConfig.region = config.region;
    }

    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.rdsClient = new RDSDataClient(clientConfig);

    // These would typically come from config.options
    this.resourceArn = (config.options?.resourceArn as string) ?? '';
    this.secretArn = (config.options?.secretArn as string) ?? '';
    this.database = (config.options?.database as string) ?? '';
  }

  private formatParameters(params?: unknown[]): Array<{ name: string; value: unknown }> {
    if (!params || params.length === 0) {
      return [];
    }

    return params.map((param, index) => ({
      name: `p${index + 1}`,
      value: this.formatValue(param),
    }));
  }

  private formatValue(value: unknown): {
    stringValue?: string;
    longValue?: number;
    booleanValue?: boolean;
    isNull?: boolean;
  } {
    if (value === null || value === undefined) {
      return { isNull: true };
    }
    if (typeof value === 'string') {
      return { stringValue: value };
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return { longValue: value };
      }
      return { stringValue: value.toString() }; // RDS Data API uses string for decimals
    }
    if (typeof value === 'boolean') {
      return { booleanValue: value };
    }
    return { stringValue: JSON.stringify(value) };
  }

  private replaceParameterPlaceholders(sql: string, params?: unknown[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let result = sql;
    params.forEach((_, index) => {
      result = result.replace('?', `:p${index + 1}`);
    });
    return result;
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!sql) {
      throw new ValidationError('SQL query is required');
    }

    try {
      const formattedSql = this.replaceParameterPlaceholders(sql, params);

      const command = new ExecuteStatementCommand({
        resourceArn: this.resourceArn,
        secretArn: this.secretArn,
        database: this.database,
        sql: formattedSql,
        parameters: this.formatParameters(params) as Array<{
          name: string;
          value: { stringValue?: string };
        }>,
        includeResultMetadata: true,
      });

      const response = await this.rdsClient.send(command);

      // Convert RDS Data API response to array of objects
      const columns = response.columnMetadata?.map((col) => col.name ?? '') ?? [];
      const rows: T[] = [];

      for (const record of response.records ?? []) {
        const row: Record<string, unknown> = {};
        record.forEach((field, index) => {
          const colName = columns[index] ?? `col${index}`;
          if (field.isNull) {
            row[colName] = null;
          } else if (field.stringValue !== undefined) {
            row[colName] = field.stringValue;
          } else if (field.longValue !== undefined) {
            row[colName] = field.longValue;
          } else if (field.doubleValue !== undefined) {
            row[colName] = field.doubleValue;
          } else if (field.booleanValue !== undefined) {
            row[colName] = field.booleanValue;
          } else if (field.blobValue !== undefined) {
            row[colName] = field.blobValue;
          }
        });
        rows.push(row as T);
      }

      return rows;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to execute query: ${(error as Error).message}`);
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    if (!sql) {
      throw new ValidationError('SQL statement is required');
    }

    try {
      const formattedSql = this.replaceParameterPlaceholders(sql, params);

      const command = new ExecuteStatementCommand({
        resourceArn: this.resourceArn,
        secretArn: this.secretArn,
        database: this.database,
        sql: formattedSql,
        parameters: this.formatParameters(params) as Array<{
          name: string;
          value: { stringValue?: string };
        }>,
      });

      const response = await this.rdsClient.send(command);

      const result: ExecuteResult = {
        rowsAffected: response.numberOfRecordsUpdated ?? 0,
      };
      const generatedId = response.generatedFields?.[0]?.longValue;
      if (generatedId !== undefined) {
        result.insertId = generatedId;
      }
      return result;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to execute statement: ${(error as Error).message}`);
    }
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    try {
      // Begin transaction
      const beginCommand = new BeginTransactionCommand({
        resourceArn: this.resourceArn,
        secretArn: this.secretArn,
        database: this.database,
      });

      const beginResponse = await this.rdsClient.send(beginCommand);
      const transactionId = beginResponse.transactionId;

      if (!transactionId) {
        throw new Error('Failed to start transaction');
      }

      // Create transaction object
      const tx: Transaction = {
        query: async <R = Record<string, unknown>>(
          sql: string,
          params?: unknown[]
        ): Promise<R[]> => {
          const formattedSql = this.replaceParameterPlaceholders(sql, params);

          const command = new ExecuteStatementCommand({
            resourceArn: this.resourceArn,
            secretArn: this.secretArn,
            database: this.database,
            sql: formattedSql,
            parameters: this.formatParameters(params) as Array<{
              name: string;
              value: { stringValue?: string };
            }>,
            transactionId,
            includeResultMetadata: true,
          });

          const response = await this.rdsClient.send(command);

          const columns = response.columnMetadata?.map((col) => col.name ?? '') ?? [];
          const rows: R[] = [];

          for (const record of response.records ?? []) {
            const row: Record<string, unknown> = {};
            record.forEach((field, index) => {
              const colName = columns[index] ?? `col${index}`;
              if (field.isNull) {
                row[colName] = null;
              } else if (field.stringValue !== undefined) {
                row[colName] = field.stringValue;
              } else if (field.longValue !== undefined) {
                row[colName] = field.longValue;
              } else if (field.doubleValue !== undefined) {
                row[colName] = field.doubleValue;
              } else if (field.booleanValue !== undefined) {
                row[colName] = field.booleanValue;
              }
            });
            rows.push(row as R);
          }

          return rows;
        },
        execute: async (sql: string, params?: unknown[]): Promise<ExecuteResult> => {
          const formattedSql = this.replaceParameterPlaceholders(sql, params);

          const command = new ExecuteStatementCommand({
            resourceArn: this.resourceArn,
            secretArn: this.secretArn,
            database: this.database,
            sql: formattedSql,
            parameters: this.formatParameters(params) as Array<{
              name: string;
              value: { stringValue?: string };
            }>,
            transactionId,
          });

          const response = await this.rdsClient.send(command);

          const result: ExecuteResult = {
            rowsAffected: response.numberOfRecordsUpdated ?? 0,
          };
          const generatedId = response.generatedFields?.[0]?.longValue;
          if (generatedId !== undefined) {
            result.insertId = generatedId;
          }
          return result;
        },
        commit: async (): Promise<void> => {
          const commitCmd = new CommitTransactionCommand({
            resourceArn: this.resourceArn,
            secretArn: this.secretArn,
            transactionId,
          });
          await this.rdsClient.send(commitCmd);
        },
        rollback: async (): Promise<void> => {
          const rollbackCmd = new RollbackTransactionCommand({
            resourceArn: this.resourceArn,
            secretArn: this.secretArn,
            transactionId,
          });
          await this.rdsClient.send(rollbackCmd);
        },
      };

      try {
        // Execute the transaction function
        const result = await fn(tx);

        // Commit transaction
        const commitCommand = new CommitTransactionCommand({
          resourceArn: this.resourceArn,
          secretArn: this.secretArn,
          transactionId,
        });

        await this.rdsClient.send(commitCommand);

        return result;
      } catch (error) {
        // Rollback transaction on error
        const rollbackCommand = new RollbackTransactionCommand({
          resourceArn: this.resourceArn,
          secretArn: this.secretArn,
          transactionId,
        });

        await this.rdsClient.send(rollbackCommand);

        throw error;
      }
    } catch (error) {
      throw new ServiceUnavailableError(`Transaction failed: ${(error as Error).message}`);
    }
  }
}
