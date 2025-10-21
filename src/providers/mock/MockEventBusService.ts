/**
 * Mock Event Bus Service Implementation
 * In-memory event bus for testing
 */

import type { EventBusService } from '../../core/services/EventBusService';
import type {
  Event,
  EventBus,
  Rule,
  RuleParams,
  Target,
  EventPattern,
} from '../../core/types/event';
import { ResourceNotFoundError } from '../../core/types/common';

interface BusData {
  bus: EventBus;
  rules: Map<string, Rule>;
  events: Event[];
}

export class MockEventBusService implements EventBusService {
  private buses = new Map<string, BusData>();
  private eventCounter = 1;

  async createEventBus(name: string): Promise<EventBus> {
    if (this.buses.has(name)) {
      throw new Error(`Event bus ${name} already exists`);
    }

    const bus: EventBus = {
      name,
      arn: `arn:mock:events:us-east-1:000000000000:event-bus/${name}`,
      created: new Date(),
    };

    this.buses.set(name, {
      bus,
      rules: new Map(),
      events: [],
    });

    return bus;
  }

  async getEventBus(name: string): Promise<EventBus> {
    const busData = this.buses.get(name);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', name);
    }
    return busData.bus;
  }

  async deleteEventBus(name: string): Promise<void> {
    const exists = this.buses.has(name);
    if (!exists) {
      throw new ResourceNotFoundError('EventBus', name);
    }
    this.buses.delete(name);
  }

  async publishEvent(busName: string, event: Event): Promise<string> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    const eventId = `mock-event-${this.eventCounter++}`;
    const fullEvent: Event = {
      ...event,
      id: event.id ?? eventId,
      time: event.time ?? new Date(),
    };

    busData.events.push(fullEvent);

    // Match event against rules and simulate delivery
    for (const rule of busData.rules.values()) {
      if (rule.enabled && this.matchesPattern(fullEvent, rule.eventPattern)) {
        // In a real implementation, this would deliver to targets
        // For mock, we just simulate successful delivery
        await this.simulateDelivery(fullEvent, rule.targets);
      }
    }

    return eventId;
  }

  async createRule(busName: string, params: RuleParams): Promise<Rule> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    if (busData.rules.has(params.name)) {
      throw new Error(`Rule ${params.name} already exists`);
    }

    const rule: Rule = {
      name: params.name,
      eventPattern: params.eventPattern,
      enabled: params.enabled ?? true,
      targets: [],
    };

    if (params.description) {
      rule.description = params.description;
    }

    busData.rules.set(params.name, rule);
    return rule;
  }

  async getRule(busName: string, ruleName: string): Promise<Rule> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    const rule = busData.rules.get(ruleName);
    if (!rule) {
      throw new ResourceNotFoundError('Rule', ruleName);
    }

    return rule;
  }

  async updateRule(busName: string, ruleName: string, params: RuleParams): Promise<Rule> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    const rule = busData.rules.get(ruleName);
    if (!rule) {
      throw new ResourceNotFoundError('Rule', ruleName);
    }

    rule.eventPattern = params.eventPattern;
    if (params.description !== undefined) {
      rule.description = params.description;
    }
    if (params.enabled !== undefined) {
      rule.enabled = params.enabled;
    }

    return rule;
  }

  async deleteRule(busName: string, ruleName: string): Promise<void> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    const existed = busData.rules.delete(ruleName);
    if (!existed) {
      throw new ResourceNotFoundError('Rule', ruleName);
    }
  }

  async addTarget(busName: string, ruleName: string, target: Target): Promise<void> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    const rule = busData.rules.get(ruleName);
    if (!rule) {
      throw new ResourceNotFoundError('Rule', ruleName);
    }

    // Check if target ID already exists
    const exists = rule.targets.some((t) => t.id === target.id);
    if (exists) {
      throw new Error(`Target ${target.id} already exists for rule ${ruleName}`);
    }

    rule.targets.push(target);
  }

  async removeTarget(busName: string, ruleName: string, targetId: string): Promise<void> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    const rule = busData.rules.get(ruleName);
    if (!rule) {
      throw new ResourceNotFoundError('Rule', ruleName);
    }

    const index = rule.targets.findIndex((t) => t.id === targetId);
    if (index === -1) {
      throw new ResourceNotFoundError('Target', targetId);
    }

    rule.targets.splice(index, 1);
  }

  async listRules(busName: string): Promise<Rule[]> {
    const busData = this.buses.get(busName);
    if (!busData) {
      throw new ResourceNotFoundError('EventBus', busName);
    }

    return Array.from(busData.rules.values());
  }

  // Helper methods
  private matchesPattern(event: Event, pattern: EventPattern): boolean {
    // Check source
    if (pattern.source && !pattern.source.includes(event.source)) {
      return false;
    }

    // Check type
    if (pattern.type && !pattern.type.includes(event.type)) {
      return false;
    }

    // Check data fields
    if (pattern.data) {
      for (const [key, value] of Object.entries(pattern.data)) {
        const eventData = event.data as Record<string, unknown>;
        if (eventData[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private async simulateDelivery(_event: Event, _targets: Target[]): Promise<void> {
    // In mock, we just simulate a small delay for delivery
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
