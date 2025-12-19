/**
 * Unit Tests for MockFunctionHostingService
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockFunctionHostingService } from '../../../../src/providers/mock/MockFunctionHostingService';
import {
  FunctionStatus,
  FunctionRuntime,
  InvocationType,
  EventSourceType,
  FunctionUrlAuthType,
} from '../../../../src/core/types/function';

describe('MockFunctionHostingService', () => {
  let service: MockFunctionHostingService;

  beforeEach(() => {
    service = new MockFunctionHostingService();
  });

  describe('createFunction', () => {
    test('should create a function and return function details', async () => {
      const func = await service.createFunction({
        name: 'test-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test code') },
        description: 'Test function',
        memorySize: 256,
        timeout: 30,
        environment: { NODE_ENV: 'test' },
      });

      expect(func.name).toBe('test-function');
      expect(func.arn).toContain('test-function');
      expect(func.runtime).toBe(FunctionRuntime.NODEJS_20);
      expect(func.handler).toBe('index.handler');
      expect(func.status).toBe(FunctionStatus.ACTIVE);
      expect(func.memorySize).toBe(256);
      expect(func.timeout).toBe(30);
      expect(func.environment).toEqual({ NODE_ENV: 'test' });
      expect(func.description).toBe('Test function');
      expect(func.created).toBeInstanceOf(Date);
    });

    test('should apply default values for optional parameters', async () => {
      const func = await service.createFunction({
        name: 'minimal-function',
        runtime: FunctionRuntime.NODEJS_18,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      expect(func.memorySize).toBe(128);
      expect(func.timeout).toBe(3);
      expect(func.environment).toEqual({});
    });

    test('should throw validation error when name is missing', async () => {
      await expect(
        service.createFunction({
          name: '',
          runtime: FunctionRuntime.NODEJS_20,
          handler: 'index.handler',
          code: { zipFile: Buffer.from('test') },
        })
      ).rejects.toThrow('Name, runtime, and handler are required');
    });

    test('should throw validation error when code is missing', async () => {
      await expect(
        service.createFunction({
          name: 'test',
          runtime: FunctionRuntime.NODEJS_20,
          handler: 'index.handler',
          code: {},
        })
      ).rejects.toThrow('Function code is required');
    });

    test('should throw validation error when function already exists', async () => {
      await service.createFunction({
        name: 'duplicate-test',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await expect(
        service.createFunction({
          name: 'duplicate-test',
          runtime: FunctionRuntime.NODEJS_20,
          handler: 'index.handler',
          code: { zipFile: Buffer.from('test') },
        })
      ).rejects.toThrow("Function 'duplicate-test' already exists");
    });

    test('should support container image deployment', async () => {
      const func = await service.createFunction({
        name: 'container-function',
        runtime: FunctionRuntime.CUSTOM,
        handler: 'not.used',
        code: { imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest' },
      });

      expect(func.name).toBe('container-function');
      expect(func.runtime).toBe(FunctionRuntime.CUSTOM);
    });
  });

  describe('getFunction', () => {
    test('should retrieve an existing function', async () => {
      const created = await service.createFunction({
        name: 'get-test',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const retrieved = await service.getFunction('get-test');

      expect(retrieved.name).toBe(created.name);
      expect(retrieved.arn).toBe(created.arn);
    });

    test('should throw error for non-existent function', async () => {
      await expect(service.getFunction('non-existent')).rejects.toThrow('Function');
    });
  });

  describe('updateFunctionConfiguration', () => {
    test('should update function configuration', async () => {
      await service.createFunction({
        name: 'update-config-test',
        runtime: FunctionRuntime.NODEJS_18,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
        memorySize: 128,
        timeout: 3,
      });

      const updated = await service.updateFunctionConfiguration('update-config-test', {
        memorySize: 512,
        timeout: 60,
        environment: { NEW_VAR: 'value' },
        description: 'Updated description',
      });

      expect(updated.memorySize).toBe(512);
      expect(updated.timeout).toBe(60);
      expect(updated.environment).toEqual({ NEW_VAR: 'value' });
      expect(updated.description).toBe('Updated description');
    });

    test('should throw error for non-existent function', async () => {
      await expect(
        service.updateFunctionConfiguration('non-existent', { memorySize: 256 })
      ).rejects.toThrow('Function');
    });
  });

  describe('updateFunctionCode', () => {
    test('should update function code', async () => {
      await service.createFunction({
        name: 'update-code-test',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('original code') },
      });

      const updated = await service.updateFunctionCode('update-code-test', {
        zipFile: Buffer.from('new code - larger'),
      });

      expect(updated.name).toBe('update-code-test');
      expect(updated.lastModified).toBeInstanceOf(Date);
    });

    test('should throw validation error when no code provided', async () => {
      await service.createFunction({
        name: 'code-update-fail',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await expect(service.updateFunctionCode('code-update-fail', {})).rejects.toThrow(
        'Code update requires'
      );
    });
  });

  describe('deleteFunction', () => {
    test('should delete a function', async () => {
      await service.createFunction({
        name: 'delete-test',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.deleteFunction('delete-test');

      await expect(service.getFunction('delete-test')).rejects.toThrow('Function');
    });

    test('should delete associated resources', async () => {
      await service.createFunction({
        name: 'delete-with-resources',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.createFunctionUrl('delete-with-resources');
      await service.createEventSourceMapping('delete-with-resources', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
        eventSourceType: EventSourceType.SQS,
      });

      await service.deleteFunction('delete-with-resources');

      await expect(service.getFunctionUrl('delete-with-resources')).rejects.toThrow();
    });

    test('should throw error for non-existent function', async () => {
      await expect(service.deleteFunction('non-existent')).rejects.toThrow('Function');
    });
  });

  describe('listFunctions', () => {
    test('should list all functions', async () => {
      await service.createFunction({
        name: 'list-test-1',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });
      await service.createFunction({
        name: 'list-test-2',
        runtime: FunctionRuntime.PYTHON_3_12,
        handler: 'handler.main',
        code: { zipFile: Buffer.from('test') },
      });

      const result = await service.listFunctions();

      expect(result.functions.length).toBeGreaterThanOrEqual(2);
    });

    test('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createFunction({
          name: `paginate-test-${i}`,
          runtime: FunctionRuntime.NODEJS_20,
          handler: 'index.handler',
          code: { zipFile: Buffer.from('test') },
        });
      }

      const result = await service.listFunctions({ maxItems: 2 });

      expect(result.functions.length).toBe(2);
      expect(result.nextToken).toBeDefined();
    });
  });

  describe('invokeFunction', () => {
    test('should invoke function synchronously', async () => {
      await service.createFunction({
        name: 'invoke-sync',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const result = await service.invokeFunction('invoke-sync', {
        payload: { test: 'data' },
        invocationType: InvocationType.SYNC,
      });

      expect(result.statusCode).toBe(200);
      expect(result.payload).toBeDefined();
      expect(result.executedVersion).toBe('$LATEST');
    });

    test('should invoke function asynchronously', async () => {
      await service.createFunction({
        name: 'invoke-async',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const result = await service.invokeFunction('invoke-async', {
        invocationType: InvocationType.ASYNC,
      });

      expect(result.statusCode).toBe(202);
      expect(result.payload).toBeUndefined();
    });

    test('should perform dry run', async () => {
      await service.createFunction({
        name: 'invoke-dryrun',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const result = await service.invokeFunction('invoke-dryrun', {
        invocationType: InvocationType.DRY_RUN,
      });

      expect(result.statusCode).toBe(204);
    });

    test('should use registered handler', async () => {
      await service.createFunction({
        name: 'custom-handler',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      service.registerHandler('custom-handler', (payload) => ({
        statusCode: 200,
        body: `Processed: ${JSON.stringify(payload)}`,
      }));

      const result = await service.invokeFunction('custom-handler', {
        payload: { message: 'hello' },
      });

      expect(result.payload).toEqual({
        statusCode: 200,
        body: 'Processed: {"message":"hello"}',
      });
    });

    test('should handle handler errors', async () => {
      await service.createFunction({
        name: 'error-handler',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      service.registerHandler('error-handler', () => {
        throw new Error('Handler error');
      });

      const result = await service.invokeFunction('error-handler');

      expect(result.functionError).toBe('Handler error');
    });

    test('should throw error for non-existent function', async () => {
      await expect(service.invokeFunction('non-existent')).rejects.toThrow('Function');
    });
  });

  describe('createEventSourceMapping', () => {
    test('should create event source mapping', async () => {
      await service.createFunction({
        name: 'esm-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const mapping = await service.createEventSourceMapping('esm-function', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:my-queue',
        eventSourceType: EventSourceType.SQS,
        batchSize: 10,
      });

      expect(mapping.id).toMatch(/^mock-esm-\d+$/);
      expect(mapping.functionName).toBe('esm-function');
      expect(mapping.eventSourceArn).toBe('arn:aws:sqs:us-east-1:123456789012:my-queue');
      expect(mapping.eventSourceType).toBe(EventSourceType.SQS);
      expect(mapping.enabled).toBe(true);
      expect(mapping.batchSize).toBe(10);
    });

    test('should throw error for non-existent function', async () => {
      await expect(
        service.createEventSourceMapping('non-existent', {
          eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue',
          eventSourceType: EventSourceType.SQS,
        })
      ).rejects.toThrow('Function');
    });
  });

  describe('getEventSourceMapping', () => {
    test('should retrieve event source mapping', async () => {
      await service.createFunction({
        name: 'get-esm-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const created = await service.createEventSourceMapping('get-esm-function', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue',
        eventSourceType: EventSourceType.SQS,
      });

      const retrieved = await service.getEventSourceMapping(created.id);

      expect(retrieved.id).toBe(created.id);
    });

    test('should throw error for non-existent mapping', async () => {
      await expect(service.getEventSourceMapping('non-existent')).rejects.toThrow(
        'EventSourceMapping'
      );
    });
  });

  describe('updateEventSourceMapping', () => {
    test('should enable/disable event source mapping', async () => {
      await service.createFunction({
        name: 'update-esm-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const mapping = await service.createEventSourceMapping('update-esm-function', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue',
        eventSourceType: EventSourceType.SQS,
      });

      const disabled = await service.updateEventSourceMapping(mapping.id, false);
      expect(disabled.enabled).toBe(false);
      expect(disabled.status).toBe('Disabled');

      const enabled = await service.updateEventSourceMapping(mapping.id, true);
      expect(enabled.enabled).toBe(true);
      expect(enabled.status).toBe('Enabled');
    });
  });

  describe('deleteEventSourceMapping', () => {
    test('should delete event source mapping', async () => {
      await service.createFunction({
        name: 'delete-esm-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const mapping = await service.createEventSourceMapping('delete-esm-function', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue',
        eventSourceType: EventSourceType.SQS,
      });

      await service.deleteEventSourceMapping(mapping.id);

      await expect(service.getEventSourceMapping(mapping.id)).rejects.toThrow('EventSourceMapping');
    });
  });

  describe('listEventSourceMappings', () => {
    test('should list event source mappings for a function', async () => {
      await service.createFunction({
        name: 'list-esm-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.createEventSourceMapping('list-esm-function', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue-1',
        eventSourceType: EventSourceType.SQS,
      });
      await service.createEventSourceMapping('list-esm-function', {
        eventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:queue-2',
        eventSourceType: EventSourceType.SQS,
      });

      const mappings = await service.listEventSourceMappings('list-esm-function');

      expect(mappings.length).toBe(2);
    });
  });

  describe('createFunctionUrl', () => {
    test('should create function URL', async () => {
      await service.createFunction({
        name: 'url-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const functionUrl = await service.createFunctionUrl('url-function');

      expect(functionUrl.functionName).toBe('url-function');
      expect(functionUrl.url).toContain('url-function');
      expect(functionUrl.authType).toBe(FunctionUrlAuthType.NONE);
    });

    test('should create function URL with IAM auth', async () => {
      await service.createFunction({
        name: 'url-iam-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const functionUrl = await service.createFunctionUrl('url-iam-function', {
        authType: FunctionUrlAuthType.IAM,
      });

      expect(functionUrl.authType).toBe(FunctionUrlAuthType.IAM);
    });

    test('should create function URL with CORS', async () => {
      await service.createFunction({
        name: 'url-cors-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      const functionUrl = await service.createFunctionUrl('url-cors-function', {
        cors: {
          allowOrigins: ['https://example.com'],
          allowMethods: ['GET', 'POST'],
          allowHeaders: ['Content-Type'],
        },
      });

      expect(functionUrl.cors?.allowOrigins).toContain('https://example.com');
    });

    test('should throw error if function URL already exists', async () => {
      await service.createFunction({
        name: 'duplicate-url-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.createFunctionUrl('duplicate-url-function');

      await expect(service.createFunctionUrl('duplicate-url-function')).rejects.toThrow(
        'Function URL already exists'
      );
    });
  });

  describe('getFunctionUrl', () => {
    test('should retrieve function URL', async () => {
      await service.createFunction({
        name: 'get-url-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.createFunctionUrl('get-url-function');

      const functionUrl = await service.getFunctionUrl('get-url-function');

      expect(functionUrl.functionName).toBe('get-url-function');
    });

    test('should throw error for non-existent function URL', async () => {
      await service.createFunction({
        name: 'no-url-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await expect(service.getFunctionUrl('no-url-function')).rejects.toThrow('FunctionUrl');
    });
  });

  describe('updateFunctionUrl', () => {
    test('should update function URL configuration', async () => {
      await service.createFunction({
        name: 'update-url-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.createFunctionUrl('update-url-function');

      const updated = await service.updateFunctionUrl('update-url-function', {
        authType: FunctionUrlAuthType.IAM,
        cors: {
          allowOrigins: ['*'],
        },
      });

      expect(updated.authType).toBe(FunctionUrlAuthType.IAM);
      expect(updated.cors?.allowOrigins).toContain('*');
    });
  });

  describe('deleteFunctionUrl', () => {
    test('should delete function URL', async () => {
      await service.createFunction({
        name: 'delete-url-function',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      await service.createFunctionUrl('delete-url-function');
      await service.deleteFunctionUrl('delete-url-function');

      await expect(service.getFunctionUrl('delete-url-function')).rejects.toThrow('FunctionUrl');
    });
  });

  describe('reset', () => {
    test('should clear all data', async () => {
      await service.createFunction({
        name: 'reset-test',
        runtime: FunctionRuntime.NODEJS_20,
        handler: 'index.handler',
        code: { zipFile: Buffer.from('test') },
      });

      service.registerHandler('reset-test', () => 'test');

      service.reset();

      const result = await service.listFunctions();
      expect(result.functions.length).toBe(0);
    });
  });
});
