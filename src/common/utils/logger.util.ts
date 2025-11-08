export const logger = {
  info: (...args: any[]) => console.log('\x1b[32m✓\x1b[0m', ...args),  // Green check mark
  error: (...args: any[]) => console.error('\x1b[31m✗\x1b[0m', ...args),  // Red X
  warn: (...args: any[]) => console.warn('\x1b[33m⚠\x1b[0m', ...args),  // Yellow warning
};