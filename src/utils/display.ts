import chalk from 'chalk'

export function success(msg: string): void {
  console.log(chalk.green('✓ ' + msg))
}

export function error(msg: string): void {
  console.error(chalk.red('✗ ' + msg))
}

export function warn(msg: string): void {
  console.warn(chalk.yellow('⚠ ' + msg))
}

export function info(msg: string): void {
  console.log(chalk.cyan('ℹ ' + msg))
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '***'
  return key.slice(0, 4) + '...' + key.slice(-4)
}

export function table(rows: [string, string][]): void {
  const maxKey = Math.max(...rows.map(([k]) => k.length))
  for (const [key, val] of rows) {
    console.log(chalk.bold(key.padEnd(maxKey + 2)) + val)
  }
}
