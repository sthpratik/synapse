# Changelog

All notable changes to Synapse will be documented in this file.

## [1.2.0] - 2026-03-23

### New Features
- **HTML comparison reports** with screenshot and diff image previews
- **Diff PNG output** under `output/diffs/` when pixels differ
- **`synapse import`** for OpenAPI 3 / Swagger 2 and HAR → `synapse.yml`
- **`synapse doctor`** dependency checks (Node, K6, Puppeteer, Sharp)
- **Auth profiles**: `bearer`, `basic`, `apiKey` (header or query)
- **`request.json`** bodies and structured **`request.checks`** in generated K6
- **Path parameters** via `parameters[].in: path` and `{placeholders}` in `baseUrl`
- **Screenshot enhancements**: `masks`, `selector`, `fullPage`, `waitForSelector`, multi-`viewports`
- **CI helpers**: `--fail-on-diff`, stable exit codes, GitHub Action workflow, Dockerfile
- **JSON text compare**: `normalizeJson`, `ignoreJsonPaths`, `minSimilarity`, `failOnDiff`
- **MCP tools**: `compare_urls`, `import_spec`, `doctor`, `init_config` (+ compare flags on run)

### Improvements
- Documented npm package name `synapse-surge` vs CLI `synapse`
- Construct mode may omit parameters (hits `baseUrl` only)
- Comparison CSV/HTML include `PassedThreshold`, viewport, and diff paths
- Broader unit tests for auth, importers, generator, validator, comparison, HTML

### Installation
```bash
npm install -g synapse-surge@1.2.0
synapse doctor
```

---

## [1.1.0] - 2025-11-26

### 🎉 New Features

#### Screenshot Comparison
- **Browser-based screenshot comparison** using Puppeteer
- Configurable viewport sizes (desktop, mobile, tablet)
- Wait strategies (load, networkidle)
- Automatic screenshot capture and comparison

#### Visual-Text Comparison
- **Combined text + screenshot validation**
- Compare both HTML content AND visual rendering
- Single pass/fail status for both validations
- Perfect for API-generated content

#### Debug Mode
- **Screenshot saving** with `--save-screenshots` flag
- Screenshot file paths in CSV reports
- Timestamp-based file naming
- Easy correlation between reports and screenshots

#### Template Generator
- **8 built-in templates** via `synapse init --type`
- Templates: basic, screenshot, visual-text, image, text, mobile, batch, advanced
- Auto-generated configurations
- Ready-to-run examples

### ✨ Enhancements

#### CLI Improvements
- Added `--save-screenshots` flag to `run` and `compare` commands
- Added `--type` option to `init` command (8 templates)
- Added `--viewport` option to `compare` command
- Added `--wait-until` option to `compare` command
- Updated `compare` command to support all 4 comparison types

#### Comparison Types
- `image` - Direct image comparison (existing)
- `text` - Text/HTML comparison (existing)
- `screenshot` - Browser screenshot comparison (NEW)
- `visual-text` - Text + screenshot comparison (NEW)

#### Report Enhancements
- Screenshot file paths in CSV reports
- Separate columns for text and screenshot similarity
- Visual-text passed status
- Enhanced error reporting

#### Documentation
- 7 detailed example configurations with line-by-line comments
- Complete CLI examples guide (21 commands)
- Updated getting started guide
- Init templates documentation
- Screenshot comparison guide
- Debug mode guide

### 🔧 Technical Changes

#### Dependencies
- Added `puppeteer` for browser automation
- Replaced K6 browser with Puppeteer (more reliable)
- Updated comparison engine for new types

#### Architecture
- New `Screenshotter` class for screenshot capture
- Enhanced `Comparator` with screenshot support
- Updated `ComparisonPostProcessor` for new report fields
- Template system in CLI

#### File Organization
- Created `validation/` folder for test configs
- Created `examples/` with 7 detailed examples
- Organized documentation structure
- Added init templates

### 📚 Documentation

#### New Documentation
- `docs/cli-examples.md` - 21 CLI command examples
- `docs/init-templates.md` - Template generator guide
- `docs/debug-mode.md` - Screenshot debugging
- `docs/screenshot-comparison.md` - Screenshot testing
- `examples/README.md` - Examples index

#### Updated Documentation
- `docs/getting-started.md` - Added new features
- `docs/cli-reference.md` - Complete CLI reference
- `docs/comparison.md` - All 4 comparison types
- `docs/examples.md` - Real-world examples
- `docs/README.md` - Updated overview

#### Example Configurations
- `01-screenshot-comparison.yml` - UI regression testing
- `02-visual-text-comparison.yml` - Content validation
- `03-image-comparison.yml` - Logo/chart testing
- `04-text-comparison.yml` - API validation
- `05-mobile-screenshot.yml` - Mobile UI testing
- `06-batch-mode.yml` - URL list testing
- `07-advanced-parameters.yml` - All parameter types

### 🐛 Bug Fixes
- Fixed K6 browser API compatibility issues
- Fixed screenshot path reporting in CSV
- Fixed comparison type validation
- Fixed commander.js option flags

### 🔄 Breaking Changes
- None - All changes are backward compatible
- Existing `image` and `text` comparison types work unchanged

### 📦 Installation
```bash
npm install -g synapse-surge@1.1.0
```

### 🚀 Quick Start
```bash
# Generate screenshot comparison config
synapse init --type screenshot --url "https://example.com"

# Run with screenshots
synapse run --compare-only --save-screenshots
```

---

## [1.0.0] - 2025-11-05

### Initial Release
- Dynamic URL construction
- Parameter types: integer, string, array, CSV, URL, static
- Image comparison with pixelmatch
- Text comparison
- Batch mode with CSV
- K6 integration
- MCP server integration
- Basic CLI commands
