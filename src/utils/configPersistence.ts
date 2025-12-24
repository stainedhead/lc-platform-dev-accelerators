/**
 * Configuration Persistence Utility
 *
 * Handles persistence of application configurations and dependencies to object storage
 */

import type {
  LCPlatformApp,
  ApplicationVersion,
  LCPlatformAppData,
} from '../core/types/application';
import { PlatformType, Environment } from '../core/types/application';
import type { ApplicationDependency, PolicyDocument } from '../core/types/dependency';
import { serializePolicy, deserializePolicy } from './policySerializer';

/**
 * Stored dependency data structure
 */
interface StoredDependency {
  id: string;
  name: string;
  type: string;
  status: string;
  configuration: unknown;
  generatedName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stored version data structure
 */
interface StoredVersionData {
  version: string;
  appId: string;
  dependencies: StoredDependency[];
  createdAt: string;
  createdBy: string;
  changeLog: string;
}

/**
 * Object store service interface for persistence
 */
export interface ObjectStoreService {
  putObject(bucket: string, key: string, content: string): Promise<void>;
  getObject(bucket: string, key: string): Promise<string>;
  listObjects(bucket: string, prefix: string): Promise<string[]>;
}

/**
 * Generate S3 path for versioned configuration
 *
 * @param account - Account ID
 * @param team - Team name
 * @param moniker - Application moniker
 * @param version - Version string
 * @returns S3 path prefix
 */
export function generateConfigPath(
  account: string,
  team: string,
  moniker: string,
  version: string
): string {
  return `lcp-${account}-${team}-${moniker}/versions/${version}/`;
}

/**
 * Generate S3 path for app.config
 *
 * @param account - Account ID
 * @param team - Team name
 * @param moniker - Application moniker
 * @returns S3 path for app.config
 */
export function generateAppConfigPath(account: string, team: string, moniker: string): string {
  return `lcp-${account}-${team}-${moniker}/app.config`;
}

/**
 * Configuration persistence manager
 */
export class ConfigurationPersistence {
  constructor(private readonly objectStore: ObjectStoreService) {}

  /**
   * Persist application metadata
   *
   * @param app - Application to persist
   * @param bucket - S3 bucket name
   */
  async persistApplication(app: LCPlatformApp, bucket: string): Promise<void> {
    const appData = {
      id: app.id,
      name: app.name,
      team: app.team,
      moniker: app.moniker,
      ciAppId: app.ciAppId,
      platformType: app.platformType,
      environment: app.environment,
      supportEmail: app.supportEmail,
      ownerEmail: app.ownerEmail,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      currentVersion: app.currentVersion,
    };

    const key = `lcp-${app.team}-${app.moniker}/app.config`;
    await this.objectStore.putObject(bucket, key, JSON.stringify(appData, null, 2));
  }

  /**
   * Load application metadata
   *
   * @param _bucket - S3 bucket name
   * @param _appId - Application ID
   * @returns Application metadata
   */
  loadApplication(_bucket: string, _appId: string): LCPlatformApp {
    // Note: This is a simplified implementation
    // In practice, we'd need to search for the app by ID or have an index
    throw new Error('Not implemented: loadApplication requires app lookup index');
  }

  /**
   * Persist a versioned snapshot of application configuration
   *
   * @param app - Application to persist
   * @param bucket - S3 bucket name
   * @param version - Version string
   * @param createdBy - User who created this version
   * @param changeLog - Description of changes
   */
  async persistVersion(
    app: LCPlatformApp,
    bucket: string,
    version: string,
    createdBy: string,
    changeLog: string
  ): Promise<void> {
    // Determine account from app or use default pattern
    const account = app.getAccountId() ?? 'unknown';
    const basePath = `lcp-${account}-${app.team}-${app.moniker}/versions/${version}`;

    // Persist dependencies as JSON
    const depsData = {
      version,
      appId: app.id,
      dependencies: app.listDependencies().map((dep) => ({
        id: dep.id,
        name: dep.name,
        type: dep.type,
        status: dep.status,
        configuration: dep.configuration,
        generatedName: dep.generatedName,
        createdAt: dep.createdAt,
        updatedAt: dep.updatedAt,
      })),
      createdAt: new Date().toISOString(),
      createdBy,
      changeLog,
    };

    await this.objectStore.putObject(
      bucket,
      `${basePath}/dependencies.json`,
      JSON.stringify(depsData, null, 2)
    );

    // Persist policies as YAML files
    const dependencies = app.listDependencies();
    await this.persistPolicies(bucket, basePath, dependencies);
  }

