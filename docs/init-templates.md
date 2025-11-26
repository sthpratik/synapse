# Init Command Templates

Generate configuration files from templates using the `synapse init` command.

## Quick Start

```bash
# Basic template
synapse init --name "My Test" --url "https://api.example.com"

# Screenshot comparison template
synapse init --type screenshot --url "https://example.com"

# Mobile testing template
synapse init --type mobile --url "https://m.example.com"
```

## Available Templates

### 1. Basic (Default)

Simple load test without comparison.

```bash
synapse init --type basic --name "API Test" --url "https://api.example.com"
```

**Generated config:**
- Construct mode
- 10 concurrent users
- 100 iterations
- Integer parameter (id: 1-1000)
- Basic K6 thresholds

**Use for:** Simple load testing, API testing

---

### 2. Screenshot

Browser-based screenshot comparison.

```bash
synapse init --type screenshot --name "UI Test" --url "https://example.com"
```

**Generated config:**
- Screenshot comparison enabled
- Desktop viewport (1920x1080)
- Network idle wait strategy
- Array parameter (pages)
- baseUrl2 auto-generated (v2 subdomain)

**Use for:** UI regression testing, visual comparison

---

### 3. Visual-Text

Combined text content + screenshot comparison.

```bash
synapse init --type visual-text --name "Content Test" --url "https://api.example.com"
```

**Generated config:**
- Visual-text comparison enabled
- Document viewport (1280x720)
- Load wait strategy
- Integer parameter (id)
- Stricter threshold (0.05)

**Use for:** API-generated content, document validation

---

### 4. Image

Direct image comparison (no browser).

```bash
synapse init --type image --name "Image Test" --url "https://cdn.example.com"
```

**Generated config:**
- Image comparison enabled
- Multiple parameters (size, format)
- Higher concurrency (20 users)
- Very strict threshold (0.01)

**Use for:** Logo validation, chart comparison

---

### 5. Text

Text/API response comparison.

```bash
synapse init --type text --name "API Test" --url "https://api.example.com/v1"
```

**Generated config:**
- Text comparison enabled
- API-focused parameters (endpoint, id)
- High concurrency (30 users)
- Fast timeout (5s)

**Use for:** API response validation, JSON comparison

---

### 6. Mobile

Mobile viewport screenshot testing.

```bash
synapse init --type mobile --name "Mobile Test" --url "https://m.example.com"
```

**Generated config:**
- Screenshot comparison enabled
- Mobile viewport (390x844 - iPhone 12/13)
- Lower concurrency (3 users)
- Mobile-specific pages

**Use for:** Mobile UI testing, responsive design

---

### 7. Batch

Test URLs from CSV file.

```bash
synapse init --type batch --name "Batch Test" --url "https://example.com"
```

**Generated config:**
- Batch mode enabled
- Duration-based (5 minutes)
- CSV file reference
- Screenshot comparison

**Use for:** Regression testing, sitemap testing

**Note:** Requires `data/urls.csv` file

---

### 8. Advanced

All parameter types demonstration.

```bash
synapse init --type advanced --name "Advanced Test" --url "https://api.example.com"
```

**Generated config:**
- Multiple parameter types (array, integer, string, static)
- Complex URL construction
- Text comparison
- Realistic test data

**Use for:** Learning, complex scenarios

---

## Command Options

```bash
synapse init [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Test name | "My Load Test" |
| `-u, --url <url>` | Base URL | "https://api.example.com" |
| `-t, --type <type>` | Template type | "basic" |
| `-o, --output <path>` | Output file path | "synapse.yml" |

## Template Types

| Type | Comparison | Viewport | Use Case |
|------|------------|----------|----------|
| `basic` | None | - | Simple load testing |
| `screenshot` | Screenshot | 1920x1080 | UI regression |
| `visual-text` | Visual-Text | 1280x720 | Content validation |
| `image` | Image | - | Logo/chart testing |
| `text` | Text | - | API validation |
| `mobile` | Screenshot | 390x844 | Mobile testing |
| `batch` | Screenshot | 1920x1080 | URL list testing |
| `advanced` | Text | - | Complex scenarios |

## Examples

### Example 1: Create Screenshot Test

```bash
synapse init \
  --name "Staging vs Production" \
  --url "https://staging.example.com" \
  --type screenshot \
  --output staging-test.yml
```

**Output:**
```
✅ Created staging-test.yml configuration file
📝 Template type: screenshot
💡 Edit the file and run: synapse run
```

### Example 2: Create Mobile Test

```bash
synapse init \
  --name "Mobile UI Test" \
  --url "https://m.example.com" \
  --type mobile \
  --output mobile-test.yml
```

### Example 3: Create API Test

```bash
synapse init \
  --name "API v1 vs v2" \
  --url "https://api.example.com/v1" \
  --type text \
  --output api-test.yml
```

### Example 4: Create Multiple Configs

```bash
# Screenshot test
synapse init --type screenshot --output screenshot.yml

# Mobile test
synapse init --type mobile --output mobile.yml

# API test
synapse init --type text --output api.yml
```

## Customization

After generating, customize the config:

```bash
# Generate template
synapse init --type screenshot --output test.yml

# Edit
vim test.yml

# Validate
synapse validate --config test.yml

# Run
synapse run --config test.yml --compare-only --save-screenshots
```

## Common Customizations

### Change Viewport

```yaml
screenshot:
  viewport:
    width: 375    # iPhone SE
    height: 667
```

### Add More Parameters

```yaml
parameters:
  - name: "newParam"
    type: "array"
    values: ["value1", "value2"]
```

### Adjust Threshold

```yaml
comparison:
  threshold: 0.05  # 5% difference
```

### Change Concurrency

```yaml
execution:
  concurrent: 20  # More users
```

## Workflow

### 1. Generate Template

```bash
synapse init --type screenshot --url "https://example.com"
```

### 2. Customize

Edit `synapse.yml` to match your needs

### 3. Validate

```bash
synapse validate
```

### 4. Test

```bash
synapse run --dry-run
```

### 5. Execute

```bash
synapse run --compare --save-screenshots
```

## Tips

1. **Start with closest template** - Choose the template that matches your use case
2. **Customize URLs** - Update baseUrl and baseUrl2 for your environment
3. **Adjust parameters** - Modify parameters to match your API/pages
4. **Set thresholds** - Adjust comparison thresholds based on tolerance
5. **Test first** - Use `--dry-run` to verify before running

## Template Comparison

### For UI Testing

```bash
# Desktop
synapse init --type screenshot

# Mobile
synapse init --type mobile
```

### For API Testing

```bash
# Response comparison
synapse init --type text

# Content + rendering
synapse init --type visual-text
```

### For Image Testing

```bash
# Direct images
synapse init --type image

# Screenshots
synapse init --type screenshot
```

## Next Steps

1. **Generate template** - Choose appropriate type
2. **Customize config** - Edit for your needs
3. **Validate** - Check config is valid
4. **Run test** - Execute with comparison
5. **Review results** - Check reports and screenshots

## Support

- [Getting Started](getting-started.md)
- [CLI Examples](cli-examples.md)
- [Configuration Schema](config-schema.md)
- [Examples](../examples/)
