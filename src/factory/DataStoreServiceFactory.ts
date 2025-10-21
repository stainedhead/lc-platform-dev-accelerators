/**
 * DataStoreService Factory
 */

import type { ProviderConfig } from '../core/types/common';
import type { DataStoreService } from '../core/services/DataStoreService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockDataStoreService } from '../providers/mock/MockDataStoreService';
import { AwsDataStoreService } from '../providers/aws/AwsDataStoreService';

export class DataStoreServiceFactory extends BaseProviderFactory<DataStoreService> {
  protected createAwsService(config: ProviderConfig): DataStoreService {
    const dbConfig = config.options ?? {};
    const awsConfig: any = {};

    if (dbConfig.dbHost) {
      awsConfig.host = String(dbConfig.dbHost);
    }

    if (dbConfig.dbPort) {
      awsConfig.port = Number(dbConfig.dbPort);
    }

    if (dbConfig.dbName) {
      awsConfig.database = String(dbConfig.dbName);
    }

    if (dbConfig.dbUser) {
      awsConfig.user = String(dbConfig.dbUser);
    }

    if (dbConfig.dbPassword) {
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
