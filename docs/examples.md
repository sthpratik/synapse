# Examples

Real-world examples for common use cases.

## Basic Load Test

```yaml
name: "Simple API Test"
baseUrl: "https://api.example.com"

execution:
  mode: "construct"
  concurrent: 10
  iterations: 100

parameters:
  - name: "endpoint"
    type: "array"
    values: ["users", "posts", "comments"]

k6Options:
  thresholds:
    http_req_duration: ["p(95)<500"]
```

## Screenshot Comparison

### UI Regression Test

```yaml
name: "UI Regression Test"
baseUrl: "https://staging.example.com"

execution:
  mode: "construct"
  concurrent: 5
  iterations: 20

parameters:
  - name: "page"
    type: "array"
    values: ["home", "about", "products", "contact"]

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://production.example.com"
  threshold: 0.1
  screenshot:
    viewport:
      width: 1920
      height: 1080
    waitUntil: "networkidle"
    timeout: 30000

k6Options:
  thresholds:
    http_req_duration: ["p(95)<2000"]
```

**Run:**
```bash
synapse run --config ui-regression.yml --compare --save-screenshots
```

### Mobile Viewport Test

```yaml
name: "Mobile UI Test"
baseUrl: "https://m.example.com"

execution:
  mode: "construct"
  iterations: 10

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
      width: 375
      height: 667
    waitUntil: "load"
```

## Visual-Text Comparison

### API Content Validation

```yaml
name: "API Content Validation"
baseUrl: "https://api-v1.example.com/render"

execution:
  mode: "construct"
  concurrent: 10
  iterations: 50

parameters:
  - name: "template"
    type: "array"
    values: ["invoice", "receipt", "report"]
  - name: "id"
    type: "integer"
    min: 1000
    max: 9999

comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://api-v2.example.com/render"
  threshold: 0.05
  screenshot:
    viewport:
      width: 1280
      height: 720
    waitUntil: "load"
    timeout: 20000
```

**Run:**
```bash
synapse run --config api-validation.yml --compare-only --save-screenshots
```

### Email Template Test

```yaml
name: "Email Template Validation"
baseUrl: "https://email-preview.example.com"

execution:
  mode: "construct"
  iterations: 20

parameters:
  - name: "template"
    type: "array"
    values: ["welcome", "reset-password", "invoice", "notification"]
  - name: "locale"
    type: "array"
    values: ["en", "es", "fr", "de"]

comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://email-preview-v2.example.com"
  threshold: 0.02
  screenshot:
    viewport:
      width: 600
      height: 800
```

## Image Comparison

### Logo Validation

```yaml
name: "Logo Comparison"
baseUrl: "https://cdn.example.com/logos"

execution:
  mode: "construct"
  iterations: 10

parameters:
  - name: "size"
    type: "array"
    values: ["small", "medium", "large"]
  - name: "format"
    type: "array"
    values: ["png", "svg", "webp"]

comparison:
  enabled: true
  type: "image"
  baseUrl2: "https://cdn-v2.example.com/logos"
  threshold: 0.01
```

## Dynamic Parameters

### E-commerce Search

```yaml
name: "E-commerce Search Test"
baseUrl: "https://shop.example.com/search"

execution:
  mode: "construct"
  concurrent: 20
  iterations: 100

parameters:
  - name: "q"
    type: "array"
    values: ["laptop", "phone", "tablet", "headphones"]
  - name: "category"
    type: "array"
    values: ["electronics", "computers", "accessories"]
  - name: "minPrice"
    type: "integer"
    min: 100
    max: 500
  - name: "maxPrice"
    type: "integer"
    min: 1000
    max: 5000
  - name: "sort"
    type: "array"
    values: ["price-asc", "price-desc", "rating", "newest"]

k6Options:
  thresholds:
    http_req_duration: ["p(95)<1000"]
    http_req_failed: ["rate<0.01"]
```

### User Session Simulation

```yaml
name: "User Session Test"
baseUrl: "https://app.example.com"

execution:
  mode: "construct"
  concurrent: 50
  duration: "5m"

parameters:
  - name: "userId"
    type: "integer"
    min: 10000
    max: 99999
    length: 5
  - name: "sessionId"
    type: "string"
    length: 32
    charset: "alphanumeric"
  - name: "action"
    type: "array"
    values: ["view", "edit", "save", "delete"]

k6Options:
  scenarios:
    normal_load:
      executor: "ramping-vus"
      stages:
        - duration: "1m"
          target: 10
        - duration: "3m"
          target: 50
        - duration: "1m"
          target: 0
```

## CSV Data Source

### Batch URL Testing

```yaml
name: "Batch URL Test"
baseUrl: "https://example.com"

execution:
  mode: "batch"
  concurrent: 10
  duration: "2m"

batch:
  file: "./data/urls.csv"
  column: "url"

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://beta.example.com"
  screenshot:
    viewport:
      width: 1920
      height: 1080
```

**urls.csv:**
```csv
url
/home
/about
/products
/contact
```

## Advanced Scenarios

### Stress Test with Comparison

```yaml
name: "Stress Test"
baseUrl: "https://api.example.com"

execution:
  mode: "construct"
  concurrent: 100
  iterations: 1000

parameters:
  - name: "endpoint"
    type: "array"
    values: ["users", "posts", "comments"]

comparison:
  enabled: true
  type: "image"
  baseUrl2: "https://api-v2.example.com"

k6Options:
  scenarios:
    stress:
      executor: "ramping-vus"
      stages:
        - duration: "2m"
          target: 10
        - duration: "5m"
          target: 50
        - duration: "2m"
          target: 100
        - duration: "5m"
          target: 100
        - duration: "2m"
          target: 0
  thresholds:
    http_req_duration: ["p(95)<2000", "p(99)<5000"]
    http_req_failed: ["rate<0.05"]
```

### Multi-Region Test

```yaml
name: "Multi-Region Test"
baseUrl: "https://us.example.com"

execution:
  mode: "construct"
  concurrent: 20
  iterations: 100

parameters:
  - name: "region"
    type: "array"
    values: ["us-east", "us-west", "eu-west", "ap-south"]
  - name: "endpoint"
    type: "array"
    values: ["api/users", "api/data", "api/metrics"]

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://eu.example.com"
  screenshot:
    viewport:
      width: 1920
      height: 1080
```

## Debugging Examples

### Save Screenshots for Review

```bash
# Run with screenshot saving
synapse run --config test.yml --compare --save-screenshots

# Find mismatches
awk -F',' '$18 < 95 {print $1,$18,$24,$25}' output/detailed-comparison-*.csv

# Open specific screenshots
open output/screenshots/url1-1234567890.png
open output/screenshots/url2-1234567890.png
```

### Comparison Only Mode

```bash
# Skip load test, just compare
synapse run --config test.yml --compare-only --save-screenshots

# Faster for debugging
synapse run --config test.yml --compare-only --save-screenshots -o ./debug
```

## Tips

1. **Start small** - Use 1-2 iterations for initial testing
2. **Use dry-run** - Verify script generation first
3. **Save screenshots** - Always use `--save-screenshots` for debugging
4. **Set thresholds** - Adjust based on your tolerance for differences
5. **Monitor resources** - Watch memory/CPU during screenshot tests
6. **Batch processing** - Use `--compare-only` for large comparison sets
