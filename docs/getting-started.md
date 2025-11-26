# Getting Started

Complete guide to get started with Synapse in 5 minutes.

## Installation

### Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- K6 will be auto-installed on first run

### Install Synapse

```bash
npm install -g synapse
```

### Verify Installation

```bash
synapse --version
# Output: 1.0.0

synapse --help
# Shows available commands
```

---

## Quick Start (30 seconds)

### Test a URL Without Config

```bash
synapse test --url "https://example.com" --concurrent 10 --requests 100
```

**What happens:**
1. Generates K6 script automatically
2. Runs 100 requests with 10 concurrent users
3. Shows performance metrics
4. Saves results to `output/`

**Output:**
```
✅ Load test completed!
📊 Results: output/results.json
```

---

## Your First Config File (2 minutes)

### Step 1: Initialize Config

```bash
synapse init --name "My First Test" --url "https://api.example.com"
```

**Creates `synapse.yml`:**
```yaml
name: "My First Test"
baseUrl: "https://api.example.com"
execution:
  mode: "construct"
  concurrent: 10
  iterations: 100
```

### Step 2: Run the Test

```bash
synapse run
```

**Output:**
```
🔄 Starting Synapse Load Test...
📋 Loading configuration...
✅ Validating configuration...
🔧 Generating K6 script...
🚀 Running K6 load test...
✅ Load test completed!
```

---

## Screenshot Comparison (5 minutes)

### Step 1: Create Screenshot Config

```bash
cat > screenshot-test.yml << 'EOF'
name: "Screenshot Test"
baseUrl: "https://example.com"

execution:
  mode: "construct"
  iterations: 5

parameters:
  - name: "page"
    type: "array"
    values: ["home", "about"]

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://example.org"
  screenshot:
    viewport:
      width: 1920
      height: 1080
EOF
```

### Step 2: Run Comparison

```bash
synapse run --config screenshot-test.yml --compare-only --save-screenshots
```

### Step 3: Review Results

```bash
# View report
cat output/screenshot-comparison-*.csv

# Open screenshots
open output/screenshots/
```

**Report shows:**
- Similarity percentage
- Screenshot file paths
- Response times
- Status codes

---

## Understanding the Config

### Basic Structure

```yaml
# Test identification
name: "My Test"
description: "What this test does"

# URL to test
baseUrl: "https://api.example.com"

# How to run the test
execution:
  mode: "construct"      # or "batch"
  concurrent: 10         # parallel users
  iterations: 100        # total requests

# Dynamic parameters (optional)
parameters:
  - name: "param1"
    type: "array"
    values: ["value1", "value2"]

# Comparison (optional)
comparison:
  enabled: true
  type: "screenshot"     # or "image", "text", "visual-text"
  baseUrl2: "https://example.org"

# K6 options (optional)
k6Options:
  thresholds:
    http_req_duration: ["p(95)<1000"]
```

### Execution Modes

**Construct Mode** - Build URLs dynamically:
```yaml
execution:
  mode: "construct"
  iterations: 100

parameters:
  - name: "page"
    type: "array"
    values: ["home", "about"]

# Generates: /home, /about, /home, /about, ...
```

**Batch Mode** - Use pre-defined URLs:
```yaml
execution:
  mode: "batch"
  duration: "5m"

batch:
  file: "./urls.csv"
  column: "url"

# Uses URLs from CSV file
```

---

## Comparison Types

### 1. Screenshot Comparison

Compare web pages visually:

```yaml
comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://v2.example.com"
  screenshot:
    viewport:
      width: 1920
      height: 1080
```

**Use for:** UI testing, visual regression

### 2. Visual-Text Comparison

Compare content AND rendering:

```yaml
comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://v2.example.com"
```

**Use for:** API-generated content, documents

### 3. Image Comparison

Compare image URLs directly:

```yaml
comparison:
  enabled: true
  type: "image"
  baseUrl2: "https://cdn-v2.example.com"
```

**Use for:** Logos, charts, generated images

### 4. Text Comparison

Compare text/JSON content:

```yaml
comparison:
  enabled: true
  type: "text"
  baseUrl2: "https://api-v2.example.com"
```

**Use for:** API responses, HTML source

---

## Parameter Types

### Array - Pick from List

