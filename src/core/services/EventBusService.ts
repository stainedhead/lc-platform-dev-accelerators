/**
 * Event Bus Service Interface
 * Provides cloud-agnostic event-driven architecture capabilities
 */

import type { Event, EventBus, Rule, RuleParams, Target } from '../types/event';

export interface EventBusService {
  /**
   * Create a new event bus
   * @param name Event bus name
   * @returns The created event bus
   */
  createEventBus(name: string): Promise<EventBus>;

  /**
   * Get event bus details
   * @param name Event bus name
   * @returns Event bus metadata
   */
  getEventBus(name: string): Promise<EventBus>;

  /**
   * Delete an event bus
   * @param name Event bus name
   */
  deleteEventBus(name: string): Promise<void>;

  /**
   * Publish an event to the event bus
   * @param busName Event bus name
   * @param event Event to publish
   * @returns Event ID
   */
  publishEvent(busName: string, event: Event): Promise<string>;

  /**
   * Create a rule to route events to targets
   * @param busName Event bus name
   * @param params Rule configuration
   * @returns The created rule
   */
  createRule(busName: string, params: RuleParams): Promise<Rule>;

  /**
   * Get rule details
   * @param busName Event bus name
   * @param ruleName Rule name
   * @returns Rule configuration
   */
  getRule(busName: string, ruleName: string): Promise<Rule>;

  /**
   * Update an existing rule
   * @param busName Event bus name
   * @param ruleName Rule name
   * @param params Updated rule configuration
   * @returns The updated rule
   */
  updateRule(busName: string, ruleName: string, params: RuleParams): Promise<Rule>;

  /**
   * Delete a rule
   * @param busName Event bus name
   * @param ruleName Rule name
   */
  deleteRule(busName: string, ruleName: string): Promise<void>;

  /**
   * Add a target to a rule
   * @param busName Event bus name
   * @param ruleName Rule name
   * @param target Target configuration
   */
  addTarget(busName: string, ruleName: string, target: Target): Promise<void>;

  /**
   * Remove a target from a rule
   * @param busName Event bus name
   * @param ruleName Rule name
   * @param targetId Target ID to remove
   */
  removeTarget(busName: string, ruleName: string, targetId: string): Promise<void>;

  /**
   * List all rules for an event bus
   * @param busName Event bus name
   * @returns Array of rules
   */
  listRules(busName: string): Promise<Rule[]>;
}
