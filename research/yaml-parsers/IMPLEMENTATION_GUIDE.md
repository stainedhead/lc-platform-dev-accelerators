# YAML Parser Implementation Guide for Cloud Policies

## Quick Decision Matrix

```
NEW PROJECT?         → Use `yaml` package
Existing js-yaml?    → Migrate to `yaml` (simple)
Need comments?       → Use `yaml` package
Performance critical?→ Either (negligible difference)
Maximum security?    → Use `yaml` package
Bun runtime?         → Use `yaml` package
```

---

## Installation

### Install yaml (Recommended)

```bash
# Using npm
npm install yaml

# Using bun
bun install yaml

# TypeScript types are included
```

### Install js-yaml (if required)

```bash
npm install js-yaml
# Or for better TypeScript support:
npm install --save-dev @types/js-yaml
```

---

## Basic Usage Comparison

### Simple Parsing

#### js-yaml
```typescript
import { load, dump } from 'js-yaml';

// Parse
const policy = load(yamlString) as AWSPolicy;

// Serialize
const yaml = dump(policy, { indent: 2 });
```

#### yaml (Recommended)
```typescript
import { parse, stringify } from 'yaml';

// Parse
const policy = parse(yamlString) as AWSPolicy;

// Serialize
const yaml = stringify(policy);
```

**Migration Note**: `load` → `parse`, `dump` → `stringify`

---

## Advanced Usage: Policy Modification

### Scenario 1: Simple Modification (Comments OK to lose)

#### js-yaml
```typescript
import { load, dump } from 'js-yaml';

const policy = load(yamlString);
policy.Statement[0].Effect = 'Deny';
return dump(policy, { indent: 2 });
```

#### yaml
```typescript
import { parse, stringify } from 'yaml';

const policy = parse(yamlString);
policy.Statement[0].Effect = 'Deny';
return stringify(policy);
```

### Scenario 2: Complex Modification (Preserve Comments)

This is where `yaml` excels:

```typescript
import { parseDocument, Document } from 'yaml';
import type { Node } from 'yaml';

// Parse with full AST
const doc = parseDocument(yamlString);

// Modify programmatically
const statements = doc.contents.items.find(
  item => item.key?.value === 'Statement'
);

if (statements?.value?.items) {
  // Find and modify specific statement
  for (const stmt of statements.value.items) {
    const sidPair = stmt.value.items?.find(pair => pair.key?.value === 'Sid');

    if (sidPair?.value?.value === targetSid) {
      // Modify while preserving comments
      const effectPair = stmt.value.items?.find(pair => pair.key?.value === 'Effect');
      if (effectPair) {
        effectPair.value.value = 'Deny';
      }
    }
  }
}

// Serialize preserves all comments and formatting!
return String(doc);
```

---

## Policy Validation Pattern

### Complete Validation Flow

```typescript
import { parse } from 'yaml';
import Ajv from 'ajv';

// 1. Define schema
const policySchema = {
  type: 'object',
  required: ['Version', 'Statement'],
  properties: {
    Version: {
      type: 'string',
      enum: ['2012-10-17', '2008-10-17'],
    },
    Statement: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['Effect', 'Action'],
        properties: {
          Sid: { type: 'string' },
          Effect: { enum: ['Allow', 'Deny'] },
          Principal: {},
          Action: {
            oneOf: [
              { type: 'string' },
              {
                type: 'array',
                items: { type: 'string' },
              },
            ],
          },
          Resource: {
            oneOf: [
              { type: 'string' },
              {
                type: 'array',
                items: { type: 'string' },
              },
            ],
          },
          Condition: { type: 'object' },
        },
      },
    },
  },
};

// 2. Create validator
const ajv = new Ajv();
const validatePolicy = ajv.compile(policySchema);

// 3. Implement secure parser
export function parsePolicyYaml(input: string): AWSPolicy {
  // Size check
  if (input.length > 100 * 1024) {
    throw new Error('Policy exceeds maximum size (100KB)');
  }

  // Parse
  let parsed: any;
  try {
    parsed = parse(input);
  } catch (error) {
    throw new YAMLParseError(
      `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Schema validation
  if (!validatePolicy(parsed)) {
    const errors = validatePolicy.errors
      ?.map(e => `${e.instancePath}: ${e.message}`)
      .join('; ');
    throw new PolicyValidationError(`Schema validation failed: ${errors}`);
  }

  // Business logic validation
  validatePolicyLogic(parsed);

  return parsed as AWSPolicy;
}