  /**
   * Persist policy documents as YAML files
   *
   * @param bucket - S3 bucket name
   * @param basePath - Base path for version
   * @param dependencies - List of dependencies with policies
   */
  private async persistPolicies(
    bucket: string,
    basePath: string,
    dependencies: ApplicationDependency[]
  ): Promise<void> {
    const policySavePromises = dependencies
      .filter((dep) => dep.policy !== undefined)
      .map(async (dep) => {
        if (dep.policy === undefined) {
          return;
        } // TypeScript guard
        const yamlContent = serializePolicy(dep.policy);
        const key = `${basePath}/${dep.name}-policy.yaml`;
        await this.objectStore.putObject(bucket, key, yamlContent);
      });

    await Promise.all(policySavePromises);
  }

  /**
   * Retrieve a specific version of application configuration
   *
   * @param bucket - S3 bucket name
   * @param appPath - Application path (lcp-{account}-{team}-{moniker})
   * @param version - Version string
   * @returns Application version snapshot
   */
  async retrieveVersion(
    bucket: string,
    appPath: string,
    version: string
  ): Promise<ApplicationVersion> {
    const basePath = `${appPath}/versions/${version}`;

    // Load dependencies.json
    const depsContent = await this.objectStore.getObject(bucket, `${basePath}/dependencies.json`);
    const depsData = JSON.parse(depsContent) as StoredVersionData;

    // Load policies for each dependency
    const dependencies = await Promise.all(
      depsData.dependencies.map(async (dep: StoredDependency): Promise<ApplicationDependency> => {
        // Try to load policy if it exists
        let policy: PolicyDocument | undefined;
        try {
          const policyYaml = await this.objectStore.getObject(
            bucket,
            `${basePath}/${dep.name}-policy.yaml`
          );
          const deserializedPolicy = deserializePolicy(policyYaml);
          policy = {
            ...deserializedPolicy,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } catch {
          // Policy doesn't exist, that's ok
          policy = undefined;
        }

        return {
          ...dep,
          ...(policy !== undefined && { policy }),
          createdAt: new Date(dep.createdAt),
          updatedAt: new Date(dep.updatedAt),
        } as ApplicationDependency;
      })
    );

    // Create a minimal app config for now
    const appConfig: LCPlatformAppData = {
      name: '',
      team: '',
      moniker: '',
      ciAppId: '',
      platformType: PlatformType.WEB,
      environment: Environment.DEVELOPMENT,
      supportEmail: '',
      ownerEmail: '',
    };

    return {
      version: depsData.version,
      appId: depsData.appId,
      appConfig,
      dependencies,
      storagePath: basePath,
      createdAt: new Date(depsData.createdAt),
      createdBy: depsData.createdBy,
      changeLog: depsData.changeLog,
    };
  }

  /**
   * List all versions available for an application
   *
   * @param bucket - S3 bucket name
   * @param appPath - Application path (lcp-{account}-{team}-{moniker})
   * @returns Array of version strings
   */
  async listVersions(bucket: string, appPath: string): Promise<string[]> {
    const prefix = `${appPath}/versions/`;
    const keys = await this.objectStore.listObjects(bucket, prefix);

    // Extract unique version folders
    const versions = new Set<string>();
    for (const key of keys) {
      // key format: lcp-{account}-{team}-{moniker}/versions/{version}/{file}
      const match = key.match(/\/versions\/([^/]+)\//);
      if (match?.[1] !== undefined) {
        versions.add(match[1]);
      }
    }

    return Array.from(versions).sort();
  }
}
