/**
 * FunctionHostingService Interface
 *
 * Cloud-agnostic interface for deploying and managing serverless functions.
 * No AWS/Azure-specific types - pure abstraction.
 *
 * Constitution Principle I: Provider Independence
 */

import type {
  ServerlessFunction,
  CreateFunctionParams,
  UpdateFunctionParams,
  UpdateFunctionCodeParams,
  InvokeFunctionParams,
  InvocationResult,
  ListFunctionsParams,
  ListFunctionsResult,
  EventSourceMapping,
  CreateEventSourceParams,
  FunctionUrl,
  FunctionUrlParams,
} from '../types/function';

export interface FunctionHostingService {
  /**
   * Create a new serverless function
   */
  createFunction(params: CreateFunctionParams): Promise<ServerlessFunction>;

  /**
   * Get function details by name
   */
  getFunction(functionName: string): Promise<ServerlessFunction>;

  /**
   * Update function configuration (memory, timeout, environment, etc.)
   */
  updateFunctionConfiguration(
    functionName: string,
    params: UpdateFunctionParams
  ): Promise<ServerlessFunction>;

  /**
   * Update function code (deploy new version)
   */
  updateFunctionCode(
    functionName: string,
    params: UpdateFunctionCodeParams
  ): Promise<ServerlessFunction>;

  /**
   * Delete a function and its associated resources
   */
  deleteFunction(functionName: string): Promise<void>;

  /**
   * List all functions with optional pagination
   */
  listFunctions(params?: ListFunctionsParams): Promise<ListFunctionsResult>;

  /**
   * Invoke a function synchronously or asynchronously
   */
  invokeFunction(functionName: string, params?: InvokeFunctionParams): Promise<InvocationResult>;

  /**
   * Create an event source mapping to trigger the function
   */
  createEventSourceMapping(
    functionName: string,
    params: CreateEventSourceParams
  ): Promise<EventSourceMapping>;

  /**
   * Get event source mapping details
   */
  getEventSourceMapping(mappingId: string): Promise<EventSourceMapping>;

  /**
   * Enable or disable an event source mapping
   */
  updateEventSourceMapping(mappingId: string, enabled: boolean): Promise<EventSourceMapping>;

  /**
   * Delete an event source mapping
   */
  deleteEventSourceMapping(mappingId: string): Promise<void>;

  /**
   * List all event source mappings for a function
   */
  listEventSourceMappings(functionName: string): Promise<EventSourceMapping[]>;

  /**
   * Create a function URL for HTTP access
   */
  createFunctionUrl(functionName: string, params?: FunctionUrlParams): Promise<FunctionUrl>;

  /**
   * Get function URL configuration
   */
  getFunctionUrl(functionName: string): Promise<FunctionUrl>;

  /**
   * Update function URL configuration
   */
  updateFunctionUrl(functionName: string, params: FunctionUrlParams): Promise<FunctionUrl>;

  /**
   * Delete function URL
   */
  deleteFunctionUrl(functionName: string): Promise<void>;
}