// 4. Business logic validation
function validatePolicyLogic(policy: AWSPolicy): void {
  // Check Sid uniqueness
  const sids = policy.Statement.map(s => s.Sid).filter(Boolean);
  if (new Set(sids).size !== sids.length) {
    throw new PolicyValidationError('Duplicate Sid values found');
  }

  // Check maximum statements
  if (policy.Statement.length > 100) {
    throw new PolicyValidationError('Maximum 100 statements allowed');
  }

  // Validate conditions
  for (const statement of policy.Statement) {
    if (statement.Condition) {
      validateConditions(statement.Condition);
    }
  }
}

function validateConditions(conditions: Record<string, unknown>): void {
  const validOperators = [
    'StringEquals',
    'StringNotEquals',
    'StringLike',
    'StringNotLike',
    'IpAddress',
    'NotIpAddress',
    'DateGreaterThan',
    'DateLessThan',
    'NumericGreaterThan',
    'NumericLessThan',
  ];

  for (const operator of Object.keys(conditions)) {
    if (!validOperators.includes(operator)) {
      throw new PolicyValidationError(`Invalid condition operator: ${operator}`);
    }
  }
}

// Custom error classes
class YAMLParseError extends Error {
  name = 'YAMLParseError';
}

class PolicyValidationError extends Error {
  name = 'PolicyValidationError';
}
```

---

## Express.js/HTTP Integration

### Upload Endpoint

```typescript
import express from 'express';
import { parse } from 'yaml';
import multer from 'multer';

const app = express();
const upload = multer({ limits: { fileSize: 100 * 1024 } }); // 100KB max

app.post('/policies/upload', upload.single('policy'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse and validate
    const policyYaml = req.file.buffer.toString('utf-8');
    const policy = parsePolicyYaml(policyYaml);

    // Store in database
    const stored = await policyStore.save({
      name: req.body.name,
      description: req.body.description,
      content: policy,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    });

    res.json({
      success: true,
      id: stored.id,
      statements: policy.Statement.length,
    });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({
      error: err.name,
      message: err.message,
    });
  }
});

app.put('/policies/:id', async (req, res) => {
  try {
    const policyYaml = req.body.content;
    const policy = parsePolicyYaml(policyYaml);

    const updated = await policyStore.update(req.params.id, {
      content: policy,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      id: updated.id,
      statements: policy.Statement.length,
    });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({
      error: err.name,
      message: err.message,
    });
  }
});
```

---

## Configuration as Code Pattern

### Store policies in TypeScript/JSON for versioning

```typescript
// policies/s3-read-only.ts
export const S3ReadOnlyPolicy: AWSPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'S3ReadOnly',
      Effect: 'Allow',
      Action: ['s3:GetObject', 's3:ListBucket'],
      Resource: [
        'arn:aws:s3:::my-bucket',
        'arn:aws:s3:::my-bucket/*',
      ],
    },
  ],
};

// Serialize to YAML
import { stringify } from 'yaml';
const yamlContent = stringify(S3ReadOnlyPolicy);
fs.writeFileSync('policies/s3-read-only.yaml', yamlContent);
```

---

## Error Handling Best Practices

```typescript
import { YAMLError, YAMLParseError } from 'yaml';

