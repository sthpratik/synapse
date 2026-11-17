# Synapse Examples

Complete example configurations with detailed comments.

## Quick Reference

| Example | Type | Use Case | Command |
|---------|------|----------|---------|
| [01-screenshot-comparison.yml](01-screenshot-comparison.yml) | Screenshot | UI regression testing | `synapse run --config 01-screenshot-comparison.yml --compare-only --save-screenshots` |
| [02-visual-text-comparison.yml](02-visual-text-comparison.yml) | Visual-Text | API content validation | `synapse run --config 02-visual-text-comparison.yml --compare-only --save-screenshots` |
| [03-image-comparison.yml](03-image-comparison.yml) | Image | Logo/chart validation | `synapse run --config 03-image-comparison.yml --compare` |
| [04-text-comparison.yml](04-text-comparison.yml) | Text | API response validation | `synapse run --config 04-text-comparison.yml --compare` |
| [05-mobile-screenshot.yml](05-mobile-screenshot.yml) | Screenshot | Mobile UI testing | `synapse run --config 05-mobile-screenshot.yml --compare-only --save-screenshots` |
| [06-batch-mode.yml](06-batch-mode.yml) | Batch | URL list testing | `synapse run --config 06-batch-mode.yml --compare --save-screenshots` |
| [07-advanced-parameters.yml](07-advanced-parameters.yml) | Advanced | All parameter types | `synapse run --config 07-advanced-parameters.yml --compare` |
| [08-auth-json-checks.yml](08-auth-json-checks.yml) | Auth/API | Bearer + JSON + checks | `synapse run --config 08-auth-json-checks.yml --dry-run` |
| [09-screenshot-masks-viewports.yml](09-screenshot-masks-viewports.yml) | Screenshot | Masks + multi-viewport | `synapse run --config 09-screenshot-masks-viewports.yml --compare-only --fail-on-diff` |

## Example Details

### 01 - Screenshot Comparison

**Purpose:** Compare web pages visually between two environments

**Features:**
- Dynamic URL construction
- Desktop viewport (1920x1080)
- Network idle wait strategy
- Screenshot saving

**Run:**
```bash
synapse run --config examples/01-screenshot-comparison.yml --compare-only --save-screenshots
```

**Output:**
- Screenshot comparison CSV
- Screenshots in `output/screenshots/`
- Similarity percentages

---

### 02 - Visual-Text Comparison

**Purpose:** Validate both HTML content AND visual rendering

**Features:**
- Text content comparison
- Screenshot comparison
- Combined validation
- Document viewport

**Run:**
```bash
synapse run --config examples/02-visual-text-comparison.yml --compare-only --save-screenshots
```

**Output:**
- Text match results
- Screenshot similarity
- Combined pass/fail status

---

### 03 - Image Comparison

**Purpose:** Direct pixel-by-pixel image comparison

**Features:**
- Fast comparison (no browser)
- Multiple image formats
- Ramping load scenarios
- Strict threshold (1%)

**Run:**
```bash
synapse run --config examples/03-image-comparison.yml --compare
```

**Output:**
- Image similarity scores
- Pixel difference counts
- Performance metrics

---

### 04 - Text Comparison

**Purpose:** Compare API responses or HTML content

**Features:**
- Text/JSON/XML comparison
- No screenshots (fastest)
- Constant load scenario
- API performance thresholds

**Run:**
```bash
synapse run --config examples/04-text-comparison.yml --compare
```

**Output:**
- Text match results
- Content differences
- API performance metrics

---

### 05 - Mobile Screenshot

**Purpose:** Test mobile responsive design

**Features:**
- Mobile viewport (390x844)
- iPhone 12/13 size
- Mobile-specific pages
- Network idle wait

**Run:**
```bash
synapse run --config examples/05-mobile-screenshot.yml --compare-only --save-screenshots
```

