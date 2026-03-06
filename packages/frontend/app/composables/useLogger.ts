/**
 * Logger Composable
 *
 * Provides conditional logging for tests based on environment variables.
 * Set VITEST_DEBUG=true or DEBUG=true to enable debug logging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private debugEnabled: boolean

  constructor() {
    // Enable debug logging if VITEST_DEBUG or DEBUG environment variables are set
    this.debugEnabled =
      process.env.VITEST_DEBUG === 'true' ||
      process.env.DEBUG === 'true' ||
      process.env.NODE_ENV === 'development'
  }

  private formatMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
      .join(' ')

    return `${prefix} ${message}`
  }

  debug(...args: any[]): void {
    if (this.debugEnabled) {
      console.log(this.formatMessage('debug', ...args))
    }
  }

  info(...args: any[]): void {
    console.log(this.formatMessage('info', ...args))
  }

  warn(...args: any[]): void {
    console.warn(this.formatMessage('warn', ...args))
  }

  error(...args: any[]): void {
    console.error(this.formatMessage('error', ...args))
  }

  /**
   * Enable debug logging programmatically
   */
  enableDebug(): void {
    this.debugEnabled = true
  }

  /**
   * Disable debug logging programmatically
   */
  disableDebug(): void {
    this.debugEnabled = false
  }

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled(): boolean {
    return this.debugEnabled
  }
}

// Singleton instance
const logger = new Logger()

// Export the composable
export const useLogger = () => logger

// Also export the class for creating custom instances if needed
export { Logger }
