/**
 * Container Repository Types
 * Cloud-agnostic types for container image registry management
 */

export interface ContainerRepository {
  name: string;
  repositoryArn?: string;
  repositoryUri: string;
  created: Date;
  imageCount: number;
  imageScanningEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface ContainerRepositoryOptions {
  imageScanOnPush?: boolean;
  encryptionType?: EncryptionType;
  kmsKeyId?: string;
  tags?: Record<string, string>;
}

export enum EncryptionType {
  AES256 = 'AES256',
  KMS = 'KMS',
}

export interface LifecyclePolicy {
  rules: LifecycleRule[];
}

export interface LifecycleRule {
  rulePriority: number;
  description?: string;
  selection: ImageSelection;
  action: LifecycleAction;
}

export interface ImageSelection {
  tagStatus: TagStatus;
  tagPrefixList?: string[];
  countType: CountType;
  countNumber: number;
}

export enum TagStatus {
  TAGGED = 'tagged',
  UNTAGGED = 'untagged',
  ANY = 'any',
}

export enum CountType {
  IMAGE_COUNT_MORE_THAN = 'imageCountMoreThan',
  SINCE_IMAGE_PUSHED = 'sinceImagePushed',
}

export interface LifecycleAction {
  type: 'expire';
}

export interface ImageScanConfig {
  scanOnPush: boolean;
}

export interface RepositoryPermission {
  principal: string;
  actions: RepositoryAction[];
}

export enum RepositoryAction {
  PULL = 'pull',
  PUSH = 'push',
  DELETE = 'delete',
  LIST = 'list',
}

export interface ContainerImage {
  repositoryName: string;
  imageDigest: string;
  imageTags?: string[];
  imageSizeInBytes: number;
  imagePushedAt: Date;
}

export interface ContainerImageDetail extends ContainerImage {
  registryId?: string;
  imageScanStatus?: ImageScanStatus;
  imageScanFindings?: ImageScanFindings;
  imageManifestMediaType?: string;
  artifactMediaType?: string;
}

export interface ImageScanStatus {
  status: ScanStatus;
  description?: string;
}

export enum ScanStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  UNSUPPORTED = 'UNSUPPORTED',
}

export interface ImageScanFindings {
  findingSeverityCounts?: Record<string, number>;
  imageScanCompletedAt?: Date;
  vulnerabilitySourceUpdatedAt?: Date;
}

export interface ImageListOptions {
  maxResults?: number;
  nextToken?: string;
  filter?: ImageFilter;
}

export interface ImageFilter {
  tagStatus?: TagStatus;
}
