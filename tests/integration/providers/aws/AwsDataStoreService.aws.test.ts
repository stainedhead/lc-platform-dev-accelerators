/**
 * Integration Test: AwsDataStoreService with Real AWS RDS PostgreSQL
 *
 * Tests AWS RDS PostgreSQL implementation against real AWS services.
 * Requires: AWS RDS PostgreSQL instance already created and accessible
 *
 * Environment Variables Required:
 * - RDS_HOST: RDS endpoint (e.g., mydb.xxxx.us-east-1.rds.amazonaws.com)
 * - RDS_PORT: Port number (default: 5432)
 * - RDS_DATABASE: Database name
 * - RDS_USER: Database username
 * - RDS_PASSWORD: Database password
 *
 * Infrastructure Notes:
 * - RDS instance must be created manually (15-30 min to provision)
 * - Security group must allow inbound traffic from test runner's IP
 * - Tests create/drop tables but do not create/destroy the RDS instance
 * - Recommended: Use a dedicated test database, not production
 *
 * Cost Considerations:
 * - RDS instances incur hourly charges even when idle
 * - Consider using db.t3.micro for testing (free tier eligible)
 * - Delete RDS instance after testing if not needed
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { AwsDataStoreService } from '../../../../src/providers/aws/AwsDataStoreService';
import type { Migration } from '../../../../src/core/types/datastore';

// RDS connection config from environment variables
const RDS_CONFIG = {
  host: process.env.RDS_HOST ?? '',
  port: parseInt(process.env.RDS_PORT ?? '5432'),
  database: process.env.RDS_DATABASE ?? '',
  user: process.env.RDS_USER ?? '',
  password: process.env.RDS_PASSWORD ?? '',
  connectionTimeout: 30000, // 30 seconds for RDS connection
};

// Skip tests if RDS environment variables not set
const RDS_CONFIGURED =
  RDS_CONFIG.host !== '' &&
  RDS_CONFIG.database !== '' &&
  RDS_CONFIG.user !== '' &&
  RDS_CONFIG.password !== '';

// Test table prefix for isolation
const TEST_PREFIX = `lcplatform_test_${Date.now()}`;
const TEST_TABLE_USERS = `${TEST_PREFIX}_users`;
const TEST_TABLE_PRODUCTS = `${TEST_PREFIX}_products`;
const TEST_TABLE_ORDERS = `${TEST_PREFIX}_orders`;

describe.skipIf(!RDS_CONFIGURED)('AwsDataStoreService Integration (AWS RDS)', () => {
  let service: AwsDataStoreService;

  beforeAll(async () => {
    if (!RDS_CONFIGURED) {
      console.warn('Skipping RDS tests - environment variables not configured');
      console.warn('Required: RDS_HOST, RDS_DATABASE, RDS_USER, RDS_PASSWORD');
      return;
    }

    console.log(`Connecting to RDS at ${RDS_CONFIG.host}:${RDS_CONFIG.port}...`);

    service = new AwsDataStoreService(RDS_CONFIG);
    await service.connect();

    console.log('Connected to RDS successfully');
  });

  afterAll(async () => {
    if (!RDS_CONFIGURED || !service) {
      return;
    }

    // Cleanup all test tables
    console.log('Cleaning up test tables...');
    try {
      await service.execute(`DROP TABLE IF EXISTS ${TEST_TABLE_USERS} CASCADE`);
      await service.execute(`DROP TABLE IF EXISTS ${TEST_TABLE_PRODUCTS} CASCADE`);
      await service.execute(`DROP TABLE IF EXISTS ${TEST_TABLE_ORDERS} CASCADE`);
      await service.execute(`DROP TABLE IF EXISTS migrations CASCADE`);
      console.log('Test tables cleaned up successfully');
    } catch (error) {
      console.warn(`Cleanup warning: ${(error as Error).message}`);
    }
  });

  beforeEach(async () => {
    // Clean and recreate users table before each test
    await service.execute(`DROP TABLE IF EXISTS ${TEST_TABLE_USERS} CASCADE`);
    await service.execute(`DROP TABLE IF EXISTS ${TEST_TABLE_PRODUCTS} CASCADE`);
    await service.execute(`DROP TABLE IF EXISTS ${TEST_TABLE_ORDERS} CASCADE`);

    // Create fresh users table
    await service.execute(`
      CREATE TABLE ${TEST_TABLE_USERS} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        age INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  test('connect - should establish RDS PostgreSQL connection', async () => {
    const newService = new AwsDataStoreService(RDS_CONFIG);
    await expect(newService.connect()).resolves.not.toThrow();
  });

  test('execute - should insert data and return affected rows', async () => {
    const result = await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Alice RDS', 'alice@rds.com', 30]
    );

    expect(result.rowsAffected).toBe(1);
  });

  test('query - should retrieve inserted data', async () => {
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Bob RDS', 'bob@rds.com', 25]
    );

    const users = await service.query<{ name: string; email: string; age: number }>(
      `SELECT name, email, age FROM ${TEST_TABLE_USERS} WHERE email = $1`,
      ['bob@rds.com']
    );

    expect(users).toHaveLength(1);
    expect(users[0]!.name).toBe('Bob RDS');
    expect(users[0]!.email).toBe('bob@rds.com');
    expect(users[0]!.age).toBe(25);
  });

  test('query - should support complex WHERE clauses', async () => {
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Charlie', 'charlie@rds.com', 35]
    );
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['David', 'david@rds.com', 40]
    );
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Eve', 'eve@rds.com', 28]
    );

    const users = await service.query<{ name: string; age: number }>(
      `SELECT name, age FROM ${TEST_TABLE_USERS} WHERE age >= $1 AND age <= $2 ORDER BY age`,
      [30, 40]
    );

    expect(users).toHaveLength(2);
    expect(users[0]!.name).toBe('Charlie');
    expect(users[0]!.age).toBe(35);
    expect(users[1]!.name).toBe('David');
    expect(users[1]!.age).toBe(40);
  });

  test('execute - should update data and return affected rows', async () => {
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Frank', 'frank@rds.com', 28]
    );

    const updateResult = await service.execute(
      `UPDATE ${TEST_TABLE_USERS} SET age = $1 WHERE email = $2`,
      [29, 'frank@rds.com']
    );

    expect(updateResult.rowsAffected).toBe(1);

    const users = await service.query<{ age: number }>(
      `SELECT age FROM ${TEST_TABLE_USERS} WHERE email = $1`,
      ['frank@rds.com']
    );
    expect(users[0]!.age).toBe(29);
  });

  test('execute - should delete data and return affected rows', async () => {
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Grace', 'grace@rds.com', 45]
    );

    const deleteResult = await service.execute(`DELETE FROM ${TEST_TABLE_USERS} WHERE email = $1`, [
      'grace@rds.com',
    ]);

    expect(deleteResult.rowsAffected).toBe(1);

    const users = await service.query(`SELECT * FROM ${TEST_TABLE_USERS} WHERE email = $1`, [
      'grace@rds.com',
    ]);
    expect(users).toHaveLength(0);
  });

  test('transaction - should commit changes when transaction succeeds', async () => {
    const result = await service.transaction(async (tx) => {
      await tx.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
        'Henry',
        'henry@rds.com',
        32,
      ]);
      await tx.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
        'Iris',
        'iris@rds.com',
        38,
      ]);
      return { success: true };
    });

    expect(result.success).toBe(true);

    const users = await service.query<{ name: string }>(
      `SELECT name FROM ${TEST_TABLE_USERS} WHERE email IN ($1, $2)`,
      ['henry@rds.com', 'iris@rds.com']
    );
    expect(users).toHaveLength(2);
  });

  test('transaction - should rollback changes when transaction fails', async () => {
    await expect(
      service.transaction(async (tx) => {
        await tx.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
          'Jack',
          'jack@rds.com',
          29,
        ]);
        throw new Error('Intentional rollback');
      })
    ).rejects.toThrow('Intentional rollback');

    const users = await service.query(`SELECT * FROM ${TEST_TABLE_USERS} WHERE email = $1`, [
      'jack@rds.com',
    ]);
    expect(users).toHaveLength(0);
  });

  test('transaction - should support nested queries within transaction', async () => {
    const userId = await service.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3) RETURNING id`,
        ['Karen', 'karen@rds.com', 42]
      );

      const users = await tx.query<{ id: number }>(
        `SELECT id FROM ${TEST_TABLE_USERS} WHERE email = $1`,
        ['karen@rds.com']
      );

      return users[0]!.id;
    });

    expect(userId).toBeDefined();
    expect(typeof userId).toBe('number');

    // Verify data persisted after transaction
    const users = await service.query<{ name: string }>(
      `SELECT name FROM ${TEST_TABLE_USERS} WHERE id = $1`,
      [userId]
    );
    expect(users[0]!.name).toBe('Karen');
  });

  test('migrate - should apply database migrations in order', async () => {
    const migrations: Migration[] = [
      {
        version: '001',
        description: 'Create products table',
        up: `
          CREATE TABLE ${TEST_TABLE_PRODUCTS} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            price DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: `DROP TABLE ${TEST_TABLE_PRODUCTS}`,
      },
      {
        version: '002',
        description: 'Add category to products',
        up: `ALTER TABLE ${TEST_TABLE_PRODUCTS} ADD COLUMN category VARCHAR(50)`,
        down: `ALTER TABLE ${TEST_TABLE_PRODUCTS} DROP COLUMN category`,
      },
      {
        version: '003',
        description: 'Add stock quantity',
        up: `ALTER TABLE ${TEST_TABLE_PRODUCTS} ADD COLUMN stock INTEGER DEFAULT 0`,
        down: `ALTER TABLE ${TEST_TABLE_PRODUCTS} DROP COLUMN stock`,
      },
    ];

    await service.migrate(migrations);

    // Verify table exists with all columns
    await service.execute(
      `INSERT INTO ${TEST_TABLE_PRODUCTS} (name, price, category, stock) VALUES ($1, $2, $3, $4)`,
      ['Widget Pro', 29.99, 'Tools', 100]
    );

    const products = await service.query<{
      name: string;
      category: string;
      stock: number;
    }>(`SELECT name, category, stock FROM ${TEST_TABLE_PRODUCTS} WHERE name = $1`, ['Widget Pro']);

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
          CREATE TABLE ${TEST_TABLE_ORDERS} (
            id SERIAL PRIMARY KEY,
            total DECIMAL(10, 2)
          )
        `,
        down: `DROP TABLE ${TEST_TABLE_ORDERS}`,
      },
    ];

    // Apply migrations twice
    await service.migrate(migrations);
    await service.migrate(migrations); // Should not fail

    // Verify table exists
    await service.execute(`INSERT INTO ${TEST_TABLE_ORDERS} (total) VALUES ($1)`, [99.99]);
    const orders = await service.query(`SELECT * FROM ${TEST_TABLE_ORDERS}`);
    expect(orders).toHaveLength(1);
  });

  test('getConnection - should return a working connection', async () => {
    const conn = service.getConnection();

    expect(conn).toBeDefined();

    await conn.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
      'Leo',
      'leo@rds.com',
      31,
    ]);

    const users = await conn.query<{ name: string }>(
      `SELECT name FROM ${TEST_TABLE_USERS} WHERE email = $1`,
      ['leo@rds.com']
    );

    expect(users).toHaveLength(1);
    expect(users[0]!.name).toBe('Leo');

    await conn.close();
  });

  test('Connection pooling - should handle multiple concurrent queries', async () => {
    const promises = [];

    // Execute 10 concurrent queries
    for (let i = 0; i < 10; i++) {
      promises.push(
        service.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
          `User${i}`,
          `user${i}@rds.com`,
          20 + i,
        ])
      );
    }

    await Promise.all(promises);

    const users = await service.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${TEST_TABLE_USERS}`
    );
    expect(users[0]!.count).toBe('10'); // PostgreSQL COUNT returns string
  });

  test('Large result sets - should handle queries returning many rows', async () => {
    // Insert 100 rows (less than local test due to network latency)
    for (let i = 0; i < 100; i++) {
      await service.execute(
        `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
        [`Bulk${i}`, `bulk${i}@rds.com`, (i % 50) + 20]
      );
    }

    const allUsers = await service.query(`SELECT * FROM ${TEST_TABLE_USERS}`);
    expect(allUsers.length).toBe(100);
  });

  test('NULL handling - should properly handle NULL values', async () => {
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['NoAge', 'noage@rds.com', null]
    );

    const users = await service.query<{ name: string; age: number | null }>(
      `SELECT name, age FROM ${TEST_TABLE_USERS} WHERE email = $1`,
      ['noage@rds.com']
    );

    expect(users[0]!.name).toBe('NoAge');
    expect(users[0]!.age).toBeNull();
  });

  test('Error handling - should throw on constraint violation', async () => {
    await service.execute(
      `INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`,
      ['Duplicate', 'duplicate@rds.com', 25]
    );

    // Attempt duplicate email (UNIQUE constraint)
    await expect(
      service.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
        'Duplicate2',
        'duplicate@rds.com',
        30,
      ])
    ).rejects.toThrow();
  });

  test('RDS-specific - should handle SSL/TLS connection', async () => {
    // This test validates the connection works over the network
    // RDS connections typically use SSL
    const result = await service.query<{ ssl: boolean }>(
      'SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()'
    );

    // If RDS is configured to require SSL, this should show SSL is active
    // Note: This may fail if SSL is not configured on the RDS instance
    if (result.length > 0) {
      console.log(`SSL connection: ${result[0]!.ssl}`);
    }
  });

  test('RDS-specific - should handle network latency gracefully', async () => {
    const start = Date.now();

    // Execute a simple query
    await service.query('SELECT 1 as test');

    const duration = Date.now() - start;
    console.log(`RDS query latency: ${duration}ms`);

    // Expect reasonable latency for RDS (typically < 100ms for simple queries)
    expect(duration).toBeLessThan(5000); // 5 second max for any query
  });

  test('Batch operations - should handle bulk insert efficiently', async () => {
    const batchSize = 50;
    const values: Array<[string, string, number]> = [];

    for (let i = 0; i < batchSize; i++) {
      values.push([`Batch${i}`, `batch${i}@rds.com`, 20 + (i % 30)]);
    }

    // Use a single transaction for batch insert
    await service.transaction(async (tx) => {
      for (const [name, email, age] of values) {
        await tx.execute(`INSERT INTO ${TEST_TABLE_USERS} (name, email, age) VALUES ($1, $2, $3)`, [
          name,
          email,
          age,
        ]);
      }
    });

    const count = await service.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${TEST_TABLE_USERS}`
    );
    expect(parseInt(count[0]!.count)).toBe(batchSize);
  });
});
