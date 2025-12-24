/**
 * Resource Name Generator Utility
 *
 * Generates globally unique resource names for cloud services.
 * Pattern: lcp-{account}-{team}-{moniker}-{service-type}
 */

import { DependencyType } from '../core/types/dependency';

/**
 * Generate a unique resource name
 *
 * @param account - Cloud account ID
 * @param team - Team identifier
 * @param moniker - Application short name
 * @param serviceType - Type of service (optional suffix)
 * @returns Globally unique resource name
 */
export function generateResourceName(
  account: string,
  team: string,
  moniker: string,
  serviceType?: string
): string {
  const parts = ['lcp', account, team, moniker];

  if (serviceType !== undefined) {
    parts.push(serviceType);
  }

  // Ensure lowercase and alphanumeric + hyphens only
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Generate a dependency-specific resource name
 *
 * @param account - Cloud account ID
 * @param team - Team identifier
 * @param moniker - Application short name
 * @param dependencyType - Type of dependency
 * @param dependencyName - Name of the specific dependency
 * @returns Globally unique resource name for the dependency
 */
export function generateDependencyResourceName(
  account: string,
  team: string,
  moniker: string,
  dependencyType: DependencyType,
  dependencyName: string
): string {
  // Map dependency type to short service identifier
  const serviceTypeMap: Record<DependencyType, string> = {
    [DependencyType.OBJECT_STORE]: 'store',
    [DependencyType.QUEUE]: 'queue',
    [DependencyType.SECRETS]: 'secret',
    [DependencyType.CONFIGURATION]: 'config',
    [DependencyType.DATA_STORE]: 'db',
    [DependencyType.DOCUMENT_STORE]: 'docdb',
    [DependencyType.EVENT_BUS]: 'events',
    [DependencyType.NOTIFICATION]: 'notify',
    [DependencyType.CACHE]: 'cache',
    [DependencyType.WEB_HOSTING]: 'web',
    [DependencyType.FUNCTION_HOSTING]: 'func',
    [DependencyType.BATCH]: 'batch',
    [DependencyType.AUTHENTICATION]: 'auth',
    [DependencyType.CONTAINER_REPO]: 'repo',
  };

  const serviceType = serviceTypeMap[dependencyType];
  const sanitizedName = dependencyName.toLowerCase().replace(/[^a-z0-9-]/g, '');

  return generateResourceName(account, team, moniker, `${serviceType}-${sanitizedName}`);
}
