/**
 * AWS Document Store Service Implementation
 * Uses AWS DocumentDB (MongoDB-compatible) for NoSQL document storage
 *
 * Note: This implementation requires the 'mongodb' driver which is compatible with DocumentDB
 * In production, you would install: bun add mongodb
 */

import type { DocumentStoreService } from '../../core/services/DocumentStoreService';
import type { Document, Collection, CollectionOptions, Query } from '../../core/types/document';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

// Mock MongoDB client for type compatibility
// In production, import from 'mongodb'
interface MongoClient {
  connect(): Promise<void>;
  db(name?: string): Database;
  close(): Promise<void>;
}

interface Database {
  collection(name: string): MongoCollection;
  listCollections(): { toArray(): Promise<Array<{ name: string }>> };
  createCollection(name: string, options?: unknown): Promise<MongoCollection>;
  dropCollection(name: string): Promise<boolean>;
}

interface MongoCollection {
  insertOne(doc: unknown): Promise<{ insertedId: string }>;
  findOne(filter: unknown): Promise<unknown>;
  find(
    filter: unknown,
    options?: { limit?: number }
  ): {
    toArray(): Promise<unknown[]>;
  };
  updateOne(filter: unknown, update: unknown): Promise<{ modifiedCount: number }>;
  deleteOne(filter: unknown): Promise<{ deletedCount: number }>;
  countDocuments(filter?: unknown): Promise<number>;
  createIndex(spec: unknown, options?: unknown): Promise<string>;
  indexInformation(): Promise<unknown>;
}

export class AwsDocumentStoreService implements DocumentStoreService {
  private client: MongoClient | null = null;
  private database: Database | null = null;
  private readonly connectionString: string;
  private databaseName: string;

  constructor(config: ProviderConfig) {
    // DocumentDB connection string format:
    // mongodb://username:password@cluster-endpoint:27017/?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

    const host = config.options?.docDbHost || 'localhost';
    const port = config.options?.docDbPort || 27017;
    const username = config.options?.docDbUser || 'admin';
    const password = config.options?.docDbPassword || 'password';
    this.databaseName = String(config.options?.docDbName || 'lcplatform');

    this.connectionString = `mongodb://${username}:${password}@${host}:${port}/${this.databaseName}?tls=true&tlsAllowInvalidCertificates=true&retryWrites=false`;
  }

  private async connect(): Promise<Database> {
    if (this.database) {
      return this.database;
    }

    try {
      // In production, use actual MongoDB client
      // const { MongoClient } = require('mongodb');
      // this.client = new MongoClient(this.connectionString);
      // await this.client.connect();
      // this.database = this.client.db(this.databaseName);

      // For now, throw error indicating MongoDB driver is needed
      // Note: this.connectionString is used in the commented production code above
      throw new Error(
        'MongoDB driver not available. Install with: bun add mongodb\n' +
          `This service requires DocumentDB connection to ${this.connectionString.split('@')[1]?.split('?')[0] || 'database'}.`
      );
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to connect to DocumentDB: ${(error as Error).message}`
      );
    }
  }

  async createCollection(name: string, options?: CollectionOptions): Promise<Collection> {
    try {
      const db = await this.connect();

      // Create collection
      const mongoCollection = await db.createCollection(name);

      // Create indexes if specified
      const indexes = options?.indexes || [];
      for (const index of indexes) {
        await mongoCollection.createIndex(
          { [index.field]: 1 },
          { unique: index.unique, sparse: index.sparse }
        );
      }

      // Set TTL if specified
      if (options?.ttl) {
        await mongoCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: options.ttl });
      }

      const collection: Collection = {
        name,
        indexes,
        documentCount: 0,
      };

      if (options?.ttl) {
        collection.ttl = options.ttl;
      }

      return collection;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to create collection: ${(error as Error).message}`);
    }
  }

  async getCollection(name: string): Promise<Collection> {
    try {
      const db = await this.connect();
      const mongoCollection = db.collection(name);

      // Check if collection exists
      const collections = await db.listCollections().toArray();
      const exists = collections.some((c) => c.name === name);

      if (!exists) {
        throw new ResourceNotFoundError('Collection', name);
      }

      // Get document count
      const count = await mongoCollection.countDocuments();

      // Get indexes
      const indexInfo = await mongoCollection.indexInformation();
      const indexes = Object.keys(indexInfo as object)
        .filter((key) => key !== '_id_')
        .map((key) => ({
          field: key.replace('_1', ''),
          unique: false,
          sparse: false,
        }));

      return {
        name,
        indexes,
        documentCount: count,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to get collection: ${(error as Error).message}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    try {
      const db = await this.connect();
      const dropped = await db.dropCollection(name);

      if (!dropped) {
        throw new ResourceNotFoundError('Collection', name);
      }
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to delete collection: ${(error as Error).message}`);
    }
  }

  async insertDocument<T>(collectionName: string, document: T): Promise<Document<T>> {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      const result = await collection.insertOne(document);

      const doc: Document<T> = {
        _id: result.insertedId,
        ...document,
      };

      return doc;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to insert document: ${(error as Error).message}`);
    }
  }

  async findById<T>(collectionName: string, id: string): Promise<Document<T> | null> {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      const doc = await collection.findOne({ _id: id });

      return doc ? (doc as Document<T>) : null;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to find document: ${(error as Error).message}`);
    }
  }

  async find<T>(collectionName: string, query: Query, limit?: number): Promise<Document<T>[]> {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      // Convert query to MongoDB format
      const mongoQuery = this.convertQueryToMongo(query);

      const findOptions: { limit?: number } = {};
      if (limit !== undefined) {
        findOptions.limit = limit;
      }

      const cursor = collection.find(mongoQuery, findOptions);
      const docs = await cursor.toArray();

      return docs as Document<T>[];
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to find documents: ${(error as Error).message}`);
    }
  }

  async updateDocument<T>(
    collectionName: string,
    id: string,
    update: Partial<T>
  ): Promise<Document<T>> {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      const result = await collection.updateOne({ _id: id }, { $set: update });

      if (result.modifiedCount === 0) {
        throw new ResourceNotFoundError('Document', id);
      }

      // Get updated document
      const doc = await collection.findOne({ _id: id });

      if (!doc) {
        throw new ResourceNotFoundError('Document', id);
      }

      return doc as Document<T>;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to update document: ${(error as Error).message}`);
    }
  }

  async deleteDocument(collectionName: string, id: string): Promise<void> {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      const result = await collection.deleteOne({ _id: id });

      if (result.deletedCount === 0) {
        throw new ResourceNotFoundError('Document', id);
      }
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to delete document: ${(error as Error).message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const db = await this.connect();
      const collections = await db.listCollections().toArray();

      return collections.map((c) => c.name);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to list collections: ${(error as Error).message}`);
    }
  }

  async count(collectionName: string, query?: Query): Promise<number> {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      const mongoQuery = query ? this.convertQueryToMongo(query) : {};
      return await collection.countDocuments(mongoQuery);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to count documents: ${(error as Error).message}`);
    }
  }

  // Helper method to convert our Query format to MongoDB query format
  private convertQueryToMongo(query: Query): Record<string, unknown> {
    const mongoQuery: Record<string, unknown> = {};

    for (const [field, operator] of Object.entries(query)) {
      if (typeof operator === 'object' && operator !== null) {
        mongoQuery[field] = operator;
      } else {
        mongoQuery[field] = operator;
      }
    }

    return mongoQuery;
  }

  // Cleanup method
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.database = null;
    }
  }
}
