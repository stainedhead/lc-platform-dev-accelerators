/**
 * Mock DocumentClient Implementation
 *
 * In-memory document store client for testing without cloud resources.
 * Simulates NoSQL document operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { DocumentClient } from '../../../core/clients/DocumentClient';
import type { Document, Query, QueryOperator } from '../../../core/types/document';
import { ResourceNotFoundError, ValidationError } from '../../../core/types/common';

export class MockDocumentClient implements DocumentClient {
  private collections = new Map<string, Map<string, Document>>();

  /**
   * Reset all mock data
   */
  reset(): void {
    this.collections.clear();
  }

  /**
   * Pre-create a collection for testing
   */
  createTestCollection(collectionName: string): void {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
  }

  private getOrCreateCollection(collectionName: string): Map<string, Document> {
    let collection = this.collections.get(collectionName);
    if (!collection) {
      collection = new Map();
      this.collections.set(collectionName, collection);
    }
    return collection;
  }

  async get(collection: string, documentId: string): Promise<Document | null> {
    if (!collection) {
      throw new ValidationError('Collection name is required');
    }
    if (!documentId) {
      throw new ValidationError('Document ID is required');
    }

    const col = this.collections.get(collection);
    if (!col) {
      return null;
    }

    const doc = col.get(documentId);
    return doc ? { ...doc } : null;
  }

  async put(collection: string, document: Document): Promise<void> {
    if (!collection) {
      throw new ValidationError('Collection name is required');
    }
    if (!document._id) {
      throw new ValidationError('Document must have an _id field');
    }

    const col = this.getOrCreateCollection(collection);
    col.set(document._id, { ...document });
  }

  async update(collection: string, documentId: string, updates: Partial<Document>): Promise<void> {
    if (!collection) {
      throw new ValidationError('Collection name is required');
    }
    if (!documentId) {
      throw new ValidationError('Document ID is required');
    }

    const col = this.collections.get(collection);
    if (!col) {
      throw new ResourceNotFoundError('Document', `${collection}/${documentId}`);
    }

    const existing = col.get(documentId);
    if (!existing) {
      throw new ResourceNotFoundError('Document', `${collection}/${documentId}`);
    }

    // Merge updates into existing document
    const updated = { ...existing, ...updates, _id: documentId };
    col.set(documentId, updated);
  }

  async delete(collection: string, documentId: string): Promise<void> {
    if (!collection) {
      throw new ValidationError('Collection name is required');
    }
    if (!documentId) {
      throw new ValidationError('Document ID is required');
    }

    const col = this.collections.get(collection);
    if (col) {
      col.delete(documentId);
    }
  }

  async query(collection: string, query: Query): Promise<Document[]> {
    if (!collection) {
      throw new ValidationError('Collection name is required');
    }

    const col = this.collections.get(collection);
    if (!col) {
      return [];
    }

    const results: Document[] = [];

    for (const doc of col.values()) {
      if (this.matchesQuery(doc, query)) {
        results.push({ ...doc });
      }
    }

    return results;
  }

  private matchesQuery(doc: Document, query: Query): boolean {
    for (const [field, condition] of Object.entries(query)) {
      const docValue = doc[field];

      if (this.isQueryOperator(condition)) {
        if (!this.matchesOperator(docValue, condition)) {
          return false;
        }
      } else {
        // Direct equality check
        if (docValue !== condition) {
          return false;
        }
      }
    }

    return true;
  }

  private isQueryOperator(value: unknown): value is QueryOperator {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const keys = Object.keys(value);
    return keys.some((k) =>
      ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'].includes(k)
    );
  }

  private matchesOperator(docValue: unknown, operator: QueryOperator): boolean {
    if (operator.$eq !== undefined && docValue !== operator.$eq) {
      return false;
    }
    if (operator.$ne !== undefined && docValue === operator.$ne) {
      return false;
    }
    if (operator.$gt !== undefined) {
      if (typeof docValue !== 'number' && !(docValue instanceof Date)) {
        return false;
      }
      const compareValue = docValue instanceof Date ? docValue.getTime() : docValue;
      const opValue = operator.$gt instanceof Date ? operator.$gt.getTime() : operator.$gt;
      if (compareValue <= opValue) {
        return false;
      }
    }
    if (operator.$gte !== undefined) {
      if (typeof docValue !== 'number' && !(docValue instanceof Date)) {
        return false;
      }
      const compareValue = docValue instanceof Date ? docValue.getTime() : docValue;
      const opValue = operator.$gte instanceof Date ? operator.$gte.getTime() : operator.$gte;
      if (compareValue < opValue) {
        return false;
      }
    }
    if (operator.$lt !== undefined) {
      if (typeof docValue !== 'number' && !(docValue instanceof Date)) {
        return false;
      }
      const compareValue = docValue instanceof Date ? docValue.getTime() : docValue;
      const opValue = operator.$lt instanceof Date ? operator.$lt.getTime() : operator.$lt;
      if (compareValue >= opValue) {
        return false;
      }
    }
    if (operator.$lte !== undefined) {
      if (typeof docValue !== 'number' && !(docValue instanceof Date)) {
        return false;
      }
      const compareValue = docValue instanceof Date ? docValue.getTime() : docValue;
      const opValue = operator.$lte instanceof Date ? operator.$lte.getTime() : operator.$lte;
      if (compareValue > opValue) {
        return false;
      }
    }
    if (operator.$in !== undefined) {
      if (!operator.$in.includes(docValue)) {
        return false;
      }
    }
    if (operator.$nin !== undefined) {
      if (operator.$nin.includes(docValue)) {
        return false;
      }
    }

    return true;
  }

  async batchGet(collection: string, documentIds: string[]): Promise<(Document | null)[]> {
    const results: (Document | null)[] = [];
    for (const id of documentIds) {
      results.push(await this.get(collection, id));
    }
    return results;
  }

  async batchPut(collection: string, documents: Document[]): Promise<void> {
    for (const doc of documents) {
      await this.put(collection, doc);
    }
  }
}
