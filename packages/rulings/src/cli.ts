export function main(argv: string[]): number {
  const dirs = argv.filter(arg => !arg.startsWith('--'));
  if (dirs.length === 0) {
    console.error('usage: rulings <page-dir> [--new] [--no-open]');
    return 1;
  }
  console.error('nothing to build yet');
  return 1;
}
