# Auth, JSON bodies & response checks

## Auth profiles

```yaml
auth:
  type: bearer          # bearer | basic | apiKey
  token: "YOUR_TOKEN"
```

```yaml
auth:
  type: basic
  username: "user"
  password: "secret"
```

```yaml
auth:
  type: apiKey
  token: "key"
  in: header            # header | query
  header: "X-API-Key"   # or queryParam: api_key
```

Auth headers/query params are merged into every generated K6 request.

## JSON request body

Prefer `request.json` over raw `body` strings:

```yaml
request:
  method: POST
  json:
    name: "widget"
    qty: 2
  checks:
    - status: 201
    - jsonPath: id
    - maxDuration: 1000
    - bodyContains: widget
```

`request.json` and `request.body` cannot both be set.

## Checks

| Field | Behavior |
|-------|----------|
| `status` | Exact code, or `"ok"` for 2xx |
| `maxDuration` | Fail if slower than N ms |
| `jsonPath` | Dotted path must exist (optional `equals`) |
| `bodyContains` | Substring match |
| `name` | Label shown in K6 |

## Path parameters

```yaml
baseUrl: "https://api.example.com/users/{userId}"
parameters:
  - name: userId
    type: integer
    min: 1
    max: 100
    in: path
  - name: expand
    type: static
    value: "true"
    in: query
```
