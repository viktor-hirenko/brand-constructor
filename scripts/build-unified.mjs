#!/usr/bin/env node
// Variant 3 — unified single-origin build.
//
// Produces ONE deployable static tree for a single Cloudflare Pages project:
//
//   deploy/unified/public/            <- deploy this directory
//     index.html, assets/, ...        (Admin SPA, base '/')
//     wizard/index.html, wizard/...   (Wizard SPA, base '/wizard/')
//     _redirects                      (SPA fallback for both apps)
//   deploy/unified/functions/         <- tracked in git (single /api proxy)
//     api/[[path]].ts
//
// Deploy (from repo root):
//   cd deploy/unified && npx wrangler pages deploy public --project-name <name>
// Wrangler discovers `./functions` as a sibling of the deploy dir (same
// convention the standalone admin/constructor deploys already rely on).
//
// Request handling on Cloudflare Pages:
//   1. Functions  -> functions/_middleware.ts wraps everything; the /api proxy
//                    lives in functions/api/[[path]].ts
//   2. Static     -> real files (/assets/*, /wizard/assets/*, ...)
//   3. SPA shell  -> _middleware.ts serves /index.html or /wizard/index.html on
//                    a 404 (see that file for why _redirects is not used)

import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adminDist = resolve(repoRoot, 'packages/admin/dist')
const wizardDist = resolve(repoRoot, 'packages/constructor/dist')
const publicDir = resolve(repoRoot, 'deploy/unified/public')

function run(cmd) {
  console.log(`\n$ ${cmd}`)
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit' })
}

// 1. Build both SPAs. Admin -> base '/'. Wizard -> base '/wizard/' (default).
run('pnpm --filter @brand-constructor/admin build')
run('pnpm --filter @brand-constructor/constructor build')

// 2. Assemble the unified static tree.
console.log('\n> assembling deploy/unified/public')
rmSync(publicDir, { recursive: true, force: true })
mkdirSync(publicDir, { recursive: true })
cpSync(adminDist, publicDir, { recursive: true })
cpSync(wizardDist, resolve(publicDir, 'wizard'), { recursive: true })

// SPA fallback is handled by deploy/unified/functions/_middleware.ts (not
// _redirects — see that file for the loop-detection rationale).

console.log('\n✓ unified build ready at deploy/unified/public')
console.log('  deploy: cd deploy/unified && npx wrangler pages deploy public --project-name <name>')
