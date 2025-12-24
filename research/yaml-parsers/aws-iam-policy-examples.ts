/**
 * AWS IAM Policy Serialization Examples
 * Demonstrates both js-yaml and yaml libraries for cloud policy handling
 */

import * as fs from 'fs';

// ============================================================================
// EXAMPLE 1: Basic AWS IAM Policy Structure
// ============================================================================

interface AWSPolicy {
  Version: string;
  Statement: PolicyStatement[];
}

interface PolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Principal?: Principal;
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
}

interface Principal {
  Service?: string | string[];
  AWS?: string | string[];
  [key: string]: any;
}

// ============================================================================
// EXAMPLE POLICY: Complex S3 + Lambda Cross-Account Access
// ============================================================================

const EXAMPLE_POLICY_YAML = `
Version: '2012-10-17'
Statement:
  - Sid: 'AllowS3ReadWrite'
    Effect: Allow
    Principal:
      Service:
        - lambda.amazonaws.com
        - s3.amazonaws.com
    Action:
      - 's3:GetObject'
      - 's3:PutObject'
      - 's3:DeleteObject'
    Resource:
      - 'arn:aws:s3:::my-secure-bucket'
      - 'arn:aws:s3:::my-secure-bucket/*'
    Condition:
      IpAddress:
        'aws:SourceIp':
          - '10.0.0.0/8'
          - '172.16.0.0/12'
      StringEquals:
        'aws:PrincipalOrgID': 'o-abc123def456'
      DateGreaterThan:
        'aws:CurrentTime': '2024-01-01T00:00:00Z'

  - Sid: 'DenyUnencryptedObjectUploads'
    Effect: Deny
    Principal: '*'
    Action: 's3:PutObject'
    Resource: 'arn:aws:s3:::my-secure-bucket/*'
    Condition:
      StringNotEquals:
        's3:x-amz-server-side-encryption': 'AES256'

  - Sid: 'AllowLambdaExecution'
    Effect: Allow
    Action:
      - 'lambda:InvokeFunction'
    Resource: 'arn:aws:lambda:us-east-1:123456789012:function:*'
    Condition:
      StringEquals:
        'aws:RequestedRegion':
          - us-east-1
          - us-west-2
`;

// ============================================================================
// SOLUTION 1: js-yaml Implementation
// ============================================================================

export class JsYamlPolicyHandler {
  private jsYaml = require('js-yaml');

