import { program } from 'commander'
import { createRequire } from 'module'
import { registerSwitchCommand } from './commands/switch.js'
import { registerStatusCommand } from './commands/status.js'
import { registerListCommand } from './commands/list.js'
import { registerConfigCommand } from './commands/config.js'
import { registerResetCommand } from './commands/reset.js'
import { registerDoctorCommand } from './commands/doctor.js'
import { registerAccountCommand } from './commands/account.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

program.name('ccs').description('Switch Claude Code between AI providers').version(version)

registerListCommand(program)
registerStatusCommand(program)
registerConfigCommand(program)
registerResetCommand(program)
registerDoctorCommand(program)
registerAccountCommand(program)
registerSwitchCommand(program)

program.parse()
