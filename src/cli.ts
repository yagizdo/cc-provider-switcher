import { program } from 'commander'
import { createRequire } from 'module'
import { registerSwitchCommand } from './commands/switch.js'
import { registerStatusCommand } from './commands/status.js'
import { registerListCommand } from './commands/list.js'
import { registerConfigCommand } from './commands/config.js'
import { registerResetCommand } from './commands/reset.js'
import { registerDoctorCommand } from './commands/doctor.js'
import { registerAccountCommand } from './commands/account.js'
import { registerRunCommand, splitClaudeArgs } from './commands/run.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

// Root options only before a subcommand: otherwise the root -m takes `ccs project glm -m x`'s model.
program.enablePositionalOptions()

program.name('ccs').description('Switch Claude Code between AI providers').version(version)

registerListCommand(program)
registerStatusCommand(program)
registerConfigCommand(program)
registerResetCommand(program)
registerDoctorCommand(program)
registerAccountCommand(program)
const { argv, claudeArgs } = splitClaudeArgs(process.argv)
registerRunCommand(program, claudeArgs)
registerSwitchCommand(program)

program.parse(argv)