  /**
   * Parse YAML policy document
   */
  parsePolicy(yamlContent: string): AWSPolicy {
    try {
      const policy = this.jsYaml.load(yamlContent) as AWSPolicy;
      this.validatePolicy(policy);
      return policy;
    } catch (error) {
      throw new Error(`Failed to parse policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Serialize policy back to YAML
   */
  serializePolicy(policy: AWSPolicy): string {
    try {
      return this.jsYaml.dump(policy, {
        indent: 2,
        noArrayIndent: false,
        sortKeys: false,
        lineWidth: -1, // No wrapping
        quotingType: "'",
        forceQuotes: false,
      });
    } catch (error) {
      throw new Error(`Failed to serialize policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Modify policy: Change Effect from Allow to Deny for specific Sid
   */
  modifyEffect(policy: AWSPolicy, sid: string, newEffect: 'Allow' | 'Deny'): AWSPolicy {
    const statement = policy.Statement.find(s => s.Sid === sid);
    if (!statement) {
      throw new Error(`Statement with Sid "${sid}" not found`);
    }

    // Note: ⚠️ Comments will be lost during round-trip
    statement.Effect = newEffect;
    return policy;
  }

  /**
   * Add new resource condition
   */
  addResourceCondition(
    policy: AWSPolicy,
    sid: string,
    conditionKey: string,
    operator: string,
    value: string | string[]
  ): AWSPolicy {
    const statement = policy.Statement.find(s => s.Sid === sid);
    if (!statement) {
      throw new Error(`Statement with Sid "${sid}" not found`);
    }

    if (!statement.Condition) {
      statement.Condition = {};
    }

    const conditionType = operator; // e.g., 'StringEquals', 'IpAddress'
    if (!statement.Condition[conditionType]) {
      statement.Condition[conditionType] = {};
    }

    statement.Condition[conditionType][conditionKey] = value;
    return policy;
  }

  /**
   * Validate policy structure
   */
  private validatePolicy(policy: any): void {
    if (!policy.Version) {
      throw new Error('Policy missing required field: Version');
    }
    if (!Array.isArray(policy.Statement)) {
      throw new Error('Policy Statement must be an array');
    }
    if (policy.Statement.length === 0) {
      throw new Error('Policy Statement array cannot be empty');
    }

    policy.Statement.forEach((stmt: any, idx: number) => {
      if (!['Allow', 'Deny'].includes(stmt.Effect)) {
        throw new Error(`Statement[${idx}]: Invalid Effect "${stmt.Effect}"`);
      }
      if (!stmt.Action) {
        throw new Error(`Statement[${idx}]: Missing required field Action`);
      }
      if (!stmt.Resource && !stmt.Principal) {
        throw new Error(`Statement[${idx}]: Must have either Resource or Principal`);
      }
    });
  }
}

// ============================================================================
// SOLUTION 2: yaml Package Implementation
// ============================================================================

export class YamlPolicyHandler {
  /**
   * Parse YAML policy document (simple mode)
   */
  parsePolicy(yamlContent: string): AWSPolicy {
    try {
      const { parse } = require('yaml');
      const policy = parse(yamlContent, {
        keepSourceTokens: false,
      }) as AWSPolicy;
      this.validatePolicy(policy);
      return policy;
    } catch (error) {
      throw new Error(`Failed to parse policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Serialize policy back to YAML
   */
  serializePolicy(policy: AWSPolicy): string {
    try {
      const { stringify } = require('yaml');
      return stringify(policy, {
        indent: 2,
        lineWidth: -1,
        defaultKeyType: 'auto',
        defaultStringType: 'auto',
      });
    } catch (error) {
      throw new Error(`Failed to serialize policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse policy preserving comments and formatting (for round-trip fidelity)
   * ✅ Superior to js-yaml for policy modifications
   */
  parsePolicyWithComments(yamlContent: string) {
    try {
      const { parseDocument, Document } = require('yaml');
      return parseDocument(yamlContent);
    } catch (error) {
      throw new Error(`Failed to parse policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Serialize Document preserving original formatting
   */
  serializePolicyDocument(doc: any): string {
    return String(doc); // Preserves comments and formatting
  }

  /**
   * Modify policy using Document API with comment preservation
   * This is the superior approach for policy modifications
   */
  modifyEffectWithComments(yamlContent: string, sid: string, newEffect: 'Allow' | 'Deny'): string {
    const { parseDocument } = require('yaml');
    const doc = parseDocument(yamlContent);

    // Navigate to Statement array
    const statementArray = doc.contents.items.find((item: any) => item.key?.value === 'Statement');
    if (!statementArray) {
      throw new Error('No Statement found in policy');
    }

    // Find statement with matching Sid
    const targetStatement = statementArray.value.items.find((stmt: any) => {
      const sidPair = stmt.value.items?.find((pair: any) => pair.key?.value === 'Sid');
      return sidPair?.value?.value === sid;
    });

    if (!targetStatement) {
      throw new Error(`Statement with Sid "${sid}" not found`);
    }

    // Update Effect while preserving comments
    const effectPair = targetStatement.value.items?.find((pair: any) => pair.key?.value === 'Effect');
    if (effectPair) {
      effectPair.value.value = newEffect;
    } else {
      throw new Error(`No Effect field found in statement ${sid}`);
    }

    return String(doc); // Preserves all formatting and comments!
  }

  /**
   * Add action to policy while preserving formatting
   */
  addActionWithComments(yamlContent: string, sid: string, newAction: string): string {
    const { parseDocument } = require('yaml');
    const doc = parseDocument(yamlContent);

    const statementArray = doc.contents.items.find((item: any) => item.key?.value === 'Statement');
    const targetStatement = statementArray.value.items.find((stmt: any) => {
      const sidPair = stmt.value.items?.find((pair: any) => pair.key?.value === 'Sid');
      return sidPair?.value?.value === sid;
    });

    const actionPair = targetStatement.value.items?.find((pair: any) => pair.key?.value === 'Action');
    if (actionPair && Array.isArray(actionPair.value.items)) {
      // Add to existing array
      const { Scalar } = require('yaml');
      actionPair.value.items.push(new Scalar(newAction));
    }

    return String(doc);
  }

  /**
   * Validate policy structure
   */
  private validatePolicy(policy: any): void {
    if (!policy.Version) {
      throw new Error('Policy missing required field: Version');
    }
    if (!Array.isArray(policy.Statement)) {
      throw new Error('Policy Statement must be an array');
    }
    if (policy.Statement.length === 0) {
      throw new Error('Policy Statement array cannot be empty');
    }

    policy.Statement.forEach((stmt: any, idx: number) => {
      if (!['Allow', 'Deny'].includes(stmt.Effect)) {
        throw new Error(`Statement[${idx}]: Invalid Effect "${stmt.Effect}"`);
      }
      if (!stmt.Action) {
        throw new Error(`Statement[${idx}]: Missing required field Action`);
      }
      if (!stmt.Resource && !stmt.Principal) {
        throw new Error(`Statement[${idx}]: Must have either Resource or Principal`);
      }
    });
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

export async function demonstrateYamlParsing(): Promise<void> {
  console.log('\n=== YAML Parser Comparison: AWS IAM Policies ===\n');

  // === Test 1: Basic Parsing ===
  console.log('--- Test 1: Basic Policy Parsing ---');

  const jsYamlHandler = new JsYamlPolicyHandler();
  const yamlHandler = new YamlPolicyHandler();

  const jsYamlPolicy = jsYamlHandler.parsePolicy(EXAMPLE_POLICY_YAML);
  const yamlPolicy = yamlHandler.parsePolicy(EXAMPLE_POLICY_YAML);

  console.log(`js-yaml: Parsed ${jsYamlPolicy.Statement.length} statements`);
  console.log(`yaml: Parsed ${yamlPolicy.Statement.length} statements`);
  console.log(`First statement Sid: ${jsYamlPolicy.Statement[0].Sid}`);

  // === Test 2: Round-trip Serialization ===
  console.log('\n--- Test 2: Round-trip Serialization ---');

  const jsYamlSerialized = jsYamlHandler.serializePolicy(jsYamlPolicy);
  const yamlSerialized = yamlHandler.serializePolicy(yamlPolicy);

  console.log(`js-yaml serialized length: ${jsYamlSerialized.length}`);
  console.log(`yaml serialized length: ${yamlSerialized.length}`);
  console.log(`⚠️ js-yaml loses formatting/comments during round-trip`);
  console.log(`✅ yaml preserves structure (when using parseDocument)`);

  // === Test 3: Policy Modification (without comment preservation) ===
  console.log('\n--- Test 3: Policy Modification ---');

  const modifiedPolicy = jsYamlHandler.modifyEffect(jsYamlPolicy, 'AllowS3ReadWrite', 'Deny');
  console.log(`Modified statement effect: ${modifiedPolicy.Statement[0].Effect}`);

  // === Test 4: Policy Modification (with comment preservation) ===
  console.log('\n--- Test 4: Advanced Modification (with Comments) ---');

  try {
    const modifiedYaml = yamlHandler.modifyEffectWithComments(EXAMPLE_POLICY_YAML, 'AllowS3ReadWrite', 'Deny');
    console.log('✅ Modified policy with comments preserved:');
    console.log(modifiedYaml.split('\n').slice(0, 10).join('\n'));
  } catch (error) {
    console.error('Comment modification error:', error);
  }

  // === Test 5: Condition Addition ===
  console.log('\n--- Test 5: Adding New Condition ---');

  const policyWithCondition = jsYamlHandler.addResourceCondition(
    jsYamlPolicy,
    'AllowS3ReadWrite',
    'aws:username',
    'StringEquals',
    ['alice', 'bob']
  );

  const condition = policyWithCondition.Statement[0].Condition;
  console.log(`Added condition: ${JSON.stringify(condition)}`);

  // === Test 6: Performance Benchmark ===
  console.log('\n--- Test 6: Performance (1000 iterations) ---');

  console.time('js-yaml-parse');
  for (let i = 0; i < 1000; i++) {
    jsYamlHandler.parsePolicy(EXAMPLE_POLICY_YAML);
  }
  console.timeEnd('js-yaml-parse');

  console.time('yaml-parse');
  for (let i = 0; i < 1000; i++) {
    yamlHandler.parsePolicy(EXAMPLE_POLICY_YAML);
  }
  console.timeEnd('yaml-parse');

  // === Test 7: Error Handling ===
  console.log('\n--- Test 7: Error Handling ---');

  const invalidPolicy = `
Version: '2012-10-17'
Statement:
  - Effect: Invalid
    Action: 's3:GetObject'
    Resource: '*'
  `;

  try {
    jsYamlHandler.parsePolicy(invalidPolicy);
  } catch (error) {
    console.log(`✅ js-yaml validation caught: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    yamlHandler.parsePolicy(invalidPolicy);
  } catch (error) {
    console.log(`✅ yaml validation caught: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// SECURITY CONSIDERATIONS
// ============================================================================

/**
 * Security Best Practices for Cloud Policy Files
 */
export const SECURITY_BEST_PRACTICES = {
  yaml: {
    advantages: [
      'Zero external dependencies (smaller attack surface)',
      'No code execution capabilities',
      'Prototype pollution protection built-in',
      'Passes all yaml-test-suite tests',
      'No known CVEs (as of 2024)',
    ],
    usage: 'use yaml for security-critical policy files',
  },

  jsYaml: {
    advantages: [
      'Safe by default in v4.x (safe schema)',
      'Prototype pollution fixed in v4.0.0',
      'Minimal dependencies (only argparse)',
      'Widely used and battle-tested',
    ],
    cautions: [
      'Older versions (pre 4.0) had code injection issues',
      'Always use v4.1.0 or later',
      'Never use unsafe schema with untrusted input',
    ],
  },

  bestPractices: [
    'Never parse untrusted YAML with custom schema extensions',
    'Always validate policy structure after parsing',
    'Use read-only schema when parsing external policies',
    'Implement JSON Schema validation for policy structure',
    'Store policies in version control with diff tracking',
    'Use role-based access control for policy modifications',
  ],
};

// Run demonstration if executed directly
if (require.main === module) {
  demonstrateYamlParsing().catch(console.error);
}
