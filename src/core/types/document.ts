/**
 * Document Store Types - NoSQL
 */

export interface Document<T = unknown> {
  _id: string;
  [key: string]: T | string; // Allow _id to be string
}

export interface Collection {
  name: string;
  indexes: IndexDefinition[];
  documentCount: number;
  ttl?: number;
}

export interface CollectionOptions {
  indexes?: IndexDefinition[];
  ttl?: number;
}

export interface IndexDefinition {
  field: string;
  unique?: boolean;
  sparse?: boolean;
}

export interface Query {
  [field: string]: QueryOperator | unknown;
}

export interface QueryOperator {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number | Date;
  $gte?: number | Date;
  $lt?: number | Date;
  $lte?: number | Date;
  $in?: unknown[];
  $nin?: unknown[];
}
