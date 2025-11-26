# Comparison Features

Synapse supports multiple comparison types for validating consistency across different versions or environments.

## Comparison Types

### 1. Image Comparison

Direct pixel-by-pixel comparison of image URLs.

```yaml
comparison:
  enabled: true
  type: "image"
  baseUrl2: "https://v2.example.com"
  threshold: 0.1
```

**Use Cases:**
- Compare static images
- Validate image generation
- Check for visual regressions

### 2. Text Comparison

Compare text/HTML content.

```yaml
comparison:
  enabled: true
  type: "text"
  baseUrl2: "https://v2.example.com"
```

**Use Cases:**
- API response validation
- HTML content comparison
- JSON output verification

### 3. Screenshot Comparison ⭐ NEW

Browser-based screenshot comparison using Puppeteer.

```yaml
comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://v2.example.com"
  threshold: 0.1
  screenshot:
    viewport:
      width: 1920
      height: 1080
    waitUntil: "networkidle"
    timeout: 30000
```

**Use Cases:**
- Web page visual comparison
- UI regression testing
- Cross-version validation
- Responsive design testing

### 4. Visual-Text Comparison ⭐ NEW

Combined text content + screenshot comparison.

```yaml
comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://v2.example.com"
  threshold: 0.05
  screenshot:
    viewport:
      width: 1280
      height: 720
    waitUntil: "load"
```

**Use Cases:**
- API-generated content validation
- Template rendering verification
- Document generation testing
- Email template validation

## Configuration Options

### Basic Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `enabled` | boolean | Enable comparison | `false` |
| `type` | string | Comparison type | `image` |
| `baseUrl2` | string | Second URL to compare | Required |
| `threshold` | number | Difference threshold (0-1) | `0.1` |
| `timeout` | number | Request timeout (ms) | `30000` |

### Screenshot Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `viewport.width` | number | Browser width | `1920` |
| `viewport.height` | number | Browser height | `1080` |
| `waitUntil` | string | Wait strategy | `networkidle` |
| `timeout` | number | Page load timeout | `30000` |

**Wait Strategies:**
- `load` - Wait for page load event (faster)
- `networkidle` - Wait for network idle (more reliable)

## Running Comparisons

### During Load Test

```bash
# Run load test + comparison
synapse run --config test.yml --compare

# Save screenshots for debugging
synapse run --config test.yml --compare --save-screenshots
```

### Comparison Only

```bash
# Skip load test, run comparison only
synapse run --config test.yml --compare-only

# With screenshots
synapse run --config test.yml --compare-only --save-screenshots
```

### Standalone Comparison

```bash
# Compare from CSV file
synapse compare --file urls.csv --type screenshot --save-screenshots
```

## Output Files

### Load Test + Comparison

```
output/
├── detailed-comparison-{timestamp}.csv    # Detailed results
├── detailed-comparison-{timestamp}.json   # JSON format
├── comparison-summary-{timestamp}.json    # Summary stats
└── screenshots/                           # Debug screenshots
    ├── url1-{timestamp}.png
    └── url2-{timestamp}.png
```

### Comparison Only

```
output/
├── screenshot-comparison-{timestamp}.csv  # Results
└── screenshots/                           # Screenshots
    ├── url1-{timestamp}.png
    └── url2-{timestamp}.png
```

## Report Format

### Screenshot Comparison CSV

```csv
Row,URL1,URL2,Success,Similarity%,Screenshot1,Screenshot2
1,url1,url2,true,99.5,output/screenshots/url1-123.png,output/screenshots/url2-123.png
```

### Visual-Text Comparison CSV

```csv
Row,URL1,URL2,TextMatch,TextSimilarity%,ScreenshotSimilarity%,VisualTextPassed,Screenshot1,Screenshot2
1,url1,url2,true,100,99.8,true,output/screenshots/url1-123.png,output/screenshots/url2-123.png
```

## Examples

### Screenshot Comparison

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
```

### Visual-Text Comparison

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
```

### Mobile Viewport

```yaml
comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://mobile.example.com"
  screenshot:
    viewport:
      width: 375
      height: 667
    waitUntil: "load"
```

## Debugging with Screenshots

### Save Screenshots

```bash
synapse run --config test.yml --compare --save-screenshots
```

### Review Mismatches

```bash
# Find rows with low similarity
awk -F',' '$15 < 95 {print $1,$15,$24,$25}' output/detailed-comparison-*.csv

# Open screenshots
open output/screenshots/url1-*.png
open output/screenshots/url2-*.png
```

### Batch Review

```bash
# Open all screenshots
open output/screenshots/*.png
```

## Performance Considerations

### Screenshot Comparison

- **Time**: 2-5 seconds per comparison
- **Memory**: ~100-200MB per browser instance
- **Recommended concurrent users**: 2-10

### Direct Image Comparison

- **Time**: 50-100ms per comparison
- **Memory**: Minimal
- **Recommended concurrent users**: 50-100

### Tips

1. Use `screenshot` for web pages
2. Use `image` for direct image URLs (faster)
3. Use `visual-text` when both content and rendering matter
4. Reduce concurrent users for screenshot tests
5. Use `--compare-only` for large comparison batches

## Thresholds

### Image/Screenshot Threshold

Value between 0-1 representing acceptable pixel difference:

- `0.01` - Very strict (1% difference)
- `0.05` - Strict (5% difference)
- `0.1` - Normal (10% difference)
- `0.2` - Lenient (20% difference)

### Similarity Percentage

Report shows similarity as percentage:

- `100%` - Identical
- `99-95%` - Minor differences
- `95-90%` - Noticeable differences
- `<90%` - Significant differences

## Troubleshooting

### Screenshots Not Captured

**Issue**: Screenshots not saved even with `--save-screenshots`

**Solution**: Ensure Puppeteer is installed:
```bash
npm install puppeteer
```

### Timeout Errors

**Issue**: Screenshot capture timeout

**Solutions**:
- Increase timeout: `screenshot.timeout: 60000`
- Use faster wait: `waitUntil: "load"`
- Check URL accessibility

### Memory Issues

**Issue**: Out of memory during screenshot tests

**Solutions**:
- Reduce concurrent users
- Reduce viewport size
- Run in smaller batches

## Best Practices

1. **Start small** - Test with 1-2 iterations first
2. **Use appropriate type** - Choose the right comparison type
3. **Set realistic thresholds** - Account for dynamic content
4. **Save screenshots** - Use `--save-screenshots` for debugging
5. **Monitor resources** - Watch memory and CPU usage
6. **Batch large tests** - Use `--compare-only` for efficiency
