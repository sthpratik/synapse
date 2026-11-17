export interface SynapseConfig {
  name: string;
  description?: string;
  baseUrl: string;
  execution: ExecutionConfig;
  k6Options?: K6Options;
  parameters?: Parameter[];
  batch?: BatchConfig;
  request?: RequestConfig;
  auth?: AuthConfig;
  output?: OutputConfig;
  comparison?: ComparisonConfig;
}

export type AuthType = 'bearer' | 'basic' | 'apiKey';

export interface AuthConfig {
  type: AuthType;
  /** Bearer token or API key value */
  token?: string;
  /** Basic auth username */
  username?: string;
  /** Basic auth password */
  password?: string;
  /** Header name for apiKey auth (default: Authorization or X-API-Key) */
  header?: string;
  /** Query param name when placing apiKey in query */
  queryParam?: string;
  /** Where to place apiKey: header (default) or query */
  in?: 'header' | 'query';
}

export interface RequestCheck {
  /** Expected HTTP status (number) or status is ok (true) */
  status?: number | 'ok';
  /** Max response time in ms */
  maxDuration?: number;
  /** JSONPath-like dotted path that must exist (e.g. "data.id") */
  jsonPath?: string;
  /** Expected value at jsonPath (stringified comparison) */
  equals?: string | number | boolean;
  /** Substring that must appear in response body */
  bodyContains?: string;
  /** Custom check name shown in K6 */
  name?: string;
}

export interface ComparisonConfig {
  enabled: boolean;
  type: 'image' | 'text' | 'screenshot' | 'visual-text';
  baseUrl2: string;
  timeout?: number;
  threshold?: number;
  reportFormat?: 'csv' | 'json' | 'html';
  /** Exit non-zero when comparisons fail similarity / match thresholds (CI) */
  failOnDiff?: boolean;
  /** Minimum similarity % required to pass (default derived from threshold) */
  minSimilarity?: number;
  /** JSON field paths to ignore during text/JSON comparison */
  ignoreJsonPaths?: string[];
  /** Normalize JSON key order / whitespace before text compare */
  normalizeJson?: boolean;
  screenshot?: ScreenshotConfig;
}

export interface ViewportConfig {
  width: number;
  height: number;
  name?: string;
}

export interface ScreenshotConfig {
  viewport?: ViewportConfig;
  /** Multiple viewports to capture and compare (overrides single viewport when set) */
  viewports?: ViewportConfig[];
  waitUntil?: 'load' | 'networkidle';
  timeout?: number;
  /** Capture full page instead of viewport */
  fullPage?: boolean;
  /** CSS selector to screenshot instead of full page */
  selector?: string;
  /** CSS selectors to mask (cover) before screenshot */
  masks?: string[];
  /** Wait for this selector before capturing */
  waitForSelector?: string;
}

export interface ExecutionConfig {
  mode: 'construct' | 'batch';
  concurrent?: number;
  iterations?: number;
  duration?: string;
  /** Think time between iterations (seconds); default 1 */
  thinkTime?: number;
}

export interface K6Options {
  stages?: Stage[];
  thresholds?: Record<string, string[]>;
  scenarios?: Record<string, any>;
  [key: string]: any;
}

export interface Stage {
  duration: string;
  target: number;
}

export interface Parameter {
  name: string;
  type: 'integer' | 'string' | 'array' | 'csv' | 'url' | 'static';
  // Integer specific
  min?: number;
  max?: number;
  length?: number;
  // String specific
  charset?: 'alphanumeric' | 'alpha' | 'numeric' | 'custom';
  customChars?: string;
  // Array specific
  values?: (string | number)[];
  // CSV/URL specific
  file?: string;
  column?: string;
  encoding?: 'base64';
  // Static specific
  value?: string | number;
  // Common
  unique?: boolean;
  /** Place parameter in path ({name}) vs query (default) */
  in?: 'query' | 'path';
}

export interface BatchConfig {
  file: string;
  column: string;
}

export interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  /** Raw string body (legacy) */
  body?: string;
  /** JSON body object — serialized automatically with Content-Type */
  json?: Record<string, unknown> | unknown[];
  /** Response checks emitted into the K6 script */
  checks?: RequestCheck[];
}

export interface OutputConfig {
  format?: 'json' | 'influxdb' | 'cloud';
  file?: string;
}

export interface GeneratedParameter {
  name: string;
  value: string | number;
}

export interface TestContext {
  config: SynapseConfig;
  parameters: GeneratedParameter[];
  urls: string[];
}
