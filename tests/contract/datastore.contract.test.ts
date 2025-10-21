/**
 * Contract Test: DataStoreService
 *
 * Verifies that both AWS and Mock providers implement the same interface
 * with identical behavior. This ensures cloud-agnostic portability.
 *
 * T020: Contract test for DataStoreService interface
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { DataStoreService } from '../../src/core/services/DataStoreService';
import type { Migration } from '../../src/core/types/datastore';
import { MockDataStoreService } from '../../src/providers/mock/MockDataStoreService';

/**
 * Contract test suite that verifies provider implementations
 * follow the DataStoreService contract.
 */
function testDataStoreServiceContract(name: string, createService: () => DataStoreService) {
  describe(`DataStoreService Contract: ${name}`, () => {
    let service: DataStoreService;

    beforeEach(async () => {
      service = createService();
      await service.connect();

      // Setup test table
      await service.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(100) UNIQUE,
          age INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    test('connect - should establish database connection', async () => {
      const newService = createService();
      await newService.connect();
    });

    test('execute - should insert data and return affected rows', async () => {
      const result = await service.execute(
        'INSERT INTO users (name, email, age) VALUES ($1, $2, $3)',
        ['Alice', 'alice@example.com', 30]
      );

      expect(result.rowsAffected).toBe(1);
      expect(result.insertId).toBeDefined();
    });

    test('query - should retrieve inserted data', async () => {
      await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Bob',
        'bob@example.com',
        25,
      ]);

      const users = await service.query<{ name: string; email: string; age: number }>(
        'SELECT name, email, age FROM users WHERE email = $1',
        ['bob@example.com']
      );

      expect(users).toHaveLength(1);
      expect(users[0]!.name).toBe('Bob');
      expect(users[0]!.email).toBe('bob@example.com');
      expect(users[0]!.age).toBe(25);
    });

    test('query - should support prepared statements with multiple parameters', async () => {
      await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Charlie',
        'charlie@example.com',
        35,
      ]);
      await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'David',
        'david@example.com',
        40,
      ]);

      const users = await service.query<{ name: string }>(
        'SELECT name FROM users WHERE age > $1 ORDER BY age',
        [30]
      );

      expect(users).toHaveLength(2);
      expect(users[0]!.name).toBe('Charlie');
      expect(users[1]!.name).toBe('David');
    });

    test('execute - should update data and return affected rows', async () => {
      await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Eve',
        'eve@example.com',
        28,
      ]);

      const result = await service.execute('UPDATE users SET age = $1 WHERE email = $2', [
        29,
        'eve@example.com',
      ]);

      expect(result.rowsAffected).toBe(1);

      const users = await service.query<{ age: number }>('SELECT age FROM users WHERE email = $1', [
        'eve@example.com',
      ]);
      expect(users[0]!.age).toBe(29);
    });

    test('execute - should delete data and return affected rows', async () => {
      await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Frank',
        'frank@example.com',
        45,
      ]);

      const result = await service.execute('DELETE FROM users WHERE email = $1', [
        'frank@example.com',
      ]);

      expect(result.rowsAffected).toBe(1);

      const users = await service.query('SELECT * FROM users WHERE email = $1', [
        'frank@example.com',
      ]);
      expect(users).toHaveLength(0);
    });

    test('transaction - should commit changes when transaction succeeds', async () => {
      const result = await service.transaction(async (tx) => {
        await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
          'Grace',
          'grace@example.com',
          32,
        ]);
        await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
          'Henry',
          'henry@example.com',
          38,
        ]);
        return { success: true };
      });

      expect(result.success).toBe(true);

      const users = await service.query<{ name: string }>(
        'SELECT name FROM users WHERE email IN ($1, $2)',
        ['grace@example.com', 'henry@example.com']
      );
      expect(users).toHaveLength(2);
    });

    test('transaction - should rollback changes when transaction fails', async () => {
      await expect(
        service.transaction(async (tx) => {
          await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
            'Iris',
            'iris@example.com',
            29,
          ]);
          throw new Error('Intentional failure');
        })
      ).rejects.toThrow('Intentional failure');

      const users = await service.query('SELECT * FROM users WHERE email = $1', [
        'iris@example.com',
      ]);
      expect(users).toHaveLength(0);
    });

    test('transaction - should support nested queries', async () => {
      const result = await service.transaction(async (tx) => {
        await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
          'Jack',
          'jack@example.com',
          42,
        ]);

        const users = await tx.query<{ id: number }>('SELECT id FROM users WHERE email = $1', [
          'jack@example.com',
        ]);

        return users[0]!.id;
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    test('migrate - should apply database migrations in order', async () => {
      const migrations: Migration[] = [
        {
          version: '001',
          description: 'Create products table',
          up: `
            CREATE TABLE products (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100),
              price DECIMAL(10, 2)
            )
          `,
          down: 'DROP TABLE products',
        },
        {
          version: '002',
          description: 'Add category to products',
          up: 'ALTER TABLE products ADD COLUMN category VARCHAR(50)',
          down: 'ALTER TABLE products DROP COLUMN category',
        },
      ];

      await service.migrate(migrations);

      // Verify table exists and has correct schema
      await service.execute('INSERT INTO products (name, price, category) VALUES ($1, $2, $3)', [
        'Widget',
        19.99,
        'Tools',
      ]);

      const products = await service.query<{ name: string; category: string }>(
        'SELECT name, category FROM products WHERE name = $1',
        ['Widget']
      );

      expect(products).toHaveLength(1);
      expect(products[0]!.name).toBe('Widget');
      expect(products[0]!.category).toBe('Tools');
    });

    test('getConnection - should return a working connection', async () => {
      const conn = service.getConnection();

      expect(conn).toBeDefined();

      await conn.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Karen',
        'karen@example.com',
        31,
      ]);

      const users = await conn.query<{ name: string }>('SELECT name FROM users WHERE email = $1', [
        'karen@example.com',
      ]);

      expect(users).toHaveLength(1);
      expect(users[0]!.name).toBe('Karen');

      await conn.close();
    });

    test('query - should return empty array when no results', async () => {
      const users = await service.query('SELECT * FROM users WHERE email = $1', [
        'nonexistent@example.com',
      ]);

      expect(users).toEqual([]);
    });

    test('execute - should return 0 affected rows when no match', async () => {
      const result = await service.execute('UPDATE users SET age = $1 WHERE email = $2', [
        50,
        'nonexistent@example.com',
      ]);

      expect(result.rowsAffected).toBe(0);
    });
  });
}

// Run contract tests against Mock provider
testDataStoreServiceContract('MockDataStoreService', () => new MockDataStoreService());

// TODO: Uncomment when AWS provider is implemented
// import { AwsDataStoreService } from '../../src/providers/aws/AwsDataStoreService';
// testDataStoreServiceContract('AwsDataStoreService', () => new AwsDataStoreService());
