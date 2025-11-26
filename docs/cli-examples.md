# CLI Examples

Complete command-line examples for all use cases.

## Quick Start

### 1. Simple Load Test (No Config File)

Test a URL without creating a configuration file:

```bash
synapse test --url "https://api.example.com" --concurrent 10 --requests 100
```

**What it does:**
- Tests the URL with 10 concurrent users
- Makes 100 total requests
- Generates K6 script automatically
- Shows performance metrics

**Output:**
```
output/
├── test.js           # Generated K6 script
└── results.json      # Test results
```

---

## Screenshot Comparison

### 2. Screenshot Comparison (Compare-Only Mode)

Compare web pages without load testing:

```bash
synapse run --config examples/01-screenshot-comparison.yml --compare-only --save-screenshots
```

**What it does:**
- Skips load test (faster)
- Captures screenshots of both URLs
- Compares them pixel-by-pixel
- Saves screenshots to disk
- Generates comparison report

**Output:**
```
output/
├── screenshot-comparison-2025-11-26.csv
└── screenshots/
    ├── url1-1234567890.png
    └── url2-1234567890.png
```

**Report columns:**
```csv
Row,URL1,URL2,Similarity%,Screenshot1,Screenshot2
1,url1,url2,99.5,output/screenshots/url1-123.png,output/screenshots/url2-123.png
```

### 3. Screenshot Comparison with Load Test

Run load test AND comparison:

```bash
synapse run --config examples/01-screenshot-comparison.yml --compare --save-screenshots
```

**What it does:**
- Runs K6 load test first
- Then performs detailed screenshot comparison
- Saves screenshots for debugging
- Generates detailed report

**Output:**
```
output/
├── detailed-comparison-2025-11-26.csv
├── detailed-comparison-2025-11-26.json
├── comparison-summary-2025-11-26.json
└── screenshots/
    ├── url1-*.png
    └── url2-*.png
```

### 4. Mobile Screenshot Testing

Test mobile viewport:

```bash
synapse run --config examples/05-mobile-screenshot.yml --compare-only --save-screenshots
```

**What it does:**
- Uses mobile viewport (390x844)
- Captures mobile screenshots
- Compares mobile rendering
- Perfect for responsive design testing

---

## Visual-Text Comparison

### 5. Visual-Text Comparison

Compare both content AND rendering:

```bash
synapse run --config examples/02-visual-text-comparison.yml --compare-only --save-screenshots
```

**What it does:**
- Fetches HTML content from both URLs
- Compares text content (HTML source)
- Captures screenshots
- Compares visual rendering
- Reports both text match AND visual similarity

**Report columns:**
```csv
Row,TextMatch,TextSimilarity%,ScreenshotSimilarity%,VisualTextPassed,Screenshot1,Screenshot2
1,true,100,99.8,true,output/screenshots/url1-123.png,output/screenshots/url2-123.png
```

**Use case:** API-generated content where both data and rendering matter

---

## Image Comparison

### 6. Direct Image Comparison

Compare image URLs (fastest):

```bash
synapse run --config examples/03-image-comparison.yml --compare
```

**What it does:**
- Downloads images from both URLs
- Compares pixel-by-pixel
- No browser needed (faster than screenshots)
- Perfect for logos, charts, generated images

**Performance:**
- ~50-100ms per comparison
- Can handle 50-100 concurrent comparisons

---

## Text/API Comparison

### 7. API Response Comparison

Compare API responses:

```bash
synapse run --config examples/04-text-comparison.yml --compare
```

**What it does:**
- Fetches content from both APIs
- Compares text/JSON/HTML content
- No screenshots (fastest)
- Perfect for API validation

**Use case:** Validate API v1 vs v2 responses

---

## Batch Mode

### 8. Test URLs from CSV

Test specific URLs from a file:

```bash
synapse run --config examples/06-batch-mode.yml --compare --save-screenshots
```

**CSV file (data/urls.csv):**
```csv
url
/home
/about
/products
/contact
```

**What it does:**
- Reads URLs from CSV
- Tests each URL
- Compares with baseUrl2
- Perfect for regression testing

---

## Configuration Management

### 9. Initialize New Config

Create a new configuration file:

```bash
synapse init --name "My Test" --url "https://api.example.com"
```

**What it does:**
- Creates `synapse.yml` with basic config
- Pre-filled with your URL
- Ready to customize

**Generated file:**
```yaml
name: "My Test"
baseUrl: "https://api.example.com"
execution:
  mode: "construct"
  concurrent: 10
  iterations: 100
```

### 10. Validate Configuration

Check if config is valid:

```bash
synapse validate --config examples/01-screenshot-comparison.yml
```

**What it does:**
- Validates YAML syntax
- Checks required fields
- Validates parameter types
- Checks file paths (CSV files)

**Output:**
```
✅ Configuration is valid
```

### 11. Generate K6 Script

Generate script without running:

```bash
synapse generate --config examples/01-screenshot-comparison.yml --output test.js
```

**What it does:**
- Generates K6 script
- Saves to specified file
- Doesn't run the test
- Useful for inspection/debugging

---

## Debugging

### 12. Dry Run

Generate script without executing:

```bash
synapse run --config examples/01-screenshot-comparison.yml --dry-run
```

**What it does:**
- Validates config
- Generates K6 script
- Doesn't run K6
- Shows script location

**Output:**
```
🏃 Dry run mode - K6 script generated but not executed
📄 Script location: output/test.js
```

### 13. Keep Generated Script

Save K6 script after test:

