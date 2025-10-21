[**LC Platform Dev Accelerators v0.1.0**](README.md)

***

# LC Platform Dev Accelerators v0.1.0

LCPlatform-DevAccelerator

Cloud-agnostic service wrappers for modern application development.
Provides seamless abstraction across AWS, Azure, and GCP.

## Enumerations

- [ProviderType](enumerations/ProviderType.md)
- [IsolationLevel](enumerations/IsolationLevel.md)
- [DeploymentStatus](enumerations/DeploymentStatus.md)
- [TargetType](enumerations/TargetType.md)
- [JobStatus](enumerations/JobStatus.md)

## Classes

- [LCPlatform](classes/LCPlatform.md)
- [LCPlatformError](classes/LCPlatformError.md)
- [ResourceNotFoundError](classes/ResourceNotFoundError.md)
- [ServiceUnavailableError](classes/ServiceUnavailableError.md)
- [QuotaExceededError](classes/QuotaExceededError.md)
- [ValidationError](classes/ValidationError.md)
- [AuthenticationError](classes/AuthenticationError.md)

## Interfaces

- [AuthenticationService](interfaces/AuthenticationService.md)
- [BatchService](interfaces/BatchService.md)
- [ConfigurationService](interfaces/ConfigurationService.md)
- [DataStoreService](interfaces/DataStoreService.md)
- [DocumentStoreService](interfaces/DocumentStoreService.md)
- [EventBusService](interfaces/EventBusService.md)
- [NotificationService](interfaces/NotificationService.md)
- [ObjectStoreService](interfaces/ObjectStoreService.md)
- [QueueService](interfaces/QueueService.md)
- [SecretsService](interfaces/SecretsService.md)
- [WebHostingService](interfaces/WebHostingService.md)
- [TokenSet](interfaces/TokenSet.md)
- [TokenClaims](interfaces/TokenClaims.md)
- [UserInfo](interfaces/UserInfo.md)
- [AuthConfig](interfaces/AuthConfig.md)
- [ProviderConfig](interfaces/ProviderConfig.md)
- [Configuration](interfaces/Configuration.md)
- [ConfigurationParams](interfaces/ConfigurationParams.md)
- [UpdateConfigParams](interfaces/UpdateConfigParams.md)
- [ValidationResult](interfaces/ValidationResult.md)
- [CreateConfigurationParams](interfaces/CreateConfigurationParams.md)
- [UpdateConfigurationParams](interfaces/UpdateConfigurationParams.md)
- [DeployConfigurationParams](interfaces/DeployConfigurationParams.md)
- [ConfigurationProfile](interfaces/ConfigurationProfile.md)
- [ExecuteResult](interfaces/ExecuteResult.md)
- [Migration](interfaces/Migration.md)
- [Transaction](interfaces/Transaction.md)
- [Connection](interfaces/Connection.md)
- [Deployment](interfaces/Deployment.md)
- [DeployApplicationParams](interfaces/DeployApplicationParams.md)
- [UpdateApplicationParams](interfaces/UpdateApplicationParams.md)
- [ScaleParams](interfaces/ScaleParams.md)
- [Document](interfaces/Document.md)
- [Collection](interfaces/Collection.md)
- [CollectionOptions](interfaces/CollectionOptions.md)
- [IndexDefinition](interfaces/IndexDefinition.md)
- [Query](interfaces/Query.md)
- [QueryOperator](interfaces/QueryOperator.md)
- [Event](interfaces/Event.md)
- [EventBus](interfaces/EventBus.md)
- [Rule](interfaces/Rule.md)
- [EventPattern](interfaces/EventPattern.md)
- [Target](interfaces/Target.md)
- [RuleParams](interfaces/RuleParams.md)
- [Job](interfaces/Job.md)
- [JobParams](interfaces/JobParams.md)
- [ListJobsParams](interfaces/ListJobsParams.md)
- [ScheduleJobParams](interfaces/ScheduleJobParams.md)
- [ScheduledJob](interfaces/ScheduledJob.md)
- [NotificationMessage](interfaces/NotificationMessage.md)
- [Topic](interfaces/Topic.md)
- [Subscription](interfaces/Subscription.md)
- [EmailParams](interfaces/EmailParams.md)
- [SMSParams](interfaces/SMSParams.md)
- [ObjectData](interfaces/ObjectData.md)
- [ObjectMetadata](interfaces/ObjectMetadata.md)
- [ObjectInfo](interfaces/ObjectInfo.md)
- [ObjectLocation](interfaces/ObjectLocation.md)
- [BucketOptions](interfaces/BucketOptions.md)
- [LifecycleRule](interfaces/LifecycleRule.md)
- [Message](interfaces/Message.md)
- [ReceivedMessage](interfaces/ReceivedMessage.md)
- [Queue](interfaces/Queue.md)
- [QueueOptions](interfaces/QueueOptions.md)
- [QueueAttributes](interfaces/QueueAttributes.md)
- [SendMessageParams](interfaces/SendMessageParams.md)
- [ReceiveMessageParams](interfaces/ReceiveMessageParams.md)
- [Secret](interfaces/Secret.md)
- [SecretMetadata](interfaces/SecretMetadata.md)
- [CreateSecretParams](interfaces/CreateSecretParams.md)
- [UpdateSecretParams](interfaces/UpdateSecretParams.md)
- [RotationConfig](interfaces/RotationConfig.md)

## Type Aliases

- [ConfigurationData](type-aliases/ConfigurationData.md)
- [Protocol](type-aliases/Protocol.md)
- [SecretValue](type-aliases/SecretValue.md)
- [RotationFunction](type-aliases/RotationFunction.md)

## Variables

- [Protocol](variables/Protocol.md)
