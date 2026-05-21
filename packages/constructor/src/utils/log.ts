/**
 * Log a suppressed error in development without crashing in production.
 * In `vite build` (prod), `import.meta.env.DEV` is statically `false`
 * and the console.warn branch is tree-shaken out.
 */
export function logSilent(scope: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[${scope}] suppressed error:`, err)
  }
}
