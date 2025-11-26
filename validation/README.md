# Validation Test Files

This directory contains test configuration files used for validating Synapse features.

## Test Files

### Screenshot Comparison Tests

- **`qrcode-screenshot-test.yml`** - QR code generation comparison
- **`screenshot-test-simple.yml`** - Simple screenshot test
- **`test-1-screenshot.yml`** - Single iteration screenshot test
- **`test-screenshot.yml`** - Basic screenshot configuration
- **`qr-test-2.yml`** - Two-iteration QR test

### General Tests

- **`test-config.yml`** - Basic configuration validation
- **`test-array.yml`** - Array parameter testing

## Usage

### Run Tests

```bash
# Screenshot comparison
synapse run --config validation/qrcode-screenshot-test.yml --compare-only --save-screenshots

# Simple test
synapse run --config validation/test-1-screenshot.yml --compare-only --save-screenshots

# Validate config
synapse validate --config validation/test-config.yml
```

### Test Scenarios

**1. Screenshot Comparison:**
```bash
cd validation
synapse run --config screenshot-test-simple.yml --compare-only --save-screenshots
```

**2. Load Test + Comparison:**
```bash
synapse run --config qrcode-screenshot-test.yml --compare --save-screenshots
```

**3. Configuration Validation:**
```bash
synapse validate --config test-config.yml
```

## Expected Output

```
output/
├── detailed-comparison-{timestamp}.csv
├── screenshot-comparison-{timestamp}.csv
└── screenshots/
    ├── url1-{timestamp}.png
    └── url2-{timestamp}.png
```

## Notes

- These files are for testing and validation only
- Not meant for production use
- Used to verify new features and bug fixes
- Can be used as examples for creating your own tests
