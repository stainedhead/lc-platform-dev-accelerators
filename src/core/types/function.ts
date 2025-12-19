/**
 * Function Types - Serverless Function Hosting
 *
 * Types for FunctionHostingService - deploying and managing serverless functions
 * Provider-agnostic abstractions for AWS Lambda, Azure Functions, GCP Cloud Functions, etc.
 */

export enum FunctionStatus {
  CREATING = 'creating',
  ACTIVE = 'active',
  UPDATING = 'updating',
  FAILED = 'failed',
  INACTIVE = 'inactive',
  DELETING = 'deleting',
}

export enum FunctionRuntime {
  NODEJS_18 = 'nodejs18.x',
  NODEJS_20 = 'nodejs20.x',
  PYTHON_3_11 = 'python3.11',
  PYTHON_3_12 = 'python3.12',
  JAVA_17 = 'java17',
  JAVA_21 = 'java21',
  CUSTOM = 'provided.al2023',
}

export enum InvocationType {
  SYNC = 'sync',
  ASYNC = 'async',
  DRY_RUN = 'dry-run',
}

export enum EventSourceType {
  SQS = 'sqs',
  S3 = 's3',
  EVENTBRIDGE = 'eventbridge',
  HTTP = 'http',
  SCHEDULE = 'schedule',
}

export enum FunctionUrlAuthType {
  NONE = 'none',
  IAM = 'iam',
}

export interface ServerlessFunction {
  name: string;
  arn?: string;
  description?: string;
  runtime: FunctionRuntime;
  handler: string;
  status: FunctionStatus;
  memorySize: number;
  timeout: number;
  environment: Record<string, string>;
  codeSize?: number;
  lastModified: Date;
  created: Date;
  role?: string;
  version?: string;
}

export interface CreateFunctionParams {
  name: string;
  runtime: FunctionRuntime;
  handler: string;
  code: FunctionCode;
  description?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
  role?: string;
}

export interface FunctionCode {
  zipFile?: Buffer;
  s3Bucket?: string;
  s3Key?: string;
  s3ObjectVersion?: string;
  imageUri?: string;
}

export interface UpdateFunctionParams {
  description?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
  handler?: string;
  runtime?: FunctionRuntime;
  role?: string;
}

export interface UpdateFunctionCodeParams {
  zipFile?: Buffer;
  s3Bucket?: string;
  s3Key?: string;
  s3ObjectVersion?: string;
  imageUri?: string;
}

export interface InvokeFunctionParams {
  payload?: unknown;
  invocationType?: InvocationType;
}

export interface InvocationResult {
  statusCode: number;
  payload?: unknown;
  executedVersion?: string;
  functionError?: string;
  logResult?: string;
}

export interface ListFunctionsParams {
  maxItems?: number;
  nextToken?: string;
}

export interface ListFunctionsResult {
  functions: ServerlessFunction[];
  nextToken?: string;
}

export interface EventSourceMapping {
  id: string;
  functionName: string;
  eventSourceArn: string;
  eventSourceType: EventSourceType;
  enabled: boolean;
  batchSize?: number;
  created: Date;
  lastModified: Date;
  status: string;
}

export interface CreateEventSourceParams {
  eventSourceArn: string;
  eventSourceType: EventSourceType;
  enabled?: boolean;
  batchSize?: number;
  startingPosition?: 'TRIM_HORIZON' | 'LATEST';
}

export interface FunctionUrl {
  functionName: string;
  url: string;
  authType: FunctionUrlAuthType;
  cors?: FunctionUrlCors;
  created: Date;
  lastModified: Date;
}

export interface FunctionUrlParams {
  authType?: FunctionUrlAuthType;
  cors?: FunctionUrlCors;
}

export interface FunctionUrlCors {
  allowCredentials?: boolean;
  allowHeaders?: string[];
  allowMethods?: string[];
  allowOrigins?: string[];
  exposeHeaders?: string[];
  maxAge?: number;
}
