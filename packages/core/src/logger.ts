export type LogLevel = 'debug' | 'error' | 'info' | 'silent' | 'warn';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.MAX_SAFE_INTEGER,
};

export function levelEnabled(
  active: LogLevel,
  wanted: Exclude<LogLevel, 'silent'>,
): boolean {
  return LEVEL_RANK[wanted] >= LEVEL_RANK[active];
}

const LEVEL_LABEL: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: 'DEBUG',
  error: 'ERROR',
  info: 'INFO',
  warn: 'WARN',
};

type Writer = (message: string) => void;

// stdout carries the MCP transport; everything here goes to stderr.
export class Logger {
  private readonly stderr: Writer;

  constructor(
    readonly activeLevel: LogLevel,
    stderr: Writer = line => process.stderr.write(`${line}\n`),
  ) {
    this.stderr = stderr;
  }

  debug(message: string): void {
    this.log('debug', message);
  }

  error(message: string): void {
    this.log('error', message);
  }

  info(message: string): void {
    this.log('info', message);
  }

  warn(message: string): void {
    this.log('warn', message);
  }

  private log(level: Exclude<LogLevel, 'silent'>, message: string): void {
    if (levelEnabled(this.activeLevel, level)) {
      this.stderr(`${LEVEL_LABEL[level]} ${message}`);
    }
  }
}
