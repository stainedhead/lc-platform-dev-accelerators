/**
 * Integration Test: AwsFunctionHostingService with LocalStack
 *
 * Tests AWS Lambda implementation against LocalStack.
 * Requires: docker-compose up localstack
 *
 * Constitution Principle VI: Mock Provider Completeness
 * Integration tests verify AWS implementation matches expected behavior.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsFunctionHostingService } from '../../../../src/providers/aws/AwsFunctionHostingService';
import {
  FunctionStatus,
  FunctionRuntime,
  InvocationType,
  EventSourceType,
  FunctionUrlAuthType,
} from '../../../../src/core/types/function';

// LocalStack Lambda endpoint
const LOCALSTACK_ENDPOINT = 'http://localhost:4566';

// Helper to create a minimal Lambda function code (Python)
function createPythonFunctionCode(): Buffer {
  const code = `
def handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }
`;
  // Create a simple zip file manually
  // This is a minimal valid ZIP structure with the handler.py file
  return createMinimalZip('handler.py', code);
}

// Helper to create a minimal zip file
function createMinimalZip(filename: string, content: string): Buffer {
  const fileContent = Buffer.from(content);
  const filenameBuffer = Buffer.from(filename);

  // Local file header
  const localHeader = Buffer.alloc(30 + filenameBuffer.length);
  localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
  localHeader.writeUInt16LE(20, 4); // Version needed to extract
  localHeader.writeUInt16LE(0, 6); // General purpose bit flag
  localHeader.writeUInt16LE(0, 8); // Compression method (0 = stored)
  localHeader.writeUInt16LE(0, 10); // File last modification time
  localHeader.writeUInt16LE(0, 12); // File last modification date
  localHeader.writeUInt32LE(0, 14); // CRC-32 (skipped for simplicity)
  localHeader.writeUInt32LE(fileContent.length, 18); // Compressed size
  localHeader.writeUInt32LE(fileContent.length, 22); // Uncompressed size
  localHeader.writeUInt16LE(filenameBuffer.length, 26); // File name length
  localHeader.writeUInt16LE(0, 28); // Extra field length
  filenameBuffer.copy(localHeader, 30);

  // Central directory file header
  const centralHeader = Buffer.alloc(46 + filenameBuffer.length);
  centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory file header signature
  centralHeader.writeUInt16LE(20, 4); // Version made by
  centralHeader.writeUInt16LE(20, 6); // Version needed to extract
  centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
  centralHeader.writeUInt16LE(0, 10); // Compression method
  centralHeader.writeUInt16LE(0, 12); // File last modification time
  centralHeader.writeUInt16LE(0, 14); // File last modification date
  centralHeader.writeUInt32LE(0, 16); // CRC-32
  centralHeader.writeUInt32LE(fileContent.length, 20); // Compressed size
  centralHeader.writeUInt32LE(fileContent.length, 24); // Uncompressed size
  centralHeader.writeUInt16LE(filenameBuffer.length, 28); // File name length
  centralHeader.writeUInt16LE(0, 30); // Extra field length
  centralHeader.writeUInt16LE(0, 32); // File comment length
  centralHeader.writeUInt16LE(0, 34); // Disk number start
  centralHeader.writeUInt16LE(0, 36); // Internal file attributes
  centralHeader.writeUInt32LE(0, 38); // External file attributes
  centralHeader.writeUInt32LE(0, 42); // Relative offset of local header
  filenameBuffer.copy(centralHeader, 46);

  // End of central directory record
  const centralDirOffset = localHeader.length + fileContent.length;
  const centralDirSize = centralHeader.length;
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  endRecord.writeUInt16LE(0, 4); // Number of this disk
  endRecord.writeUInt16LE(0, 6); // Disk where central directory starts
  endRecord.writeUInt16LE(1, 8); // Number of central directory records on this disk
  endRecord.writeUInt16LE(1, 10); // Total number of central directory records
  endRecord.writeUInt32LE(centralDirSize, 12); // Size of central directory
  endRecord.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  endRecord.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([localHeader, fileContent, centralHeader, endRecord]);
}

describe('AwsFunctionHostingService Integration (LocalStack)', () => {
  let service: AwsFunctionHostingService;
  const functionNames: string[] = [];
  const testRole = 'arn:aws:iam::000000000000:role/lambda-role';

  beforeAll(() => {
    service = new AwsFunctionHostingService({
      region: 'us-east-1',
      endpoint: LOCALSTACK_ENDPOINT,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  });

  afterAll(async () => {
    // Cleanup: Delete all test functions
    for (const name of functionNames) {
      try {
        await service.deleteFunction(name);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('createFunction - should create Lambda function', async () => {
    const functionName = `test-func-${Date.now()}`;
    functionNames.push(functionName);

    const func = await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: {
        zipFile: createPythonFunctionCode(),
      },
      description: 'Test Lambda function',
      memorySize: 128,
      timeout: 30,
      environment: {
        TEST_VAR: 'test-value',
      },
      role: testRole,
    });

    expect(func.name).toBe(functionName);
    expect(func.runtime).toBe(FunctionRuntime.PYTHON_3_11);
    expect(func.handler).toBe('handler.handler');
    expect(func.memorySize).toBe(128);
    expect(func.timeout).toBe(30);
    expect(func.environment.TEST_VAR).toBe('test-value');
    expect(Object.values(FunctionStatus)).toContain(func.status);
    expect(func.created).toBeInstanceOf(Date);
    expect(func.lastModified).toBeInstanceOf(Date);
  });

  test('getFunction - should retrieve function details', async () => {
    const functionName = `test-get-func-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const func = await service.getFunction(functionName);

    expect(func.name).toBe(functionName);
    expect(func.runtime).toBe(FunctionRuntime.PYTHON_3_11);
    expect(func.handler).toBe('handler.handler');
  });

  test('updateFunctionConfiguration - should update function settings', async () => {
    const functionName = `test-update-func-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      memorySize: 128,
      timeout: 10,
      role: testRole,
    });

    const updated = await service.updateFunctionConfiguration(functionName, {
      memorySize: 256,
      timeout: 60,
      description: 'Updated description',
      environment: { UPDATED_VAR: 'new-value' },
    });

    expect(updated.memorySize).toBe(256);
    expect(updated.timeout).toBe(60);
    expect(updated.description).toBe('Updated description');
    expect(updated.environment.UPDATED_VAR).toBe('new-value');
    expect(updated.lastModified).toBeInstanceOf(Date);
  });

  test('updateFunctionCode - should update function code', async () => {
    const functionName = `test-update-code-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const newCode = `
def handler(event, context):
    return {'statusCode': 200, 'body': 'Updated!'}
`;
    const updated = await service.updateFunctionCode(functionName, {
      zipFile: createMinimalZip('handler.py', newCode),
    });

    expect(updated.name).toBe(functionName);
    expect(updated.lastModified).toBeInstanceOf(Date);
  });

  test('deleteFunction - should delete function', async () => {
    const functionName = `test-delete-func-${Date.now()}`;

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    await expect(service.deleteFunction(functionName)).resolves.not.toThrow();

    // Verify deletion
    await expect(service.getFunction(functionName)).rejects.toThrow();
  });

  test('listFunctions - should list all functions', async () => {
    const functionName1 = `test-list-func-1-${Date.now()}`;
    const functionName2 = `test-list-func-2-${Date.now()}`;
    functionNames.push(functionName1, functionName2);

    await service.createFunction({
      name: functionName1,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    await service.createFunction({
      name: functionName2,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const result = await service.listFunctions();

    expect(result.functions).toBeDefined();
    expect(Array.isArray(result.functions)).toBe(true);

    const names = result.functions.map((f) => f.name);
    expect(names).toContain(functionName1);
    expect(names).toContain(functionName2);
  });

  test('invokeFunction - sync invocation', async () => {
    const functionName = `test-invoke-sync-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const result = await service.invokeFunction(functionName, {
      payload: { key: 'value' },
      invocationType: InvocationType.SYNC,
    });

    expect(result.statusCode).toBe(200);
    expect(result.payload).toBeDefined();
  });

  test('invokeFunction - async invocation', async () => {
    const functionName = `test-invoke-async-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const result = await service.invokeFunction(functionName, {
      payload: { key: 'value' },
      invocationType: InvocationType.ASYNC,
    });

    expect(result.statusCode).toBe(202);
  });

  test('invokeFunction - dry run invocation', async () => {
    const functionName = `test-invoke-dry-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const result = await service.invokeFunction(functionName, {
      invocationType: InvocationType.DRY_RUN,
    });

    expect(result.statusCode).toBe(204);
  });

  test('createFunctionUrl - should create HTTP endpoint', async () => {
    const functionName = `test-url-func-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const functionUrl = await service.createFunctionUrl(functionName, {
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST'],
      },
    });

    expect(functionUrl.functionName).toBe(functionName);
    expect(functionUrl.url).toBeDefined();
    expect(functionUrl.url).toMatch(/^https?:\/\//);
    expect(functionUrl.authType).toBe(FunctionUrlAuthType.NONE);
    expect(functionUrl.cors?.allowOrigins).toContain('*');
    expect(functionUrl.created).toBeInstanceOf(Date);
  });

  test('getFunctionUrl - should retrieve URL config', async () => {
    const functionName = `test-get-url-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    await service.createFunctionUrl(functionName, {
      authType: FunctionUrlAuthType.NONE,
    });

    const functionUrl = await service.getFunctionUrl(functionName);

    expect(functionUrl.functionName).toBe(functionName);
    expect(functionUrl.url).toBeDefined();
    expect(functionUrl.authType).toBe(FunctionUrlAuthType.NONE);
  });

  test('updateFunctionUrl - should update URL config', async () => {
    const functionName = `test-update-url-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    await service.createFunctionUrl(functionName, {
      authType: FunctionUrlAuthType.NONE,
    });

    const updated = await service.updateFunctionUrl(functionName, {
      cors: {
        allowOrigins: ['https://example.com'],
        allowMethods: ['GET'],
        maxAge: 3600,
      },
    });

    expect(updated.cors?.allowOrigins).toContain('https://example.com');
    expect(updated.cors?.maxAge).toBe(3600);
    expect(updated.lastModified).toBeInstanceOf(Date);
  });

  test('deleteFunctionUrl - should delete URL config', async () => {
    const functionName = `test-delete-url-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    await service.createFunctionUrl(functionName, {
      authType: FunctionUrlAuthType.NONE,
    });

    await expect(service.deleteFunctionUrl(functionName)).resolves.not.toThrow();

    // Verify deletion
    await expect(service.getFunctionUrl(functionName)).rejects.toThrow();
  });

  test('createEventSourceMapping - should create SQS trigger', async () => {
    const functionName = `test-esm-func-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    // LocalStack may need SQS queue to exist
    const queueArn = 'arn:aws:sqs:us-east-1:000000000000:test-queue';

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

  test('listEventSourceMappings - should list mappings for function', async () => {
    const functionName = `test-list-esm-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const queueArn1 = 'arn:aws:sqs:us-east-1:000000000000:test-queue-1';
    const queueArn2 = 'arn:aws:sqs:us-east-1:000000000000:test-queue-2';

    await service.createEventSourceMapping(functionName, {
      eventSourceArn: queueArn1,
      eventSourceType: EventSourceType.SQS,
      enabled: true,
    });

    await service.createEventSourceMapping(functionName, {
      eventSourceArn: queueArn2,
      eventSourceType: EventSourceType.SQS,
      enabled: true,
    });

    const mappings = await service.listEventSourceMappings(functionName);

    expect(mappings.length).toBeGreaterThanOrEqual(2);
    const arns = mappings.map((m) => m.eventSourceArn);
    expect(arns).toContain(queueArn1);
    expect(arns).toContain(queueArn2);
  });

  test('updateEventSourceMapping - should enable/disable mapping', async () => {
    const functionName = `test-update-esm-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const queueArn = 'arn:aws:sqs:us-east-1:000000000000:test-queue-update';

    const mapping = await service.createEventSourceMapping(functionName, {
      eventSourceArn: queueArn,
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
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    const queueArn = 'arn:aws:sqs:us-east-1:000000000000:test-queue-delete';

    const mapping = await service.createEventSourceMapping(functionName, {
      eventSourceArn: queueArn,
      eventSourceType: EventSourceType.SQS,
      enabled: true,
    });

    await expect(service.deleteEventSourceMapping(mapping.id)).resolves.not.toThrow();

    // Verify deletion
    await expect(service.getEventSourceMapping(mapping.id)).rejects.toThrow();
  });

  test('Error handling - should throw on non-existent function', async () => {
    await expect(service.getFunction('nonexistent-function-12345')).rejects.toThrow();
  });

  test('Error handling - should throw on duplicate function name', async () => {
    const functionName = `test-duplicate-${Date.now()}`;
    functionNames.push(functionName);

    await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    await expect(
      service.createFunction({
        name: functionName,
        runtime: FunctionRuntime.PYTHON_3_11,
        handler: 'handler.handler',
        code: { zipFile: createPythonFunctionCode() },
        role: testRole,
      })
    ).rejects.toThrow();
  });

  test('createFunction with defaults - should use default memory and timeout', async () => {
    const functionName = `test-defaults-${Date.now()}`;
    functionNames.push(functionName);

    const func = await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.PYTHON_3_11,
      handler: 'handler.handler',
      code: { zipFile: createPythonFunctionCode() },
      role: testRole,
    });

    expect(func.memorySize).toBe(128); // Default memory
    expect(func.timeout).toBe(3); // Default timeout
  });

  test('createFunction with Node.js runtime', async () => {
    const functionName = `test-nodejs-${Date.now()}`;
    functionNames.push(functionName);

    const nodeCode = `
exports.handler = async (event) => {
  return { statusCode: 200, body: 'Hello from Node.js!' };
};
`;

    const func = await service.createFunction({
      name: functionName,
      runtime: FunctionRuntime.NODEJS_20,
      handler: 'index.handler',
      code: { zipFile: createMinimalZip('index.js', nodeCode) },
      role: testRole,
    });

    expect(func.runtime).toBe(FunctionRuntime.NODEJS_20);
    expect(func.handler).toBe('index.handler');
  });
});
