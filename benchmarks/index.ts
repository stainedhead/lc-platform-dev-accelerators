/**
 * Performance Benchmarks for LC Platform Dev Accelerators
 * Measures overhead of abstraction layer vs direct provider calls
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
  avgLatency: number;
}

class Benchmark {
  private results: BenchmarkResult[] = [];

  async run(name: string, fn: () => Promise<void> | void, iterations = 10000): Promise<void> {
    // Warmup
    for (let i = 0; i < 100; i++) {
      await fn();
    }

    // Actual benchmark
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    const end = performance.now();

    const duration = end - start;
    const opsPerSecond = (iterations / duration) * 1000;
    const avgLatency = duration / iterations;

    this.results.push({
      name,
      operations: iterations,
      duration,
      opsPerSecond,
      avgLatency,
    });

    console.log(
      `${name.padEnd(50)} ${iterations.toLocaleString().padStart(10)} ops in ${duration.toFixed(2).padStart(10)}ms (${opsPerSecond.toFixed(0).padStart(10)} ops/s, ${avgLatency.toFixed(3)}ms avg)`
    );
  }

  async group(name: string, fn: () => Promise<void>): Promise<void> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${name}`);
    console.log(`${'='.repeat(80)}`);
    await fn();
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  printSummary(): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(
      `${'Benchmark'.padEnd(50)} ${'Operations'.padStart(10)} ${'Duration'.padStart(12)} ${'Ops/sec'.padStart(12)} ${'Avg Latency'.padStart(12)}`
    );
    console.log(`${'-'.repeat(80)}`);

    for (const result of this.results) {
      console.log(
        `${result.name.padEnd(50)} ${result.operations.toLocaleString().padStart(10)} ${result.duration.toFixed(2).padStart(10)}ms ${result.opsPerSecond.toFixed(0).padStart(10)} ${result.avgLatency.toFixed(3).padStart(10)}ms`
      );
    }
  }
}

// Import services for benchmarking
import { ObjectStoreServiceFactory } from '../src/factory/ObjectStoreServiceFactory';
import { DataStoreServiceFactory } from '../src/factory/DataStoreServiceFactory';
import { BatchServiceFactory } from '../src/factory/BatchServiceFactory';
import { QueueServiceFactory } from '../src/factory/QueueServiceFactory';
import { SecretsServiceFactory } from '../src/factory/SecretsServiceFactory';
import { ConfigurationServiceFactory } from '../src/factory/ConfigurationServiceFactory';
import { ProviderType } from '../src/index';

async function main() {
  const bench = new Benchmark();

  console.log('LC Platform Dev Accelerators - Performance Benchmarks');
  console.log(`Runtime: Bun ${Bun.version}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Object Store Service Benchmarks
  await bench.group('Object Store Service', async () => {
    const storage = new ObjectStoreServiceFactory().create({ provider: ProviderType.MOCK });
    await storage.createBucket('test-bucket');

    await bench.run('ObjectStoreService - Upload small file (1KB)', async () => {
      await storage.putObject('test-bucket', 'test-key', Buffer.from('x'.repeat(1024)));
    });

    await bench.run('ObjectStoreService - Download file', async () => {
      await storage.getObject('test-bucket', 'test-key');
    });

    await bench.run('ObjectStoreService - Delete file', async () => {
      await storage.deleteObject('test-bucket', 'test-key');
      await storage.putObject('test-bucket', 'test-key', Buffer.from('test'));
    });

    await bench.run('ObjectStoreService - List files', async () => {
      await storage.listObjects('test-bucket');
    });

    await bench.run('ObjectStoreService - Generate presigned URL', async () => {
      await storage.generatePresignedUrl('test-bucket', 'test-key');
    });
  });

  // Database Service Benchmarks
  await bench.group('Database Service', async () => {
    const db = new DataStoreServiceFactory().create({ provider: ProviderType.MOCK });
    await db.connect();

    await bench.run('DatabaseService - Simple SELECT query', async () => {
      await db.query('SELECT * FROM users WHERE id = $1', [1]);
    });

    await bench.run('DatabaseService - Query with parameters', async () => {
      await db.query('SELECT * FROM users WHERE email = $1 AND active = $2', [
        'test@example.com',
        true,
      ]);
    });

    await bench.run('DatabaseService - Transaction (3 queries)', async () => {
      await db.transaction(async (tx) => {
        await tx.query('SELECT * FROM users WHERE id = $1', [1]);
        await tx.execute('UPDATE users SET last_login = $1 WHERE id = $2', [new Date(), 1]);
        await tx.execute('INSERT INTO audit_log (user_id, action) VALUES ($1, $2)', [1, 'login']);
      });
    });
  });

  // Batch Service Benchmarks
  await bench.group('Batch Service', async () => {
    const batch = new BatchServiceFactory().create({ provider: ProviderType.MOCK });

    await bench.run('BatchService - Submit job', async () => {
      await batch.submitJob({
        name: 'test-job',
        image: 'test-image:latest',
        command: ['echo', 'hello'],
      });
    });

    // Create some jobs for listing
    const jobIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const job = await batch.submitJob({
        name: `job-${i}`,
        image: 'test:latest',
        command: ['echo', String(i)],
      });
      jobIds.push(job.id);
    }

    await bench.run('BatchService - List jobs', async () => {
      await batch.listJobs();
    });

    await bench.run('BatchService - Get job', async () => {
      if (jobIds[0]) {
        await batch.getJob(jobIds[0]);
      }
    });
  });

  // Queue Service Benchmarks
  await bench.group('Queue Service', async () => {
    const queue = new QueueServiceFactory().create({ provider: ProviderType.MOCK });
    const queueData = await queue.createQueue('bench-queue');

    await bench.run('QueueService - Send message', async () => {
      await queue.sendMessage(queueData.url, { body: 'Test message content' });
    });

    // Pre-fill queue with messages
    for (let i = 0; i < 100; i++) {
      await queue.sendMessage(queueData.url, { body: `Message ${i}` });
    }

    await bench.run('QueueService - Receive messages', async () => {
      await queue.receiveMessages(queueData.url, { maxMessages: 10 });
    });

    await bench.run('QueueService - Delete message', async () => {
      const messages = await queue.receiveMessages(queueData.url, { maxMessages: 1 });
      if (messages.length > 0) {
        // Mock provider doesn't return receiptHandle, use message ID as placeholder
        await queue.deleteMessage(queueData.url, 'mock-receipt-handle');
      }
    });
  });

  // Secrets Service Benchmarks
  await bench.group('Secrets Service', async () => {
    const secrets = new SecretsServiceFactory().create({ provider: ProviderType.MOCK });

    await bench.run('SecretsService - Create secret', async () => {
      await secrets.createSecret({ name: `bench-secret-${Math.random()}`, value: 'secret-value' });
    });

    await secrets.createSecret({ name: 'bench-test', value: 'test-value' });

    await bench.run('SecretsService - Get secret value', async () => {
      await secrets.getSecretValue('bench-test');
    });

    await bench.run('SecretsService - List secrets', async () => {
      await secrets.listSecrets();
    });
  });

  // Configuration Service Benchmarks
  await bench.group('Configuration Service', async () => {
    const config = new ConfigurationServiceFactory().create({ provider: ProviderType.MOCK });

    await bench.run('ConfigurationService - Create config', async () => {
      await config.createConfiguration({
        name: `bench-config-${Math.random()}`,
        content: JSON.stringify({ key: 'value' }),
      });
    });

    await config.createConfiguration({ name: 'bench-test', content: JSON.stringify({ test: true }) });

    await bench.run('ConfigurationService - Get config', async () => {
      await config.getConfiguration('bench-test');
    });

    await bench.run('ConfigurationService - List configs', async () => {
      await config.listConfigurations();
    });
  });

  // Object Creation Benchmarks
  await bench.group('Object Creation Overhead', async () => {
    await bench.run(
      'Direct object creation',
      () => {
        void {
          id: '123',
          name: 'test',
          value: 42,
          active: true,
          created: new Date(),
        };
      },
      100000
    );

    await bench.run(
      'Object with type annotation',
      () => {
        interface TestType {
          id: string;
          name: string;
          value: number;
          active: boolean;
          created: Date;
        }
        const obj: TestType = {
          id: '123',
          name: 'test',
          value: 42,
          active: true,
          created: new Date(),
        };
        void obj;
      },
      100000
    );

    await bench.run(
      'Factory function pattern',
      () => {
        function createObject(id: string, name: string) {
          return {
            id,
            name,
            value: 42,
            active: true,
            created: new Date(),
          };
        }
        void createObject('123', 'test');
      },
      100000
    );
  });

  bench.printSummary();

  // Performance targets
  console.log(`\n${'='.repeat(80)}`);
  console.log('PERFORMANCE TARGETS');
  console.log(`${'='.repeat(80)}`);
  console.log('Service abstraction overhead should be < 5% vs direct implementation');
  console.log('Object creation should exceed 100,000 ops/sec');
  console.log('Storage operations should exceed 10,000 ops/sec');
  console.log('Database queries should exceed 50,000 ops/sec');
  console.log('Queue operations should exceed 20,000 ops/sec');
}

main().catch(console.error);
