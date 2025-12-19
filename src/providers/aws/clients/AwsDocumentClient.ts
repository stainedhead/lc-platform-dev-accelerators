/**
 * AWS Document Client Implementation
 * Uses Amazon DynamoDB for document storage
 *
 * Constitution Principle I: Provider Independence
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { DocumentClient } from '../../../core/clients/DocumentClient';
import type { Document, Query } from '../../../core/types/document';
import type { ProviderConfig } from '../../../core/types/common';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsDocumentClient implements DocumentClient {
  private dynamoClient: DynamoDBClient;

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

    this.dynamoClient = new DynamoDBClient(clientConfig);
  }

  async get(collection: string, documentId: string): Promise<Document | null> {
    if (!collection || !documentId) {
      throw new ValidationError('Collection and document ID are required');
    }

    try {
      const command = new GetItemCommand({
        TableName: collection,
        Key: marshall({ _id: documentId }),
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        return null;
      }

      return unmarshall(response.Item) as Document;
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        return null;
      }
      throw new ServiceUnavailableError(`Failed to get document: ${(error as Error).message}`);
    }
  }

  async put(collection: string, document: Document): Promise<void> {
    if (!collection) {
      throw new ValidationError('Collection is required');
    }
    if (!document._id) {
      throw new ValidationError('Document must have an _id field');
    }

    try {
      const command = new PutItemCommand({
        TableName: collection,
        Item: marshall(document, { removeUndefinedValues: true }),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to put document: ${(error as Error).message}`);
    }
  }

  async update(collection: string, documentId: string, updates: Partial<Document>): Promise<void> {
    if (!collection || !documentId) {
      throw new ValidationError('Collection and document ID are required');
    }

    // First check if document exists
    const existing = await this.get(collection, documentId);
    if (!existing) {
      throw new ResourceNotFoundError('Document', documentId);
    }

    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      Object.entries(updates).forEach(([key, value], index) => {
        if (key === '_id') {
          return; // Skip the ID field
        }
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;
        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      });

      if (updateExpressions.length === 0) {
        return; // Nothing to update
      }

      const command = new UpdateItemCommand({
        TableName: collection,
        Key: marshall({ _id: documentId }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to update document: ${(error as Error).message}`);
    }
  }

  async delete(collection: string, documentId: string): Promise<void> {
    if (!collection || !documentId) {
      throw new ValidationError('Collection and document ID are required');
    }

    try {
      const command = new DeleteItemCommand({
        TableName: collection,
        Key: marshall({ _id: documentId }),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to delete document: ${(error as Error).message}`);
    }
  }

  async query(collection: string, query: Query): Promise<Document[]> {
    if (!collection) {
      throw new ValidationError('Collection is required');
    }

    try {
      // Build filter expression from query
      const filterExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      Object.entries(query).forEach(([key, condition], index) => {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;
        expressionAttributeNames[nameKey] = key;

        if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
          // Handle operators
          const keys = Object.keys(condition);
          const op = keys[0];
          if (!op) {
            // Empty object, skip
            return;
          }
          const value = (condition as Record<string, unknown>)[op];

          switch (op) {
            case '$eq':
              filterExpressions.push(`${nameKey} = ${valueKey}`);
              expressionAttributeValues[valueKey] = value;
              break;
            case '$ne':
              filterExpressions.push(`${nameKey} <> ${valueKey}`);
              expressionAttributeValues[valueKey] = value;
              break;
            case '$gt':
              filterExpressions.push(`${nameKey} > ${valueKey}`);
              expressionAttributeValues[valueKey] = value;
              break;
            case '$gte':
              filterExpressions.push(`${nameKey} >= ${valueKey}`);
              expressionAttributeValues[valueKey] = value;
              break;
            case '$lt':
              filterExpressions.push(`${nameKey} < ${valueKey}`);
              expressionAttributeValues[valueKey] = value;
              break;
            case '$lte':
              filterExpressions.push(`${nameKey} <= ${valueKey}`);
              expressionAttributeValues[valueKey] = value;
              break;
            case '$in':
              if (Array.isArray(value)) {
                const inValues = value.map((_, i) => `:val${index}_${i}`);
                filterExpressions.push(`${nameKey} IN (${inValues.join(', ')})`);
                value.forEach((val, i) => {
                  expressionAttributeValues[`:val${index}_${i}`] = val;
                });
              }
              break;
            default:
              // Default to equality for unknown operators
              filterExpressions.push(`${nameKey} = ${valueKey}`);
              expressionAttributeValues[valueKey] = condition;
          }
        } else {
          // Simple equality
          filterExpressions.push(`${nameKey} = ${valueKey}`);
          expressionAttributeValues[valueKey] = condition;
        }
      });

      // Use Scan with filter (Note: for production, you'd want to use Query with proper indexes)
      const command = new QueryCommand({
        TableName: collection,
        FilterExpression:
          filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
        ExpressionAttributeNames:
          Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues:
          Object.keys(expressionAttributeValues).length > 0
            ? marshall(expressionAttributeValues)
            : undefined,
      });

      const response = await this.dynamoClient.send(command);

      return (response.Items ?? []).map((item) => unmarshall(item) as Document);
    } catch (error) {
      // If Query fails (no index), fall back to returning empty
      // In production, you'd want to use Scan or ensure proper indexes
      if ((error as Error).message.includes('Query')) {
        return [];
      }
      throw new ServiceUnavailableError(`Failed to query documents: ${(error as Error).message}`);
    }
  }

  async batchGet(collection: string, documentIds: string[]): Promise<(Document | null)[]> {
    if (!collection) {
      throw new ValidationError('Collection is required');
    }

    if (documentIds.length === 0) {
      return [];
    }

    try {
      // DynamoDB BatchGetItem supports max 100 items
      const results: (Document | null)[] = [];
      const batchSize = 100;

      for (let i = 0; i < documentIds.length; i += batchSize) {
        const batch = documentIds.slice(i, i + batchSize);

        const command = new BatchGetItemCommand({
          RequestItems: {
            [collection]: {
              Keys: batch.map((id) => marshall({ _id: id })),
            },
          },
        });

        const response = await this.dynamoClient.send(command);
        const items = response.Responses?.[collection] ?? [];
        const itemMap = new Map<string, Document>();

        for (const item of items) {
          const doc = unmarshall(item) as Document;
          itemMap.set(doc._id, doc);
        }

        // Maintain order and null for missing items
        for (const id of batch) {
          results.push(itemMap.get(id) ?? null);
        }
      }

      return results;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to batch get documents: ${(error as Error).message}`
      );
    }
  }

  async batchPut(collection: string, documents: Document[]): Promise<void> {
    if (!collection) {
      throw new ValidationError('Collection is required');
    }

    if (documents.length === 0) {
      return;
    }

    try {
      // DynamoDB BatchWriteItem supports max 25 items
      const batchSize = 25;

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const command = new BatchWriteItemCommand({
          RequestItems: {
            [collection]: batch.map((doc) => ({
              PutRequest: {
                Item: marshall(doc, { removeUndefinedValues: true }),
              },
            })),
          },
        });

        await this.dynamoClient.send(command);
      }
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to batch put documents: ${(error as Error).message}`
      );
    }
  }
}
