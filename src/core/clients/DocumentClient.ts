/**
 * DocumentClient Interface - Data Plane
 *
 * Runtime interface for document store operations in hosted applications.
 * Provides CRUD and query operations without collection management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { Document, Query } from '../types/document';

export interface DocumentClient {
  /**
   * Get a document by ID
   * @param collection - Collection name
   * @param documentId - Document ID
   * @returns Document or null if not found
   */
  get(collection: string, documentId: string): Promise<Document | null>;

  /**
   * Put (create or replace) a document
   * @param collection - Collection name
   * @param document - Document to store (must include _id)
   */
  put(collection: string, document: Document): Promise<void>;

  /**
   * Update specific fields of a document
   * @param collection - Collection name
   * @param documentId - Document ID
   * @param updates - Partial document with fields to update
   */
  update(collection: string, documentId: string, updates: Partial<Document>): Promise<void>;

  /**
   * Delete a document
   * @param collection - Collection name
   * @param documentId - Document ID
   */
  delete(collection: string, documentId: string): Promise<void>;

  /**
   * Query documents by criteria
   * @param collection - Collection name
   * @param query - Query criteria
   * @returns Array of matching documents
   */
  query(collection: string, query: Query): Promise<Document[]>;

  /**
   * Get multiple documents by ID
   * @param collection - Collection name
   * @param documentIds - Array of document IDs
   * @returns Array of documents (may contain nulls for not found)
   */
  batchGet(collection: string, documentIds: string[]): Promise<(Document | null)[]>;

  /**
   * Put multiple documents at once
   * @param collection - Collection name
   * @param documents - Array of documents to store
   */
  batchPut(collection: string, documents: Document[]): Promise<void>;
}
