/**
 * Mock Document Store Service Implementation
 * In-memory NoSQL document database for testing
 */

import type { DocumentStoreService } from '../../core/services/DocumentStoreService';
import type {
  Document,
  Collection,
  CollectionOptions,
  Query,
  QueryOperator,
} from '../../core/types/document';
import { ResourceNotFoundError } from '../../core/types/common';
import { randomBytes } from 'crypto';

interface CollectionData {
  metadata: Collection;
  documents: Map<string, Document>;
  options: CollectionOptions;
}

export class MockDocumentStoreService implements DocumentStoreService {
  private collections = new Map<string, CollectionData>();

  async createCollection(
    name: string,
    options?: CollectionOptions
  ): Promise<Collection> {
    if (this.collections.has(name)) {
      throw new Error(`Collection ${name} already exists`);
    }

    const collection: Collection = {
      name,
      indexes: options?.indexes ?? [],
      documentCount: 0,
    };

    if (options?.ttl !== undefined) {
      collection.ttl = options.ttl;
    }

    this.collections.set(name, {
      metadata: collection,
      documents: new Map(),
      options: options ?? {},
    });

    return collection;
  }

  async getCollection(name: string): Promise<Collection> {
    const collData = this.collections.get(name);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', name);
    }

    return {
      ...collData.metadata,
      documentCount: collData.documents.size,
    };
  }

  async deleteCollection(name: string): Promise<void> {
    const exists = this.collections.has(name);
    if (!exists) {
      throw new ResourceNotFoundError('Collection', name);
    }
    this.collections.delete(name);
  }

  async insertDocument<T>(
    collectionName: string,
    document: T
  ): Promise<Document<T>> {
    const collData = this.collections.get(collectionName);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', collectionName);
    }

    const id = this.generateId();
    const doc: Document<T> = {
      _id: id,
      ...document,
    };

    collData.documents.set(id, doc as Document);
    collData.metadata.documentCount = collData.documents.size;

    return doc;
  }

  async findById<T>(
    collectionName: string,
    id: string
  ): Promise<Document<T> | null> {
    const collData = this.collections.get(collectionName);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', collectionName);
    }

    const doc = collData.documents.get(id);
    return doc ? (doc as Document<T>) : null;
  }

  async find<T>(
    collectionName: string,
    query: Query,
    limit?: number
  ): Promise<Document<T>[]> {
    const collData = this.collections.get(collectionName);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', collectionName);
    }

    const allDocs = Array.from(collData.documents.values());
    const matched = allDocs.filter((doc) => this.matchesQuery(doc, query));

    const results = limit ? matched.slice(0, limit) : matched;
    return results as Document<T>[];
  }

  async updateDocument<T>(
    collectionName: string,
    id: string,
    update: Partial<T>
  ): Promise<Document<T>> {
    const collData = this.collections.get(collectionName);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', collectionName);
    }

    const doc = collData.documents.get(id);
    if (!doc) {
      throw new ResourceNotFoundError('Document', id);
    }

    // Merge update into document
    const updated = { ...doc, ...update, _id: id };
    collData.documents.set(id, updated);

    return updated as Document<T>;
  }

  async deleteDocument(collectionName: string, id: string): Promise<void> {
    const collData = this.collections.get(collectionName);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', collectionName);
    }

    const existed = collData.documents.delete(id);
    if (!existed) {
      throw new ResourceNotFoundError('Document', id);
    }

    collData.metadata.documentCount = collData.documents.size;
  }

  async listCollections(): Promise<string[]> {
    return Array.from(this.collections.keys());
  }

  async count(collectionName: string, query?: Query): Promise<number> {
    const collData = this.collections.get(collectionName);
    if (!collData) {
      throw new ResourceNotFoundError('Collection', collectionName);
    }

    if (!query) {
      return collData.documents.size;
    }

    const allDocs = Array.from(collData.documents.values());
    return allDocs.filter((doc) => this.matchesQuery(doc, query)).length;
  }

  // Helper methods
  private generateId(): string {
    return randomBytes(12).toString('hex');
  }

  private matchesQuery(doc: Document, query: Query): boolean {
    for (const [field, condition] of Object.entries(query)) {
      const value = doc[field];

      // If condition is a QueryOperator, evaluate it
      if (this.isQueryOperator(condition)) {
        if (!this.evaluateOperator(value, condition)) {
          return false;
        }
      } else {
        // Direct equality check
        if (value !== condition) {
          return false;
        }
      }
    }

    return true;
  }

  private isQueryOperator(value: unknown): value is QueryOperator {
    if (typeof value !== 'object' || value === null) return false;

    const operators = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'];
    return operators.some((op) => op in value);
  }

  private evaluateOperator(value: unknown, operator: QueryOperator): boolean {
    if (operator.$eq !== undefined && value !== operator.$eq) return false;
    if (operator.$ne !== undefined && value === operator.$ne) return false;

    // Numeric/date comparisons
    if (typeof value === 'number' || value instanceof Date) {
      const numValue =
        value instanceof Date ? value.getTime() : (value as number);

      if (operator.$gt !== undefined) {
        const threshold =
          operator.$gt instanceof Date ? operator.$gt.getTime() : operator.$gt;
        if (numValue <= threshold) return false;
      }

      if (operator.$gte !== undefined) {
        const threshold =
          operator.$gte instanceof Date ? operator.$gte.getTime() : operator.$gte;
        if (numValue < threshold) return false;
      }

      if (operator.$lt !== undefined) {
        const threshold =
          operator.$lt instanceof Date ? operator.$lt.getTime() : operator.$lt;
        if (numValue >= threshold) return false;
      }

      if (operator.$lte !== undefined) {
        const threshold =
          operator.$lte instanceof Date ? operator.$lte.getTime() : operator.$lte;
        if (numValue > threshold) return false;
      }
    }

    // Array operators
    if (operator.$in !== undefined && !operator.$in.includes(value)) return false;
    if (operator.$nin !== undefined && operator.$nin.includes(value)) return false;

    return true;
  }
}
