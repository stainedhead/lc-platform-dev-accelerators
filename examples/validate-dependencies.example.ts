/**
 * Example: Validating Cloud Infrastructure Dependencies
 *
 * This example demonstrates how to use the DependencyValidator
 * to validate cloud infrastructure configuration files.
 *
 * Scenarios covered:
 * 1. Loading and validating a single configuration file
 * 2. Batch validation of multiple configuration files
 * 3. Generating helpful error reports for DevOps teams
 * 4. Integration with configuration management systems
 */

import { DependencyValidator, ApplicationDependency } from '../src/validation/DependencyValidator';

/**
 * Example 1: Validate a single configuration file
 */
function validateSingleConfiguration() {
  console.log('=== Example 1: Single Configuration Validation ===\n');

  const validator = new DependencyValidator();

  // Example configuration for an RDS database
  const rdsConfig = {
    id: 'dep-rds-postgres-prod',
    name: 'production-database',
    type: 'database' as const,
    provider: 'aws' as const,
    region: 'us-east-1',
    status: 'deployed' as const,
    version: '1.0.0',
    environment: 'prod' as const,
    description: 'PostgreSQL RDS instance for production workloads',
    configuration: {
      engine: 'postgres',
      engineVersion: '15.3',
      instanceClass: 'db.t3.medium',
      allocatedStorage: 100,
      multiAz: true,
      backupRetentionPeriod: 30,
    },
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'rds.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    },
    generatedName: 'lcp-prod-app-db-postgres',
    tags: {
      Application: 'myapp',
      Team: 'backend',
      Environment: 'prod',
      CostCenter: 'engineering',
    },
    dependencies: [], // No dependencies
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-15T12:00:00Z',
    deployedAt: '2025-01-15T13:00:00Z',
  };

  const result = validator.validateDependency(rdsConfig);

  if (result.valid) {
    console.log('✓ Configuration is valid!');
    console.log(`  ID: ${result.data?.id}`);
    console.log(`  Name: ${result.data?.name}`);
    console.log(`  Type: ${result.data?.type}`);
    console.log(`  Provider: ${result.data?.provider}`);
    console.log(`  Status: ${result.data?.status}`);
  } else {
    console.log('✗ Configuration validation failed!');
    result.errors?.forEach((error) => {
      console.log(`  Path: ${error.path}`);
      console.log(`  Error: ${error.message}`);
    });
  }

  console.log();
}

/**
 * Example 2: Validate multiple configurations (batch operation)
 */
function validateBatchConfigurations() {
  console.log('=== Example 2: Batch Configuration Validation ===\n');

  const validator = new DependencyValidator();

  // Example: Infrastructure for a multi-tier application
  const configurations: ApplicationDependency[] = [
    {
      id: 'dep-rds-db-01',
      name: 'application-database',
      type: 'database',
      provider: 'aws',
      region: 'us-east-1',
      status: 'deployed',
      version: '1.0.0',
      environment: 'prod',
      configuration: { engine: 'postgres', engineVersion: '15.3' },
      tags: { Application: 'app', Environment: 'prod' },
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      deployedAt: new Date().toISOString(),
    },
    {
      id: 'dep-redis-cache-01',
      name: 'application-cache',
      type: 'cache',
      provider: 'aws',
      region: 'us-east-1',
      status: 'deployed',
      version: '1.0.0',
      environment: 'prod',
      configuration: { engine: 'redis', engineVersion: '7.0' },
      tags: { Application: 'app', Environment: 'prod' },
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      deployedAt: new Date().toISOString(),
    },
    {
      id: 'dep-s3-bucket-01',
      name: 'application-storage',
      type: 'storage',
      provider: 'aws',
      region: 'us-east-1',
      status: 'deployed',
      version: '1.0.0',
      environment: 'prod',
      configuration: { versioning: true, encryption: true },
      tags: { Application: 'app', Environment: 'prod' },
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      deployedAt: new Date().toISOString(),
    },
    {
      id: 'dep-sqs-queue-01',
      name: 'application-queue',
      type: 'queue',
      provider: 'aws',
      region: 'us-east-1',
      status: 'deployed',
      version: '1.0.0',
      environment: 'prod',
      configuration: { messageRetentionPeriod: 86400 },
      tags: { Application: 'app', Environment: 'prod' },
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      deployedAt: new Date().toISOString(),
    },
  ];

  const result = validator.validateDependencies(configurations);

  console.log(`Total configurations: ${result.summary.total}`);
  console.log(`Valid: ${result.summary.passed}`);
  console.log(`Invalid: ${result.summary.failed}`);
  console.log(`Time: ${result.summary.duration.toFixed(2)}ms`);

  if (result.valid) {
    console.log('\n✓ All configurations passed validation!\n');
    result.validated.forEach((dep) => {
      console.log(`  [${dep.type.toUpperCase()}] ${dep.name} (${dep.provider}:${dep.region})`);
    });
  } else {
    console.log('\n✗ Some configurations failed validation:\n');
    result.invalid.forEach(({ index, errors }) => {
      const config = configurations[index];
      console.log(`  [${index}] ${config?.name}:`);
      errors.forEach((error) => {
        console.log(`    - ${error.path}: ${error.message}`);
      });
    });
  }

  console.log();
}

