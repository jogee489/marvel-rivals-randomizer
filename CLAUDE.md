# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

### Branching
- Prefix branches: `feature/`, `fix/`, `chore/`
- Follow with short description: `feature/add-hero-filter`

### Communication
- Skip fluff and preamble
- No narration — state action when asking permission
- Summaries: 3-6 word sentences
- Drop articles: "the", "a", "an"

### Git
- Never commit without asking first
- Never merge without explicit instruction
- Commit author: **JJ Dorko** `<jdorko90@gmail.com>`
- No Claude references in commit messages, branch names, co-author notes, or session links

## Commands

```bash
npm run dev       # Dev server on port 3000
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint with auto-fix
```

```bash
npm test            # Run Vitest unit tests
```

Tests live in `src/utils/__tests__/`. Vitest is configured via `vitest.config.mjs`.

## Architecture

Vue 3 + Vuetify 3 app. Team composition randomizer for Marvel Rivals — users enter 6 player names, set role preferences, then get randomized hero assignments.

**Data layer** (`src/data/`): Static JSON — `characters.json` (heroes grouped by role: Vanguard/Duelist/Strategist) and `character_roles.json` (role names + icons).

**Core logic** lives entirely in `src/components/Randomizer.vue`. Role assignment runs four phases:
1. `assignInstalockPlayerRoles()` — players wanting only one role
2. `fillMinimalRoles()` — roles with exact player count needed
3. `randomlyAssignRoles()` — remaining random assignments
4. `findSwappablePlayer()` — swap to satisfy composition constraints

State is local to `Randomizer.vue`; Pinia store (`src/stores/app.js`) is currently unused.

**Role assignment logic** lives in `src/utils/roleAssignment.js` as pure functions. The exported `assignRoles(players, teamComposition, playerAvailability, roleNames)` modifies `player.role` in-place across four phases.

**Key config**: `vite.config.mjs` sets base path to `/marvel-rivals-randomizer/` and uses auto-imports for Vue, Vue Router, and Vuetify. Path alias `@/` maps to `src/`.