```bash
synapse run --config examples/01-screenshot-comparison.yml --keep-script
```

**What it does:**
- Runs the test
- Keeps generated K6 script
- Useful for debugging
- Can run script manually with K6

### 14. Custom Output Directory

Specify output location:

```bash
synapse run --config examples/01-screenshot-comparison.yml --output ./my-results --save-screenshots
```

**What it does:**
- Saves all output to `./my-results/`
- Organizes test results
- Useful for CI/CD

---

## Advanced Usage

### 15. Standalone Comparison from CSV

Compare URLs without config file:

```bash
synapse compare --file urls.csv --type screenshot --save-screenshots
```

**CSV file (urls.csv):**
```csv
url1,url2
https://example.com/page1,https://example.org/page1
https://example.com/page2,https://example.org/page2
```

**What it does:**
- Reads URL pairs from CSV
- Compares each pair
- Generates report
- No load testing

**Options:**
```bash
# Image comparison
synapse compare --file urls.csv --type image

# Text comparison
synapse compare --file urls.csv --type text

# Screenshot with custom viewport
synapse compare --file urls.csv --type screenshot --viewport 1280x720

# Visual-text comparison
synapse compare --file urls.csv --type visual-text --save-screenshots
```

### 16. Custom Viewport

Specify viewport size:

```bash
synapse compare --file urls.csv --type screenshot --viewport 375x667 --save-screenshots
```

**Common viewports:**
- Desktop: `1920x1080`, `1366x768`
- Tablet: `768x1024`, `1024x768`
- Mobile: `375x667` (iPhone SE), `390x844` (iPhone 12)

### 17. Custom Threshold

Set comparison strictness:

```bash
synapse compare --file urls.csv --type screenshot --threshold 0.05 --save-screenshots
```

**Threshold values:**
- `0.01` - Very strict (1% difference)
- `0.05` - Strict (5% difference)
- `0.1` - Normal (10% difference)
- `0.2` - Lenient (20% difference)

### 18. Wait Strategy

Control page load waiting:

```bash
synapse compare --file urls.csv --type screenshot --wait-until load --save-screenshots
```

**Options:**
- `load` - Wait for page load event (faster)
- `networkidle` - Wait for network idle (more reliable)

---

## Workflow Examples

### 19. Complete Testing Workflow

```bash
# Step 1: Initialize config
synapse init --name "My Test" --url "https://api.example.com"

# Step 2: Validate config
synapse validate

# Step 3: Dry run to check script
synapse run --dry-run

# Step 4: Run test
synapse run

# Step 5: Run with comparison
synapse run --compare --save-screenshots

# Step 6: Review results
cat output/detailed-comparison-*.csv
open output/screenshots/
```

### 20. CI/CD Pipeline

```bash
# Run test and save results
synapse run --config test.yml --compare --save-screenshots --output ./results

# Check exit code
if [ $? -eq 0 ]; then
  echo "Test passed"
else
  echo "Test failed"
  exit 1
fi

# Archive results
tar -czf results.tar.gz ./results
```

### 21. Find and Review Mismatches

```bash
# Run comparison
synapse run --config test.yml --compare-only --save-screenshots

# Find rows with similarity < 95%
awk -F',' 'NR>1 && $15 < 95 {print "Row",$1,"Similarity:",$15"%","Screenshots:",$24,$25}' output/screenshot-comparison-*.csv

# Open specific screenshots
open output/screenshots/url1-1234567890.png
open output/screenshots/url2-1234567890.png

# Or open all screenshots
open output/screenshots/*.png
```

---

## Tips & Tricks

### Performance Optimization

```bash
# Use compare-only for faster comparison (no load test)
synapse run --config test.yml --compare-only

# Use image type for direct images (faster than screenshot)
synapse compare --file urls.csv --type image

# Reduce concurrent users for screenshot tests
# Edit config: concurrent: 5 (instead of 50)
```

### Debugging

```bash
# Always save screenshots when debugging
synapse run --config test.yml --compare --save-screenshots

# Keep script to inspect generated code
synapse run --config test.yml --keep-script

# Use dry-run to validate without running
synapse run --config test.yml --dry-run
```

### Organization

```bash
# Use descriptive output directories
synapse run --config test.yml --output ./results-$(date +%Y%m%d)

# Separate load test and comparison
synapse run --config test.yml                    # Load test only
synapse run --config test.yml --compare-only     # Comparison only
```

---

## Common Use Cases

### Use Case 1: UI Regression Testing

```bash
# Test staging vs production
synapse run --config examples/01-screenshot-comparison.yml --compare-only --save-screenshots

# Review mismatches
grep -v "100" output/screenshot-comparison-*.csv
```

### Use Case 2: API Version Migration

```bash
# Compare API v1 vs v2
synapse run --config examples/04-text-comparison.yml --compare

# Check for differences
cat output/detailed-comparison-*.csv
```

### Use Case 3: Mobile Responsive Testing

```bash
# Test mobile viewport
synapse run --config examples/05-mobile-screenshot.yml --compare-only --save-screenshots

# Review mobile screenshots
open output/screenshots/
```

### Use Case 4: Document Generation Validation

```bash
# Test PDF/document generation
synapse run --config examples/02-visual-text-comparison.yml --compare-only --save-screenshots

# Verify both content and rendering
cat output/screenshot-comparison-*.csv
```

---

## Help Commands

```bash
# General help
synapse --help

# Command-specific help
synapse run --help
synapse compare --help
synapse test --help
synapse validate --help
synapse generate --help
synapse init --help

# Version
synapse --version
```
