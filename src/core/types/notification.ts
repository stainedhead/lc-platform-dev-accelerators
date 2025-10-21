/**
 * Notification Types
 */

export interface NotificationMessage {
  subject?: string;
  body: string;
  attributes?: Record<string, string>;
}

export interface Topic {
  name: string;
  arn?: string;
  subscriptions: Subscription[];
  created: Date;
}

export interface Subscription {
  id: string;
  protocol: Protocol;
  endpoint: string;
  confirmed: boolean;
  created: Date;
}

export const Protocol = {
  EMAIL: 'email' as const,
  SMS: 'sms' as const,
  HTTP: 'http' as const,
  HTTPS: 'https' as const,
  WEBHOOK: 'webhook' as const,
};

export type Protocol = (typeof Protocol)[keyof typeof Protocol];

export interface EmailParams {
  to: string[];
  from?: string;
  subject: string;
  body: string;
  html?: boolean;
}

export interface SMSParams {
  to: string;
  message: string;
  senderId?: string;
}
