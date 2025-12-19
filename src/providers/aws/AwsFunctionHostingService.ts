/**
 * AWS FunctionHostingService Implementation
 *
 * AWS Lambda-based serverless function hosting.
 * Implements serverless function deployment, invocation, and event source management.
 */

import {
  LambdaClient,
  type LambdaClientConfig,
  CreateFunctionCommand,
  GetFunctionCommand,
  UpdateFunctionConfigurationCommand,
  UpdateFunctionCodeCommand,
  DeleteFunctionCommand,
  ListFunctionsCommand,
  InvokeCommand,
  CreateEventSourceMappingCommand,
  GetEventSourceMappingCommand,
  UpdateEventSourceMappingCommand,
  DeleteEventSourceMappingCommand,
  ListEventSourceMappingsCommand,
  CreateFunctionUrlConfigCommand,
  GetFunctionUrlConfigCommand,
  UpdateFunctionUrlConfigCommand,
  DeleteFunctionUrlConfigCommand,
  type FunctionConfiguration,
  type State,
  type InvocationType as LambdaInvocationType,
  type FunctionUrlAuthType as LambdaFunctionUrlAuthType,
  type EventSourceMappingConfiguration,
} from '@aws-sdk/client-lambda';
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
import {
  FunctionStatus,
  InvocationType,
  FunctionUrlAuthType,
  EventSourceType,
} from '../../core/types/function';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../core/types/common';
import { withRetry } from '../../utils/retry';
import { getErrorMessage, getErrorName } from '../../utils/error';

export interface AwsFunctionHostingConfig {
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class AwsFunctionHostingService implements FunctionHostingService {
  private client: LambdaClient;

  constructor(config?: AwsFunctionHostingConfig) {
    const clientConfig: LambdaClientConfig = {
      region: config?.region ?? process.env.AWS_REGION ?? 'us-east-1',
    };

    if (config?.endpoint !== undefined && config.endpoint !== null && config.endpoint !== '') {
      clientConfig.endpoint = config.endpoint;
    }

    if (config?.credentials !== undefined && config.credentials !== null) {
      clientConfig.credentials = config.credentials;
    }

    this.client = new LambdaClient(clientConfig);
  }

  async createFunction(params: CreateFunctionParams): Promise<ServerlessFunction> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new CreateFunctionCommand({
            FunctionName: params.name,
            Runtime: params.runtime,
            Handler: params.handler,
            Code: {
              ZipFile: params.code.zipFile,
              S3Bucket: params.code.s3Bucket,
              S3Key: params.code.s3Key,
              S3ObjectVersion: params.code.s3ObjectVersion,
              ImageUri: params.code.imageUri,
            },
            Description: params.description,
            MemorySize: params.memorySize ?? 128,
            Timeout: params.timeout ?? 3,
            Environment: params.environment ? { Variables: params.environment } : undefined,
            Role: params.role ?? this.getDefaultRole(),
            PackageType: params.code.imageUri ? 'Image' : 'Zip',
          })
        );

