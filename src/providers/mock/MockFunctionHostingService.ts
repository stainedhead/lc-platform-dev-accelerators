/**
 * Mock FunctionHostingService Implementation
 *
 * In-memory implementation for testing without cloud resources.
 * Simulates serverless function lifecycle.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { FunctionHostingService } from '../../core/services/FunctionHostingService';
import type {
  ServerlessFunction,
  CreateFunctionParams,
  UpdateFunctionParams,
  UpdateFunctionCodeParams,
  InvokeFunctionParams,
  InvocationResult,
  ListFunctionsParams,
  ListFunctionsResult,
  EventSourceMapping,
  CreateEventSourceParams,
  FunctionUrl,
  FunctionUrlParams,
} from '../../core/types/function';
import { FunctionStatus, InvocationType, FunctionUrlAuthType } from '../../core/types/function';
import { ResourceNotFoundError, ValidationError } from '../../core/types/common';

export class MockFunctionHostingService implements FunctionHostingService {
  private functions = new Map<string, ServerlessFunction>();
  private eventSourceMappings = new Map<string, EventSourceMapping>();
  private functionUrls = new Map<string, FunctionUrl>();
  private handlers = new Map<string, (payload: unknown) => unknown>();
  private mappingCounter = 1;

  /**
   * Register a custom handler for function invocation testing
   */
  registerHandler(functionName: string, handler: (payload: unknown) => unknown): void {
    this.handlers.set(functionName, handler);
  }

  /**
   * Clear all registered handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Reset all mock data
   */
  reset(): void {
    this.functions.clear();
    this.eventSourceMappings.clear();
    this.functionUrls.clear();
    this.handlers.clear();
    this.mappingCounter = 1;
  }

  async createFunction(params: CreateFunctionParams): Promise<ServerlessFunction> {
    if (!params.name || !params.runtime || !params.handler) {
      throw new ValidationError('Name, runtime, and handler are required');
    }

    if (!params.code || (!params.code.zipFile && !params.code.s3Bucket && !params.code.imageUri)) {
      throw new ValidationError('Function code is required (zipFile, s3Bucket/s3Key, or imageUri)');
    }

    if (this.functions.has(params.name)) {
      throw new ValidationError(`Function '${params.name}' already exists`);
    }

    const now = new Date();
    const func: ServerlessFunction = {
      name: params.name,
      arn: `arn:aws:lambda:us-east-1:123456789012:function:${params.name}`,
      runtime: params.runtime,
      handler: params.handler,
      status: FunctionStatus.ACTIVE,
      memorySize: params.memorySize ?? 128,
      timeout: params.timeout ?? 3,
      environment: params.environment ?? {},
      codeSize: params.code.zipFile?.length ?? 1024,
      lastModified: now,
      created: now,
      role: params.role ?? 'arn:aws:iam::123456789012:role/lambda-role',
      version: '$LATEST',
    };

    if (params.description) {
      func.description = params.description;
    }

    this.functions.set(params.name, func);
    return { ...func };
  }

  async getFunction(functionName: string): Promise<ServerlessFunction> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }
    return { ...func };
  }

  async updateFunctionConfiguration(
    functionName: string,
    params: UpdateFunctionParams
  ): Promise<ServerlessFunction> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    if (params.description !== undefined) {
      func.description = params.description;
    }
    if (params.memorySize !== undefined) {
      func.memorySize = params.memorySize;
    }
    if (params.timeout !== undefined) {
      func.timeout = params.timeout;
    }
    if (params.environment !== undefined) {
      func.environment = { ...func.environment, ...params.environment };
    }
    if (params.handler !== undefined) {
      func.handler = params.handler;
    }
    if (params.runtime !== undefined) {
      func.runtime = params.runtime;
    }
    if (params.role !== undefined) {
      func.role = params.role;
    }

    func.lastModified = new Date();
    return { ...func };
  }

  async updateFunctionCode(
    functionName: string,
    params: UpdateFunctionCodeParams
  ): Promise<ServerlessFunction> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    if (!params.zipFile && !params.s3Bucket && !params.imageUri) {
      throw new ValidationError('Code update requires zipFile, s3Bucket/s3Key, or imageUri');
    }

    if (params.zipFile) {
      func.codeSize = params.zipFile.length;
    }
    func.lastModified = new Date();

    return { ...func };
  }

  async deleteFunction(functionName: string): Promise<void> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    // Delete associated resources
    this.functionUrls.delete(functionName);

    // Delete event source mappings for this function
    for (const [id, mapping] of this.eventSourceMappings.entries()) {
      if (mapping.functionName === functionName) {
        this.eventSourceMappings.delete(id);
      }
    }

    this.functions.delete(functionName);
    this.handlers.delete(functionName);
  }

  async listFunctions(params?: ListFunctionsParams): Promise<ListFunctionsResult> {
    const allFunctions = Array.from(this.functions.values());
    const maxItems = params?.maxItems ?? 50;

    // Simple pagination simulation
    let startIndex = 0;
    if (params?.nextToken) {
      startIndex = parseInt(params.nextToken, 10);
    }

    const endIndex = startIndex + maxItems;
    const paginatedFunctions = allFunctions.slice(startIndex, endIndex);

    const result: ListFunctionsResult = {
      functions: paginatedFunctions.map((f) => ({ ...f })),
    };

    if (endIndex < allFunctions.length) {
      result.nextToken = String(endIndex);
    }

    return result;
  }

  async invokeFunction(
    functionName: string,
    params?: InvokeFunctionParams
  ): Promise<InvocationResult> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    if (func.status !== FunctionStatus.ACTIVE) {
      throw new ValidationError(`Function '${functionName}' is not active`);
    }

    const invocationType = params?.invocationType ?? InvocationType.SYNC;

    // Dry run just validates
    if (invocationType === InvocationType.DRY_RUN) {
      const dryRunResult: InvocationResult = {
        statusCode: 204,
      };
      if (func.version) {
        dryRunResult.executedVersion = func.version;
      }
      return dryRunResult;
    }

    // Execute handler if registered
    const handler = this.handlers.get(functionName);
    let responsePayload: unknown;
    let functionError: string | undefined;

    if (handler) {
      try {
        responsePayload = handler(params?.payload);
      } catch (error) {
        functionError = (error as Error).message;
        responsePayload = { errorMessage: functionError, errorType: 'Error' };
      }
    } else {
      // Default mock response
      responsePayload = {
        statusCode: 200,
        body: JSON.stringify({ message: 'Mock function executed', input: params?.payload }),
      };
    }

    // For async invocation, just return 202
    if (invocationType === InvocationType.ASYNC) {
      const asyncResult: InvocationResult = {
        statusCode: 202,
      };
      if (func.version) {
        asyncResult.executedVersion = func.version;
      }
      return asyncResult;
    }

    const result: InvocationResult = {
      statusCode: 200,
      payload: responsePayload,
    };

    if (func.version) {
      result.executedVersion = func.version;
    }
    if (functionError) {
      result.functionError = functionError;
    }

    return result;
  }

  async createEventSourceMapping(
    functionName: string,
    params: CreateEventSourceParams
  ): Promise<EventSourceMapping> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    if (!params.eventSourceArn) {
      throw new ValidationError('eventSourceArn is required');
    }

    const mappingId = `mock-esm-${this.mappingCounter++}`;
    const now = new Date();

    const mapping: EventSourceMapping = {
      id: mappingId,
      functionName,
      eventSourceArn: params.eventSourceArn,
      eventSourceType: params.eventSourceType,
      enabled: params.enabled ?? true,
      batchSize: params.batchSize ?? 10,
      created: now,
      lastModified: now,
      status: 'Enabled',
    };

    this.eventSourceMappings.set(mappingId, mapping);
    return { ...mapping };
  }

  async getEventSourceMapping(mappingId: string): Promise<EventSourceMapping> {
    const mapping = this.eventSourceMappings.get(mappingId);
    if (!mapping) {
      throw new ResourceNotFoundError('EventSourceMapping', mappingId);
    }
    return { ...mapping };
  }

  async updateEventSourceMapping(mappingId: string, enabled: boolean): Promise<EventSourceMapping> {
    const mapping = this.eventSourceMappings.get(mappingId);
    if (!mapping) {
      throw new ResourceNotFoundError('EventSourceMapping', mappingId);
    }

    mapping.enabled = enabled;
    mapping.status = enabled ? 'Enabled' : 'Disabled';
    mapping.lastModified = new Date();

    return { ...mapping };
  }

  async deleteEventSourceMapping(mappingId: string): Promise<void> {
    const mapping = this.eventSourceMappings.get(mappingId);
    if (!mapping) {
      throw new ResourceNotFoundError('EventSourceMapping', mappingId);
    }

    this.eventSourceMappings.delete(mappingId);
  }

  async listEventSourceMappings(functionName: string): Promise<EventSourceMapping[]> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    const mappings = Array.from(this.eventSourceMappings.values()).filter(
      (m) => m.functionName === functionName
    );

    return mappings.map((m) => ({ ...m }));
  }

  async createFunctionUrl(functionName: string, params?: FunctionUrlParams): Promise<FunctionUrl> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    if (this.functionUrls.has(functionName)) {
      throw new ValidationError(`Function URL already exists for '${functionName}'`);
    }

    const now = new Date();
    const functionUrl: FunctionUrl = {
      functionName,
      url: `https://${functionName}.lambda-url.us-east-1.on.aws/`,
      authType: params?.authType ?? FunctionUrlAuthType.NONE,
      created: now,
      lastModified: now,
    };

    if (params?.cors) {
      functionUrl.cors = params.cors;
    }

    this.functionUrls.set(functionName, functionUrl);
    return { ...functionUrl };
  }

  async getFunctionUrl(functionName: string): Promise<FunctionUrl> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    const functionUrl = this.functionUrls.get(functionName);
    if (!functionUrl) {
      throw new ResourceNotFoundError('FunctionUrl', functionName);
    }

    return { ...functionUrl };
  }

  async updateFunctionUrl(functionName: string, params: FunctionUrlParams): Promise<FunctionUrl> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    const functionUrl = this.functionUrls.get(functionName);
    if (!functionUrl) {
      throw new ResourceNotFoundError('FunctionUrl', functionName);
    }

    if (params.authType !== undefined) {
      functionUrl.authType = params.authType;
    }
    if (params.cors !== undefined) {
      functionUrl.cors = params.cors;
    }
    functionUrl.lastModified = new Date();

    return { ...functionUrl };
  }

  async deleteFunctionUrl(functionName: string): Promise<void> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new ResourceNotFoundError('Function', functionName);
    }

    const functionUrl = this.functionUrls.get(functionName);
    if (!functionUrl) {
      throw new ResourceNotFoundError('FunctionUrl', functionName);
    }

    this.functionUrls.delete(functionName);
  }
}
