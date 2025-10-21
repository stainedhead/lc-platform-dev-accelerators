/**
 * Cloud-Agnostic Service Contracts
 *
 * All 11 service interfaces for the LCPlatform DevAccelerator package.
 * These contracts are provider-agnostic and contain NO cloud-specific types.
 *
 * Generated from: specs/001-core-platform-infrastructure/spec.md
 * Date: 2025-10-20
 */

// =============================================================================
// Common Types
// =============================================================================

export enum ProviderType {
  AWS = 'aws',
  AZURE = 'azure',
  MOCK = 'mock'
}

export interface ProviderConfig {
  provider: ProviderType;
  region?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  options?: Record<string, any>;
}

export class LCPlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LCPlatformError';
  }
}

// =============================================================================
// 1. Web Hosting Service (FR-001 to FR-005)
// =============================================================================

export enum DeploymentStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  UPDATING = 'updating',
  DELETING = 'deleting',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

export interface Deployment {
  id: string;
  name: string;
  url: string;
  status: DeploymentStatus;
  image: string;
  cpu: number;
  memory: number;
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
  created: Date;
  lastUpdated: Date;
  environment: Record<string, string>;
}

export interface DeployApplicationParams {
  name: string;
  image: string;
  port?: number;
  environment?: Record<string, string>;
  cpu?: number;
  memory?: number;
  minInstances?: number;
  maxInstances?: number;
}

export interface UpdateApplicationParams {
  image?: string;
  environment?: Record<string, string>;
  cpu?: number;
  memory?: number;
}

export interface ScaleParams {
  minInstances?: number;
  maxInstances?: number;
}

export interface WebHostingService {
  deployApplication(params: DeployApplicationParams): Promise<Deployment>;
  getDeployment(deploymentId: string): Promise<Deployment>;
  updateApplication(deploymentId: string, params: UpdateApplicationParams): Promise<Deployment>;
  deleteApplication(deploymentId: string): Promise<void>;
  getApplicationUrl(deploymentId: string): Promise<string>;
  scaleApplication(deploymentId: string, params: ScaleParams): Promise<void>;
}

// =============================================================================
// 2. Batch Processing Service (FR-006 to FR-010)
// =============================================================================

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  image: string;
  command?: string[];
  environment: Record<string, string>;
  cpu: number;
  memory: number;
  timeout: number;
  retryCount: number;
  attemptsMade: number;
  created: Date;
  started?: Date;
  completed?: Date;
  exitCode?: number;
  errorMessage?: string;
}

export interface JobParams {
  name: string;
  image: string;
  command?: string[];
  environment?: Record<string, string>;
  cpu?: number;
  memory?: number;
  timeout?: number;
  retryCount?: number;
}

export interface ListJobsParams {
  status?: JobStatus;
  limit?: number;
  nextToken?: string;
}

export interface ScheduleJobParams extends JobParams {
  schedule: string; // Cron expression
}

export interface ScheduledJob extends Job {
  schedule: string;
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
}

export interface BatchService {
  submitJob(params: JobParams): Promise<Job>;
  getJob(jobId: string): Promise<Job>;
  listJobs(params?: ListJobsParams): Promise<Job[]>;
  terminateJob(jobId: string): Promise<void>;
  scheduleJob(params: ScheduleJobParams): Promise<ScheduledJob>;
}

// =============================================================================
// 3. Secrets Management Service (FR-011 to FR-015)
// =============================================================================

export interface Secret {
  name: string;
  version: string;
  created: Date;
  lastModified: Date;
  lastRotated?: Date;
  rotationEnabled: boolean;
  rotationDays?: number;
}

export interface SecretMetadata {
  name: string;
  version: string;
  created: Date;
  lastModified: Date;
}

export type SecretValue = string | object;
export type RotationFunction = (currentValue: SecretValue) => Promise<SecretValue>;

export interface SecretsService {
  createSecret(name: string, value: SecretValue): Promise<Secret>;
  getSecret(name: string): Promise<SecretValue>;
  updateSecret(name: string, value: SecretValue): Promise<Secret>;
  deleteSecret(name: string): Promise<void>;
  listSecrets(): Promise<SecretMetadata[]>;
  rotateSecret(name: string, rotationFn?: RotationFunction): Promise<void>;
}

// =============================================================================
// 4. Configuration Service (FR-016 to FR-020)
// =============================================================================

export interface Configuration {
  application: string;
  environment: string;
  version: string;
  data: Record<string, any>;
  schema?: object;
  description?: string;
  created: Date;
  deployed: boolean;
}

export interface ConfigurationParams {
  application: string;
  environment: string;
  data: object;
  schema?: object;
  description?: string;
}

