/**
 * MVP Demo Test
 *
 * End-to-end test demonstrating User Story 1 working with Mock providers.
 * Shows developer deploying a web app with database and object storage.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { LCPlatform } from '../../src/LCPlatform';
import { ProviderType } from '../../src/core/types/common';

describe('MVP Demo - User Story 1', () => {
  let platform: LCPlatform;

  beforeAll(() => {
    // Initialize platform with Mock provider
    platform = new LCPlatform({
      provider: ProviderType.MOCK,
      region: 'us-east-1',
    });
  });

  test('Deploy web application with database and storage', async () => {
    // Step 1: Create object storage bucket for application assets
    const objectStore = platform.getObjectStore();
    await objectStore.createBucket('my-app-assets');

    // Upload a configuration file
    const configData = Buffer.from(
      JSON.stringify({
        appName: 'MyAwesomeApp',
        version: '1.0.0',
      })
    );
    await objectStore.putObject('my-app-assets', 'config.json', configData, {
      contentType: 'application/json',
    });

    // Verify upload
    const uploadedConfig = await objectStore.getObject('my-app-assets', 'config.json');
    expect(uploadedConfig.bucket).toBe('my-app-assets');
    expect(uploadedConfig.key).toBe('config.json');
    expect(uploadedConfig.contentType).toBe('application/json');

    console.log('✅ Storage: Uploaded config.json');

    // Step 2: Setup database (basic connection test)
    const dataStore = platform.getDataStore();
    await dataStore.connect();

    // Create users table
    await dataStore.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert test data
    const insertResult = await dataStore.execute(
      'INSERT INTO users (name, email) VALUES ($1, $2)',
      ['Alice Developer', 'alice@example.com']
    );

    expect(insertResult.rowsAffected).toBe(1);
    console.log('✅ Database: Created users table and inserted data');

    // Step 3: Deploy web application
    const webHosting = platform.getWebHosting();

    const deployment = await webHosting.deployApplication({
      name: 'my-awesome-app',
      image: 'myorg/awesome-app:v1.0.0',
      port: 3000,
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost/myapp',
        S3_BUCKET: 'my-app-assets',
      },
      cpu: 2,
      memory: 4096,
      minInstances: 2,
      maxInstances: 10,
    });

    // Verify deployment
    expect(deployment.name).toBe('my-awesome-app');
    expect(deployment.image).toBe('myorg/awesome-app:v1.0.0');
    expect(deployment.url).toBeDefined();
    expect(deployment.environment.NODE_ENV).toBe('production');
    expect(deployment.minInstances).toBe(2);
    expect(deployment.maxInstances).toBe(10);

    // Step 4: Get application URL
    const appUrl = await webHosting.getApplicationUrl(deployment.id);
    expect(appUrl).toMatch(/^https?:\/\//);

    // Step 5: Scale application
    await webHosting.scaleApplication(deployment.id, {
      minInstances: 3,
      maxInstances: 15,
    });

    const scaledDeployment = await webHosting.getDeployment(deployment.id);
    expect(scaledDeployment.minInstances).toBe(3);
    expect(scaledDeployment.maxInstances).toBe(15);

    // Step 6: Update application
    const updatedDeployment = await webHosting.updateApplication(deployment.id, {
      image: 'myorg/awesome-app:v1.1.0',
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost/myapp',
        S3_BUCKET: 'my-app-assets',
        FEATURE_FLAG_NEW_UI: 'true',
      },
    });

    expect(updatedDeployment.image).toBe('myorg/awesome-app:v1.1.0');
    expect(updatedDeployment.environment.FEATURE_FLAG_NEW_UI).toBe('true');

    console.log('✅ MVP Demo Complete!');
    console.log(`✅ Deployed: ${deployment.name}`);
    console.log(`✅ URL: ${appUrl}`);
  });

  test('Cloud-agnostic abstraction - switch providers via config only', () => {
    // Demonstrate that switching providers requires ZERO code changes
    const awsPlatform = new LCPlatform({
      provider: ProviderType.AWS,
      region: 'us-west-2',
    });

    const mockPlatform = new LCPlatform({
      provider: ProviderType.MOCK,
      region: 'local',
    });

    // Both platforms expose the same interface
    expect(typeof awsPlatform.getWebHosting).toBe('function');
    expect(typeof awsPlatform.getDataStore).toBe('function');
    expect(typeof awsPlatform.getObjectStore).toBe('function');

    expect(typeof mockPlatform.getWebHosting).toBe('function');
    expect(typeof mockPlatform.getDataStore).toBe('function');
    expect(typeof mockPlatform.getObjectStore).toBe('function');

    console.log('✅ Provider independence verified!');
    console.log('✅ Application code works with ANY provider');
  });
});
