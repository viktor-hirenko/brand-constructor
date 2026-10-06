#!/usr/bin/env node
// Production is deployed only from `main`, committed (owner, 05.10.2026;
// until then `phase/cleanup`).
//
// Every production deploy script runs this first. A feature branch goes to the
// stage (`pnpm deploy:stage`) until the owner agrees to it; it reaches
// production only by being merged into `main`. Uncommitted changes
// are refused too, so production is always a commit one can name and return to.

import { execFileSync } from 'node:child_process'

const PROD_BRANCH = 'main'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch !== PROD_BRANCH) {
  console.error(
    `\n✘ Production is deployed only from ${PROD_BRANCH}; this is ${branch}.\n` +
      `  Check a branch on the stage: pnpm deploy:stage\n` +
      `  It goes to production once merged into ${PROD_BRANCH}, on the owner's word.\n`
  )
  process.exit(1)
}

const dirty = git('status', '--porcelain', '--untracked-files=no')
if (dirty) {
  console.error(`\n✘ Uncommitted changes — production gets commits only:\n${dirty}\n`)
  process.exit(1)
}

console.log(`✓ production deploy from ${PROD_BRANCH} @ ${git('rev-parse', '--short', 'HEAD')}`)
