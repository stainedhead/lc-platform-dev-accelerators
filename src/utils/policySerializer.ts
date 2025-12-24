/**
 * Policy Serializer Utility
 *
 * Serializes and deserializes cloud policy documents to/from YAML.
 */

import * as yaml from 'js-yaml';
import type { PolicyDocument } from '../core/types/dependency';

/**
 * Serialize a policy document to YAML string
 *
 * @param policy - Policy document object
 * @returns YAML string representation
 */
export function serializePolicy(policy: Omit<PolicyDocument, 'createdAt' | 'updatedAt'>): string {
  try {
    // Parse the content string to object (if it's JSON)
    let policyContent: unknown;
    try {
      policyContent = JSON.parse(policy.content);
    } catch {
      // Content is already a string or YAML, use as-is
      policyContent = policy.content;
    }

    const policyData = {
      version: policy.version,
      provider: policy.provider,
      policy: policyContent,
    };

    return yaml.dump(policyData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  } catch (error) {
    throw new Error(
      `Failed to serialize policy: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deserialize a YAML string to policy document
 *
 * @param yamlContent - YAML string
 * @returns Policy document object
 */
export function deserializePolicy(
  yamlContent: string
): Omit<PolicyDocument, 'createdAt' | 'updatedAt'> {
  try {
    const data = yaml.load(yamlContent) as {
      version: string;
      provider: 'aws' | 'azure' | 'gcp';
      policy: unknown;
    };

    if (data.version === undefined || data.provider === undefined || data.policy === undefined) {
      throw new Error('Invalid policy document: missing required fields');
    }

    // Convert policy object back to string if needed
    const policyContent =
      typeof data.policy === 'string' ? data.policy : JSON.stringify(data.policy, null, 2);

    return {
      version: data.version,
      provider: data.provider,
      content: policyContent,
    };
  } catch (error) {
    throw new Error(
      `Failed to deserialize policy: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