        return this.mapToFunction(response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceConflictException') {
          throw new ValidationError(`Function '${params.name}' already exists`);
        }
        if (errorName === 'InvalidParameterValueException') {
          throw new ValidationError(`Invalid parameters: ${getErrorMessage(error)}`);
        }
        throw new ServiceUnavailableError(`Failed to create function: ${getErrorMessage(error)}`);
      }
    });
  }

  async getFunction(functionName: string): Promise<ServerlessFunction> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new GetFunctionCommand({
            FunctionName: functionName,
          })
        );

        if (!response.Configuration) {
          throw new ResourceNotFoundError('Function', functionName);
        }

        return this.mapToFunction(response.Configuration);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        throw new ServiceUnavailableError(`Failed to get function: ${getErrorMessage(error)}`);
      }
    });
  }

  async updateFunctionConfiguration(
    functionName: string,
    params: UpdateFunctionParams
  ): Promise<ServerlessFunction> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new UpdateFunctionConfigurationCommand({
            FunctionName: functionName,
            Description: params.description,
            MemorySize: params.memorySize,
            Timeout: params.timeout,
            Environment: params.environment ? { Variables: params.environment } : undefined,
            Handler: params.handler,
            Runtime: params.runtime,
            Role: params.role,
          })
        );

        return this.mapToFunction(response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        if (errorName === 'InvalidParameterValueException') {
          throw new ValidationError(`Invalid parameters: ${getErrorMessage(error)}`);
        }
        throw new ServiceUnavailableError(
          `Failed to update function configuration: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async updateFunctionCode(
    functionName: string,
    params: UpdateFunctionCodeParams
  ): Promise<ServerlessFunction> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new UpdateFunctionCodeCommand({
            FunctionName: functionName,
            ZipFile: params.zipFile,
            S3Bucket: params.s3Bucket,
            S3Key: params.s3Key,
            S3ObjectVersion: params.s3ObjectVersion,
            ImageUri: params.imageUri,
          })
        );

        return this.mapToFunction(response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        throw new ServiceUnavailableError(
          `Failed to update function code: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async deleteFunction(functionName: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.send(
          new DeleteFunctionCommand({
            FunctionName: functionName,
          })
        );
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        throw new ServiceUnavailableError(`Failed to delete function: ${getErrorMessage(error)}`);
      }
    });
  }

  async listFunctions(params?: ListFunctionsParams): Promise<ListFunctionsResult> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new ListFunctionsCommand({
            MaxItems: params?.maxItems ?? 50,
            Marker: params?.nextToken,
          })
        );

        const functions = (response.Functions ?? []).map((f: FunctionConfiguration) =>
          this.mapToFunction(f)
        );

        const result: ListFunctionsResult = {
          functions,
        };

        if (response.NextMarker) {
          result.nextToken = response.NextMarker;
        }

        return result;
      } catch (error: unknown) {
        throw new ServiceUnavailableError(`Failed to list functions: ${getErrorMessage(error)}`);
      }
    });
  }

  async invokeFunction(
    functionName: string,
    params?: InvokeFunctionParams
  ): Promise<InvocationResult> {
    return withRetry(async () => {
      try {
        const invocationType = this.mapInvocationType(params?.invocationType);

        const invokeParams: {
          FunctionName: string;
          InvocationType: LambdaInvocationType;
          LogType: 'Tail' | 'None';
          Payload?: Uint8Array;
        } = {
          FunctionName: functionName,
          InvocationType: invocationType,
          LogType: params?.invocationType === InvocationType.SYNC ? 'Tail' : 'None',
        };

        if (params?.payload) {
          invokeParams.Payload = Buffer.from(JSON.stringify(params.payload));
        }

        const response = await this.client.send(new InvokeCommand(invokeParams));

        let payload: unknown;
        if (response.Payload) {
          const payloadString = Buffer.from(response.Payload).toString('utf-8');
          if (payloadString) {
            try {
              payload = JSON.parse(payloadString);
            } catch {
              payload = payloadString;
            }
          }
        }

        const result: InvocationResult = {
          statusCode: response.StatusCode ?? 200,
        };

        if (payload !== undefined) {
          result.payload = payload;
        }
        if (response.ExecutedVersion) {
          result.executedVersion = response.ExecutedVersion;
        }
        if (response.FunctionError) {
          result.functionError = response.FunctionError;
        }
        if (response.LogResult) {
          result.logResult = Buffer.from(response.LogResult, 'base64').toString('utf-8');
        }

        return result;
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        throw new ServiceUnavailableError(`Failed to invoke function: ${getErrorMessage(error)}`);
      }
    });
  }

  async createEventSourceMapping(
    functionName: string,
    params: CreateEventSourceParams
  ): Promise<EventSourceMapping> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new CreateEventSourceMappingCommand({
            FunctionName: functionName,
            EventSourceArn: params.eventSourceArn,
            Enabled: params.enabled ?? true,
            BatchSize: params.batchSize,
            StartingPosition: params.startingPosition,
          })
        );

        return this.mapToEventSourceMapping(response, params.eventSourceType);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        if (errorName === 'InvalidParameterValueException') {
          throw new ValidationError(`Invalid parameters: ${getErrorMessage(error)}`);
        }
        throw new ServiceUnavailableError(
          `Failed to create event source mapping: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async getEventSourceMapping(mappingId: string): Promise<EventSourceMapping> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new GetEventSourceMappingCommand({
            UUID: mappingId,
          })
        );

        return this.mapToEventSourceMapping(response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('EventSourceMapping', mappingId);
        }
        throw new ServiceUnavailableError(
          `Failed to get event source mapping: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async updateEventSourceMapping(mappingId: string, enabled: boolean): Promise<EventSourceMapping> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new UpdateEventSourceMappingCommand({
            UUID: mappingId,
            Enabled: enabled,
          })
        );

        return this.mapToEventSourceMapping(response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('EventSourceMapping', mappingId);
        }
        throw new ServiceUnavailableError(
          `Failed to update event source mapping: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async deleteEventSourceMapping(mappingId: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.send(
          new DeleteEventSourceMappingCommand({
            UUID: mappingId,
          })
        );
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('EventSourceMapping', mappingId);
        }
        throw new ServiceUnavailableError(
          `Failed to delete event source mapping: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async listEventSourceMappings(functionName: string): Promise<EventSourceMapping[]> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new ListEventSourceMappingsCommand({
            FunctionName: functionName,
          })
        );

        return (response.EventSourceMappings ?? []).map((m: EventSourceMappingConfiguration) =>
          this.mapToEventSourceMapping(m)
        );
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        throw new ServiceUnavailableError(
          `Failed to list event source mappings: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async createFunctionUrl(functionName: string, params?: FunctionUrlParams): Promise<FunctionUrl> {
    return withRetry(async () => {
      try {
        const authType = this.mapFunctionUrlAuthType(params?.authType);

        const response = await this.client.send(
          new CreateFunctionUrlConfigCommand({
            FunctionName: functionName,
            AuthType: authType,
            Cors: params?.cors
              ? {
                  AllowCredentials: params.cors.allowCredentials,
                  AllowHeaders: params.cors.allowHeaders,
                  AllowMethods: params.cors.allowMethods,
                  AllowOrigins: params.cors.allowOrigins,
                  ExposeHeaders: params.cors.exposeHeaders,
                  MaxAge: params.cors.maxAge,
                }
              : undefined,
          })
        );

        return this.mapToFunctionUrl(functionName, response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Function', functionName);
        }
        if (errorName === 'ResourceConflictException') {
          throw new ValidationError(`Function URL already exists for '${functionName}'`);
        }
        throw new ServiceUnavailableError(
          `Failed to create function URL: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async getFunctionUrl(functionName: string): Promise<FunctionUrl> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new GetFunctionUrlConfigCommand({
            FunctionName: functionName,
          })
        );

        return this.mapToFunctionUrl(functionName, response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('FunctionUrl', functionName);
        }
        throw new ServiceUnavailableError(`Failed to get function URL: ${getErrorMessage(error)}`);
      }
    });
  }

  async updateFunctionUrl(functionName: string, params: FunctionUrlParams): Promise<FunctionUrl> {
    return withRetry(async () => {
      try {
        const authType = this.mapFunctionUrlAuthType(params.authType);

        const response = await this.client.send(
          new UpdateFunctionUrlConfigCommand({
            FunctionName: functionName,
            AuthType: authType,
            Cors: params.cors
              ? {
                  AllowCredentials: params.cors.allowCredentials,
                  AllowHeaders: params.cors.allowHeaders,
                  AllowMethods: params.cors.allowMethods,
                  AllowOrigins: params.cors.allowOrigins,
                  ExposeHeaders: params.cors.exposeHeaders,
                  MaxAge: params.cors.maxAge,
                }
              : undefined,
          })
        );

        return this.mapToFunctionUrl(functionName, response);
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('FunctionUrl', functionName);
        }
        throw new ServiceUnavailableError(
          `Failed to update function URL: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async deleteFunctionUrl(functionName: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.send(
          new DeleteFunctionUrlConfigCommand({
            FunctionName: functionName,
          })
        );
      } catch (error: unknown) {
        const errorName = getErrorName(error);
        if (errorName === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('FunctionUrl', functionName);
        }
        throw new ServiceUnavailableError(
          `Failed to delete function URL: ${getErrorMessage(error)}`
        );
      }
    });
  }

  // Private helper methods

  private getDefaultRole(): string {
    // In production, this would be configurable or derived from context
    return `arn:aws:iam::${process.env.AWS_ACCOUNT_ID ?? '000000000000'}:role/lambda-execution-role`;
  }

  private mapToFunction(config: FunctionConfiguration): ServerlessFunction {
    const func: ServerlessFunction = {
      name: config.FunctionName ?? '',
      runtime: (config.Runtime as ServerlessFunction['runtime']) ?? 'nodejs20.x',
      handler: config.Handler ?? '',
      status: this.mapToFunctionStatus(config.State),
      memorySize: config.MemorySize ?? 128,
      timeout: config.Timeout ?? 3,
      environment: config.Environment?.Variables ?? {},
      lastModified: config.LastModified ? new Date(config.LastModified) : new Date(),
      created: config.LastModified ? new Date(config.LastModified) : new Date(),
    };

    if (config.FunctionArn) {
      func.arn = config.FunctionArn;
    }
    if (config.Description) {
      func.description = config.Description;
    }
    if (config.CodeSize !== undefined) {
      func.codeSize = config.CodeSize;
    }
    if (config.Role) {
      func.role = config.Role;
    }
    if (config.Version) {
      func.version = config.Version;
    }

    return func;
  }

  private mapToFunctionStatus(state?: State): FunctionStatus {
    if (!state) {
      return FunctionStatus.ACTIVE;
    }

    switch (state) {
      case 'Pending':
        return FunctionStatus.CREATING;
      case 'Active':
        return FunctionStatus.ACTIVE;
      case 'Inactive':
        return FunctionStatus.INACTIVE;
      case 'Failed':
        return FunctionStatus.FAILED;
      default:
        return FunctionStatus.ACTIVE;
    }
  }

  private mapInvocationType(invocationType?: InvocationType): LambdaInvocationType {
    if (!invocationType) {
      return 'RequestResponse';
    }

    switch (invocationType) {
      case InvocationType.SYNC:
        return 'RequestResponse';
      case InvocationType.ASYNC:
        return 'Event';
      case InvocationType.DRY_RUN:
        return 'DryRun';
      default:
        return 'RequestResponse';
    }
  }

  private mapFunctionUrlAuthType(authType?: FunctionUrlAuthType): LambdaFunctionUrlAuthType {
    if (!authType || authType === FunctionUrlAuthType.NONE) {
      return 'NONE';
    }
    return 'AWS_IAM';
  }

  private mapFromLambdaAuthType(authType?: LambdaFunctionUrlAuthType): FunctionUrlAuthType {
    if (!authType || authType === 'NONE') {
      return FunctionUrlAuthType.NONE;
    }
    return FunctionUrlAuthType.IAM;
  }

  private mapToEventSourceMapping(
    config: EventSourceMappingConfiguration,
    eventSourceType?: EventSourceType
  ): EventSourceMapping {
    // Derive event source type from ARN if not provided
    const derivedType = eventSourceType ?? this.deriveEventSourceType(config.EventSourceArn);

    const mapping: EventSourceMapping = {
      id: config.UUID ?? '',
      functionName: config.FunctionArn?.split(':').pop() ?? '',
      eventSourceArn: config.EventSourceArn ?? '',
      eventSourceType: derivedType,
      enabled: config.State === 'Enabled',
      created: config.LastModified ?? new Date(),
      lastModified: config.LastModified ?? new Date(),
      status: config.State ?? 'Unknown',
    };

    if (config.BatchSize !== undefined) {
      mapping.batchSize = config.BatchSize;
    }

    return mapping;
  }

  private mapToFunctionUrl(
    functionName: string,
    response: {
      FunctionUrl?: string | undefined;
      AuthType?: LambdaFunctionUrlAuthType | undefined;
      Cors?:
        | {
            AllowCredentials?: boolean | undefined;
            AllowHeaders?: string[] | undefined;
            AllowMethods?: string[] | undefined;
            AllowOrigins?: string[] | undefined;
            ExposeHeaders?: string[] | undefined;
            MaxAge?: number | undefined;
          }
        | undefined;
      CreationTime?: string | undefined;
      LastModifiedTime?: string | undefined;
    }
  ): FunctionUrl {
    const funcUrl: FunctionUrl = {
      functionName,
      url: response.FunctionUrl ?? '',
      authType: this.mapFromLambdaAuthType(response.AuthType),
      created: response.CreationTime ? new Date(response.CreationTime) : new Date(),
      lastModified: response.LastModifiedTime ? new Date(response.LastModifiedTime) : new Date(),
    };

    if (response.Cors) {
      const cors: FunctionUrl['cors'] = {};
      if (response.Cors.AllowCredentials !== undefined) {
        cors.allowCredentials = response.Cors.AllowCredentials;
      }
      if (response.Cors.AllowHeaders) {
        cors.allowHeaders = response.Cors.AllowHeaders;
      }
      if (response.Cors.AllowMethods) {
        cors.allowMethods = response.Cors.AllowMethods;
      }
      if (response.Cors.AllowOrigins) {
        cors.allowOrigins = response.Cors.AllowOrigins;
      }
      if (response.Cors.ExposeHeaders) {
        cors.exposeHeaders = response.Cors.ExposeHeaders;
      }
      if (response.Cors.MaxAge !== undefined) {
        cors.maxAge = response.Cors.MaxAge;
      }
      funcUrl.cors = cors;
    }

    return funcUrl;
  }

  private deriveEventSourceType(arn?: string): EventSourceType {
    if (!arn) {
      return EventSourceType.SQS;
    }

    if (arn.includes(':sqs:')) {
      return EventSourceType.SQS;
    }
    if (arn.includes(':s3:')) {
      return EventSourceType.S3;
    }
    if (arn.includes(':events:')) {
      return EventSourceType.EVENTBRIDGE;
    }

    return EventSourceType.SQS;
  }
}
