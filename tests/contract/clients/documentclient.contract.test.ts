/**
 * Contract Test: DocumentClient
 *
 * Verifies that both AWS and Mock providers implement the DocumentClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { DocumentClient } from '../../../src/core/clients/DocumentClient';
import { MockDocumentClient } from '../../../src/providers/mock/clients/MockDocumentClient';
import { ResourceNotFoundError, ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the DocumentClient contract.
 */
function testDocumentClientContract(
  name: string,
  createClient: () => DocumentClient,
  cleanup?: () => void
) {
  describe(`DocumentClient Contract: ${name}`, () => {
    let client: DocumentClient;
    const testCollection = 'test-collection';

    beforeEach(() => {
      client = createClient();
      if (cleanup) {
        cleanup();
      }
    });

    describe('put', () => {
      test('should put document successfully', async () => {
        await expect(
          client.put(testCollection, { _id: 'doc-1', name: 'Test Doc', value: 42 })
        ).resolves.toBeUndefined();
      });

      test('should overwrite existing document', async () => {
        await client.put(testCollection, { _id: 'doc-overwrite', value: 1 });
        await client.put(testCollection, { _id: 'doc-overwrite', value: 2 });

        const doc = await client.get(testCollection, 'doc-overwrite');
        expect(doc?.value).toBe(2);
      });

      test('should throw ValidationError for missing _id', async () => {
        await expect(
          client.put(testCollection, { name: 'No ID' } as unknown as { _id: string })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.put('', { _id: 'doc-1' })).rejects.toThrow(ValidationError);
      });
    });

    describe('get', () => {
      test('should get existing document', async () => {
        await client.put(testCollection, { _id: 'get-test', name: 'Get Test', count: 10 });

        const doc = await client.get(testCollection, 'get-test');

        expect(doc).toBeDefined();
        expect(doc?._id).toBe('get-test');
        expect(doc?.name).toBe('Get Test');
        expect(doc?.count).toBe(10);
      });

      test('should return null for non-existent document', async () => {
        const doc = await client.get(testCollection, 'nonexistent-doc');

        expect(doc).toBeNull();
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.get('', 'doc-id')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty document ID', async () => {
        await expect(client.get(testCollection, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('update', () => {
      test('should update existing document', async () => {
        await client.put(testCollection, { _id: 'update-test', name: 'Original', count: 1 });

        await client.update(testCollection, 'update-test', { count: 5, status: 'updated' });

        const doc = await client.get(testCollection, 'update-test');
        expect(doc?.name).toBe('Original'); // Unchanged
        expect(doc?.count).toBe(5); // Updated
        expect(doc?.status).toBe('updated'); // Added
      });

      test('should throw ResourceNotFoundError for non-existent document', async () => {
        await expect(
          client.update(testCollection, 'nonexistent-doc', { value: 1 })
        ).rejects.toThrow(ResourceNotFoundError);
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.update('', 'doc-id', { value: 1 })).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty document ID', async () => {
        await expect(client.update(testCollection, '', { value: 1 })).rejects.toThrow(
          ValidationError
        );
      });
    });

    describe('delete', () => {
      test('should delete existing document', async () => {
        await client.put(testCollection, { _id: 'delete-test', value: 1 });

        await expect(client.delete(testCollection, 'delete-test')).resolves.toBeUndefined();

        const doc = await client.get(testCollection, 'delete-test');
        expect(doc).toBeNull();
      });

      test('should not throw for non-existent document', async () => {
        await expect(client.delete(testCollection, 'nonexistent-doc')).resolves.toBeUndefined();
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.delete('', 'doc-id')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty document ID', async () => {
        await expect(client.delete(testCollection, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('query', () => {
      beforeEach(async () => {
        // Setup test documents for query tests
        await client.put(testCollection, { _id: 'q1', category: 'A', score: 10 });
        await client.put(testCollection, { _id: 'q2', category: 'A', score: 20 });
        await client.put(testCollection, { _id: 'q3', category: 'B', score: 15 });
      });

      test('should query by equality', async () => {
        const docs = await client.query(testCollection, { category: 'A' });

        expect(docs).toHaveLength(2);
        expect(docs.every((d) => d.category === 'A')).toBe(true);
      });

      test('should query with $eq operator', async () => {
        const docs = await client.query(testCollection, { category: { $eq: 'B' } });

        expect(docs).toHaveLength(1);
        expect(docs[0]?._id).toBe('q3');
      });

      test('should query with $gt operator', async () => {
        const docs = await client.query(testCollection, { score: { $gt: 15 } });

        expect(docs).toHaveLength(1);
        expect(docs[0]?._id).toBe('q2');
      });

      test('should query with $gte operator', async () => {
        const docs = await client.query(testCollection, { score: { $gte: 15 } });

        expect(docs).toHaveLength(2);
      });

      test('should return empty array for no matches', async () => {
        const docs = await client.query(testCollection, { category: 'nonexistent' });

        expect(docs).toEqual([]);
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.query('', { field: 'value' })).rejects.toThrow(ValidationError);
      });
    });

    describe('batchGet', () => {
      beforeEach(async () => {
        await client.put(testCollection, { _id: 'bg1', value: 1 });
        await client.put(testCollection, { _id: 'bg2', value: 2 });
        await client.put(testCollection, { _id: 'bg3', value: 3 });
      });

      test('should get multiple documents', async () => {
        const docs = await client.batchGet(testCollection, ['bg1', 'bg2', 'bg3']);

        expect(docs).toHaveLength(3);
        expect(docs.filter((d) => d !== null)).toHaveLength(3);
      });

      test('should return null for non-existent documents', async () => {
        const docs = await client.batchGet(testCollection, ['bg1', 'nonexistent', 'bg3']);

        expect(docs).toHaveLength(3);
        expect(docs[0]).not.toBeNull();
        expect(docs[1]).toBeNull();
        expect(docs[2]).not.toBeNull();
      });

      test('should return empty array for empty IDs', async () => {
        const docs = await client.batchGet(testCollection, []);

        expect(docs).toEqual([]);
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.batchGet('', ['id1'])).rejects.toThrow(ValidationError);
      });
    });

    describe('batchPut', () => {
      test('should put multiple documents', async () => {
        const documents = [
          { _id: 'bp1', name: 'Doc 1' },
          { _id: 'bp2', name: 'Doc 2' },
          { _id: 'bp3', name: 'Doc 3' },
        ];

        await expect(client.batchPut(testCollection, documents)).resolves.toBeUndefined();

        // Verify all documents were stored
        const doc1 = await client.get(testCollection, 'bp1');
        const doc2 = await client.get(testCollection, 'bp2');
        const doc3 = await client.get(testCollection, 'bp3');

        expect(doc1?.name).toBe('Doc 1');
        expect(doc2?.name).toBe('Doc 2');
        expect(doc3?.name).toBe('Doc 3');
      });

      test('should handle empty documents array', async () => {
        await expect(client.batchPut(testCollection, [])).resolves.toBeUndefined();
      });

      test('should throw ValidationError for empty collection', async () => {
        await expect(client.batchPut('', [{ _id: 'doc' }])).rejects.toThrow(ValidationError);
      });
    });

    describe('document data handling', () => {
      test('should handle nested objects', async () => {
        const doc = {
          _id: 'nested-doc',
          user: {
            profile: {
              name: 'Test User',
              preferences: {
                theme: 'dark',
              },
            },
          },
        };

        await client.put(testCollection, doc);
        const retrieved = await client.get(testCollection, 'nested-doc');

        expect(retrieved?.user).toEqual(doc.user);
      });

      test('should handle arrays', async () => {
        const doc = {
          _id: 'array-doc',
          tags: ['a', 'b', 'c'],
          items: [{ id: 1 }, { id: 2 }],
        };

        await client.put(testCollection, doc);
        const retrieved = await client.get(testCollection, 'array-doc');

        expect(retrieved?.tags).toEqual(['a', 'b', 'c']);
        expect(retrieved?.items).toEqual([{ id: 1 }, { id: 2 }]);
      });
    });
  });
}

// Run contract tests against Mock provider
testDocumentClientContract(
  'MockDocumentClient',
  () => new MockDocumentClient(),
  () => {
    // Cleanup is handled by creating new instance
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsDocumentClient } from '../../../src/providers/aws/clients/AwsDocumentClient';
// testDocumentClientContract('AwsDocumentClient', () => new AwsDocumentClient({ provider: ProviderType.AWS }));
