/**
 * Unit tests for Policy Serializer
 *
 * Tests for YAML serialization and deserialization of policy documents
 */

import { describe, test, expect } from 'bun:test';
import { serializePolicy, deserializePolicy } from '../../../src/utils/policySerializer';

describe('policySerializer', () => {
  describe('T054: policy serialization to YAML', () => {
    test('should serialize policy document to YAML', () => {
      const policy = {
        version: '1.0',
        provider: 'aws' as const,
        content: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::my-bucket/*',
            },
          ],
        }),
      };

      const yaml = serializePolicy(policy);

      expect(yaml).toContain("version: '1.0'");
      expect(yaml).toContain('provider: aws');
      expect(yaml).toContain('policy:');
      expect(yaml).toContain("Version: '2012-10-17'");
    });

    test('should handle policy content as string', () => {
      const policy = {
        version: '2.0',
        provider: 'azure' as const,
        content: 'plain text policy',
      };

      const yaml = serializePolicy(policy);

      expect(yaml).toContain("version: '2.0'");
      expect(yaml).toContain('provider: azure');
      expect(yaml).toContain('policy: plain text policy');
    });

    test('should handle complex nested policy structures', () => {
      const policy = {
        version: '1.0',
        provider: 'gcp' as const,
        content: JSON.stringify({
          bindings: [
            {
              role: 'roles/storage.objectViewer',
              members: ['user:admin@example.com'],
              condition: {
                title: 'expires_2024',
                expression: 'request.time < timestamp("2024-12-31T00:00:00Z")',
              },
            },
          ],
        }),
      };

      const yaml = serializePolicy(policy);

      expect(yaml).toContain("version: '1.0'");
      expect(yaml).toContain('provider: gcp');
      expect(yaml).toContain('bindings:');
      expect(yaml).toContain('role: roles/storage.objectViewer');
      expect(yaml).toContain('condition:');
    });
  });

  describe('T055: policy deserialization from YAML', () => {
    test('should deserialize YAML to policy document', () => {
      const yaml = `version: "1.0"
provider: aws
policy:
  Version: "2012-10-17"
  Statement:
    - Effect: Allow
      Action: s3:GetObject
      Resource: "arn:aws:s3:::my-bucket/*"
`;

      const policy = deserializePolicy(yaml);

      expect(policy.version).toBe('1.0');
      expect(policy.provider).toBe('aws');
      expect(policy.content).toContain('Version');
      expect(policy.content).toContain('2012-10-17');
    });

    test('should handle simple string policies', () => {
      const yaml = `version: "1.0"
provider: azure
policy: simple policy text
`;

      const policy = deserializePolicy(yaml);

      expect(policy.version).toBe('1.0');
      expect(policy.provider).toBe('azure');
      expect(policy.content).toBe('simple policy text');
    });

    test('should throw error on invalid YAML', () => {
      const invalidYaml = `version: "1.0"
provider: aws
`;

      expect(() => deserializePolicy(invalidYaml)).toThrow(/missing required fields/);
    });

    test('should handle round-trip serialization/deserialization', () => {
      const original = {
        version: '1.0',
        provider: 'aws' as const,
        content: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Deny',
              Action: ['s3:*'],
              Resource: '*',
            },
          ],
        }),
      };

      const yaml = serializePolicy(original);
      const deserialized = deserializePolicy(yaml);

      expect(deserialized.version).toBe(original.version);
      expect(deserialized.provider).toBe(original.provider);

      const originalContent = JSON.parse(original.content);
      const deserializedContent = JSON.parse(deserialized.content);

      expect(deserializedContent).toEqual(originalContent);
    });
  });

  describe('error handling', () => {
    test('should handle malformed YAML gracefully', () => {
      const malformedYaml = `{{{invalid yaml`;

      expect(() => deserializePolicy(malformedYaml)).toThrow(/Failed to deserialize policy/);
    });

    test('should handle missing version field', () => {
      const yaml = `provider: aws
policy:
  test: value
`;

      expect(() => deserializePolicy(yaml)).toThrow(/missing required fields/);
    });
  });
});
