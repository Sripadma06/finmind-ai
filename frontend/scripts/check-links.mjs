#!/usr/bin/env node
/**
 * Finds broken internal links.
 *
 * Collects every route declared in src/App.tsx, then scans all other source files for internal link targets
 * (<Link to>, <NavLink to>, <Navigate to>, navigate('...'), href="/...", <a href>) and reports any that
 * do not match a declared route. External http(s) links are listed but not fetched.
 *
 * Usage: npm run check:links     (exits 1 if anything is broken)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const src = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : []
  })
}

const files = walk(src)
const app = readFileSync(join(src, 'App.tsx'), 'utf8')

// Declared routes ("*" is the catch-all and is skipped as a target).
const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*')
const routeRegexes = routes.map((r) => new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$'))
const matches = (path) => routeRegexes.some((re) => re.test(path))

// Links that leave the SPA on purpose (served by the backend / dev proxy), so they are not routes.
const serverPaths = [/^\/swagger-ui(\.html)?$/, /^\/v3\/api-docs/, /^\/api\//]

const patterns = [
  /\bto="([^"]+)"/g,
  /\bto=\{'([^']+)'\}/g,
  /\bto=\{`([^`]+)`\}/g,
  /\bto=\{user \? '([^']+)' : '([^']+)'\}/g,
  /\bnavigate\('([^']+)'/g,
  /\bnavigate\(`([^`]+)`/g,
  /\bhref="([^"]+)"/g,
  /\bgo\('([^']+)'\)/g,
  /\bgo\(`([^`]+)`\)/g,
]

const problems = []
const external = new Set()
let checked = 0

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      for (const target of m.slice(1).filter(Boolean)) {
        const line = text.slice(0, m.index).split('\n').length
        if (/^https?:\/\//.test(target)) {
          external.add(target)
          continue
        }
        if (target.startsWith('#') || target.startsWith('mailto:')) continue
        if (!target.startsWith('/')) continue // relative / dynamic values are not link targets here
        const path = target.split(/[?#]/)[0].replace(/\$\{[^}]*\}/g, 'x') || '/'
        if (serverPaths.some((r) => r.test(path))) continue
        checked++
        if (!matches(path)) {
          problems.push(`${relative(root, file)}:${line}  "${target}" does not match any route`)
        }
      }
    }
  }
  void lines
}

// Footer / env defaults that point at the backend are allowed; flag any other hard-coded absolute URLs for review.
console.log(`Routes: ${routes.join(', ')}`)
console.log(`Checked ${checked} internal link targets in ${files.length} files.`)
if (external.size) console.log(`External links (not fetched): ${[...external].join(', ')}`)

if (problems.length) {
  console.error('\nBroken internal links:')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('No broken internal links.')
