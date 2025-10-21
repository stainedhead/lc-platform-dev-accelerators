# Integration Tests

Integration tests verify that AWS provider implementations work correctly with real AWS-compatible services (LocalStack and PostgreSQL).

## Prerequisites

### Docker and Docker Compose

All integration tests require Docker and Docker Compose to be installed and running.

### Start Test Services

```bash
# Start all test services (LocalStack + PostgreSQL)
docker-compose up -d

# Wait for services to be ready (approximately 10-15 seconds)
# PostgreSQL health check will ensure database is ready
docker-compose ps
```

### Verify Services are Running

```bash
# Check LocalStack is responding
curl http://localhost:4566/_localstack/health

# Check PostgreSQL is ready
docker-compose exec postgres pg_isready -U testuser
```

## Running Integration Tests

### All Integration Tests

```bash
bun test tests/integration/
```

### Individual Service Tests

```bash
# Test AWS ObjectStoreService (S3) with LocalStack
bun test tests/integration/providers/aws/AwsObjectStoreService.test.ts

# Test AWS DataStoreService (PostgreSQL) with Docker PostgreSQL
bun test tests/integration/providers/aws/AwsDataStoreService.test.ts

# Test AWS WebHostingService (App Runner) with LocalStack
bun test tests/integration/providers/aws/AwsWebHostingService.test.ts
```

## Test Configuration

### LocalStack Services

LocalStack provides AWS service emulation on `localhost:4566`:
- **S3**: Object storage for AwsObjectStoreService
- **App Runner**: Container hosting for AwsWebHostingService
- **Other services**: SQS, SNS, EventBridge, etc. (for future user stories)

### PostgreSQL Service

Docker PostgreSQL container on `localhost:5432`:
- **Database**: `testdb`
- **User**: `testuser`
- **Password**: `testpassword`

Used by AwsDataStoreService tests for real SQL operations.

## What is Tested

### AwsObjectStoreService (T027)
- ✅ Create S3 buckets in LocalStack
- ✅ Upload/download objects
- ✅ List objects with prefix filtering
- ✅ Delete objects
- ✅ Copy objects between buckets
- ✅ Generate presigned URLs
- ✅ Store and retrieve metadata
- ✅ Binary data preservation
- ✅ Large file handling (>1MB)

### AwsDataStoreService (T026)
- ✅ Connect to PostgreSQL
- ✅ Execute SQL queries with prepared statements
- ✅ INSERT/UPDATE/DELETE operations
- ✅ Transaction support with COMMIT/ROLLBACK
- ✅ Nested queries within transactions
- ✅ Database migrations
- ✅ Connection pooling (concurrent queries)
- ✅ Large result sets (1000+ rows)
- ✅ NULL value handling
- ✅ Constraint violation error handling

### AwsWebHostingService (T025)
- ✅ Deploy applications to LocalStack App Runner
- ✅ Get deployment details
- ✅ Get application URLs
- ✅ Update deployments (rolling updates)
- ✅ Scale applications (min/max instances)
- ✅ Delete deployments
- ✅ Custom CPU/memory configuration
- ✅ Environment variable management
- ✅ Multiple concurrent deployments
- ✅ Error handling for invalid operations

## Cleanup

Stop and remove test services:

```bash
# Stop services
docker-compose down

# Remove volumes (clean slate for next run)
docker-compose down -v
```

## Troubleshooting

### LocalStack not responding

```bash
# Check LocalStack logs
docker-compose logs localstack

# Restart LocalStack
docker-compose restart localstack
```

### PostgreSQL connection errors

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify PostgreSQL is ready
docker-compose exec postgres pg_isready -U testuser

# Connect manually to verify
docker-compose exec postgres psql -U testuser -d testdb
```

### Port conflicts

If you see "port already in use" errors:

```bash
# Check what's using the ports
lsof -i :4566  # LocalStack
lsof -i :5432  # PostgreSQL

# Stop conflicting services or change ports in docker-compose.yml
```

## Notes

### LocalStack Limitations

LocalStack's App Runner support is limited compared to real AWS. The tests validate:
- Service interface compliance
- Basic CRUD operations
- Error handling

For production validation, run against real AWS App Runner.

### Test Isolation

Each test suite:
- Creates its own resources
- Cleans up after completion
- Uses unique names to avoid conflicts

However, if tests fail mid-execution, manual cleanup may be required:

```bash
# Reset everything
docker-compose down -v && docker-compose up -d
```

## CI/CD Integration

To run integration tests in CI/CD pipelines:

```bash
# Start services in background
docker-compose up -d

# Wait for services to be ready
sleep 10

# Run tests
bun test tests/integration/

# Cleanup
docker-compose down -v
```

## Additional Resources

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [PostgreSQL Docker Documentation](https://hub.docker.com/_/postgres)
- [Bun Test Documentation](https://bun.sh/docs/cli/test)
