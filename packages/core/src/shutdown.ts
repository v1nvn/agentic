/** Close each closable in order (best-effort), then force-exit. */
export function shutdownOnSignals(
  closables: readonly { close(): Promise<unknown> }[],
  signals: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'],
): void {
  const shutdown = (): void => {
    void closables
      .reduce(
        (acc: Promise<void>, closable) =>
          acc.then(async () => {
            try {
              await closable.close();
            } catch {
              // best-effort; exiting regardless
            }
          }),
        Promise.resolve(),
      )
      .finally(() => {
        // Force-exit on signal; the n/no-process-exit rule targets libraries.
        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
      });
  };
  for (const signal of signals) {
    process.on(signal, shutdown);
  }
}
