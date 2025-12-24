/**
 * Integration tests for Application Lifecycle
 *
 * Following TDD: These tests are written FIRST and should FAIL before implementation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { LCPlatform } from '../../src/LCPlatform';
import { PlatformType, Environment } from '../../src/core/types/application';
import { DependencyType, EncryptionType, DependencyStatus } from '../../src/core/types/dependency';
import type { DependencyConfiguration } from '../../src/core/types/dependency';
import { ProviderType } from '../../src/core/types/common';
import type { ObjectStoreService } from '../../src/utils/configPersistence';

describe('Application Registration Workflow', () => {
  let platform: LCPlatform;

  beforeEach(() => {
    platform = new LCPlatform({ provider: ProviderType.MOCK });
  });

  test('should register new application and retrieve it', () => {
    const appData = {
      name: 'Test Application',
      team: 'test-team',
      moniker: 'testapp',
      ciAppId: 'APP-TEST-001',
      platformType: PlatformType.WEB,
      environment: Environment.DEVELOPMENT,
      supportEmail: 'support@test.com',
      ownerEmail: 'owner@test.com',
    };

    const app = platform.registerApplication(appData);

    expect(app.id).toMatch(/^app-[a-f0-9]{8}$/);
    expect(app.name).toBe('Test Application');

    const retrieved = platform.getApplication(app.id);
    expect(retrieved).toEqual(app);
  });

  test('should list all registered applications', () => {
    const app1 = platform.registerApplication({
      name: 'App 1',
      team: 'team-a',
      moniker: 'app1',
      ciAppId: 'APP-001',
      platformType: PlatformType.WEB,
      environment: Environment.DEVELOPMENT,
      supportEmail: 'support@app1.com',
      ownerEmail: 'owner@app1.com',
    });

    const app2 = platform.registerApplication({
      name: 'App 2',
      team: 'team-b',
      moniker: 'app2',
      ciAppId: 'APP-002',
      platformType: PlatformType.API,
      environment: Environment.PRODUCTION,
      supportEmail: 'support@app2.com',
      ownerEmail: 'owner@app2.com',
    });

    const apps = platform.listApplications();
    expect(apps).toHaveLength(2);
    expect(apps).toContainEqual(app1);
    expect(apps).toContainEqual(app2);
  });
});

describe('Dependency Management Workflow', () => {
  let platform: LCPlatform;

  beforeEach(() => {
    platform = new LCPlatform({ provider: ProviderType.MOCK });
  });

  test('should add dependencies to application', () => {
    const app = platform.registerApplication({
      name: 'Test App',
      team: 'test-team',
      moniker: 'testapp',
      ciAppId: 'APP-001',
      platformType: PlatformType.WEB,
      environment: Environment.DEVELOPMENT,
      supportEmail: 'support@test.com',
      ownerEmail: 'owner@test.com',
    });

    app.setAccountId('123456');

    const dep1 = app.addDependency('uploads', DependencyType.OBJECT_STORE, {
      type: 'object-store',
      versioning: true,
      encryption: EncryptionType.KMS,
      publicAccess: false,
    });

    expect(dep1.name).toBe('uploads');
    expect(dep1.type).toBe(DependencyType.OBJECT_STORE);
    expect(dep1.generatedName).toMatch(/^lcp-123456-test-team-testapp-store-uploads$/);

    const dep2 = app.addDependency('tasks', DependencyType.QUEUE, {
      type: 'queue',
      fifo: false,
      visibilityTimeout: 30,
      messageRetention: 3600,
      encryption: true,
    });

    expect(app.listDependencies()).toHaveLength(2);
    expect(app.getDependency('uploads')).toEqual(dep1);
    expect(app.getDependency('tasks')).toEqual(dep2);
  });

  test('should prevent duplicate dependency names', () => {
    const app = platform.registerApplication({
      name: 'Test App',
      team: 'test-team',
      moniker: 'testapp',
      ciAppId: 'APP-001',
      platformType: PlatformType.WEB,
      environment: Environment.DEVELOPMENT,
      supportEmail: 'support@test.com',
      ownerEmail: 'owner@test.com',
    });

    app.addDependency('uploads', DependencyType.OBJECT_STORE, {
      type: 'object-store',
      versioning: true,
      encryption: EncryptionType.NONE,
      publicAccess: false,
    });

    expect(() => {
      app.addDependency('uploads', DependencyType.OBJECT_STORE, {
        type: 'object-store',
        versioning: false,
        encryption: EncryptionType.NONE,
        publicAccess: true,
      });
    }).toThrow(/already exists/);
  });
});

describe.skip('Configuration Persistence Workflow (T057)', () => {
  // Mock ObjectStoreService
  class MockObjectStoreService {
    private storage = new Map<string, string>();

    async putObject(bucket: string, key: string, content: string): Promise<void> {
      this.storage.set(`${bucket}/${key}`, content);
    }

    async getObject(bucket: string, key: string): Promise<string> {
      const content = this.storage.get(`${bucket}/${key}`);
      if (content === undefined) {
        throw new Error(`Object not found: ${bucket}/${key}`);
      }
      return content;
    }

    async listObjects(bucket: string, prefix: string): Promise<string[]> {
      const keys: string[] = [];
      for (const [key] of this.storage) {
        if (key.startsWith(`${bucket}/${prefix}`)) {
          keys.push(key.replace(`${bucket}/`, ''));
        }
      }
      return keys;
    }
  }

  test('should persist and retrieve complete application configuration', async () => {
    const { ConfigurationPersistence } = await import('../../src/utils/configPersistence');
    const mockStore = new MockObjectStoreService();
    const persistence = new ConfigurationPersistence(mockStore as unknown as ObjectStoreService);

    // Create application with dependencies
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const app = platform.registerApplication({
      name: 'Production App',
      team: 'platform',
      moniker: 'prodapp',
      ciAppId: 'APP-PROD-001',
      platformType: PlatformType.API,
      environment: Environment.PRODUCTION,
      supportEmail: 'support@prod.com',
      ownerEmail: 'owner@prod.com',
    });

    app.setAccountId('999888');

    // Add multiple dependencies
    app.addDependency('data-bucket', DependencyType.OBJECT_STORE, {
      type: 'object-store',
      versioning: true,
      encryption: EncryptionType.KMS,
      publicAccess: false,
    });

    app.addDependency('task-queue', DependencyType.QUEUE, {
      type: 'queue',
      fifo: true,
      visibilityTimeout: 60,
      messageRetention: 7200,
      encryption: true,
    });

    app.addDependency('api-secrets', DependencyType.SECRETS, {
      type: 'secrets',
      secretName: 'api-secrets',
      description: 'API secrets for production',
    });

    // Persist version
    await persistence.persistVersion(
      app,
      'lcp-prod-config',
      'v1.0.0',
      'admin@prod.com',
      'Initial production release'
    );

    // Retrieve version
    const version = await persistence.retrieveVersion(
      'lcp-prod-config',
      'lcp-999888-platform-prodapp',
      'v1.0.0'
    );

    expect(version.version).toBe('v1.0.0');
    expect(version.appId).toBe(app.id);
    expect(version.dependencies).toHaveLength(3);
    expect(version.createdBy).toBe('admin@prod.com');
    expect(version.changeLog).toBe('Initial production release');

    // Verify all dependencies are present
    const depNames = version.dependencies.map((d) => d.name);
    expect(depNames).toContain('data-bucket');
    expect(depNames).toContain('task-queue');
    expect(depNames).toContain('api-secrets');
  });

  test('should handle multiple versions', async () => {
    const { ConfigurationPersistence } = await import('../../src/utils/configPersistence');
    const mockStore = new MockObjectStoreService();
    const persistence = new ConfigurationPersistence(mockStore as unknown as ObjectStoreService);

    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const app = platform.registerApplication({
      name: 'Versioned App',
      team: 'engineering',
      moniker: 'verapp',
      ciAppId: 'APP-VER-001',
      platformType: PlatformType.WEB,
      environment: Environment.STAGING,
      supportEmail: 'support@ver.com',
      ownerEmail: 'owner@ver.com',
    });

    app.setAccountId('111222');

    // Version 1.0.0
    app.addDependency('database', DependencyType.DATA_STORE, {
      type: 'data-store',
      engine: 'postgres',
      instanceClass: 'db.t3.micro',
      allocatedStorage: 20,
    });

    await persistence.persistVersion(app, 'lcp-ver-config', 'v1.0.0', 'dev@ver.com', 'Initial');

    // Version 1.1.0 - add another dependency
    app.addDependency('config', DependencyType.OBJECT_STORE, {
      type: 'object-store',
      versioning: false,
      encryption: EncryptionType.NONE,
      publicAccess: false,
    });

    await persistence.persistVersion(
      app,
      'lcp-ver-config',
      'v1.1.0',
      'dev@ver.com',
      'Added notifications'
    );

    // List versions
    const versions = await persistence.listVersions(
      'lcp-ver-config',
      'lcp-111222-engineering-verapp'
    );

    expect(versions).toHaveLength(2);
    expect(versions).toContain('v1.0.0');
    expect(versions).toContain('v1.1.0');

    // Retrieve specific versions
    const v1 = await persistence.retrieveVersion(
      'lcp-ver-config',
      'lcp-111222-engineering-verapp',
      'v1.0.0'
    );
    expect(v1.dependencies).toHaveLength(1);

    const v2 = await persistence.retrieveVersion(
      'lcp-ver-config',
      'lcp-111222-engineering-verapp',
      'v1.1.0'
    );
    expect(v2.dependencies).toHaveLength(2);
  });
});

describe.skip('Dependency Validation Workflow (T076)', () => {
  test('should validate application with 50 dependencies', async () => {
    const { DependencyValidator } = await import('../../src/utils/dependencyValidator');
    const validator = new DependencyValidator();

    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const app = platform.registerApplication({
      name: 'Large App',
      team: 'platform',
      moniker: 'largeapp',
      ciAppId: 'APP-LARGE-001',
      platformType: PlatformType.WEB,
      environment: Environment.PRODUCTION,
      supportEmail: 'support@large.com',
      ownerEmail: 'owner@large.com',
    });

    app.setAccountId('555666');

    // Add 50 dependencies with various types
    for (let i = 0; i < 50; i++) {
      const depType =
        i % 4 === 0
          ? DependencyType.OBJECT_STORE
          : i % 4 === 1
            ? DependencyType.QUEUE
            : i % 4 === 2
              ? DependencyType.SECRETS
              : DependencyType.DATA_STORE;

      let config: unknown;
      if (depType === DependencyType.OBJECT_STORE) {
        config = {
          type: 'object-store',
          versioning: true,
          encryption: EncryptionType.KMS,
          publicAccess: false,
        };
      } else if (depType === DependencyType.QUEUE) {
        config = {
          type: 'queue',
          fifo: false,
          visibilityTimeout: 30,
          messageRetention: 3600,
          encryption: true,
        };
      } else if (depType === DependencyType.SECRETS) {
        config = {
          type: 'secrets',
          secretName: `dep-${i}`,
          description: `Secret ${i}`,
        };
      } else {
        config = {
          type: 'data-store',
          engine: 'postgres',
          instanceClass: 'db.t3.micro',
          allocatedStorage: 20,
        };
      }

      app.addDependency(`dep-${i}`, depType, config as DependencyConfiguration);
    }

    // Validate all dependencies
    const result = validator.validateApplication(app.listDependencies());

    expect(result.valid).toBe(true);
    expect(result.validatedCount).toBe(50);
    expect(result.errorCount).toBe(0);
  });

  test('should detect errors in large application', async () => {
    const { DependencyValidator } = await import('../../src/utils/dependencyValidator');
    const validator = new DependencyValidator();

    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const app = platform.registerApplication({
      name: 'Large App With Errors',
      team: 'platform',
      moniker: 'largeapp2',
      ciAppId: 'APP-LARGE-002',
      platformType: PlatformType.WEB,
      environment: Environment.PRODUCTION,
      supportEmail: 'support@large.com',
      ownerEmail: 'owner@large.com',
    });

    app.setAccountId('777888');

    // Add 48 valid dependencies
    for (let i = 0; i < 48; i++) {
      app.addDependency(`dep-${i}`, DependencyType.SECRETS, {
        type: 'secrets',
        secretName: `dep-${i}`,
        description: `Secret ${i}`,
      });
    }

    // Add 2 invalid dependencies (manually create with invalid configs)
    const deps = app.listDependencies();
    deps.push({
      id: 'dep-invalid-1',
      name: 'invalid-1',
      type: DependencyType.QUEUE,
      status: DependencyStatus.PENDING,
      configuration: {
        type: 'queue',
        // Missing required fields
      } as unknown as DependencyConfiguration,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    deps.push({
      id: 'dep-invalid-2',
      name: 'invalid-2',
      type: DependencyType.OBJECT_STORE,
      status: DependencyStatus.PENDING,
      configuration: {
        type: 'object-store',
        // Missing required fields
      } as unknown as DependencyConfiguration,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Validate all
    const result = validator.validateApplication(deps);

    expect(result.valid).toBe(false);
    expect(result.validatedCount).toBe(48);
    expect(result.errorCount).toBe(2);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
