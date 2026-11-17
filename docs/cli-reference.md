# CLI Reference

Complete command-line interface reference for Synapse.

## Commands

### `synapse run`

Run load test from configuration file.

```bash
synapse run [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to configuration file | `synapse.yml` |
| `-o, --output <path>` | Output directory | `./output` |
| `--dry-run` | Generate script without running | - |
| `--keep-script` | Keep generated K6 script | - |
| `--compare` | Run comparison if enabled | - |
| `--compare-only` | Run only comparison (skip load test) | - |
| `--save-screenshots` | Save screenshots during comparison | - |
| `--fail-on-diff` | Exit code 3 when comparison thresholds fail | - |

**Examples:**

```bash
# Basic run
synapse run --config test.yml

# Dry run (generate script only)
synapse run --config test.yml --dry-run

# Run with comparison
synapse run --config test.yml --compare

# Comparison only (no load test)
synapse run --config test.yml --compare-only

# Save screenshots for debugging
synapse run --config test.yml --compare --save-screenshots
```

### `synapse test`

Quick load test without configuration file.

```bash
synapse test [options]
```

**Options:**

| Option | Description | Required |
|--------|-------------|----------|
| `-u, --url <url>` | Target URL | Yes |
| `-c, --concurrent <number>` | Concurrent users | Yes |
| `-r, --requests <number>` | Total requests | Yes |
| `-o, --output <path>` | Output directory | No |
| `--dry-run` | Generate script only | No |
| `--keep-script` | Keep generated script | No |

**Example:**

```bash
synapse test --url "https://api.example.com" --concurrent 10 --requests 100
```

### `synapse compare`

Compare images, text, or screenshots from CSV file.

```bash
synapse compare [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | CSV file with URLs | Required |
| `--column1 <name>` | First URL column | `url1` |
| `--column2 <name>` | Second URL column | `url2` |
| `-t, --type <type>` | Comparison type | `image` |
| `-o, --output <path>` | Output directory | `./output` |
| `--timeout <ms>` | Request timeout | `30000` |
| `--threshold <value>` | Comparison threshold (0-1) | `0.1` |
| `--viewport <size>` | Viewport size (WIDTHxHEIGHT) | `1920x1080` |
| `--wait-until <strategy>` | Wait strategy | `networkidle` |
| `--save-screenshots` | Save screenshots | - |

**Comparison Types:**

- `image` - Direct image URL comparison
- `text` - Text/HTML content comparison
- `screenshot` - Browser screenshot comparison
- `visual-text` - Text + Screenshot comparison

**Examples:**

```bash
# Image comparison
synapse compare --file urls.csv --type image

# Screenshot comparison
synapse compare --file urls.csv --type screenshot --save-screenshots

# Visual-text comparison
synapse compare --file urls.csv --type visual-text --viewport 1280x720

# Custom threshold
synapse compare --file urls.csv --type image --threshold 0.05
```

### `synapse validate`

Validate configuration file.

```bash
synapse validate [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Configuration file | `synapse.yml` |

**Example:**

```bash
synapse validate --config test.yml
```

### `synapse generate`

Generate K6 script without running.

```bash
synapse generate [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Configuration file | `synapse.yml` |
| `-o, --output <path>` | Output script path | `test.js` |

**Example:**

```bash
synapse generate --config test.yml --output custom-test.js
```

### `synapse init`

Initialize new configuration file.

```bash
synapse init [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Test name | Required |
| `--url <url>` | Base URL | Required |
| `-o, --output <path>` | Output file | `synapse.yml` |

**Example:**

```bash
synapse init --name "API Test" --url "https://api.example.com" --type screenshot
```

### `synapse import`

Import OpenAPI or HAR into a Synapse config.

```bash
synapse import --openapi ./openapi.yaml -o synapse.yml
synapse import --har ./capture.har --csv ./urls.csv
```

### `synapse doctor`

Check local dependencies.

```bash
synapse doctor
synapse doctor --json
```

## Global Options

| Option | Description |
|--------|-------------|
| `-V, --version` | Output version number |
| `-h, --help` | Display help |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General / K6 error |
| 2 | Configuration error |
| 3 | Comparison failed (`--fail-on-diff`) |
| 4 | Required dependency missing |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PUPPETEER_EXECUTABLE_PATH` | Chromium binary for screenshots | puppeteer bundled |
| `K6_BROWSER_ENABLED` | Legacy K6 browser flag | `true` |

## Examples

### Complete Workflow

```bash
# 1. Initialize config
synapse init --name "My Test" --url "https://api.example.com"

# 2. Validate config
synapse validate

# 3. Dry run
synapse run --dry-run

# 4. Run test
synapse run

# 5. Run with comparison
synapse run --compare --save-screenshots
```

### Screenshot Comparison Workflow

```bash
# 1. Create config with screenshot comparison
cat > screenshot-test.yml << EOF
name: "Screenshot Test"
baseUrl: "https://v1.example.com"
execution:
  mode: "construct"
  iterations: 10
parameters:
  - name: "page"
    type: "array"
    values: ["home", "about", "contact"]
comparison:
  enabled: true
  type: "screenshot"
  baseUrl2: "https://v2.example.com"
  screenshot:
    viewport: { width: 1920, height: 1080 }
EOF

# 2. Run comparison with screenshots
synapse run --config screenshot-test.yml --compare-only --save-screenshots

# 3. Review results
cat output/screenshot-comparison-*.csv
open output/screenshots/
```

## Tips

- Use `--dry-run` to verify script generation before running
- Use `--keep-script` to inspect generated K6 scripts
- Use `--compare-only` for faster comparison without load testing
- Use `--save-screenshots` to debug visual differences
- Check `output/` directory for all generated files