export interface UpdateConfigParams {
  data?: object;
  schema?: object;
  description?: string;
}

export interface ConfigurationData {
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  expected: string;
  actual: string;
}

export interface ConfigurationService {
  createConfiguration(params: ConfigurationParams): Promise<Configuration>;
  getConfiguration(app: string, environment: string): Promise<ConfigurationData>;
  updateConfiguration(app: string, params: UpdateConfigParams): Promise<Configuration>;
  validateConfiguration(app: string, schema: object): Promise<ValidationResult>;
  rollbackConfiguration(app: string, version: string): Promise<Configuration>;
}

// =============================================================================
// 5. Document Store Service (FR-021 to FR-025)
// =============================================================================

export interface Document<T = any> {
  _id: string;
  [key: string]: T;
}

export interface Collection {
  name: string;
  indexes: IndexDefinition[];
  documentCount: number;
  ttl?: number;
}

export interface CollectionOptions {
  indexes?: IndexDefinition[];
  ttl?: number;
}

export interface IndexDefinition {
  field: string;
  unique?: boolean;
  sparse?: boolean;
}

export interface Query {
  [field: string]: any | QueryOperator;
}

export interface QueryOperator {
  $eq?: any;
  $ne?: any;
  $gt?: number | Date;
  $gte?: number | Date;
  $lt?: number | Date;
  $lte?: number | Date;
  $in?: any[];
  $nin?: any[];
}

export interface DocumentStoreService {
  connect(connectionString?: string): Promise<void>;
  createCollection(name: string, options?: CollectionOptions): Promise<Collection>;
  insert<T>(collection: string, document: T): Promise<string>;
  find<T>(collection: string, query: Query): Promise<T[]>;
  findOne<T>(collection: string, query: Query): Promise<T | null>;
  update<T>(collection: string, query: Query, update: Partial<T>): Promise<number>;
  delete(collection: string, query: Query): Promise<number>;
  createIndex(collection: string, index: IndexDefinition): Promise<void>;
}

// =============================================================================
// 6. Relational Database Service (FR-026 to FR-030)
// =============================================================================

export enum IsolationLevel {
  READ_UNCOMMITTED = 'read_uncommitted',
  READ_COMMITTED = 'read_committed',
  REPEATABLE_READ = 'repeatable_read',
  SERIALIZABLE = 'serializable'
}

export interface ExecuteResult {
  rowsAffected: number;
  insertId?: string | number;
}

export interface Migration {
  version: string;
  description: string;
  up: string;
  down: string;
  appliedAt?: Date;
}

