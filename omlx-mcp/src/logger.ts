type Writer = (message: string) => void;

// stdout carries the MCP transport; everything here goes to stderr.
class Logger {
  private readonly stderr: Writer;

  constructor(stderr: Writer = line => process.stderr.write(`${line}\n`)) {
    this.stderr = stderr;
  }

  error(message: string): void {
    this.stderr(`ERROR ${message}`);
  }

  info(message: string): void {
    this.stderr(`INFO ${message}`);
  }
}

export const logger = new Logger();
