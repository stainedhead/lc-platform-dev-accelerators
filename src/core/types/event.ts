/**
 * Event Bus Types
 */

export interface Event {
  source: string;
  type: string;
  data: object;
  metadata?: Record<string, string>;
  time?: Date;
  id?: string;
}

export interface EventBus {
  name: string;
  arn?: string;
  created: Date;
}

export interface Rule {
  name: string;
  eventPattern: EventPattern;
  description?: string;
  enabled: boolean;
  targets: Target[];
}

export interface EventPattern {
  source?: string[];
  type?: string[];
  data?: Record<string, unknown>;
}

export interface Target {
  id: string;
  type: TargetType;
  endpoint: string;
}

export enum TargetType {
  HTTP = 'http',
  HTTPS = 'https',
  QUEUE = 'queue',
  FUNCTION = 'function',
  EMAIL = 'email',
}

export interface RuleParams {
  name: string;
  eventPattern: EventPattern;
  description?: string;
  enabled?: boolean;
}
