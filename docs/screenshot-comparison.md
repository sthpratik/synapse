# Screenshot & Visual-Text Comparison

Synapse now supports browser-based screenshot comparison and combined visual-text comparison using K6's browser module.

## Comparison Types

| Type | Description | Use Case |
|------|-------------|----------|
| `image` | Direct image URL comparison | Compare static images, logos, charts |
| `text` | Text/HTML content comparison | Compare API responses, HTML source |
| `screenshot` | Browser screenshot comparison | Compare web page rendering |
| `visual-text` | Text + Screenshot comparison | Compare both content AND visual rendering |

## Screenshot Comparison

Compare how web pages render visually across different versions or environments.

### Configuration

```yaml
name: "Screenshot Comparison Test"
baseUrl: "https://v1.example.com"

execution:
  mode: "construct"
  concurrent: 5
  iterations: 20

parameters:
  - name: "page"
    type: "array"
    values: ["home", "about", "products"]

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://v2.example.com"
  threshold: 0.1  # 10% pixel difference allowed
  screenshot:
    viewport:
      width: 1920
      height: 1080
    waitUntil: "networkidle"  # or "load"
    timeout: 30000
```

### How It Works

1. K6 browser opens both URLs
2. Waits for page load (based on `waitUntil`)
3. Captures screenshots at specified viewport size
4. Compares screenshots pixel-by-pixel using pixelmatch
5. Reports similarity percentage and diff pixels

### Use Cases

- **Version comparison**: Compare old vs new UI
- **A/B testing**: Visual differences between variants
- **Cross-environment**: Staging vs production rendering
- **Responsive design**: Different viewport sizes

## Visual-Text Comparison

Compare both the HTML content AND visual rendering - perfect for catching CSS/rendering issues while ensuring content integrity.

### Configuration

```yaml
name: "Visual-Text Comparison"
baseUrl: "https://api.example.com/render"

execution:
  mode: "construct"
  concurrent: 10
  iterations: 50

parameters:
  - name: "template"
    type: "array"
    values: ["invoice", "receipt", "report"]

comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://api-v2.example.com/render"
  threshold: 0.05  # 5% visual difference allowed
  screenshot:
    viewport:
      width: 1280
      height: 720
    waitUntil: "load"
    timeout: 20000
```

### How It Works

1. Fetches HTML content from both URLs
2. Compares text content (HTML source)
3. Opens both URLs in browser
4. Captures screenshots
5. Compares screenshots visually
6. Reports both text match AND visual similarity

### Result Fields

```csv
TextMatch,TextSimilarity%,ScreenshotSimilarity%,ScreenshotDiffPixels,VisualTextPassed
true,100,99.8,120,true
false,85.3,99.9,50,false
true,100,94.2,3450,false
```

- `TextMatch`: HTML content identical (true/false)
- `TextSimilarity`: Text similarity percentage
- `ScreenshotSimilarity`: Visual similarity percentage
- `ScreenshotDiffPixels`: Number of different pixels
- `VisualTextPassed`: Both text AND visual passed thresholds

### Use Cases

- **API-generated content**: Ensure both data and rendering match
- **Template rendering**: Verify templates produce identical output
- **PDF/Document generation**: Content + layout verification
- **Email templates**: HTML + visual consistency

## Screenshot Configuration Options

### Viewport

Control browser window size:

```yaml
screenshot:
  viewport:
    width: 1920   # Desktop
    height: 1080
```

Common viewport sizes:
- Desktop: `1920x1080`, `1366x768`
- Tablet: `768x1024`, `1024x768`
- Mobile: `375x667`, `414x896`

### Wait Strategy

Control when to capture screenshot:

```yaml
screenshot:
  waitUntil: "networkidle"  # or "load"
```

- `load`: Wait for page load event (faster)
- `networkidle`: Wait for network to be idle (more reliable for dynamic content)

### Timeout

Maximum wait time for page load:

```yaml
screenshot:
  timeout: 30000  # 30 seconds
```

## Running Screenshot Comparisons

### During Load Test

```bash
# Run load test with comparison
synapse run --config screenshot-test.yml --compare

# Comparison only (no load test)
synapse run --config screenshot-test.yml --compare-only
```

### Standalone Comparison

```bash
# Compare URLs from CSV
synapse compare --file urls.csv --type screenshot
```

## Report Output

### CSV Report

```csv
Row,URL1,URL2,Success,ResponseTime(ms),URL1_Status,URL2_Status,Width1,Height1,Width2,Height2,ScreenshotDiffPixels,ScreenshotSimilarity%,Error
1,https://v1.example.com/home,https://v2.example.com/home,true,2450,200,200,1920,1080,1920,1080,234,99.2,
2,https://v1.example.com/about,https://v2.example.com/about,true,2100,200,200,1920,1080,1920,1080,0,100,
```

### Visual-Text Report

```csv
Row,URL1,URL2,TextMatch,TextSimilarity%,ScreenshotSimilarity%,ScreenshotDiffPixels,VisualTextPassed
1,url1,url2,true,100,99.8,120,true
2,url1,url2,false,85.3,99.9,50,false
```

## Prerequisites

### K6 Browser Module

Screenshot comparison requires K6 with browser support:

```bash
# K6 v0.43.0+ includes browser module
k6 version

# Test browser support
k6 run --help | grep browser
```

### System Requirements

- Chromium (installed automatically by K6)
- Sufficient memory for browser instances
- Display server (for headless mode)

## Performance Considerations

### Resource Usage

Screenshot comparison is more resource-intensive than direct image comparison:

- **Memory**: ~100-200MB per browser instance
- **CPU**: Higher during page rendering
- **Time**: 2-5 seconds per comparison (vs <100ms for direct images)

### Optimization Tips

1. **Reduce concurrent users** for screenshot tests:
   ```yaml
   concurrent: 5  # Instead of 50
   ```

2. **Use appropriate wait strategy**:
   ```yaml
   waitUntil: "load"  # Faster than "networkidle"
   ```

3. **Set reasonable timeouts**:
   ```yaml
   timeout: 20000  # Don't wait too long
   ```

4. **Batch comparisons**:
   ```bash
   # Compare-only mode for large batches
   synapse run --compare-only
   ```

## Troubleshooting

### Browser Launch Failed

```
Error: Screenshot capture failed: Browser launch failed
```

**Solution**: Ensure K6 browser module is available:
```bash
k6 version  # Check version >= 0.43.0
```

### Timeout Errors

```
Error: Screenshot capture failed: Timeout
```

**Solutions**:
- Increase timeout: `screenshot.timeout: 60000`
- Use faster wait strategy: `waitUntil: "load"`
- Check if URLs are accessible

### Memory Issues

```
Error: Out of memory
```

**Solutions**:
- Reduce concurrent users
- Reduce viewport size
- Run in batches

## Examples

### Compare Staging vs Production

```yaml
name: "Staging vs Production"
baseUrl: "https://staging.example.com"
comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://production.example.com"
```

### Mobile Viewport Comparison

```yaml
comparison:
  type: "screenshot"
  screenshot:
    viewport:
      width: 375
      height: 667
```

### Fast Load Comparison

```yaml
comparison:
  type: "screenshot"
  screenshot:
    waitUntil: "load"
    timeout: 10000
```

### Strict Visual-Text Validation

```yaml
comparison:
  type: "visual-text"
  threshold: 0.01  # 1% difference allowed
```

## Best Practices

1. **Start with small iterations** to test configuration
2. **Use appropriate viewport** for your use case
3. **Set realistic thresholds** (5-10% for dynamic content)
4. **Monitor resource usage** during tests
5. **Use compare-only mode** for large comparison batches
6. **Combine with load testing** for performance + visual validation