async function handlePolicyOperation(input: string) {
  try {
    const policy = parsePolicyYaml(input);
    return policy;
  } catch (error) {
    if (error instanceof YAMLParseError) {
      // Parsing error
      logger.error('yaml_parse_error', {
        line: error.pos?.line,
        column: error.pos?.col,
        message: error.message,
      });
      throw new BadRequestError(`Invalid YAML format: ${error.message}`);
    }

    if (error instanceof PolicyValidationError) {
      // Validation error
      logger.warn('policy_validation_failed', {
        message: error.message,
      });
      throw new BadRequestError(`Policy validation failed: ${error.message}`);
    }

    if (error instanceof Error) {
      // Unexpected error
      logger.error('unexpected_error', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      throw new InternalServerError('Failed to process policy');
    }

    throw error;
  }
}
```

---

## Testing

### Unit Tests with Bun

```typescript
import { describe, it, expect } from 'bun:test';
import { parsePolicyYaml } from './policy-parser';

describe('Policy Parser', () => {
  it('should parse valid policy', () => {
    const yaml = `
Version: '2012-10-17'
Statement:
  - Sid: 'Test'
    Effect: Allow
    Action: 's3:GetObject'
    Resource: '*'
`;
    const policy = parsePolicyYaml(yaml);
    expect(policy.Statement).toHaveLength(1);
    expect(policy.Statement[0].Sid).toBe('Test');
  });

  it('should reject invalid effect', () => {
    const yaml = `
Version: '2012-10-17'
Statement:
  - Effect: Maybe
    Action: 's3:GetObject'
    Resource: '*'
`;
    expect(() => parsePolicyYaml(yaml)).toThrow();
  });

  it('should preserve comments with yaml package', () => {
    const { parseDocument } = require('yaml');
    const yaml = `
# S3 access policy
Version: '2012-10-17'
Statement:
  # Allow reads
  - Effect: Allow
    Action: 's3:GetObject'
    Resource: '*'
`;
    const doc = parseDocument(yaml);
    const serialized = String(doc);
    expect(serialized).toContain('# S3 access policy');
    expect(serialized).toContain('# Allow reads');
  });

  it('should validate conditions', () => {
    const yaml = `
Version: '2012-10-17'
Statement:
  - Effect: Allow
    Action: 's3:GetObject'
    Resource: '*'
    Condition:
      InvalidOperator:
        'aws:SourceIp': '10.0.0.0/8'
`;
    expect(() => parsePolicyYaml(yaml)).toThrow('Invalid condition operator');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'bun:test';

describe('Policy Storage Integration', () => {
  it('should round-trip policy through storage', async () => {
    const original = await loadFixture('complex-policy.yaml');

    // Parse
    const policy = parsePolicyYaml(original);

    // Store
    const stored = await policyStore.save({
      name: 'test-policy',
      content: policy,
    });

    // Retrieve
    const retrieved = await policyStore.get(stored.id);

    // Verify
    expect(retrieved.content.Statement).toHaveLength(
      policy.Statement.length
    );
  });
});
```

---

## Migration from js-yaml

### Step 1: Update imports

```diff
- import { load, dump } from 'js-yaml';
+ import { parse, stringify } from 'yaml';
```

### Step 2: Replace function calls

```diff
- const policy = load(yaml);
+ const policy = parse(yaml);

- const yaml = dump(policy);
+ const yaml = stringify(policy);
```

### Step 3: Update configuration

```diff
- dump(policy, {
+ stringify(policy, {
  indent: 2,
  noArrayIndent: false,
-  sortKeys: false,
  lineWidth: -1,
})
```

### Step 4: Run tests

```bash
bun test
npm run test
```

**Expected**: Tests pass with zero changes to application logic.

---

## Troubleshooting

### Issue: "Cannot find module 'yaml'"

```bash
# Solution: Install missing package
npm install yaml
```

### Issue: TypeScript errors with parseDocument

```typescript
// Solution: Import Document type
import { parseDocument } from 'yaml';
import type { Document } from 'yaml';

const doc: Document = parseDocument(yaml);
```

### Issue: Comments not preserved

```typescript
// Wrong - uses simple parser
const policy = parse(yaml);

// Right - uses document parser
const doc = parseDocument(yaml);
const serialized = String(doc); // Comments preserved!
```

### Issue: Performance degradation

```typescript
// Check file size - parseDocument is slower for large files
if (yaml.length > 10 * 1024) {
  // Use simple parser for large files
  const policy = parse(yaml);
} else {
  // Use document parser for small files with comments
  const doc = parseDocument(yaml);
}
```

---

## Production Checklist

- [ ] Use `yaml` package v2.8.1+
- [ ] Implement JSON Schema validation
- [ ] Set MAX_SIZE limit (100KB recommended)
- [ ] Add audit logging for modifications
- [ ] Handle all error types
- [ ] Run security scan: `npm audit`
- [ ] Add unit tests for policy validation
- [ ] Document policy format in README
- [ ] Implement rate limiting for uploads
- [ ] Set up monitoring/alerts

---

## Resources

- **yaml package**: https://eemeli.org/yaml/
- **js-yaml documentation**: https://github.com/nodeca/js-yaml
- **AWS Policy Documentation**: https://docs.aws.amazon.com/IAM/latest/UserGuide/
- **YAML Specification**: https://yaml.org/spec/
- **JSON Schema**: https://json-schema.org/

