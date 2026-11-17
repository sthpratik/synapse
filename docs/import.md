# Import OpenAPI & HAR

Generate a starter `synapse.yml` from existing API specs or browser captures.

## OpenAPI / Swagger

```bash
synapse import --openapi ./openapi.yaml -o synapse.yml
synapse import --openapi ./openapi.json --path /pets --method get --name "Pets API"
```

What gets generated:

- `baseUrl` from `servers` / `host` + selected path (keeps `{path}` placeholders)
- Parameters from path/query schemas (`integer`, `array` enums, `string`)
- Optional `auth` stub from security schemes (`REPLACE_ME` tokens)
- Default response `checks` and K6 thresholds

## HAR

```bash
synapse import --har ./capture.har -o synapse.yml --csv ./har-urls.csv
synapse import --har ./capture.har --include-static --duration 5m
```

Creates:

- Batch-mode config
- Deduplicated GET/HEAD URL CSV (static assets skipped unless `--include-static`)

## After import

```bash
synapse validate -c synapse.yml
synapse doctor
synapse run --dry-run
```