/**
 * Example 3: Error handling and user-friendly reporting
 */
function validateWithErrorReporting() {
  console.log('=== Example 3: Error Handling & User-Friendly Reporting ===\n');

  const validator = new DependencyValidator();

  // Configuration with intentional errors
  const invalidConfigs = [
    {
      id: 'invalid-id', // Should match pattern ^dep-[a-z0-9-]+$
      name: 'database',
      type: 'database',
      provider: 'aws',
      region: 'invalid-region', // Should match region pattern
      status: 'deployed',
      created: 'not-a-date', // Should be ISO 8601 format
      updated: new Date().toISOString(),
    },
    {
      id: 'dep-cache-01',
      name: '', // Empty name (minLength: 1)
      type: 'invalid-type', // Not in enum
      provider: 'invalid-provider', // Not in enum
      region: 'us-east-1',
      status: 'deployed',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    {
      // Missing required fields: id, name, type, provider, region, status
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
  ];

  const result = validator.validateDependencies(invalidConfigs);

  console.log('Configuration Validation Report:');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Total Checked: ${result.summary.total}`);
  console.log(`Status: ${result.valid ? 'PASS' : 'FAIL'}\n`);

  if (!result.valid) {
    console.log('Issues Found:\n');

    result.invalid.forEach(({ index, errors }, errorIndex) => {
      console.log(`${errorIndex + 1}. Configuration #${index}:`);

      errors.forEach((error) => {
        const path = error.path === '/' ? 'root' : error.path;
        console.log(`   • ${path}: ${error.message}`);
      });

      console.log();
    });

    console.log('Summary:');
    console.log(`• ${result.summary.passed} configuration(s) passed`);
    console.log(`• ${result.summary.failed} configuration(s) failed`);
    console.log(
      `\nValidation completed in ${result.summary.duration.toFixed(2)}ms`
    );
  }

  console.log();
}

/**
 * Example 4: Loading from JSON file and validating
 */
async function validateFromJsonFile() {
  console.log('=== Example 4: Loading from JSON File ===\n');

  // In a real scenario, you would read from a file
  const jsonContent = JSON.stringify({
    dependencies: [
      {
        id: 'dep-rds-db-01',
        name: 'prod-database',
        type: 'database',
        provider: 'aws',
        region: 'us-east-1',
        status: 'deployed',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'dep-s3-bucket-01',
        name: 'app-storage',
        type: 'storage',
        provider: 'aws',
        region: 'us-west-2',
        status: 'deployed',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
  });

  try {
    const validator = new DependencyValidator();
    const data = JSON.parse(jsonContent) as { dependencies: unknown[] };

    console.log(`Loaded ${data.dependencies.length} configuration(s) from JSON\n`);

    const result = validator.validateDependencies(data.dependencies);

    if (result.valid) {
      console.log(`✓ All ${result.validated.length} configurations are valid!\n`);
      result.validated.forEach((dep) => {
        console.log(`  • ${dep.id}: ${dep.type} (${dep.provider}/${dep.region})`);
      });
    } else {
      console.log(`✗ Validation failed for ${result.summary.failed} configuration(s)\n`);
    }
  } catch (error) {
    console.error(`Error processing JSON: ${(error as Error).message}`);
  }

  console.log();
}

/**
 * Example 5: Performance benchmarking
 */
function performanceBenchmark() {
  console.log('=== Example 5: Performance Benchmark ===\n');

  const validator = new DependencyValidator();

  // Generate 100 test configurations
  const configurations = Array.from({ length: 100 }, (_, i) => ({
    id: `dep-db-${i.toString().padStart(3, '0')}`,
    name: `database-${i}`,
    type: 'database' as const,
    provider: 'aws' as const,
    region: i % 2 === 0 ? 'us-east-1' : 'us-west-2',
    status: 'deployed' as const,
    version: '1.0.0',
    environment: (i % 3 === 0 ? 'dev' : i % 3 === 1 ? 'staging' : 'prod') as const,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tags: {
      Application: `app-${i}`,
      Team: 'platform',
    },
    dependencies: [],
  }));

  console.log(`Validating ${configurations.length} configurations...\n`);

  const result = validator.validateDependencies(configurations);

  console.log('Results:');
  console.log(`  Total: ${result.summary.total}`);
  console.log(`  Valid: ${result.summary.passed}`);
  console.log(`  Invalid: ${result.summary.failed}`);
  console.log(`  Duration: ${result.summary.duration.toFixed(2)}ms`);
  console.log(
    `  Average per config: ${(result.summary.duration / result.summary.total).toFixed(3)}ms`
  );
  console.log();
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Dependency Configuration Validator - Examples                 ║');
  console.log('║   Using AJV for JSON Schema Validation                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  validateSingleConfiguration();
  validateBatchConfigurations();
  validateWithErrorReporting();
  await validateFromJsonFile();
  performanceBenchmark();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('All examples completed successfully!');
}

// Run examples
main().catch(console.error);
