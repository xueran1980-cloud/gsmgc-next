---
name: css-guard
description: Tailwind v4 CSS layer safety scanner. Run `node scripts/css-guard.mjs` before any CSS change to detect violations. Use when modifying globals.css, adding new CSS rules, or debugging layout issues. Detects bare CSS (CRITICAL), global selectors in wrong layer (HIGH), custom utilities (WARN). Prevents Tailwind utility override regressions.
agent_created: true
---

# CSS Guard — Tailwind v4 Layer Safety

## Purpose

Prevent CSS regressions that break Tailwind v4's cascade model. The guard scans `src/app/globals.css` and reports any rule that could override Tailwind utilities.

## Trigger

Use this skill when:
- Modifying `globals.css` (adding/removing/changing CSS rules)
- Debugging layout issues on gsmgc-next
- Before `git commit` involving CSS changes
- After seeing `prebuild` fail due to CSS guard

## Quick Run

```bash
npm run css-guard
```

Or directly:
```bash
node scripts/css-guard.mjs
```

## Violation Levels

| Level | Rule | Trigger | Action |
|-------|------|---------|--------|
| 🔴 CRITICAL | BARE_CSS | CSS rule outside `@layer {}` | Exit 1 — must fix immediately |
| ⚠️ HIGH | GLOBAL_IN_NON_BASE | Global selector (`img`, `button`, `a`, etc.) in `@layer components` or `@layer utilities` | Exit 1 — must fix immediately |
| 🔶 WARN | CUSTOM_UTILITIES | Custom rules in `@layer utilities` | Exit 0 — advisory, may conflict with Tailwind built-ins |
| ℹ️ INFO | — | Structural summary of all rules | Exit 0 — informational only |

## Why This Matters

Tailwind v4 CSS cascade:
```
UNLAYERED CSS              ← Highest priority (DANGEROUS!)
@layer utilities           ← Tailwind built-in utilities
@layer components          ← Custom component styles
@layer base                ← Global resets
@layer theme               ← CSS variables
```

CSS rules written OUTSIDE any `@layer` block will override ALL Tailwind utilities. This caused the P0 layout collapse where `img { height: auto }` overrode `.h-10 { height: 2.5rem }` on the GSMGC logo.

## When Guard Blocks

If the guard exits with code 1:
1. Read the violation message and line number
2. Fix the CSS rule — move it into the correct `@layer` block
3. Re-run `npm run css-guard` to verify
4. Do NOT proceed with other changes until all CRITICAL and HIGH violations are fixed

## prebuild Hook

`npm run build` automatically runs `css-guard` first. If violations exist, the build will fail. To bypass (emergency only):
```bash
npx next build   # skips prebuild hook
```
