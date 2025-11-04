# Testing Guide for Synapse

This guide covers how to test the Synapse load testing tool comprehensively.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **K6** installed globally (for integration tests)
3. **npm** or **yarn**

## Installation for Testing

```bash
# Clone the repository
git clone <repository-url>
cd synapse

# Install dependencies
npm install

# Build the project
npm run build
```

## Unit Tests

Run the unit test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm test -- parameterGenerator.test.ts
```

## Integration Tests

### 1. CLI Command Tests

Test all CLI commands:

```bash
# Test initialization
node dist/cli.js init --name "Test API" --url "https://api.example.com"

# Test validation
node dist/cli.js validate --config synapse.yml

# Test script generation
node dist/cli.js generate --config synapse.yml --output test.js

# Test dry run
node dist/cli.js run --dry-run
```

### 2. Parameter Type Tests

Create test configurations for each parameter type:

#### Integer Parameters
```yaml
name: "Integer Test"
baseUrl: "https://httpbin.org/get"
execution:
  mode: "construct"
  concurrent: 2
  iterations: 5
parameters:
  - name: "userId"
    type: "integer"
    min: 1000
    max: 9999
    length: 6
```

#### String Parameters
```yaml
name: "String Test"
baseUrl: "https://httpbin.org/get"
execution:
  mode: "construct"
  concurrent: 2
  iterations: 5
parameters:
  - name: "sessionId"
    type: "string"
    length: 16
    charset: "alphanumeric"
```

#### Array Parameters
```yaml
name: "Array Test"
baseUrl: "https://httpbin.org/get"
execution:
  mode: "construct"
  concurrent: 2
  iterations: 5
parameters:
  - name: "category"
    type: "array"
    values: ["tech", "business", "health"]
```

#### CSV Parameters
Create a test CSV file:
```csv
region,code
us-east,USE
us-west,USW
eu-central,EUC
```

Configuration:
```yaml
name: "CSV Test"
baseUrl: "https://httpbin.org/get"
execution:
  mode: "construct"
  concurrent: 2
  iterations: 5
parameters:
  - name: "region"
    type: "csv"
    file: "./test-data.csv"
    column: "region"
```

### 3. Batch Mode Tests

Create test URLs CSV:
```csv
url,description
/users/1,Get user 1
/users/2,Get user 2
/posts/1,Get post 1
```

Configuration:
```yaml
name: "Batch Test"
baseUrl: "https://jsonplaceholder.typicode.com"
execution:
  mode: "batch"
  concurrent: 2
  duration: "10s"
batch:
  file: "./test-urls.csv"
  column: "url"
```

### 4. K6 Integration Tests

Test with actual K6 execution (requires K6 installed):

```bash
# Generate and run a simple test
node dist/cli.js run --config examples/api-test.yml --output ./test-results

# Check if results are generated
ls -la test-results/
```

## Performance Tests

Test Synapse's own performance:

### 1. Large Parameter Sets
```yaml
name: "Large Parameter Test"
baseUrl: "https://httpbin.org/get"
execution:
  mode: "construct"
  concurrent: 50
  iterations: 1000
parameters:
  - name: "id1"
    type: "integer"
    min: 1
    max: 1000000
  - name: "id2"
    type: "integer"
    min: 1
    max: 1000000
  - name: "category"
    type: "array"
    values: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]
```

### 2. Large CSV Files
Create CSV files with 10,000+ rows and test parameter generation performance.

## Error Handling Tests

### 1. Invalid Configurations
Test with intentionally broken configurations:

```yaml
# Missing required fields
name: "Broken Test"
# baseUrl missing
execution:
  mode: "construct"
```

```yaml
# Invalid parameter types
name: "Invalid Param Test"
baseUrl: "https://api.example.com"
execution:
  mode: "construct"
parameters:
  - name: "test"
    type: "invalid_type"
```

### 2. Missing Files
```yaml
name: "Missing File Test"
baseUrl: "https://api.example.com"
execution:
  mode: "construct"
parameters:
  - name: "data"
    type: "csv"
    file: "./nonexistent.csv"
    column: "value"
```

## Automated Testing Script

Create a comprehensive test script:

```bash
#!/bin/bash
# test-all.sh

echo "🧪 Running Synapse Test Suite"

# Unit tests
echo "📋 Running unit tests..."
npm test

# Build project
echo "🔨 Building project..."
npm run build

# CLI tests
echo "🖥️  Testing CLI commands..."
node dist/cli.js init --name "Test" --url "https://httpbin.org/get"
node dist/cli.js validate
node dist/cli.js generate --output test.js

# Parameter type tests
echo "🔢 Testing parameter types..."
# Add specific parameter tests here

# Integration tests
echo "🔗 Running integration tests..."
# Add K6 integration tests here

echo "✅ All tests completed!"
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Test Synapse

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build
    
    - name: Install K6
      run: |
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    
    - name: Test CLI
      run: |
        node dist/cli.js init --name "CI Test" --url "https://httpbin.org/get"
        node dist/cli.js validate
        node dist/cli.js generate --output test.js
```

## Manual Testing Checklist

- [ ] CLI commands work correctly
- [ ] All parameter types generate valid values
- [ ] Configuration validation catches errors
- [ ] K6 scripts are generated correctly
- [ ] Batch mode works with CSV files
- [ ] Error messages are helpful
- [ ] Performance is acceptable for large configurations
- [ ] Documentation examples work
- [ ] NPM package installs globally
- [ ] K6 integration works end-to-end
