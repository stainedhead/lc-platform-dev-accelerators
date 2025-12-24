/**
 * Application Types for LCPlatform Dependency Management
 *
 * This module defines types for application registration and management.
 * Following Constitution Principle I: Provider Independence - no cloud-specific types.
 */

import { generateAppId, generateDependencyId } from '../../utils/idGenerator';
import { generateDependencyResourceName } from '../../utils/nameGenerator';
import type {
  ApplicationDependency,
  DependencyType,
  DependencyConfiguration,
  DependencyStatus,
  PolicyDocument,
} from './dependency';
import { DependencyStatus as StatusEnum } from './dependency';

/**
 * Platform deployment type
 */
export enum PlatformType {
  WEB = 'web',
  FUNCTION = 'function',
  BATCH = 'batch',
  MOBILE = 'mobile',
  API = 'api',
}

/**
 * Deployment environment
 */
export enum Environment {
  DEVELOPMENT = 'dev',
  STAGING = 'staging',
  PRODUCTION = 'prod',
  TEST = 'test',
}

/**
 * Application registration data
 */
export interface LCPlatformAppData {
  name: string;
  team: string;
  moniker: string;
  ciAppId: string;
  platformType: PlatformType;
  environment: Environment;
  supportEmail: string;
  ownerEmail: string;
}

/**
 * Application version snapshot for persistence
 */
export interface ApplicationVersion {
  version: string;
  appId: string;
  appConfig: LCPlatformAppData;
  dependencies: ApplicationDependency[];
  storagePath: string;
  createdAt: Date;
  createdBy: string;
  changeLog: string;
}

/**
 * Registered application with dependency management
 */
export class LCPlatformApp {
  readonly id: string;
  name: string;
  team: string;
  moniker: string;
  ciAppId: string;
  platformType: PlatformType;
  environment: Environment;
  supportEmail: string;
  ownerEmail: string;
  dependencies: ApplicationDependency[];
  readonly createdAt: Date;
  updatedAt: Date;
  currentVersion?: string;

  // Account ID for resource naming (set from platform config)
  private accountId?: string;

  constructor(data: LCPlatformAppData) {
    // Validate input
    this.validateInput(data);

    // Initialize fields
    this.id = generateAppId();
    this.name = data.name;
    this.team = data.team;
    this.moniker = data.moniker;
    this.ciAppId = data.ciAppId;
    this.platformType = data.platformType;
    this.environment = data.environment;
    this.supportEmail = data.supportEmail;
    this.ownerEmail = data.ownerEmail;
    this.dependencies = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Validate application registration data
   */
  private validateInput(data: LCPlatformAppData): void {
    // Validate required fields
    if (data.name.length === 0 || data.name.length > 100) {
      throw new Error('Invalid application name: must be 1-100 characters');
    }

    if (data.team.length === 0 || data.team.length > 50) {
      throw new Error('Invalid team: must be 1-50 characters');
    }

    // Validate moniker format (lowercase alphanumeric + hyphens)
    if (
      data.moniker.length === 0 ||
      !/^[a-z0-9-]+$/.test(data.moniker) ||
      data.moniker.length > 20
    ) {
      throw new Error(
        'Invalid moniker: must be 1-20 characters, lowercase alphanumeric + hyphens only'
      );
    }

    if (data.ciAppId.length === 0 || data.ciAppId.length > 100) {
      throw new Error('Invalid CI App ID: must be 1-100 characters');
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.supportEmail)) {
      throw new Error('Invalid support email format');
    }
    if (!emailRegex.test(data.ownerEmail)) {
      throw new Error('Invalid owner email format');
    }
  }

  /**
   * Convert application metadata to cloud resource tags
   */
  toResourceTags(): Record<string, string> {
    return {
      Team: this.team,
      Moniker: this.moniker,
      'CI-AppID': this.ciAppId,
      PlatformType: this.platformType,
      Environment: this.environment,
      SupportEmail: this.supportEmail,
      OwnerEmail: this.ownerEmail,
    };
  }

  /**
   * Set account ID for resource naming
   */
  setAccountId(accountId: string): void {
    this.accountId = accountId;
  }

  /**
   * Get account ID
   */
  getAccountId(): string | undefined {
    return this.accountId;
  }

  /**
   * Add a dependency to the application
   */
  addDependency(
    name: string,
    type: DependencyType,
    configuration: DependencyConfiguration,
    policy?: PolicyDocument
  ): ApplicationDependency {
    // Check for name collision
    if (this.dependencies.some((dep) => dep.name === name)) {
      throw new Error(`Dependency with name '${name}' already exists`);
    }

    // Generate unique resource name if account ID is set
    const generatedName =
      this.accountId !== undefined
        ? generateDependencyResourceName(this.accountId, this.team, this.moniker, type, name)
        : undefined;

    const dependency: ApplicationDependency = {
      id: generateDependencyId(),
      name,
      type,
      status: StatusEnum.PENDING,
      configuration,
      ...(policy !== undefined && { policy }),
      ...(generatedName !== undefined && { generatedName }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dependencies.push(dependency);
    this.updatedAt = new Date();

    return dependency;
  }

  /**
   * Get a dependency by name
   */
  getDependency(name: string): ApplicationDependency | undefined {
    return this.dependencies.find((dep) => dep.name === name);
  }

  /**
   * Remove a dependency by name
   */
  removeDependency(name: string): boolean {
    const index = this.dependencies.findIndex((dep) => dep.name === name);
    if (index === -1) {
      return false;
    }

    this.dependencies.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * List all dependencies
   */
  listDependencies(): ApplicationDependency[] {
    return [...this.dependencies];
  }

  /**
   * Update a dependency
   */
  updateDependency(
    name: string,
    updates: {
      configuration?: DependencyConfiguration;
      policy?: PolicyDocument;
      status?: DependencyStatus;
    }
  ): ApplicationDependency | undefined {
    const dependency = this.getDependency(name);
    if (dependency === undefined) {
      return undefined;
    }

    if (updates.configuration !== undefined) {
      dependency.configuration = updates.configuration;
    }
    if (updates.policy !== undefined) {
      dependency.policy = updates.policy;
    }
    if (updates.status !== undefined) {
      dependency.status = updates.status;
    }

    dependency.updatedAt = new Date();
    this.updatedAt = new Date();

    return dependency;
  }

  /**
   * Validate all dependencies in the application
   *
   * @returns Validation summary
   */
  async validateAll(): Promise<{
    valid: boolean;
    validatedCount: number;
    errorCount: number;
    errors?: Array<{ name: string; errors: string[] }>;
  }> {
    const { DependencyValidator } = await import('../../utils/dependencyValidator');
    const validator = new DependencyValidator();

    const result = validator.validateApplication(this.dependencies);

    // Format errors for easier consumption
    const formattedErrors =
      result.errors !== undefined
        ? result.errors.map((error) => ({
            name: typeof error.details?.name === 'string' ? error.details.name : 'unknown',
            errors: [error.message],
          }))
        : undefined;

    return {
      valid: result.valid,
      validatedCount: result.validatedCount ?? 0,
      errorCount: result.errorCount ?? 0,
      ...(formattedErrors !== undefined && { errors: formattedErrors }),
    };
  }
}
