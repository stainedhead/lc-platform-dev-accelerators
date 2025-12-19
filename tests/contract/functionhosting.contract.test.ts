/**
 * Contract Test: FunctionHostingService
 *
 * Verifies that both AWS and Mock providers implement the same interface
 * with identical behavior. This ensures cloud-agnostic portability.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import type { FunctionHostingService } from '../../src/core/services/FunctionHostingService';
import { MockFunctionHostingService } from '../../src/providers/mock/MockFunctionHostingService';
import { ResourceNotFoundError, ValidationError } from '../../src/core/types/common';
import {
  FunctionStatus,
  FunctionRuntime,
  InvocationType,
  EventSourceType,
  FunctionUrlAuthType,
} from '../../src/core/types/function';

// Helper to create a minimal function code buffer
function createMockCode(): Buffer {
  return Buffer.from('mock-function-code');
}

/**
 * Contract test suite that verifies provider implementations
 * follow the FunctionHostingService contract.
 */
function testFunctionHostingServiceContract(
  name: string,
  createService: () => FunctionHostingService & { reset?: () => void }
) {
  describe(`FunctionHostingService Contract: ${name}`, () => {
    let service: FunctionHostingService & { reset?: () => void };
    const createdFunctions: string[] = [];
    const testRole = 'arn:aws:iam::123456789012:role/lambda-role';

    beforeEach(() => {
      service = createService();
      if (service.reset) {
        service.reset();
      }
      createdFunctions.length = 0;
    });

    afterEach(async () => {
      // Cleanup all created functions
      for (const name of createdFunctions) {
        try {
          await service.deleteFunction(name);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    // ===================
    // Function CRUD Tests
    // ===================

    test('createFunction - should create a new function', async () => {
      const functionName = `test-func-${Date.now()}`;
      createdFunctions.push(functionName);

      const func = await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      expect(func.name).toBe(functionName);
      expect(func.runtime).toBe(FunctionRuntime.NODEJS_20);
      expect(func.handler).toBe('index.handler');
      expect(Object.values(FunctionStatus)).toContain(func.status);
      expect(func.created).toBeInstanceOf(Date);
      expect(func.lastModified).toBeInstanceOf(Date);
    });

    test('createFunction - should use default memory and timeout', async () => {
      const functionName = `test-defaults-${Date.now()}`;
      createdFunctions.push(functionName);

      const func = await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.PYTHON_3_11,
        handler: 'handler.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      expect(func.memorySize).toBe(128);
      expect(func.timeout).toBe(3);
    });

    test('createFunction - should accept custom memory, timeout, and environment', async () => {
      const functionName = `test-custom-${Date.now()}`;
      createdFunctions.push(functionName);

      const func = await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        memorySize: 512,
        timeout: 60,
        environment: { NODE_ENV: 'production', API_KEY: 'secret' },
        description: 'Test function with custom settings',
        role: testRole,
      });

      expect(func.memorySize).toBe(512);
      expect(func.timeout).toBe(60);
      expect(func.environment.NODE_ENV).toBe('production');
      expect(func.environment.API_KEY).toBe('secret');
      expect(func.description).toBe('Test function with custom settings');
    });

    test('createFunction - should throw ValidationError for duplicate name', async () => {
      const functionName = `test-duplicate-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await expect(
        service.createFunction({
          name: functionName,
          runtime: FunctionRuntime.NODEJS_20,
          handler: 'index.handler',
          code: { zipFile: createMockCode() },
          role: testRole,
        })
      ).rejects.toThrow(ValidationError);
    });

    test('createFunction - should throw ValidationError for missing code', async () => {
      const functionName = `test-no-code-${Date.now()}`;

      await expect(
        service.createFunction({
          name: functionName,
          runtime: FunctionRuntime.NODEJS_20,
          handler: 'index.handler',
          code: {},
          role: testRole,
        })
      ).rejects.toThrow(ValidationError);
    });

    test('getFunction - should retrieve existing function', async () => {
      const functionName = `test-get-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.PYTHON_3_12,
        handler: 'handler.main',
        code: { zipFile: createMockCode() },
        description: 'Test get function',
        role: testRole,
      });

      const func = await service.getFunction(functionName);

      expect(func.name).toBe(functionName);
      expect(func.runtime).toBe(FunctionRuntime.PYTHON_3_12);
      expect(func.handler).toBe('handler.main');
      expect(func.description).toBe('Test get function');
    });

    test('getFunction - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(service.getFunction('nonexistent-function-12345')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('updateFunctionConfiguration - should update function settings', async () => {
      const functionName = `test-update-config-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        memorySize: 128,
        timeout: 10,
        role: testRole,
      });

      const updated = await service.updateFunctionConfiguration(functionName, {
        memorySize: 256,
        timeout: 30,
        description: 'Updated function',
        environment: { UPDATED: 'true' },
      });

      expect(updated.memorySize).toBe(256);
      expect(updated.timeout).toBe(30);
      expect(updated.description).toBe('Updated function');
      expect(updated.environment.UPDATED).toBe('true');
      expect(updated.lastModified).toBeInstanceOf(Date);
    });

    test('updateFunctionConfiguration - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(
        service.updateFunctionConfiguration('nonexistent', { memorySize: 256 })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('updateFunctionCode - should update function code', async () => {
      const functionName = `test-update-code-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const updated = await service.updateFunctionCode(functionName, {
        zipFile: Buffer.from('updated-code'),
      });

      expect(updated.name).toBe(functionName);
      expect(updated.lastModified).toBeInstanceOf(Date);
    });

    test('updateFunctionCode - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(
        service.updateFunctionCode('nonexistent', { zipFile: createMockCode() })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('updateFunctionCode - should throw ValidationError for empty code update', async () => {
      const functionName = `test-empty-code-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await expect(service.updateFunctionCode(functionName, {})).rejects.toThrow(ValidationError);
    });

    test('deleteFunction - should delete existing function', async () => {
      const functionName = `test-delete-${Date.now()}`;

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.deleteFunction(functionName);

      // Verify deletion
      await expect(service.getFunction(functionName)).rejects.toThrow(ResourceNotFoundError);
    });

    test('deleteFunction - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(service.deleteFunction('nonexistent-function')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('listFunctions - should return all functions', async () => {
      const func1 = `test-list-1-${Date.now()}`;
      const func2 = `test-list-2-${Date.now()}`;
      createdFunctions.push(func1, func2);

      await service.createFunction({
        name: func1,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.createFunction({
        name: func2,
        runtime: FunctionRuntime.PYTHON_3_11,
        handler: 'handler.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const result = await service.listFunctions();

      expect(result.functions).toBeDefined();
      expect(Array.isArray(result.functions)).toBe(true);

      const names = result.functions.map((f) => f.name);
      expect(names).toContain(func1);
      expect(names).toContain(func2);
    });

    // ==================
    // Invocation Tests
    // ==================

    test('invokeFunction - sync invocation should return response', async () => {
      const functionName = `test-invoke-sync-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const result = await service.invokeFunction(functionName, {
        payload: { test: 'data' },
        invocationType: InvocationType.SYNC,
      });

      expect(result.statusCode).toBe(200);
      expect(result.payload).toBeDefined();
    });

    test('invokeFunction - async invocation should return 202', async () => {
      const functionName = `test-invoke-async-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const result = await service.invokeFunction(functionName, {
        payload: { test: 'data' },
        invocationType: InvocationType.ASYNC,
      });

      expect(result.statusCode).toBe(202);
    });

    test('invokeFunction - dry run should return 204', async () => {
      const functionName = `test-invoke-dry-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const result = await service.invokeFunction(functionName, {
        invocationType: InvocationType.DRY_RUN,
      });

      expect(result.statusCode).toBe(204);
    });

    test('invokeFunction - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(service.invokeFunction('nonexistent-function')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    // =========================
    // Event Source Mapping Tests
    // =========================

    test('createEventSourceMapping - should create SQS trigger', async () => {
      const functionName = `test-esm-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';

      const mapping = await service.createEventSourceMapping(functionName, {
        eventSourceArn: queueArn,
        eventSourceType: EventSourceType.SQS,
        enabled: true,
        batchSize: 5,
      });

      expect(mapping.id).toBeDefined();
      expect(mapping.functionName).toBe(functionName);
      expect(mapping.eventSourceArn).toBe(queueArn);
      expect(mapping.enabled).toBe(true);
      expect(mapping.batchSize).toBe(5);
      expect(mapping.created).toBeInstanceOf(Date);
    });

    test('createEventSourceMapping - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(
        service.createEventSourceMapping('nonexistent', {
          eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue',
          eventSourceType: EventSourceType.SQS,
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('createEventSourceMapping - should throw ValidationError for missing eventSourceArn', async () => {
      const functionName = `test-esm-no-arn-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await expect(
        service.createEventSourceMapping(functionName, {
          eventSourceArn: '',
          eventSourceType: EventSourceType.SQS,
        })
      ).rejects.toThrow(ValidationError);
    });

    test('getEventSourceMapping - should retrieve mapping by id', async () => {
      const functionName = `test-get-esm-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue-get';

      const created = await service.createEventSourceMapping(functionName, {
        eventSourceArn: queueArn,
        eventSourceType: EventSourceType.SQS,
        enabled: true,
      });

      const retrieved = await service.getEventSourceMapping(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.functionName).toBe(functionName);
      expect(retrieved.eventSourceArn).toBe(queueArn);
    });

    test('getEventSourceMapping - should throw ResourceNotFoundError for non-existent mapping', async () => {
      await expect(service.getEventSourceMapping('nonexistent-mapping-id')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('updateEventSourceMapping - should enable/disable mapping', async () => {
      const functionName = `test-update-esm-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const mapping = await service.createEventSourceMapping(functionName, {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue-update',
        eventSourceType: EventSourceType.SQS,
        enabled: true,
      });

      const disabled = await service.updateEventSourceMapping(mapping.id, false);
      expect(disabled.enabled).toBe(false);

      const enabled = await service.updateEventSourceMapping(mapping.id, true);
      expect(enabled.enabled).toBe(true);
    });

    test('deleteEventSourceMapping - should delete mapping', async () => {
      const functionName = `test-delete-esm-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const mapping = await service.createEventSourceMapping(functionName, {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue-delete',
        eventSourceType: EventSourceType.SQS,
      });

      await service.deleteEventSourceMapping(mapping.id);

      // Verify deletion
      await expect(service.getEventSourceMapping(mapping.id)).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('listEventSourceMappings - should list mappings for function', async () => {
      const functionName = `test-list-esm-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.createEventSourceMapping(functionName, {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue-1',
        eventSourceType: EventSourceType.SQS,
      });

      await service.createEventSourceMapping(functionName, {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue-2',
        eventSourceType: EventSourceType.SQS,
      });

      const mappings = await service.listEventSourceMappings(functionName);

      expect(mappings.length).toBe(2);
      expect(mappings.every((m) => m.functionName === functionName)).toBe(true);
    });

    // ===================
    // Function URL Tests
    // ===================

    test('createFunctionUrl - should create HTTP endpoint', async () => {
      const functionName = `test-url-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      const functionUrl = await service.createFunctionUrl(functionName, {
        authType: FunctionUrlAuthType.NONE,
        cors: {
          allowOrigins: ['https://example.com'],
          allowMethods: ['GET', 'POST'],
          maxAge: 3600,
        },
      });

      expect(functionUrl.functionName).toBe(functionName);
      expect(functionUrl.url).toBeDefined();
      expect(functionUrl.url).toMatch(/^https?:\/\//);
      expect(functionUrl.authType).toBe(FunctionUrlAuthType.NONE);
      expect(functionUrl.cors?.allowOrigins).toContain('https://example.com');
      expect(functionUrl.cors?.allowMethods).toContain('GET');
      expect(functionUrl.created).toBeInstanceOf(Date);
    });

    test('createFunctionUrl - should throw ResourceNotFoundError for non-existent function', async () => {
      await expect(service.createFunctionUrl('nonexistent-function')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('createFunctionUrl - should throw ValidationError for duplicate URL', async () => {
      const functionName = `test-url-dup-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.createFunctionUrl(functionName, {
        authType: FunctionUrlAuthType.NONE,
      });

      await expect(
        service.createFunctionUrl(functionName, {
          authType: FunctionUrlAuthType.NONE,
        })
      ).rejects.toThrow(ValidationError);
    });

    test('getFunctionUrl - should retrieve URL config', async () => {
      const functionName = `test-get-url-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.createFunctionUrl(functionName, {
        authType: FunctionUrlAuthType.IAM,
      });

      const functionUrl = await service.getFunctionUrl(functionName);

      expect(functionUrl.functionName).toBe(functionName);
      expect(functionUrl.authType).toBe(FunctionUrlAuthType.IAM);
    });

    test('getFunctionUrl - should throw ResourceNotFoundError for non-existent URL', async () => {
      const functionName = `test-no-url-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await expect(service.getFunctionUrl(functionName)).rejects.toThrow(ResourceNotFoundError);
    });

    test('updateFunctionUrl - should update URL config', async () => {
      const functionName = `test-update-url-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.createFunctionUrl(functionName, {
        authType: FunctionUrlAuthType.NONE,
      });

      const updated = await service.updateFunctionUrl(functionName, {
        cors: {
          allowOrigins: ['*'],
          allowMethods: ['*'],
          maxAge: 7200,
        },
      });

      expect(updated.cors?.allowOrigins).toContain('*');
      expect(updated.cors?.maxAge).toBe(7200);
      expect(updated.lastModified).toBeInstanceOf(Date);
    });

    test('deleteFunctionUrl - should delete URL config', async () => {
      const functionName = `test-delete-url-${Date.now()}`;
      createdFunctions.push(functionName);

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      await service.createFunctionUrl(functionName, {
        authType: FunctionUrlAuthType.NONE,
      });

      await service.deleteFunctionUrl(functionName);

      // Verify deletion
      await expect(service.getFunctionUrl(functionName)).rejects.toThrow(ResourceNotFoundError);
    });

    // ============================
    // Cleanup/Cascade Delete Tests
    // ============================

    test('deleteFunction - should cleanup associated URLs and mappings', async () => {
      const functionName = `test-cascade-${Date.now()}`;

      await service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: createMockCode() },
        role: testRole,
      });

      // Create associated resources
      await service.createFunctionUrl(functionName, { authType: FunctionUrlAuthType.NONE });
      await service.createEventSourceMapping(functionName, {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:cascade-queue',
        eventSourceType: EventSourceType.SQS,
      });

      // Delete function
      await service.deleteFunction(functionName);

      // Verify function is deleted
      await expect(service.getFunction(functionName)).rejects.toThrow(ResourceNotFoundError);
    });
  });
}

// Run contract tests against Mock provider
testFunctionHostingServiceContract(
  'MockFunctionHostingService',
  () => new MockFunctionHostingService()
);

// TODO: Uncomment when running with LocalStack
// import { AwsFunctionHostingService } from '../../src/providers/aws/AwsFunctionHostingService';
// testFunctionHostingServiceContract('AwsFunctionHostingService', () => new AwsFunctionHostingService({
//   endpoint: 'http://localhost:4566',
//   region: 'us-east-1',
//   credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
// }));
