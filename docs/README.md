# Synapse Documentation

Welcome to Synapse - A powerful command-line tool for dynamic load testing with K6.

## What is Synapse?

Synapse generates K6 load testing scripts from simple YAML configurations, supporting:

- ✅ Dynamic URL construction with parameters
- ✅ Multiple parameter types (integer, string, array, CSV, static)
- ✅ Batch mode with pre-built URLs
- ✅ Full K6 feature integration
- ✅ **Screenshot comparison** with Puppeteer
- ✅ **Visual-text comparison** for comprehensive validation
- ✅ **Debug mode** with screenshot saving
- ✅ Automatic K6 installation

## Quick Start

### Installation

```bash
npm install -g synapse
```

### Simple Test

```bash
synapse test --url "https://api.example.com" --concurrent 10 --requests 100
```

### With Configuration

```bash
# Initialize
synapse init --name "My Test" --url "https://api.example.com"

# Run
synapse run
```

## Key Features

### 1. Dynamic URL Construction

```yaml
baseUrl: "https://api.example.com/search"
parameters:
  - name: "query"
    type: "array"
    values: ["javascript", "python", "react"]
  - name: "userId"
    type: "integer"
    min: 1000
    max: 9999
```

### 2. Screenshot Comparison ⭐ NEW

Compare web pages visually across versions:

```yaml
comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://v2.example.com"
  screenshot:
    viewport: { width: 1920, height: 1080 }
```

```bash
synapse run --config test.yml --compare --save-screenshots
```

### 3. Visual-Text Comparison ⭐ NEW

Validate both content AND rendering:

```yaml
comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://v2.example.com"
```

### 4. Debug Mode ⭐ NEW

Save screenshots for investigation:

```bash
synapse run --config test.yml --compare --save-screenshots
```

Output includes screenshot paths in CSV:
```csv
Row,Similarity%,Screenshot1,Screenshot2
1,99.5,output/screenshots/url1-123.png,output/screenshots/url2-123.png
```

## Comparison Types

| Type | Description | Use Case |
|------|-------------|----------|
| `image` | Direct image comparison | Static images, logos |
| `text` | Text/HTML comparison | API responses, HTML |
| `screenshot` | Browser screenshot | Web pages, UI testing |
| `visual-text` | Text + Screenshot | Content + rendering |

## Documentation

- [Getting Started](getting-started.md) - Installation and first test
- [CLI Reference](cli-reference.md) - Complete command reference
- [Comparison Features](comparison.md) - All comparison types
- [Screenshot Comparison](screenshot-comparison.md) - Screenshot testing guide
- [Debug Mode](debug-mode.md) - Screenshot saving and debugging
- [Parameter Types](parameter-types.md) - All parameter options
- [K6 Options](k6-options.md) - K6 configuration
- [Examples](examples.md) - Real-world examples

## Examples

### Screenshot Comparison

```yaml
name: "UI Regression Test"
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
    viewport: { width: 1920, height: 1080 }
```

### Visual-Text Comparison

```yaml
name: "API Content Validation"
baseUrl: "https://api-v1.example.com/render"
execution:
  mode: "construct"
  iterations: 50
parameters:
  - name: "template"
    type: "array"
    values: ["invoice", "receipt"]
comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://api-v2.example.com/render"
```

### Load Test with Comparison

```bash
# Run load test + screenshot comparison
synapse run --config test.yml --compare --save-screenshots

# Comparison only (no load test)
synapse run --config test.yml --compare-only --save-screenshots
```

## Features Overview

### Load Testing
- Concurrent users configuration
- Iterations or duration-based
- K6 scenarios and thresholds
- Custom K6 options

### Parameter Generation
- Integer ranges with padding
- String generation (alphanumeric, alpha, numeric, custom)
- Array values with random selection
- CSV data loading
- URL parameters with encoding
- Static values

### Comparison
- Image pixel comparison
- Text content comparison
- Browser screenshot comparison
- Combined visual-text validation
- Configurable thresholds
- Screenshot debugging

### Output
- K6 test results
- Comparison reports (CSV/JSON)
- Screenshot files
- Summary statistics
- Detailed metrics

## Requirements

- Node.js 16+
- K6 (auto-installed)
- Puppeteer (for screenshots)

## Installation

### Global

```bash
npm install -g synapse
```

### Local

```bash
npm install synapse
npx synapse --help
```

## Support

- [GitHub Issues](https://github.com/sthpratik/synapse/issues)
- [Documentation](https://sthpratik.github.io/synapse)
- [Examples](examples.md)

## License

MIT License - see [LICENSE](../LICENSE) file

## Contributing

See [Contributing Guide](contributing.md)
