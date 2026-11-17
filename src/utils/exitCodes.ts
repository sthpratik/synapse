/**
 * Stable process exit codes for CI pipelines.
 */
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONFIG_ERROR = 2,
  COMPARISON_FAILED = 3,
  DEPENDENCY_MISSING = 4,
}

export function exitWith(code: ExitCode, message?: string): never {
  if (message) {
    // Caller is responsible for styling; keep this plain for CI logs
    console.error(message);
  }
  process.exit(code);
}
