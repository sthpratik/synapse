# CI, Docker & Exit Codes

## Install name vs CLI name

| What | Value |
|------|--------|
| npm package | `synapse-surge` |
| CLI binary | `synapse` |

```bash
npm install -g synapse-surge
synapse --version
synapse doctor
```

## Exit codes (CI-friendly)

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error / K6 failure (including threshold breach) |
| `2` | Configuration error |
| `3` | Comparison failed (`--fail-on-diff` or `comparison.failOnDiff`) |
| `4` | Required dependency missing (`synapse doctor`) |

```bash
synapse run --compare --fail-on-diff
synapse compare --file urls.csv --type screenshot --fail-on-diff
```

## GitHub Action

Reusable workflow: `.github/workflows/synapse.yml`

```yaml
jobs:
  load:
    uses: sthpratik/Synapse/.github/workflows/synapse.yml@main
    with:
      config: synapse.yml
      compare: true
      fail_on_diff: true
```

Artifacts uploaded from `synapse-output/` include CSV, JSON, HTML reports, screenshots, and diffs.

## Docker

```bash
npm run build
docker build -t synapse .
docker run --rm -v "$PWD:/work" -w /work synapse run --config synapse.yml --dry-run
docker run --rm synapse doctor
```

`PUPPETEER_EXECUTABLE_PATH` is set to system Chromium in the image for screenshot comparison.
