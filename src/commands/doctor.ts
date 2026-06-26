import fs from 'fs/promises'
import { type Command } from 'commander'
import { CLAUDE_DIR } from '../utils/paths.js'
import { loadUserConfig } from '../config/user-config.js'
import chalk from 'chalk'

interface Check {
  label: string
  pass: boolean
  detail?: string
}

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Diagnose common configuration issues')
    .action(async () => {
      const checks: Check[] = []

      // Node.js version
      const nodeVersion = process.versions.node
      const [major] = nodeVersion.split('.').map(Number)
      checks.push({
        label: `Node.js version (${nodeVersion})`,
        pass: major >= 22,
        detail: major < 22 ? 'ccs requires Node.js >=22' : undefined,
      })

      // ~/.claude/ exists
      let claudeDirExists = false
      try {
        await fs.access(CLAUDE_DIR)
        claudeDirExists = true
      } catch {
        /* skip */
      }
      checks.push({
        label: `Claude Code directory (~/.claude/)`,
        pass: claudeDirExists,
        detail: claudeDirExists ? undefined : 'Not found. Is Claude Code installed?',
      })

      // Config valid
      let configValid = true
      let configDetail: string | undefined
      try {
        await loadUserConfig()
      } catch (err) {
        configValid = false
        configDetail = String(err)
      }
      checks.push({ label: 'ccs config file', pass: configValid, detail: configDetail })

      // At least one API key
      let hasKey = false
      try {
        const config = await loadUserConfig()
        hasKey = Object.keys(config.keys).length > 0
      } catch {
        /* skip */
      }
      checks.push({
        label: 'At least one API key configured',
        pass: hasKey,
        detail: hasKey ? undefined : 'Run "ccs config" to add API keys.',
      })

      console.log('\nccs doctor\n')
      for (const check of checks) {
        const icon = check.pass ? chalk.green('✓') : chalk.red('✗')
        console.log(`  ${icon}  ${check.label}`)
        if (check.detail) console.log(`     ${chalk.dim(check.detail)}`)
      }
      console.log()

      const failed = checks.filter((c) => !c.pass)
      if (failed.length === 0) {
        console.log(chalk.green('All checks passed.\n'))
      } else {
        console.log(chalk.yellow(`${failed.length} issue(s) found.\n`))
        process.exit(1)
      }
    })
}
