/**
 * Contract tests for JSON schemas
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('JSON Schema Contracts', () => {
  test('LCPlatformApp schema should be valid JSON', () => {
    const schemaPath = join(process.cwd(), 'src/schemas/LCPlatformApp.schema.json');
    const content = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.type).toBe('object');
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('team');
  });

  test('ApplicationDependency schema should be valid JSON', () => {
    const schemaPath = join(process.cwd(), 'src/schemas/ApplicationDependency.schema.json');
    const content = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('type');
  });

  test('DependencyConfiguration schema should define oneOf configurations', () => {
    const schemaPath = join(process.cwd(), 'src/schemas/DependencyConfiguration.schema.json');
    const content = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.oneOf).toBeDefined();
    expect(Array.isArray(schema.oneOf)).toBe(true);
  });
});