**Output:**
- Mobile screenshots
- Responsive design validation
- Mobile performance metrics

---

### 06 - Batch Mode

**Purpose:** Test specific URLs from CSV file

**Features:**
- Pre-defined URL list
- Duration-based execution
- CSV data source
- Regression testing

**CSV Format (data/urls.csv):**
```csv
url
/home
/about
/products
/contact
```

**Run:**
```bash
synapse run --config examples/06-batch-mode.yml --compare --save-screenshots
```

**Output:**
- Results for each URL
- Screenshot comparisons
- Batch test summary

---

### 07 - Advanced Parameters

**Purpose:** Demonstrate all parameter types

**Features:**
- Array parameters
- Integer ranges
- String generation
- Static values
- CSV data loading
- URL parameters
- Auto-encoding

**Run:**
```bash
synapse run --config examples/07-advanced-parameters.yml --compare
```

**Output:**
- Complex URL generation
- Parameter validation
- Realistic test data

---

## Common Workflows

### Workflow 1: UI Regression Testing

```bash
# 1. Run screenshot comparison
synapse run --config examples/01-screenshot-comparison.yml --compare-only --save-screenshots

# 2. Find mismatches
grep -v "100" output/screenshot-comparison-*.csv

# 3. Review screenshots
open output/screenshots/
```

### Workflow 2: API Version Migration

```bash
# 1. Compare API responses
synapse run --config examples/04-text-comparison.yml --compare

# 2. Check results
cat output/detailed-comparison-*.csv

# 3. Verify differences
jq . output/detailed-comparison-*.json
```

### Workflow 3: Mobile Testing

```bash
# 1. Test mobile viewport
synapse run --config examples/05-mobile-screenshot.yml --compare-only --save-screenshots

# 2. Review mobile screenshots
open output/screenshots/

# 3. Check similarity scores
awk -F',' 'NR>1 {print $1,$15}' output/screenshot-comparison-*.csv
```

---

## Customization Tips

### Change Viewport Size

Edit the `screenshot.viewport` section:

```yaml
screenshot:
  viewport:
    width: 375    # iPhone SE
    height: 667
```

**Common sizes:**
- Desktop: 1920x1080, 1366x768
- Tablet: 768x1024, 1024x768
- Mobile: 375x667, 390x844, 414x896

### Adjust Threshold

Edit the `threshold` value:

```yaml
comparison:
  threshold: 0.05  # 5% difference allowed
```

**Recommendations:**
- Images: 0.01 (1%)
- Screenshots: 0.1 (10%)
- Dynamic content: 0.2 (20%)

### Change Wait Strategy

Edit the `waitUntil` option:

```yaml
screenshot:
  waitUntil: "load"  # Faster, less reliable
  # or
  waitUntil: "networkidle"  # Slower, more reliable
```

### Add More Parameters

Add to the `parameters` section:

```yaml
parameters:
  - name: "newParam"
    type: "array"
    values: ["value1", "value2"]
```

---

## Required Data Files

Some examples require CSV data files:

### data/urls.csv (for batch mode)

```csv
url
/home
/about
/products
/contact
```

### data/regions.csv (for advanced parameters)

```csv
code,name
us-east,US East
us-west,US West
eu-west,EU West
```

### data/images.csv (for advanced parameters)

```csv
url
https://cdn.example.com/img1.jpg
https://cdn.example.com/img2.jpg
```

---

## Next Steps

1. **Copy an example** - Start with the closest match to your use case
2. **Customize** - Modify URLs, parameters, and thresholds
3. **Validate** - Run `synapse validate --config your-config.yml`
4. **Test** - Run with `--dry-run` first
5. **Execute** - Run the full test

---

## Support

- [Getting Started Guide](../docs/getting-started.md)
- [CLI Examples](../docs/cli-examples.md)
- [CLI Reference](../docs/cli-reference.md)
- [Comparison Guide](../docs/comparison.md)
