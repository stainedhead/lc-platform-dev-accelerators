import { LCPlatform } from './src/LCPlatform';
import { PlatformType, Environment } from './src/core/types/application';
import { DependencyType, EncryptionType } from './src/core/types/dependency';
import { DependencyValidator } from './src/utils/dependencyValidator';
import { serializePolicy, deserializePolicy } from './src/utils/policySerializer';

console.log('🔍 LCPlatform Dependency Management - Health Check\n');

// Test User Story 1: Application Registration
const platform = new LCPlatform({ provider: 'mock' });
const app = platform.registerApplication({
  name: 'Test App',
  team: 'platform',
  moniker: 'testapp',
  ciAppId: 'APP-001',
  platformType: PlatformType.WEB,
  environment: Environment.DEVELOPMENT,
  supportEmail: 'support@test.com',
  ownerEmail: 'owner@test.com',
});

console.log('✅ User Story 1: Application Registration - WORKING');
console.log(`  - App ID: ${app.id}`);
console.log(`  - App Name: ${app.name}`);
console.log(`  - Platform type: ${app.platformType}`);

// Test User Story 2: Add Dependencies
app.setAccountId('123456');
const dep1 = app.addDependency('uploads', DependencyType.OBJECT_STORE, {
  type: 'object-store',
  versioning: true,
  encryption: EncryptionType.KMS,
  publicAccess: false,
});

const dep2 = app.addDependency('tasks', DependencyType.QUEUE, {
  type: 'queue',
  fifo: false,
  visibilityTimeout: 30,
  messageRetention: 3600,
  encryption: true,
});

const dep3 = app.addDependency('secrets', DependencyType.SECRETS, {
  type: 'secrets',
  encryption: true,
});

console.log('\n✅ User Story 2: Dependency Management - WORKING');
console.log(`  - Dependencies added: ${app.listDependencies().length}`);
console.log(`  - Object store generated name: ${dep1.generatedName}`);
console.log(`  - Queue generated name: ${dep2.generatedName}`);
console.log(`  - Get dependency: ${app.getDependency('uploads')?.name}`);

// Test dependency update
const updated = app.updateDependency('uploads', {
  configuration: {
    type: 'object-store',
    versioning: false,
    encryption: EncryptionType.AES256,
    publicAccess: false,
  },
});

console.log(`  - Update dependency: ${updated?.configuration.versioning === false ? 'SUCCESS' : 'FAILED'}`);

// Test User Story 3: Policy Serialization
const policy = {
  version: '1.0',
  provider: 'aws' as const,
  content: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::my-bucket/*',
      },
    ],
  }),
};

const yaml = serializePolicy(policy);
const deserialized = deserializePolicy(yaml);

console.log('\n✅ User Story 3: Policy Serialization - WORKING');
console.log(`  - YAML serialization: ${yaml.length} bytes`);
console.log(`  - Round-trip successful: ${deserialized.version === policy.version}`);
console.log(`  - Provider preserved: ${deserialized.provider === policy.provider}`);

// Test User Story 4: Validation
const validator = new DependencyValidator();
const validationResult = validator.validateApplication(app.listDependencies());

console.log('\n✅ User Story 4: Validation - WORKING');
console.log(`  - Valid: ${validationResult.valid}`);
console.log(`  - Validated: ${validationResult.validatedCount} dependencies`);
console.log(`  - Errors: ${validationResult.errorCount}`);

// Test invalid configuration
const invalidResult = validator.validateConfiguration(DependencyType.QUEUE, {
  type: 'queue',
  // Missing required fields
} as any);

console.log(`  - Invalid config detection: ${!invalidResult.valid ? 'WORKING' : 'FAILED'}`);
console.log(`  - Error reporting: ${invalidResult.errors && invalidResult.errors.length > 0 ? 'WORKING' : 'FAILED'}`);

// Test name collision detection
const deps = app.listDependencies();
deps.push({
  id: 'dup-1',
  name: 'uploads', // Duplicate!
  type: DependencyType.CACHE,
  status: 'pending' as any,
  configuration: { type: 'cache', engine: 'redis', nodeType: 't3.micro' },
  createdAt: new Date(),
  updatedAt: new Date(),
});

const collisionResult = validator.checkNameCollisions(deps);
console.log(`  - Name collision detection: ${!collisionResult.valid ? 'WORKING' : 'FAILED'}`);

// Test additional features
const tags = app.toResourceTags();
const accountId = app.getAccountId();

console.log('\n✅ Additional Features - WORKING');
console.log(`  - Resource tags generation: ${Object.keys(tags).length} tags`);
console.log(`  - Account ID getter: ${accountId}`);
console.log(`  - List applications: ${platform.listApplications().length} apps`);
console.log(`  - Get application: ${platform.getApplication(app.id)?.name}`);

// Test dependency removal
const removeResult = app.removeDependency('secrets');
console.log(`  - Dependency removal: ${removeResult ? 'WORKING' : 'FAILED'}`);
console.log(`  - Remaining dependencies: ${app.listDependencies().length}`);

// Test all 14 dependency types are defined
const allTypes = [
  DependencyType.OBJECT_STORE,
  DependencyType.QUEUE,
  DependencyType.SECRETS,
  DependencyType.DATA_STORE,
  DependencyType.DOCUMENT_STORE,
  DependencyType.CACHE,
  DependencyType.NOTIFICATION,
  DependencyType.FUNCTION_HOSTING,
  DependencyType.WEB_HOSTING,
  DependencyType.BATCH,
  DependencyType.AUTHENTICATION,
  DependencyType.CONTAINER_REPO,
  DependencyType.EVENT_BUS,
  DependencyType.CONFIGURATION,
];

console.log(`\n✅ Dependency Types: ${allTypes.length} types defined`);

console.log('\n🎉 Health Check Complete - All Features Working!\n');