```yaml
- name: "category"
  type: "array"
  values: ["electronics", "books", "clothing"]
```

### Integer - Random Number

```yaml
- name: "userId"
  type: "integer"
  min: 1000
  max: 9999
```

### String - Random String

```yaml
- name: "sessionId"
  type: "string"
  length: 32
  charset: "alphanumeric"
```

### Static - Fixed Value

```yaml
- name: "apiKey"
  type: "static"
  value: "demo-key-12345"
```

### CSV - Load from File

```yaml
- name: "region"
  type: "csv"
  file: "./data/regions.csv"
  column: "code"
```

---

## Common Commands

### Run Tests

```bash
# Basic run
synapse run

# With config file
synapse run --config test.yml

# With comparison
synapse run --config test.yml --compare

# Comparison only (no load test)
synapse run --config test.yml --compare-only

# Save screenshots
synapse run --config test.yml --compare --save-screenshots
```

### Validate & Debug

```bash
# Validate config
synapse validate --config test.yml

# Dry run (don't execute)
synapse run --config test.yml --dry-run

# Keep generated script
synapse run --config test.yml --keep-script
```

### Standalone Comparison

```bash
# Compare from CSV
synapse compare --file urls.csv --type screenshot --save-screenshots

# Custom viewport
synapse compare --file urls.csv --type screenshot --viewport 375x667
```

---

## Examples

### Example 1: Simple API Test

```yaml
name: "API Test"
baseUrl: "https://api.example.com"

execution:
  mode: "construct"
  concurrent: 10
  iterations: 100

parameters:
  - name: "endpoint"
    type: "array"
    values: ["users", "posts", "comments"]
```

**Run:**
```bash
synapse run --config api-test.yml
```

### Example 2: Screenshot Comparison

```yaml
name: "UI Test"
baseUrl: "https://staging.example.com"

execution:
  mode: "construct"
  iterations: 10

parameters:
  - name: "page"
    type: "array"
    values: ["home", "about", "products"]

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://production.example.com"
  screenshot:
    viewport:
      width: 1920
      height: 1080
```

**Run:**
```bash
synapse run --config ui-test.yml --compare-only --save-screenshots
```

### Example 3: Mobile Testing

```yaml
name: "Mobile Test"
baseUrl: "https://m.example.com"

execution:
  mode: "construct"
  iterations: 5

parameters:
  - name: "page"
    type: "array"
    values: ["home", "menu", "cart"]

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://m-beta.example.com"
  screenshot:
    viewport:
      width: 390
      height: 844
```

**Run:**
```bash
synapse run --config mobile-test.yml --compare-only --save-screenshots
```

---

## Output Files

### Load Test Only

```
output/
├── test.js           # Generated K6 script
└── results.json      # Test results
```

### With Comparison

```
output/
├── detailed-comparison-{timestamp}.csv
├── detailed-comparison-{timestamp}.json
├── comparison-summary-{timestamp}.json
└── screenshots/
    ├── url1-{timestamp}.png
    └── url2-{timestamp}.png
```

---

## Next Steps

1. **Explore Examples** - Check `examples/` folder for more configs
2. **Read CLI Examples** - See [CLI Examples](cli-examples.md) for all commands
3. **Learn Comparison** - Read [Comparison Guide](comparison.md)
4. **Advanced Features** - Check [Parameter Types](parameter-types.md)

---

## Quick Reference

```bash
# Initialize
synapse init --name "Test" --url "https://example.com"

# Validate
synapse validate

# Run
synapse run

# Compare
synapse run --compare --save-screenshots

# Help
synapse --help
```

---

## Troubleshooting

### K6 Not Found

```bash
# K6 will auto-install on first run
# Or install manually:
brew install k6  # macOS
```

### Config Validation Error

```bash
# Check config syntax
synapse validate --config test.yml

# Common issues:
# - Missing required fields
# - Invalid parameter types
# - File paths don't exist
```

### Screenshots Not Saved

```bash
# Make sure to use --save-screenshots flag
synapse run --config test.yml --compare --save-screenshots

# Check if Puppeteer is installed
npm list puppeteer
```

---

## Support

- [Documentation](https://sthpratik.github.io/synapse)
- [Examples](examples.md)
- [CLI Reference](cli-reference.md)
- [GitHub Issues](https://github.com/sthpratik/synapse/issues)
