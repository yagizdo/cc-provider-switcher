import { describe, it, expect } from 'vitest'
import { splitClaudeArgs } from '../../src/commands/run.js'

// commander's optional [region] takes the first word after `--`, so the tail must be cut off before parsing.
describe('splitClaudeArgs', () => {
  it('passes everything after -- to claude and keeps it from ccs', () => {
    expect(splitClaudeArgs(['node', 'ccs', 'run', 'glm', '--', '--resume', '-m', 'x'])).toEqual({
      argv: ['node', 'ccs', 'run', 'glm'],
      claudeArgs: ['--resume', '-m', 'x'],
    })
  })

  it('leaves other commands alone', () => {
    const argv = ['node', 'ccs', 'glm', '--', 'china']
    expect(splitClaudeArgs(argv)).toEqual({ argv, claudeArgs: [] })
  })
})
