/**
 * Document Store Service Interface
 * Provides cloud-agnostic NoSQL document database capabilities
 */

import type {
  Document,
  Collection,
  CollectionOptions,
  Query,
} from '../types/document';

export interface DocumentStoreService {
  /**
   * Create a new collection
   * @param name Collection name
   * @param options Optional collection configuration (indexes, TTL)
   * @returns The created collection
   */
  createCollection(name: string, options?: CollectionOptions): Promise<Collection>;

  /**
   * Get collection details
   * @param name Collection name
   * @returns Collection metadata
   */
  getCollection(name: string): Promise<Collection>;

  /**
   * Delete a collection and all its documents
   * @param name Collection name
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * Insert a document into a collection
   * @param collectionName Collection name
   * @param document Document to insert (without _id, will be generated)
   * @returns The inserted document with generated _id
   */
  insertDocument<T>(collectionName: string, document: T): Promise<Document<T>>;

  /**
   * Find a document by ID
   * @param collectionName Collection name
   * @param id Document ID
   * @returns The document if found
   */
  findById<T>(collectionName: string, id: string): Promise<Document<T> | null>;

  /**
   * Find documents matching a query
   * @param collectionName Collection name
   * @param query Query filter
   * @param limit Optional limit on number of results
   * @returns Array of matching documents
   */
  find<T>(
    collectionName: string,
    query: Query,
    limit?: number
  ): Promise<Document<T>[]>;

  /**
   * Update a document by ID
   * @param collectionName Collection name
   * @param id Document ID
   * @param update Partial document with fields to update
   * @returns The updated document
   */
  updateDocument<T>(
    collectionName: string,
    id: string,
    update: Partial<T>
  ): Promise<Document<T>>;

  /**
   * Delete a document by ID
   * @param collectionName Collection name
   * @param id Document ID
   */
  deleteDocument(collectionName: string, id: string): Promise<void>;

  /**
   * List all collections
   * @returns Array of collection names
   */
  listCollections(): Promise<string[]>;

  /**
   * Count documents matching a query
   * @param collectionName Collection name
   * @param query Optional query filter
   * @returns Count of matching documents
   */
  count(collectionName: string, query?: Query): Promise<number>;
}
