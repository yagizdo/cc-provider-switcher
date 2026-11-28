import chalk from 'chalk'
import readline from 'readline'

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

export function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    // Ctrl+D closes input without an answer: treat it as no.
    rl.on('close', () => resolve(false))
    rl.question(`${prompt} [y/N] `, (answer) => {
      // resolve before close: close fires its handler at once, and that handler resolves false.
      resolve(answer.trim().toLowerCase() === 'y')
      rl.close()
    })
  })
}

export interface SelectItem {
  label: string
  hint?: string
  // A row whose group differs from the row above gets a header line; header lines cannot be selected.
  group?: string
  dim?: boolean
}

// Arrow-key list on a TTY. Resolves the picked index, or null on Esc, q, Ctrl+C or Ctrl+D.
// shortcut: assumes the list fits the screen height and the width does not change while open; scroll and resize handling when a list outgrows ~20 rows.
export function select(title: string, items: SelectItem[], initial: number): Promise<number | null> {
  const { stdin, stdout } = process
  let cursor = Math.min(Math.max(initial, 0), items.length - 1)
  let drawn = 0

  const render = () => {
    // Lines are cut below the width so none wraps: the redraw moves up by the number of lines written.
    const width = Math.max((stdout.columns || 80) - 1, 10)
    const cut = (s: string) => (s.length > width ? s.slice(0, width - 1) + '…' : s)
    const lines = [chalk.bold(cut(title)), chalk.dim(cut('↑/↓ move, Enter select, Esc cancel'))]
    // Capped at half the width, so one long custom name does not push every hint off the screen.
    const labelWidth = Math.min(Math.max(...items.map((i) => i.label.length)) + 2, Math.floor(width / 2))
    const pad = (s: string) => (s.length > labelWidth - 2 ? s.slice(0, labelWidth - 3) + '…' : s).padEnd(labelWidth)
    items.forEach((item, i) => {
      if (item.group && item.group !== items[i - 1]?.group) lines.push(chalk.dim(cut(item.group)))
      const line = cut((i === cursor ? '❯ ' : '  ') + (item.hint ? pad(item.label) + item.hint : item.label))
      lines.push(i === cursor ? chalk.cyan(line) : item.dim ? chalk.dim(line) : line)
    })
    stdout.write((drawn ? `\x1b[${drawn}A\r` : '') + '\x1b[J' + lines.join('\n') + '\n')
    drawn = lines.length
  }

  return new Promise((resolve) => {
    const finish = (value: number | null) => {
      // Runs before the caller prints or throws anything, so the shell never gets a raw, cursorless terminal back.
      stdin.off('keypress', onKey)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write(`\x1b[${drawn}A\r\x1b[J\x1b[?25h`)
      resolve(value)
    }
    const onKey = (_str: string | undefined, key: { name?: string; ctrl?: boolean } | undefined) => {
      const name = key?.name
      // Raw mode turns Ctrl+C and Ctrl+D into plain key events: no SIGINT, no end of input.
      if (name === 'escape' || name === 'q' || (key?.ctrl && (name === 'c' || name === 'd'))) return finish(null)
      if (name === 'return') return finish(cursor)
      if (name === 'up' || name === 'k') cursor = (cursor - 1 + items.length) % items.length
      else if (name === 'down' || name === 'j') cursor = (cursor + 1) % items.length
      else return
      render()
    }
    readline.emitKeypressEvents(stdin)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('keypress', onKey)
    stdout.write('\x1b[?25l')
    render()
  })
}
