#!/usr/bin/env bash
set -e

echo "Running integration tests against LocalStack..."
echo "Note: Only testing services supported by LocalStack free tier"
echo ""

# Track failures
FAILED_TESTS=()

# Function to run a test and track result
run_test() {
  local test_file=$1
  local service_name=$2

  echo "Testing $service_name..."
  if bun test "$test_file"; then
    echo "✓ $service_name tests passed"
  else
    echo "✗ $service_name tests failed"
    FAILED_TESTS+=("$service_name")
  fi
  echo ""
}

# Run tests for LocalStack-supported services
# Note: AppRunner, RDS, Batch, AppConfig require LocalStack Pro or are not fully emulated

# Currently available integration tests:
# - AwsObjectStoreService (S3) - ✅ Supported
# - AwsDataStoreService (PostgreSQL/RDS) - ❌ Requires RDS (not in LocalStack free)
# - AwsWebHostingService (App Runner) - ❌ Requires Pro

# Core supported services (only test files that exist)
run_test "tests/integration/providers/aws/AwsObjectStoreService.test.ts" "S3 ObjectStore"

# TODO: Add these tests when implemented:
# run_test "tests/integration/providers/aws/AwsQueueService.test.ts" "SQS Queue"
# run_test "tests/integration/providers/aws/AwsNotificationService.test.ts" "SNS Notification"
# run_test "tests/integration/providers/aws/AwsEventBusService.test.ts" "EventBridge"
# run_test "tests/integration/providers/aws/AwsSecretsService.test.ts" "Secrets Manager"
# run_test "tests/integration/providers/aws/AwsDocumentStoreService.test.ts" "DynamoDB DocumentStore"

# Report results
echo "================================"
echo "Integration Test Summary"
echo "================================"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
  echo "✓ All LocalStack integration tests passed!"
  exit 0
else
  echo "✗ Some tests failed:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  echo "Note: Tests for AppRunner, RDS, Batch, and AppConfig are skipped"
  echo "as they require LocalStack Pro or are not fully supported."
  exit 1
fi
