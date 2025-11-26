# Debug Mode - Screenshot Saving

Save screenshots during comparison for debugging and validation.

## Overview

When running screenshot or visual-text comparisons, you can save the captured screenshots to disk for later inspection using the `--save-screenshots` flag.

## Usage

### With Run Command

```bash
synapse run --config test.yml --compare --save-screenshots
```

### With Compare Command

```bash
synapse compare --file urls.csv --type screenshot --save-screenshots
```

## Output Structure

Screenshots are saved in the output directory:

```
output/
├── screenshots/
│   ├── url1-1732645200000.png
│   ├── url2-1732645200000.png
│   ├── url1-1732645201000.png
│   ├── url2-1732645201000.png
│   └── ...
├── detailed-comparison-2025-11-26_10-30-00.csv
└── comparison-summary-2025-11-26_10-30-00.json
```

## File Naming

Screenshots are named with:
- `url1-{timestamp}.png` - First URL screenshot
- `url2-{timestamp}.png` - Second URL screenshot

Timestamp is in milliseconds for unique identification.

## Use Cases

### 1. Visual Debugging

Compare screenshots side-by-side to understand differences:

```bash
synapse run --config test.yml --compare --save-screenshots

# Check screenshots
open output/screenshots/url1-*.png
open output/screenshots/url2-*.png
```

### 2. Test Validation

Verify that screenshots are captured correctly:

```bash
synapse compare --file urls.csv --type screenshot --save-screenshots --output ./debug
```

### 3. Regression Testing

Keep screenshots for historical comparison:

```bash
# Run test and save screenshots
synapse run --config test.yml --compare --save-screenshots --output ./results-v1

# Later, compare with new version
synapse run --config test.yml --compare --save-screenshots --output ./results-v2

# Manually compare screenshot folders
diff -r results-v1/screenshots results-v2/screenshots
```

### 4. CI/CD Artifacts

Save screenshots as build artifacts:

```yaml
# GitHub Actions
- name: Run comparison with screenshots
  run: synapse run --config test.yml --compare --save-screenshots

- name: Upload screenshots
  uses: actions/upload-artifact@v3
  with:
    name: comparison-screenshots
    path: output/screenshots/
```

## Configuration Examples

### Screenshot Comparison with Debug

```yaml
name: "Debug Screenshot Test"
baseUrl: "https://v1.example.com"

execution:
  mode: "construct"
  concurrent: 2
  iterations: 5

comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://v2.example.com"
  screenshot:
    viewport:
      width: 1920
      height: 1080
```

Run with:
```bash
synapse run --config test.yml --compare --save-screenshots
```

### Visual-Text with Screenshots

```yaml
comparison:
  enabled: true
  type: "visual-text"
  baseUrl2: "https://v2.example.com"
```

Run with:
```bash
synapse run --config test.yml --compare --save-screenshots
```

## CLI Options

### Run Command

```bash
synapse run [options]

Options:
  --save-screenshots   Save screenshots during comparison (debug mode)
```

### Compare Command

```bash
synapse compare [options]

Options:
  --save-screenshots       Save screenshots to output directory (debug mode)
  --viewport <size>        Viewport size (default: "1920x1080")
  --wait-until <strategy>  Wait strategy: load | networkidle (default: "networkidle")
  -t, --type <type>        Comparison type: image | text | screenshot | visual-text
```

## Performance Impact

Saving screenshots has minimal performance impact:

- **Storage**: ~100-500KB per screenshot (PNG format)
- **Time**: <10ms additional per comparison
- **Memory**: No additional memory usage (writes directly to disk)

## Disk Space Considerations

Calculate required disk space:

```
Screenshots per comparison: 2
Average size per screenshot: 300KB
Total comparisons: 100

Required space = 2 × 300KB × 100 = 60MB
```

For large test runs, monitor disk space:

```bash
# Check output directory size
du -sh output/screenshots/

# Clean old screenshots
rm -rf output/screenshots/*.png
```

## Troubleshooting

### Screenshots Not Saved

**Issue:** `--save-screenshots` flag used but no screenshots in output

**Solutions:**
1. Check comparison type is `screenshot` or `visual-text`
2. Verify output directory is writable
3. Ensure K6 browser module is working

### Permission Denied

**Issue:** Cannot write to screenshots directory

**Solution:**
```bash
# Create directory with proper permissions
mkdir -p output/screenshots
chmod 755 output/screenshots
```

### Large Disk Usage

**Issue:** Screenshots consuming too much disk space

**Solutions:**
1. Reduce iterations in config
2. Clean screenshots after each run
3. Use `--compare-only` for targeted testing

## Best Practices

1. **Use for debugging only** - Don't save screenshots in production load tests
2. **Clean regularly** - Remove old screenshots to save disk space
3. **Organize by test run** - Use different output directories for each run
4. **Archive important screenshots** - Move critical screenshots to separate folder
5. **CI/CD artifacts** - Upload screenshots as build artifacts for review

## Example Workflow

```bash
# 1. Run test with screenshots
synapse run --config test.yml --compare --save-screenshots --output ./run-$(date +%Y%m%d-%H%M%S)

# 2. Review screenshots
open ./run-*/screenshots/

# 3. Archive if needed
tar -czf screenshots-backup.tar.gz ./run-*/screenshots/

# 4. Clean up
rm -rf ./run-*/screenshots/
```

## Integration with Reports

Screenshots are saved alongside comparison reports:

```
output/
├── screenshots/              # Debug screenshots
├── detailed-comparison.csv   # Detailed metrics
└── comparison-summary.json   # Summary statistics
```

Cross-reference CSV rows with screenshots using timestamps.
