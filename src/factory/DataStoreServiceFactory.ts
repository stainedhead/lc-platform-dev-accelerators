/**
 * DataStoreService Factory
 */

import type { ProviderConfig } from '../core/types/common';
import type { DataStoreService } from '../core/services/DataStoreService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockDataStoreService } from '../providers/mock/MockDataStoreService';
import { AwsDataStoreService, type AwsDataStoreConfig } from '../providers/aws/AwsDataStoreService';

export class DataStoreServiceFactory extends BaseProviderFactory<DataStoreService> {
  protected createAwsService(config: ProviderConfig): DataStoreService {
    const dbConfig = config.options ?? {};
    const awsConfig: AwsDataStoreConfig = {};

    if (dbConfig.dbHost !== undefined && dbConfig.dbHost !== null) {
      awsConfig.host = String(dbConfig.dbHost);
    }

    if (dbConfig.dbPort !== undefined && dbConfig.dbPort !== null) {
      awsConfig.port = Number(dbConfig.dbPort);
    }

    if (dbConfig.dbName !== undefined && dbConfig.dbName !== null) {
      awsConfig.database = String(dbConfig.dbName);
    }

    if (dbConfig.dbUser !== undefined && dbConfig.dbUser !== null) {
      awsConfig.user = String(dbConfig.dbUser);
    }

    if (dbConfig.dbPassword !== undefined && dbConfig.dbPassword !== null) {
      awsConfig.password = String(dbConfig.dbPassword);
    }

    return new AwsDataStoreService(awsConfig);
  }

  protected createAzureService(_config: ProviderConfig): DataStoreService {
    throw new Error('Azure DataStoreService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): DataStoreService {
    return new MockDataStoreService();
  }
}
