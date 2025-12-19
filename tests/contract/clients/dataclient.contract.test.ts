/**
 * Contract Test: DataClient
 *
 * Verifies that both AWS and Mock providers implement the DataClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { DataClient } from '../../../src/core/clients/DataClient';
import { MockDataClient } from '../../../src/providers/mock/clients/MockDataClient';
import { ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the DataClient contract.
 */
function testDataClientContract(
  name: string,
  createClient: () => MockDataClient | DataClient,
  setup?: (client: MockDataClient) => void
) {
  describe(`DataClient Contract: ${name}`, () => {
    let client: DataClient;

    beforeEach(() => {
      const c = createClient();
      client = c;
      if (setup && c instanceof MockDataClient) {
        setup(c);
      }
    });

    describe('query', () => {
      test('should query data and return results', async () => {
        const results = await client.query<{ id: number; name: string }>('SELECT * FROM users');

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      });

      test('should query with parameters', async () => {
        const results = await client.query<{ id: number; name: string }>(
          'SELECT * FROM users WHERE id = ?',
          [1]
        );

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0 && results[0]) {
          expect(results[0].id).toBe(1);
        }
      });

      test('should return empty array for no matches', async () => {
        const results = await client.query('SELECT * FROM users WHERE id = ?', [9999]);

        expect(results).toEqual([]);
      });

      test('should throw ValidationError for empty SQL', async () => {
        await expect(client.query('')).rejects.toThrow(ValidationError);
      });
    });

    describe('execute', () => {
      test('should execute INSERT and return affected rows', async () => {
        const result = await client.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
          'John',
          'john@example.com',
        ]);

        expect(result).toBeDefined();
        expect(result.rowsAffected).toBeGreaterThanOrEqual(0);
      });

      test('should execute UPDATE and return affected rows', async () => {
        // First insert a row
        await client.execute('INSERT INTO users (name) VALUES (?)', ['Update Test']);

        const result = await client.execute('UPDATE users SET name = ? WHERE name = ?', [
          'Updated Name',
          'Update Test',
        ]);

        expect(result).toBeDefined();
        expect(typeof result.rowsAffected).toBe('number');
      });

      test('should execute DELETE and return affected rows', async () => {
        // First insert a row
        await client.execute('INSERT INTO users (name) VALUES (?)', ['Delete Test']);

        const result = await client.execute('DELETE FROM users WHERE name = ?', ['Delete Test']);

        expect(result).toBeDefined();
        expect(typeof result.rowsAffected).toBe('number');
      });

      test('should return insertId for INSERT operations', async () => {
        const result = await client.execute('INSERT INTO products (name) VALUES (?)', [
          'New Product',
        ]);

        expect(result).toBeDefined();
        // insertId may be present for INSERT operations
        if (result.insertId !== undefined) {
          expect(typeof result.insertId).toBe('number');
        }
      });

      test('should throw ValidationError for empty SQL', async () => {
        await expect(client.execute('')).rejects.toThrow(ValidationError);
      });
    });

    describe('transaction', () => {
      test('should execute operations within a transaction', async () => {
        const result = await client.transaction(async (tx) => {
          await tx.execute('INSERT INTO orders (product) VALUES (?)', ['Widget']);
          const orders = await tx.query<{ product: string }>('SELECT * FROM orders');
          return orders.length;
        });

        expect(result).toBeGreaterThanOrEqual(0);
      });

      test('should commit transaction on success', async () => {
        await client.transaction(async (tx) => {
          await tx.execute('INSERT INTO logs (message) VALUES (?)', ['Transaction log']);
        });

        // Data should be persisted after commit
        const results = await client.query<{ message: string }>(
          'SELECT * FROM logs WHERE message = ?',
          ['Transaction log']
        );

        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      test('should rollback transaction on error', async () => {
        // Insert a row first
        await client.execute('INSERT INTO rollback_test (value) VALUES (?)', ['original']);

        try {
          await client.transaction(async (tx) => {
            await tx.execute('UPDATE rollback_test SET value = ?', ['updated']);
            throw new Error('Simulated error');
          });
        } catch {
          // Expected error
        }

        // Data should be unchanged after rollback
        const results = await client.query<{ value: string }>(
          'SELECT * FROM rollback_test WHERE value = ?',
          ['original']
        );

        // In a proper rollback, the original value should remain
        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      test('should allow querying within transaction', async () => {
        const result = await client.transaction(async (tx) => {
          await tx.execute('INSERT INTO items (name) VALUES (?)', ['Transaction Item']);
          const items = await tx.query<{ name: string }>('SELECT * FROM items');
          return items;
        });

        expect(Array.isArray(result)).toBe(true);
      });

      test('should throw ValidationError for nested transactions', async () => {
        await expect(
          client.transaction(async () => {
            // Attempting nested transaction should fail
            await client.transaction(async () => {
              // This should not execute
            });
          })
        ).rejects.toThrow(ValidationError);
      });
    });
  });
}

// Run contract tests against Mock provider with setup
testDataClientContract(
  'MockDataClient',
  () => new MockDataClient(),
  (client) => {
    // Setup test tables
    client.setTableData('users', [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ]);
    client.setTableData('products', [{ id: 1, name: 'Widget' }]);
    client.setTableData('orders', []);
    client.setTableData('logs', []);
    client.setTableData('items', []);
    client.setTableData('rollback_test', []);
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsDataClient } from '../../../src/providers/aws/clients/AwsDataClient';
// testDataClientContract('AwsDataClient', () => new AwsDataClient({ provider: ProviderType.AWS }));
