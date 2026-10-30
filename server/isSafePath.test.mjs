// Minimal assert-based check for isSafePath's symlink handling.
// Run: node server/isSafePath.test.mjs
import assert from 'node:assert'
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, writeFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = mkdtempSync(join(tmpdir(), 'claude-os-test-'))
const claudeDir = join(root, 'claude')
const outside = join(root, 'outside')
mkdirSync(claudeDir, { recursive: true })
mkdirSync(outside, { recursive: true })
writeFileSync(join(outside, 'secret.md'), 'should not be readable')

// Mirrors isSafePath in server/index.js (kept in sync by hand — this is a
// lightweight sanity check, not a full integration test).
function isSafePath(resolvedPath, CLAUDE_DIR) {
  if (!resolvedPath.startsWith(CLAUDE_DIR + '/')) return false
  try {
    return realpathSync(resolvedPath).startsWith(realpathSync(CLAUDE_DIR) + '/')
  } catch {
    return false
  }
}

// A symlink inside CLAUDE_DIR pointing outside it must be rejected.
const linkPath = join(claudeDir, 'escape.md')
symlinkSync(join(outside, 'secret.md'), linkPath)
assert.strictEqual(isSafePath(linkPath, claudeDir), false, 'symlink escaping CLAUDE_DIR must be rejected')

// A real file inside CLAUDE_DIR must still pass.
const realFile = join(claudeDir, 'real.md')
writeFileSync(realFile, 'fine')
assert.strictEqual(isSafePath(realFile, claudeDir), true, 'real file inside CLAUDE_DIR must be accepted')

// A nonexistent path must be rejected, not throw.
assert.strictEqual(isSafePath(join(claudeDir, 'missing.md'), claudeDir), false, 'nonexistent path must be rejected, not throw')

rmSync(root, { recursive: true, force: true })
console.log('isSafePath: all checks passed')
