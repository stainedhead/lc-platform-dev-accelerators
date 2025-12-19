/**
 * Unit Tests for MockDataClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockDataClient } from '../../../../../src/providers/mock/clients/MockDataClient';
import { ValidationError } from '../../../../../src/core/types/common';

describe('MockDataClient', () => {
  let client: MockDataClient;

  beforeEach(() => {
    client = new MockDataClient();
    client.reset();
  });

  describe('query', () => {
    test('should query data from table', async () => {
      client.setTableData('users', [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ]);

      const results = await client.query('SELECT * FROM users');
      expect(results.length).toBe(2);
    });

    test('should query with WHERE clause', async () => {
      client.setTableData('users', [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ]);

      const results = await client.query<{ id: number; name: string }>(
        'SELECT * FROM users WHERE name = ?',
        ['Alice']
      );
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe('Alice');
    });

    test('should return empty array for non-existent table', async () => {
      const results = await client.query('SELECT * FROM non_existent');
      expect(results).toEqual([]);
    });

    test('should throw ValidationError for empty SQL', async () => {
      expect(client.query('')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('execute', () => {
    test('should insert a record', async () => {
      const result = await client.execute('INSERT INTO users (name, age) VALUES (?, ?)', [
        'Alice',
        30,
      ]);

      expect(result.rowsAffected).toBe(1);
      expect(result.insertId).toBeDefined();
    });

    test('should update records', async () => {
      client.setTableData('users', [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ]);

      const result = await client.execute('UPDATE users SET age = ? WHERE name = ?', [31, 'Alice']);

      expect(result.rowsAffected).toBe(1);

      const data = client.getTableData('users');
      const alice = data.find((r) => r['name'] === 'Alice');
      expect(alice?.age).toBe(31);
    });

    test('should delete records', async () => {
      client.setTableData('users', [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ]);

      const result = await client.execute('DELETE FROM users WHERE name = ?', ['Alice']);

      expect(result.rowsAffected).toBe(1);

      const data = client.getTableData('users');
      expect(data.length).toBe(1);
    });

    test('should throw ValidationError for empty SQL', async () => {
      expect(client.execute('')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('transaction', () => {
    test('should execute operations in transaction', async () => {
      client.setTableData('accounts', [
        { id: 1, name: 'Alice', balance: 100 },
        { id: 2, name: 'Bob', balance: 50 },
      ]);

      await client.transaction(async (tx) => {
        await tx.execute('UPDATE accounts SET balance = ? WHERE name = ?', [80, 'Alice']);
        await tx.execute('UPDATE accounts SET balance = ? WHERE name = ?', [70, 'Bob']);
      });

      const data = client.getTableData('accounts');
      const alice = data.find((r) => r['name'] === 'Alice');
      const bob = data.find((r) => r['name'] === 'Bob');
      expect(alice?.balance).toBe(80);
      expect(bob?.balance).toBe(70);
    });

    test('should rollback on error', async () => {
      client.setTableData('accounts', [{ id: 1, name: 'Alice', balance: 100 }]);

      try {
        await client.transaction(async (tx) => {
          await tx.execute('UPDATE accounts SET balance = ? WHERE name = ?', [50, 'Alice']);
          throw new Error('Simulated error');
        });
      } catch {
        // Expected
      }

      const data = client.getTableData('accounts');
      const alice = data.find((r) => r['name'] === 'Alice');
      expect(alice?.balance).toBe(100); // Rolled back
    });

    test('should return transaction result', async () => {
      client.setTableData('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const result = await client.transaction(async (tx) => {
        const users = await tx.query<{ id: number; name: string }>('SELECT * FROM users');
        return users.length;
      });

      expect(result).toBe(2);
    });

    test('should throw ValidationError for nested transactions', async () => {
      expect(
        client.transaction(async () => {
          await client.transaction(async () => {
            // Nested transaction
          });
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('integration', () => {
    test('should support typical data access patterns', async () => {
      // Create orders table
      await client.execute('INSERT INTO orders (user_id, amount) VALUES (?, ?)', ['u1', 100]);
      await client.execute('INSERT INTO orders (user_id, amount) VALUES (?, ?)', ['u1', 200]);
      await client.execute('INSERT INTO orders (user_id, amount) VALUES (?, ?)', ['u2', 150]);

      // Query orders
      const orders = await client.query<{ id: number; user_id: string; amount: number }>(
        'SELECT * FROM orders WHERE user_id = ?',
        ['u1']
      );
      expect(orders.length).toBe(2);

      // Update order
      await client.execute('UPDATE orders SET amount = ? WHERE user_id = ?', [250, 'u1']);

      // Delete order
      const deleteResult = await client.execute('DELETE FROM orders WHERE user_id = ?', ['u2']);
      expect(deleteResult.rowsAffected).toBe(1);
    });
  });
});