export interface Transaction {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<ExecuteResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface Connection {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<ExecuteResult>;
  close(): Promise<void>;
}

export interface DataStoreService {
  connect(connectionString?: string): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<ExecuteResult>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  migrate(migrations: Migration[]): Promise<void>;
  getConnection(): Connection;
}

// =============================================================================
// 7. Object Storage Service (FR-031 to FR-036)
// =============================================================================

export interface ObjectData {
  bucket: string;
  key: string;
  data: Buffer | ReadableStream;
  size: number;
  contentType?: string;
  metadata?: ObjectMetadata;
  etag: string;
  lastModified: Date;
}

export interface ObjectMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface ObjectInfo {
  bucket: string;
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

export interface ObjectLocation {
  bucket: string;
  key: string;
}

export interface BucketOptions {
  versioning?: boolean;
  encryption?: boolean;
  publicRead?: boolean;
  lifecycle?: LifecycleRule[];
}

export interface LifecycleRule {
  prefix: string;
  expirationDays: number;
}

export interface ObjectStoreService {
  createBucket(name: string, options?: BucketOptions): Promise<void>;
  putObject(bucket: string, key: string, data: Buffer | ReadableStream, metadata?: ObjectMetadata): Promise<void>;
  getObject(bucket: string, key: string): Promise<ObjectData>;
  deleteObject(bucket: string, key: string): Promise<void>;
  listObjects(bucket: string, prefix?: string): Promise<ObjectInfo[]>;
  generatePresignedUrl(bucket: string, key: string, expires?: number): Promise<string>;
  copyObject(source: ObjectLocation, destination: ObjectLocation): Promise<void>;
}

// =============================================================================
// 8. Queue Service (FR-037 to FR-042)
// =============================================================================

export interface Message {
  body: string | object;
  attributes?: Record<string, string>;
  delaySeconds?: number;
  deduplicationId?: string;
  groupId?: string;
}

export interface ReceivedMessage {
  id: string;
  receiptHandle: string;
  body: string | object;
  attributes: Record<string, string>;
  sentTimestamp: Date;
  approximateReceiveCount: number;
}

export interface Queue {
  name: string;
  url: string;
  messageCount: number;
  created: Date;
}

export interface QueueOptions {
  visibilityTimeout?: number;
  messageRetention?: number;
  maxMessageSize?: number;
  enableDeadLetter?: boolean;
  deadLetterAfterRetries?: number;
  fifo?: boolean;
}

export interface QueueAttributes {
  approximateMessageCount: number;
  approximateMessageNotVisibleCount: number;
  created: Date;
  lastModified: Date;
}

export interface QueueService {
  createQueue(name: string, options?: QueueOptions): Promise<Queue>;
  sendMessage(queue: string, message: Message): Promise<string>;
  sendBatch(queue: string, messages: Message[]): Promise<string[]>;
  receiveMessages(queue: string, count?: number): Promise<ReceivedMessage[]>;
  deleteMessage(queue: string, receiptHandle: string): Promise<void>;
  getQueueAttributes(queue: string): Promise<QueueAttributes>;
  purgeQueue(queue: string): Promise<void>;
}

// =============================================================================
// 9. Event Bus Service (FR-043 to FR-047)
// =============================================================================

export interface Event {
  source: string;
  type: string;
  data: object;
  metadata?: Record<string, string>;
  time?: Date;
  id?: string;
}

export interface EventBus {
  name: string;
  arn?: string;
  created: Date;
}

export interface Rule {
  name: string;
  eventPattern: EventPattern;
  description?: string;
  enabled: boolean;
  targets: Target[];
}

export interface EventPattern {
  source?: string[];
  type?: string[];
  data?: Record<string, any>;
}

export interface Target {
  id: string;
  type: TargetType;
  endpoint: string;
}

export enum TargetType {
  HTTP = 'http',
  HTTPS = 'https',
  QUEUE = 'queue',
  FUNCTION = 'function',
  EMAIL = 'email'
}

export interface EventBusService {
  createEventBus(name: string): Promise<EventBus>;
  publishEvent(event: Event): Promise<string>;
  publishBatch(events: Event[]): Promise<string[]>;
  createRule(params: RuleParams): Promise<Rule>;
  addTarget(ruleName: string, target: Target): Promise<void>;
  deleteRule(ruleName: string): Promise<void>;
}

export interface RuleParams {
  name: string;
  eventPattern: EventPattern;
  description?: string;
  enabled?: boolean;
}

// =============================================================================
// 10. Notification Service (FR-048 to FR-052)
// =============================================================================

export interface NotificationMessage {
  subject?: string;
  body: string;
  attributes?: Record<string, string>;
}

export interface Topic {
  name: string;
  arn?: string;
  subscriptions: Subscription[];
  created: Date;
}

export interface Subscription {
  id: string;
  protocol: Protocol;
  endpoint: string;
  confirmed: boolean;
  created: Date;
}

export enum Protocol {
  EMAIL = 'email',
  SMS = 'sms',
  HTTP = 'http',
  HTTPS = 'https',
  WEBHOOK = 'webhook'
}

export interface EmailParams {
  to: string[];
  from?: string;
  subject: string;
  body: string;
  html?: boolean;
}

export interface SMSParams {
  to: string;
  message: string;
  senderId?: string;
}

export interface NotificationService {
  createTopic(name: string): Promise<Topic>;
  publishMessage(topic: string, message: NotificationMessage): Promise<string>;
  subscribe(topic: string, endpoint: string, protocol: Protocol): Promise<Subscription>;
  unsubscribe(subscriptionId: string): Promise<void>;
  sendEmail(params: EmailParams): Promise<string>;
  sendSMS(params: SMSParams): Promise<string>;
}

// =============================================================================
// 11. Authentication Service (FR-053 to FR-058)
// =============================================================================

export interface TokenSet {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface TokenClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  email?: string;
  name?: string;
  [claim: string]: any;
}

export interface UserInfo {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  [key: string]: any;
}

export interface AuthConfig {
  provider: 'okta' | 'auth0' | 'azure-ad';
  domain: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
  redirectUri?: string;
}

export interface AuthenticationService {
  configure(params: AuthConfig): void;
  getLoginUrl(redirectUri: string, scopes?: string[]): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;
  verifyToken(token: string): Promise<TokenClaims>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
  logout(token: string): Promise<void>;
}

// =============================================================================
// Main LCPlatform Class
// =============================================================================

export interface LCPlatform {
  getWebHosting(): WebHostingService;
  getBatch(): BatchService;
  getSecrets(): SecretsService;
  getConfiguration(): ConfigurationService;
  getDocumentStore(): DocumentStoreService;
  getDataStore(): DataStoreService;
  getObjectStore(): ObjectStoreService;
  getQueue(): QueueService;
  getEventBus(): EventBusService;
  getNotification(): NotificationService;
  getAuthentication(): AuthenticationService;
}
