/**
 * Integration Test: AwsDocumentClient with LocalStack
 *
 * Tests AWS DynamoDB Document Client implementation against LocalStack.
 * Requires: docker-compose up localstack
 *
 * T028: Integration test for AWS DocumentClient with LocalStack
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsDocumentClient } from '../../../../../src/providers/aws/clients/AwsDocumentClient';
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import { ProviderType, type ProviderConfig } from '../../../../../src/core/types/common';

// LocalStack DynamoDB endpoint - use environment variable if available
const LOCALSTACK_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
const TEST_TABLE = `test-document-client-${Date.now()}`;

const config: ProviderConfig = {
  provider: ProviderType.AWS,
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
};

const dynamoConfig = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
};

describe('AwsDocumentClient Integration (LocalStack)', () => {
  let client: AwsDocumentClient;
  let dynamoClient: DynamoDBClient;

  beforeAll(async () => {
    // Configure client to use LocalStack
    client = new AwsDocumentClient(config);
    dynamoClient = new DynamoDBClient(dynamoConfig);

    // Create DynamoDB table directly for testing
    try {
      await dynamoClient.send(
        new CreateTableCommand({
          TableName: TEST_TABLE,
          KeySchema: [{ AttributeName: '_id', KeyType: 'HASH' }],
          AttributeDefinitions: [{ AttributeName: '_id', AttributeType: 'S' }],
          BillingMode: 'PAY_PER_REQUEST',
        })
      );

      // Wait for table to be active
      let tableActive = false;
      for (let i = 0; i < 30 && !tableActive; i++) {
        const describe = await dynamoClient.send(
          new DescribeTableCommand({ TableName: TEST_TABLE })
        );
        tableActive = describe.Table?.TableStatus === 'ACTIVE';
        if (!tableActive) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Failed to create test table:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test table
    try {
      await dynamoClient.send(new DeleteTableCommand({ TableName: TEST_TABLE }));
    } catch {
      // Ignore cleanup errors
    }
  });

  test('put - should create document', async () => {
    await client.put(TEST_TABLE, {
      _id: 'doc-1',
      name: 'Test Document',
      value: 42,
    });

    // Verify by getting it back
    const doc = await client.get(TEST_TABLE, 'doc-1');
    expect(doc?._id).toBe('doc-1');
    expect(doc?.name).toBe('Test Document');
    expect(doc?.value).toBe(42);
  });

  test('put - should overwrite existing document', async () => {
    await client.put(TEST_TABLE, { _id: 'overwrite-test', value: 1 });
    await client.put(TEST_TABLE, { _id: 'overwrite-test', value: 2 });

    const doc = await client.get(TEST_TABLE, 'overwrite-test');
    expect(doc?.value).toBe(2);
  });

  test('get - should retrieve existing document', async () => {
    await client.put(TEST_TABLE, {
      _id: 'get-test',
      name: 'Get Test',
      count: 10,
      active: true,
    });

    const doc = await client.get(TEST_TABLE, 'get-test');

    expect(doc).toBeDefined();
    expect(doc?._id).toBe('get-test');
    expect(doc?.name).toBe('Get Test');
    expect(doc?.count).toBe(10);
    expect(doc?.active).toBe(true);
  });

  test('get - should return null for non-existent document', async () => {
    const doc = await client.get(TEST_TABLE, 'nonexistent-doc');

    expect(doc).toBeNull();
  });

  test('update - should update existing document', async () => {
    await client.put(TEST_TABLE, {
      _id: 'update-test',
      name: 'Original',
      count: 1,
    });

    await client.update(TEST_TABLE, 'update-test', {
      count: 5,
      status: 'updated',
    });

    const doc = await client.get(TEST_TABLE, 'update-test');
    expect(doc?.name).toBe('Original'); // Unchanged
    expect(doc?.count).toBe(5); // Updated
    expect(doc?.status).toBe('updated'); // Added
  });

  test('delete - should delete existing document', async () => {
    await client.put(TEST_TABLE, { _id: 'delete-test', value: 1 });

    await client.delete(TEST_TABLE, 'delete-test');

    const doc = await client.get(TEST_TABLE, 'delete-test');
    expect(doc).toBeNull();
  });

  test('delete - should not throw for non-existent document', async () => {
    // Should not throw
    await client.delete(TEST_TABLE, 'nonexistent-doc-for-delete');
  });

  test('batchGet - should retrieve multiple documents', async () => {
    await client.put(TEST_TABLE, { _id: 'batch-1', value: 1 });
    await client.put(TEST_TABLE, { _id: 'batch-2', value: 2 });
    await client.put(TEST_TABLE, { _id: 'batch-3', value: 3 });

    const docs = await client.batchGet(TEST_TABLE, ['batch-1', 'batch-2', 'batch-3']);

    expect(docs).toHaveLength(3);
    expect(docs.filter((d) => d !== null)).toHaveLength(3);
  });

  test('batchGet - should return null for missing documents', async () => {
    await client.put(TEST_TABLE, { _id: 'exists-1', value: 1 });
    await client.put(TEST_TABLE, { _id: 'exists-2', value: 2 });

    const docs = await client.batchGet(TEST_TABLE, ['exists-1', 'missing-doc', 'exists-2']);

    expect(docs).toHaveLength(3);
    expect(docs[0]).not.toBeNull();
    expect(docs[1]).toBeNull();
    expect(docs[2]).not.toBeNull();
  });

  test('batchPut - should create multiple documents', async () => {
    const documents = [
      { _id: 'bp-1', name: 'Doc 1' },
      { _id: 'bp-2', name: 'Doc 2' },
      { _id: 'bp-3', name: 'Doc 3' },
    ];

    await client.batchPut(TEST_TABLE, documents);

    // Verify all documents were stored
    const doc1 = await client.get(TEST_TABLE, 'bp-1');
    const doc2 = await client.get(TEST_TABLE, 'bp-2');
    const doc3 = await client.get(TEST_TABLE, 'bp-3');

    expect(doc1?.name).toBe('Doc 1');
    expect(doc2?.name).toBe('Doc 2');
    expect(doc3?.name).toBe('Doc 3');
  });

  test('nested objects - should handle nested document structures', async () => {
    const doc = {
      _id: 'nested-test',
      user: {
        profile: {
          name: 'Test User',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
      },
    };

    await client.put(TEST_TABLE, doc);
    const retrieved = await client.get(TEST_TABLE, 'nested-test');

    expect(retrieved?.user).toEqual(doc.user);
    const user = retrieved?.user as { profile?: { preferences?: { theme?: string } } } | undefined;
    expect(user?.profile?.preferences?.theme).toBe('dark');
  });

  test('arrays - should handle array fields', async () => {
    const doc = {
      _id: 'array-test',
      tags: ['a', 'b', 'c'],
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };

    await client.put(TEST_TABLE, doc);
    const retrieved = await client.get(TEST_TABLE, 'array-test');

    expect(retrieved?.tags).toEqual(['a', 'b', 'c']);
    expect(retrieved?.items).toEqual([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]);
  });

  test('various data types - should handle different data types', async () => {
    const doc = {
      _id: 'types-test',
      stringField: 'hello',
      numberField: 42,
      floatField: 3.14,
      booleanField: true,
      nullField: null,
      dateAsString: '2024-01-15T10:00:00Z',
    };

    await client.put(TEST_TABLE, doc);
    const retrieved = await client.get(TEST_TABLE, 'types-test');

    expect(retrieved?.stringField).toBe('hello');
    expect(retrieved?.numberField).toBe(42);
    expect(retrieved?.floatField).toBe(3.14);
    expect(retrieved?.booleanField).toBe(true);
    expect(retrieved?.nullField).toBeNull();
    expect(retrieved?.dateAsString).toBe('2024-01-15T10:00:00Z');
  });

  test('large document - should handle documents with many fields', async () => {
    const doc: Record<string, unknown> = { _id: 'large-doc-test' };
    for (let i = 0; i < 50; i++) {
      doc[`field${i}`] = `value${i}`;
    }

    await client.put(TEST_TABLE, doc as { _id: string });
    const retrieved = await client.get(TEST_TABLE, 'large-doc-test');

    expect(retrieved?._id).toBe('large-doc-test');
    expect(retrieved?.field0).toBe('value0');
    expect(retrieved?.field49).toBe('value49');
  });
});
