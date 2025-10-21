/**
 * AWS Event Bus Service Implementation
 * Uses AWS EventBridge for event-driven architecture
 */

import {
  EventBridgeClient,
  CreateEventBusCommand,
  DescribeEventBusCommand,
  DeleteEventBusCommand,
  PutEventsCommand,
  PutRuleCommand,
  DescribeRuleCommand,
  DeleteRuleCommand,
  ListRulesCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  ListTargetsByRuleCommand,
  RuleState,
} from '@aws-sdk/client-eventbridge';
import type { EventBusService } from '../../core/services/EventBusService';
import type {
  Event,
  EventBus,
  Rule,
  RuleParams,
  Target,
  EventPattern,
  TargetType,
} from '../../core/types/event';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

export class AwsEventBusService implements EventBusService {
  private client: EventBridgeClient;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = {};

    if (config.region) {
      clientConfig.region = config.region;
    }

    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    this.client = new EventBridgeClient(clientConfig);
  }

  async createEventBus(name: string): Promise<EventBus> {
    try {
      const command = new CreateEventBusCommand({
        Name: name,
      });

      const response = await this.client.send(command);

      const bus: EventBus = {
        name: response.EventBusArn?.split('/').pop() || name,
        created: new Date(),
      };

      if (response.EventBusArn) {
        bus.arn = response.EventBusArn;
      }

      return bus;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to create event bus: ${(error as Error).message}`
      );
    }
  }

  async getEventBus(name: string): Promise<EventBus> {
    try {
      const command = new DescribeEventBusCommand({
        Name: name,
      });

      const response = await this.client.send(command);

      const bus: EventBus = {
        name: response.Name || name,
        created: new Date(),
      };

      if (response.Arn) {
        bus.arn = response.Arn;
      }

      return bus;
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('EventBus', name);
      }
      throw new ServiceUnavailableError(
        `Failed to get event bus: ${(error as Error).message}`
      );
    }
  }

  async deleteEventBus(name: string): Promise<void> {
    try {
      const command = new DeleteEventBusCommand({
        Name: name,
      });

      await this.client.send(command);
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('EventBus', name);
      }
      throw new ServiceUnavailableError(
        `Failed to delete event bus: ${(error as Error).message}`
      );
    }
  }

  async publishEvent(busName: string, event: Event): Promise<string> {
    try {
      const entries = [
        {
          Source: event.source,
          DetailType: event.type,
          Detail: JSON.stringify(event.data),
          EventBusName: busName,
          Time: event.time,
        },
      ];

      const command = new PutEventsCommand({
        Entries: entries,
      });

      const response = await this.client.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const error = response.Entries?.[0];
        throw new Error(
          `Failed to publish event: ${error?.ErrorCode || 'Unknown error'}`
        );
      }

      return response.Entries?.[0]?.EventId || 'unknown';
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to publish event: ${(error as Error).message}`
      );
    }
  }

  async createRule(busName: string, params: RuleParams): Promise<Rule> {
    try {
      const eventPattern = this.convertEventPattern(params.eventPattern);

      const command = new PutRuleCommand({
        Name: params.name,
        EventBusName: busName,
        EventPattern: JSON.stringify(eventPattern),
        Description: params.description,
        State: params.enabled === false ? RuleState.DISABLED : RuleState.ENABLED,
      });

      await this.client.send(command);

      const rule: Rule = {
        name: params.name,
        eventPattern: params.eventPattern,
        enabled: params.enabled ?? true,
        targets: [],
      };

      if (params.description) {
        rule.description = params.description;
      }

      return rule;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to create rule: ${(error as Error).message}`
      );
    }
  }

  async getRule(busName: string, ruleName: string): Promise<Rule> {
    try {
      const command = new DescribeRuleCommand({
        Name: ruleName,
        EventBusName: busName,
      });

      const response = await this.client.send(command);

      // Get targets for this rule
      const targetsCommand = new ListTargetsByRuleCommand({
        Rule: ruleName,
        EventBusName: busName,
      });

      const targetsResponse = await this.client.send(targetsCommand);

      // Parse event pattern
      const eventPattern = response.EventPattern
        ? this.parseEventPattern(response.EventPattern)
        : { source: [], type: [] };

      const targets: Target[] = [];
      for (const awsTarget of targetsResponse.Targets || []) {
        if (awsTarget.Id && awsTarget.Arn) {
          targets.push(this.convertAwsTarget(awsTarget.Id, awsTarget.Arn));
        }
      }

      const rule: Rule = {
        name: response.Name || ruleName,
        eventPattern,
        enabled: response.State === RuleState.ENABLED,
        targets,
      };

      if (response.Description) {
        rule.description = response.Description;
      }

      return rule;
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Rule', ruleName);
      }
      throw new ServiceUnavailableError(
        `Failed to get rule: ${(error as Error).message}`
      );
    }
  }

  async updateRule(busName: string, ruleName: string, params: RuleParams): Promise<Rule> {
    try {
      const eventPattern = this.convertEventPattern(params.eventPattern);

      const command = new PutRuleCommand({
        Name: ruleName,
        EventBusName: busName,
        EventPattern: JSON.stringify(eventPattern),
        Description: params.description,
        State: params.enabled === false ? RuleState.DISABLED : RuleState.ENABLED,
      });

      await this.client.send(command);

      // Get updated rule with targets
      return await this.getRule(busName, ruleName);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to update rule: ${(error as Error).message}`
      );
    }
  }

  async deleteRule(busName: string, ruleName: string): Promise<void> {
    try {
      // First remove all targets
      const targetsCommand = new ListTargetsByRuleCommand({
        Rule: ruleName,
        EventBusName: busName,
      });

      const targetsResponse = await this.client.send(targetsCommand);

      if (targetsResponse.Targets && targetsResponse.Targets.length > 0) {
        const removeTargetsCommand = new RemoveTargetsCommand({
          Rule: ruleName,
          EventBusName: busName,
          Ids: targetsResponse.Targets.map((t) => t.Id || '').filter(Boolean),
        });

        await this.client.send(removeTargetsCommand);
      }

      // Then delete the rule
      const deleteCommand = new DeleteRuleCommand({
        Name: ruleName,
        EventBusName: busName,
      });

      await this.client.send(deleteCommand);
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Rule', ruleName);
      }
      throw new ServiceUnavailableError(
        `Failed to delete rule: ${(error as Error).message}`
      );
    }
  }

  async addTarget(busName: string, ruleName: string, target: Target): Promise<void> {
    try {
      const awsTarget = this.convertToAwsTarget(target);

      const command = new PutTargetsCommand({
        Rule: ruleName,
        EventBusName: busName,
        Targets: [awsTarget],
      });

      const response = await this.client.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const error = response.FailedEntries?.[0];
        throw new Error(
          `Failed to add target: ${error?.ErrorCode || 'Unknown error'}`
        );
      }
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to add target: ${(error as Error).message}`
      );
    }
  }

  async removeTarget(busName: string, ruleName: string, targetId: string): Promise<void> {
    try {
      const command = new RemoveTargetsCommand({
        Rule: ruleName,
        EventBusName: busName,
        Ids: [targetId],
      });

      const response = await this.client.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const error = response.FailedEntries?.[0];
        throw new Error(
          `Failed to remove target: ${error?.ErrorCode || 'Unknown error'}`
        );
      }
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to remove target: ${(error as Error).message}`
      );
    }
  }

  async listRules(busName: string): Promise<Rule[]> {
    try {
      const command = new ListRulesCommand({
        EventBusName: busName,
      });

      const response = await this.client.send(command);

      const rules: Rule[] = [];

      for (const awsRule of response.Rules || []) {
        if (!awsRule.Name) continue;

        const eventPattern = awsRule.EventPattern
          ? this.parseEventPattern(awsRule.EventPattern)
          : { source: [], type: [] };

        const rule: Rule = {
          name: awsRule.Name,
          eventPattern,
          enabled: awsRule.State === RuleState.ENABLED,
          targets: [],
        };

        if (awsRule.Description) {
          rule.description = awsRule.Description;
        }

        rules.push(rule);
      }

      return rules;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to list rules: ${(error as Error).message}`
      );
    }
  }

  // Helper methods
  private convertEventPattern(pattern: EventPattern): Record<string, unknown> {
    const awsPattern: Record<string, unknown> = {};

    if (pattern.source) {
      awsPattern.source = pattern.source;
    }

    if (pattern.type) {
      awsPattern['detail-type'] = pattern.type;
    }

    if (pattern.data) {
      awsPattern.detail = pattern.data;
    }

    return awsPattern;
  }

  private parseEventPattern(eventPatternStr: string): EventPattern {
    try {
      const awsPattern = JSON.parse(eventPatternStr) as Record<string, unknown>;

      const pattern: EventPattern = {};

      if (awsPattern.source && Array.isArray(awsPattern.source)) {
        pattern.source = awsPattern.source as string[];
      }

      if (awsPattern['detail-type'] && Array.isArray(awsPattern['detail-type'])) {
        pattern.type = awsPattern['detail-type'] as string[];
      }

      if (awsPattern.detail && typeof awsPattern.detail === 'object') {
        pattern.data = awsPattern.detail as Record<string, unknown>;
      }

      return pattern;
    } catch {
      return { source: [], type: [] };
    }
  }

  private convertToAwsTarget(target: Target): { Id: string; Arn: string } {
    return {
      Id: target.id,
      Arn: target.endpoint,
    };
  }

  private convertAwsTarget(id: string, arn: string): Target {
    // Determine target type from ARN
    let type: TargetType = 'https' as TargetType;

    if (arn.includes(':sqs:')) {
      type = 'queue' as TargetType;
    } else if (arn.includes(':lambda:')) {
      type = 'function' as TargetType;
    } else if (arn.includes(':sns:')) {
      type = 'email' as TargetType;
    }

    return {
      id,
      type,
      endpoint: arn,
    };
  }
}
