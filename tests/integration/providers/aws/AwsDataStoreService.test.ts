/**
 * Integration Test: AwsDataStoreService with PostgreSQL
 *
 * Tests AWS PostgreSQL implementation against real PostgreSQL database.
 * Requires: docker-compose up postgres
 *
 * T026: Integration test for AWS DataStoreService with LocalStack
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { AwsDataStoreService } from '../../../../src/providers/aws/AwsDataStoreService';
import type { Migration } from '../../../../src/core/types/datastore';

// PostgreSQL connection config for docker-compose
const PG_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'testdb',
  user: 'testuser',
  password: 'testpassword',
};

describe('AwsDataStoreService Integration (PostgreSQL)', () => {
  let service: AwsDataStoreService;

  beforeAll(async () => {
    service = new AwsDataStoreService(PG_CONFIG);
    await service.connect();
  });

  afterAll(async () => {
    // Cleanup all test tables
    try {
      await service.execute('DROP TABLE IF EXISTS users CASCADE');
      await service.execute('DROP TABLE IF EXISTS products CASCADE');
      await service.execute('DROP TABLE IF EXISTS orders CASCADE');
      await service.execute('DROP TABLE IF EXISTS migrations CASCADE');
    } catch {
      // Ignore cleanup errors
    }

    // Note: DataStoreService interface doesn't have disconnect()
    // Connection pool cleanup is handled automatically
  });

  beforeEach(async () => {
    // Clean tables before each test
    await service.execute('DROP TABLE IF EXISTS users CASCADE');
    await service.execute('DROP TABLE IF EXISTS products CASCADE');
    await service.execute('DROP TABLE IF EXISTS orders CASCADE');

    // Create fresh users table
    await service.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        age INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  test('connect - should establish PostgreSQL connection', async () => {
    const newService = new AwsDataStoreService(PG_CONFIG);
    expect(newService.connect()).resolves.not.toThrow();
  });

  test('execute - should insert data and return affected rows', async () => {
    const result = await service.execute(
      'INSERT INTO users (name, email, age) VALUES ($1, $2, $3)',
      ['Alice Integration', 'alice@integration.com', 30]
    );

    expect(result.rowsAffected).toBe(1);
    expect(result.insertId).toBeDefined();
    expect(typeof result.insertId).toBe('number');
  });

  test('query - should retrieve inserted data', async () => {
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Bob Integration',
      'bob@integration.com',
      25,
    ]);

    const users = await service.query<{ name: string; email: string; age: number }>(
      'SELECT name, email, age FROM users WHERE email = $1',
      ['bob@integration.com']
    );

    expect(users).toHaveLength(1);
    expect(users[0]!.name).toBe('Bob Integration');
    expect(users[0]!.email).toBe('bob@integration.com');
    expect(users[0]!.age).toBe(25);
  });

  test('query - should support complex WHERE clauses', async () => {
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Charlie',
      'charlie@test.com',
      35,
    ]);
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'David',
      'david@test.com',
      40,
    ]);
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Eve',
      'eve@test.com',
      28,
    ]);

    const users = await service.query<{ name: string; age: number }>(
      'SELECT name, age FROM users WHERE age >= $1 AND age < $2 ORDER BY age',
      [30, 40]
    );

    expect(users).toHaveLength(2);
    expect(users[0]!.name).toBe('Charlie');
    expect(users[0]!.age).toBe(35);
    expect(users[1]!.name).toBe('David');
    expect(users[1]!.age).toBe(40);
  });

  test('execute - should update data and return affected rows', async () => {
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Frank',
      'frank@test.com',
      28,
    ]);

    const updateResult = await service.execute('UPDATE users SET age = $1 WHERE email = $2', [
      29,
      'frank@test.com',
    ]);

    expect(updateResult.rowsAffected).toBe(1);

    const users = await service.query<{ age: number }>('SELECT age FROM users WHERE email = $1', [
      'frank@test.com',
    ]);
    expect(users[0]!.age).toBe(29);
  });

  test('execute - should delete data and return affected rows', async () => {
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Grace',
      'grace@test.com',
      45,
    ]);

    const deleteResult = await service.execute('DELETE FROM users WHERE email = $1', [
      'grace@test.com',
    ]);

    expect(deleteResult.rowsAffected).toBe(1);

    const users = await service.query('SELECT * FROM users WHERE email = $1', ['grace@test.com']);
    expect(users).toHaveLength(0);
  });

  test('transaction - should commit changes when transaction succeeds', async () => {
    const result = await service.transaction(async (tx) => {
      await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Henry',
        'henry@test.com',
        32,
      ]);
      await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Iris',
        'iris@test.com',
        38,
      ]);
      return { success: true };
    });

    expect(result.success).toBe(true);

    const users = await service.query<{ name: string }>(
      'SELECT name FROM users WHERE email IN ($1, $2)',
      ['henry@test.com', 'iris@test.com']
    );
    expect(users).toHaveLength(2);
  });

  test('transaction - should rollback changes when transaction fails', async () => {
    await expect(
      service.transaction(async (tx) => {
        await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
          'Jack',
          'jack@test.com',
          29,
        ]);
        throw new Error('Intentional rollback');
      })
    ).rejects.toThrow('Intentional rollback');

    const users = await service.query('SELECT * FROM users WHERE email = $1', ['jack@test.com']);
    expect(users).toHaveLength(0);
  });

  test('transaction - should support nested queries within transaction', async () => {
    const userId = await service.transaction(async (tx) => {
      await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING id', [
        'Karen',
        'karen@test.com',
        42,
      ]);

      const users = await tx.query<{ id: number }>('SELECT id FROM users WHERE email = $1', [
        'karen@test.com',
      ]);

      return users[0]!.id;
    });

    expect(userId).toBeDefined();
    expect(typeof userId).toBe('number');

    // Verify data persisted after transaction
    const users = await service.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [
      userId,
    ]);
    expect(users[0]!.name).toBe('Karen');
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
            price DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      {
        version: '003',
        description: 'Add stock quantity',
        up: 'ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0',
        down: 'ALTER TABLE products DROP COLUMN stock',
      },
    ];

    await service.migrate(migrations);

    // Verify table exists with all columns
    await service.execute(
      'INSERT INTO products (name, price, category, stock) VALUES ($1, $2, $3, $4)',
      ['Widget Pro', 29.99, 'Tools', 100]
    );

    const products = await service.query<{
      name: string;
      category: string;
      stock: number;
    }>('SELECT name, category, stock FROM products WHERE name = $1', ['Widget Pro']);

    expect(products).toHaveLength(1);
    expect(products[0]!.name).toBe('Widget Pro');
    expect(products[0]!.category).toBe('Tools');
    expect(products[0]!.stock).toBe(100);
  });

  test('migrate - should skip already applied migrations', async () => {
    const migrations: Migration[] = [
      {
        version: '001',
        description: 'Create orders table',
        up: `
          CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            total DECIMAL(10, 2)
          )
        `,
        down: 'DROP TABLE orders',
      },
    ];

    // Apply migrations twice
    await service.migrate(migrations);
    await service.migrate(migrations); // Should not fail

    // Verify table exists
    await service.execute('INSERT INTO orders (total) VALUES ($1)', [99.99]);
    const orders = await service.query('SELECT * FROM orders');
    expect(orders).toHaveLength(1);
  });

  test('getConnection - should return a working connection', async () => {
    const conn = service.getConnection();

    expect(conn).toBeDefined();

    await conn.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Leo',
      'leo@test.com',
      31,
    ]);

    const users = await conn.query<{ name: string }>('SELECT name FROM users WHERE email = $1', [
      'leo@test.com',
    ]);

    expect(users).toHaveLength(1);
    expect(users[0]!.name).toBe('Leo');

    await conn.close();
  });

  test('Connection pooling - should handle multiple concurrent queries', async () => {
    const promises = [];

    // Execute 10 concurrent queries
    for (let i = 0; i < 10; i++) {
      promises.push(
        service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
          `User${i}`,
          `user${i}@test.com`,
          20 + i,
        ])
      );
    }

    await Promise.all(promises);

    const users = await service.query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    expect(users[0]!.count).toBe('10'); // PostgreSQL COUNT returns string
  });

  test('Large result sets - should handle queries returning many rows', async () => {
    // Insert 1000 rows
    for (let i = 0; i < 1000; i++) {
      await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        `Bulk${i}`,
        `bulk${i}@test.com`,
        (i % 50) + 20,
      ]);
    }

    const allUsers = await service.query('SELECT * FROM users');
    expect(allUsers.length).toBe(1000);
  });

  test('NULL handling - should properly handle NULL values', async () => {
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'NoAge',
      'noage@test.com',
      null,
    ]);

    const users = await service.query<{ name: string; age: number | null }>(
      'SELECT name, age FROM users WHERE email = $1',
      ['noage@test.com']
    );

    expect(users[0]!.name).toBe('NoAge');
    expect(users[0]!.age).toBeNull();
  });

  test('Error handling - should throw on constraint violation', async () => {
    await service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
      'Duplicate',
      'duplicate@test.com',
      25,
    ]);

    // Attempt duplicate email (UNIQUE constraint)
    await expect(
      service.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        'Duplicate2',
        'duplicate@test.com',
        30,
      ])
    ).rejects.toThrow();
  });
});
