# Init Command - Template Generator

## Quick Reference

Generate configuration files from templates:

```bash
synapse init --type <template> --url <your-url>
```

## Available Templates

| Template | Command | Use Case |
|----------|---------|----------|
| `basic` | `synapse init --type basic` | Simple load testing |
| `screenshot` | `synapse init --type screenshot` | UI regression testing |
| `visual-text` | `synapse init --type visual-text` | Content + rendering validation |
| `image` | `synapse init --type image` | Logo/chart comparison |
| `text` | `synapse init --type text` | API response validation |
| `mobile` | `synapse init --type mobile` | Mobile UI testing |
| `batch` | `synapse init --type batch` | URL list testing |
| `advanced` | `synapse init --type advanced` | Complex scenarios |

## Examples

### Screenshot Comparison

```bash
synapse init \
  --name "UI Test" \
  --url "https://example.com" \
  --type screenshot \
  --output ui-test.yml
```

**Generates:**
- Desktop viewport (1920x1080)
- Screenshot comparison enabled
- Network idle wait strategy
- Ready to run

**Run:**
```bash
synapse run --config ui-test.yml --compare-only --save-screenshots
```

### Mobile Testing

```bash
synapse init \
  --name "Mobile Test" \
  --url "https://m.example.com" \
  --type mobile \
  --output mobile-test.yml
```

**Generates:**
- Mobile viewport (390x844)
- iPhone 12/13 size
- Screenshot comparison
- Mobile-optimized settings

### API Testing

```bash
synapse init \
  --name "API Test" \
  --url "https://api.example.com/v1" \
  --type text \
  --output api-test.yml
```

**Generates:**
- Text comparison
- API-focused parameters
- High concurrency
- Fast timeouts

### Visual-Text Comparison

```bash
synapse init \
  --name "Content Test" \
  --url "https://api.example.com/render" \
  --type visual-text \
  --output content-test.yml
```

**Generates:**
- Text + screenshot comparison
- Document viewport
- Combined validation
- Stricter threshold

## Options

```bash
-n, --name <name>      Test name (default: "My Load Test")
-u, --url <url>        Base URL (default: "https://api.example.com")
-t, --type <type>      Template type (default: "basic")
-o, --output <path>    Output file (default: "synapse.yml")
```

## Workflow

```bash
# 1. Generate
synapse init --type screenshot --url "https://example.com"

# 2. Validate
synapse validate

# 3. Test
synapse run --dry-run

# 4. Execute
synapse run --compare --save-screenshots
```

## Template Features

### Screenshot Template
- ✅ Desktop viewport
- ✅ Screenshot comparison
- ✅ Network idle wait
- ✅ Page parameters

### Mobile Template
- ✅ Mobile viewport (390x844)
- ✅ Screenshot comparison
- ✅ Lower concurrency
- ✅ Mobile pages

### Visual-Text Template
- ✅ Text + screenshot
- ✅ Document viewport
- ✅ Combined validation
- ✅ Strict threshold

### Image Template
- ✅ Direct comparison
- ✅ No browser (fast)
- ✅ Multiple formats
- ✅ Very strict threshold

### Text Template
- ✅ API comparison
- ✅ High concurrency
- ✅ Fast timeout
- ✅ No screenshots

### Batch Template
- ✅ CSV URLs
- ✅ Duration-based
- ✅ Screenshot comparison
- ✅ Regression testing

### Advanced Template
- ✅ All parameter types
- ✅ Complex URLs
- ✅ Learning example
- ✅ Text comparison

## Tips

1. **Choose right template** - Match your use case
2. **Customize after generation** - Edit for your needs
3. **Validate before running** - Check config is valid
4. **Use dry-run** - Test without executing
5. **Save screenshots** - Use `--save-screenshots` for debugging

## Documentation

- Full guide: [docs/init-templates.md](docs/init-templates.md)
- CLI examples: [docs/cli-examples.md](docs/cli-examples.md)
- Getting started: [docs/getting-started.md](docs/getting-started.md)
