import { describe, test, expect } from 'vitest'
import { assignRoles, zeroCounts, findSwappablePlayer } from '../roleAssignment.js'

const ROLES = ['Vanguard', 'Duelist', 'Strategist']

function makePlayers(configs) {
  return configs.map(([name, V, D, S]) => ({
    name,
    Vanguard: V,
    Duelist: D,
    Strategist: S,
  }))
}

function countByRole(players) {
  return Object.fromEntries(ROLES.map(r => [r, players.filter(p => p.role === r).length]))
}

// ---------------------------------------------------------------------------
// Core invariants
// ---------------------------------------------------------------------------
describe('assignRoles — core invariants', () => {
  test('every player gets a role', () => {
    const players = makePlayers([
      ['P1', true, true,  true ],
      ['P2', true, true,  true ],
      ['P3', true, true,  true ],
      ['P4', true, true,  true ],
      ['P5', true, true,  true ],
      ['P6', true, true,  true ],
    ])
    assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
    players.forEach(p => expect(p.role).toBeTruthy())
  })

  test('role counts exactly match teamComposition', () => {
    const players = makePlayers([
      ['P1', true, true, true],
      ['P2', true, true, true],
      ['P3', true, true, true],
      ['P4', true, true, true],
      ['P5', true, true, true],
      ['P6', true, true, true],
    ])
    assignRoles(players, { Vanguard: 1, Duelist: 3, Strategist: 2 }, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(1)
    expect(counts.Duelist).toBe(3)
    expect(counts.Strategist).toBe(2)
  })

  test('assigned role is always one the player wanted', () => {
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true,  true,  false],
        ['P2', true,  true,  false],
        ['P3', true,  true,  false],
        ['P4', false, true,  true ],
        ['P5', false, true,  true ],
        ['P6', false, true,  true ],
      ])
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 3, Duelist: 6, Strategist: 3 }, ROLES)
      players.forEach(p => expect(p[p.role]).toBe(true))
    }
  })

  test('clears previous role assignments before re-running', () => {
    const players = makePlayers([
      ['P1', true, true, true],
      ['P2', true, true, true],
      ['P3', true, true, true],
      ['P4', true, true, true],
      ['P5', true, true, true],
      ['P6', true, true, true],
    ])
    const comp  = { Vanguard: 2, Duelist: 2, Strategist: 2 }
    const avail = { Vanguard: 6, Duelist: 6, Strategist: 6 }
    assignRoles(players, comp, avail, ROLES)
    assignRoles(players, comp, avail, ROLES)
    players.forEach(p => expect(p.role).toBeTruthy())
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(2)
    expect(counts.Duelist).toBe(2)
    expect(counts.Strategist).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Instalock — players who want exactly one role
// ---------------------------------------------------------------------------
describe('assignRoles — instalock players', () => {
  test('instalock player is assigned their only desired role', () => {
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', false, true,  false],
      ['P3', false, false, true ],
      ['P4', true,  true,  true ],
      ['P5', true,  true,  true ],
      ['P6', true,  true,  true ],
    ])
    assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 4, Duelist: 4, Strategist: 4 }, ROLES)
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Duelist')
    expect(players[2].role).toBe('Strategist')
  })

  test('does not throw when an unrelated role is at capacity before the player is processed', () => {
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', true,  false, false],
      ['P3', false, true,  false],
      ['P4', false, true,  true ],
      ['P5', false, true,  true ],
      ['P6', false, false, true ],
    ])
    expect(() =>
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 2, Duelist: 3, Strategist: 3 }, ROLES)
    ).not.toThrow()
    expect(players[2].role).toBe('Duelist')
  })

  test('throws when more instalock players want a role than slots allow', () => {
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', true,  false, false],
      ['P3', true,  false, false],
      ['P4', false, true,  true ],
      ['P5', false, true,  true ],
      ['P6', false, true,  true ],
    ])
    expect(() =>
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 3, Duelist: 4, Strategist: 4 }, ROLES)
    ).toThrow('Too many people want to instalock Vanguard')
  })
})

// ---------------------------------------------------------------------------
// Instalock detection edge cases
// (targets the forEach+push → filter refactor)
// ---------------------------------------------------------------------------
describe('instalock detection — edge cases', () => {
  test('player wanting all roles is NOT treated as instalock and can receive any role', () => {
    // A truly flexible player should receive different roles across many runs,
    // proving they are not locked to one role by instalock logic.
    const seenRoles = new Set()
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true, true, true], // flexible — roleCount=3, NOT instalock
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
      seenRoles.add(players[0].role)
    }
    expect(seenRoles.size).toBeGreaterThan(1)
  })

  test('player wanting exactly 2 roles is NOT treated as instalock', () => {
    // roleCount=2, should be randomly assigned between their two preferred roles,
    // never to the third role they don't want.
    const seenRoles = new Set()
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true,  true,  false], // wants V or D, NOT instalock
        ['P2', true,  true,  false],
        ['P3', true,  true,  false],
        ['P4', false, true,  true ],
        ['P5', false, true,  true ],
        ['P6', false, true,  true ],
      ])
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 3, Duelist: 6, Strategist: 3 }, ROLES)
      seenRoles.add(players[0].role)
    }
    // P1 should appear in both Vanguard and Duelist across runs (not locked)
    expect(seenRoles.has('Strategist')).toBe(false) // never assigned unwanted role
    expect(seenRoles.size).toBeGreaterThan(1)        // assigned different roles across runs
  })

  test('player wanting 0 roles is not processed by instalock logic (roleCount=0, not 1)', () => {
    // roleCount=0 means the player is never added to instalockPlayers.
    // They should be force-assigned a role without throwing.
    const players = makePlayers([
      ['P1', false, false, false], // wants nothing — must be force-assigned
      ['P2', true,  true,  true ],
      ['P3', true,  true,  true ],
      ['P4', true,  true,  true ],
      ['P5', true,  true,  true ],
      ['P6', true,  true,  true ],
    ])
    expect(() =>
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 5, Duelist: 5, Strategist: 5 }, ROLES)
    ).not.toThrow()
    expect(players[0].role).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Player availability counting
// (targets the forEach+mutation → reduce refactor in validatePlayerRoles)
// The availability count drives minimal-role detection in assignRoles.
// ---------------------------------------------------------------------------
describe('player availability counting', () => {
  test('minimal role detected when availability exactly equals composition — players locked in every run', () => {
    // Strategist availability=2 equals composition=2 → minimal.
    // P5 and P6 must always end up in Strategist regardless of shuffle.
    for (let i = 0; i < 50; i++) {
      const players = makePlayers([
        ['P1', true,  true,  false],
        ['P2', true,  true,  false],
        ['P3', true,  true,  false],
        ['P4', true,  true,  false],
        ['P5', false, false, true ],
        ['P6', false, false, true ],
      ])
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 4, Duelist: 4, Strategist: 2 }, ROLES)
      expect(players[4].role).toBe('Strategist')
      expect(players[5].role).toBe('Strategist')
    }
  })

  test('non-minimal role distributes randomly when availability exceeds composition', () => {
    // All 6 players want all roles (availability=6), composition=2 each.
    // No role is minimal — assignment should be random.
    // Any player should be capable of ending up in any role across many runs.
    const seenVanguard = new Set()
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true, true, true],
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
      players.filter(p => p.role === 'Vanguard').forEach(p => seenVanguard.add(p.name))
    }
    // Multiple distinct players should have been assigned Vanguard — proves no locking
    expect(seenVanguard.size).toBeGreaterThan(2)
  })

  test('correct counts for mixed availability per role', () => {
    // P1-P3 want Vanguard only (instalock) → availability.Vanguard = 3 (but composition = 2, throws).
    // Use a safe version: P1-P2 instalock Vanguard (fills it), P3-P6 flexible.
    // Verify: after assignment, Vanguard has exactly 2 and the right players have it.
    const players = makePlayers([
      ['P1', true,  false, false], // instalock Vanguard
      ['P2', true,  false, false], // instalock Vanguard
      ['P3', false, true,  true ],
      ['P4', false, true,  true ],
      ['P5', false, true,  true ],
      ['P6', false, true,  true ],
    ])
    assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 2, Duelist: 4, Strategist: 4 }, ROLES)
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Vanguard')
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(2)
    expect(counts.Duelist).toBe(2)
    expect(counts.Strategist).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// allRolesFilled behavior
// (targets the extracted allRolesFilled helper used in randomlyAssignRoles
// and findSwappablePlayer — verifies the early-exit condition is correct)
// ---------------------------------------------------------------------------
describe('allRolesFilled behavior', () => {
  test('no role ever exceeds its composition count across 500 random shuffles', () => {
    // If allRolesFilled exit condition fires too late, roles get over-assigned.
    const comp = { Vanguard: 2, Duelist: 2, Strategist: 2 }
    for (let i = 0; i < 500; i++) {
      const players = makePlayers([
        ['P1', true,  true,  false],
        ['P2', true,  true,  false],
        ['P3', true,  true,  false],
        ['P4', false, true,  true ],
        ['P5', false, false, true ],
        ['P6', false, false, true ],
      ])
      assignRoles(players, comp, { Vanguard: 3, Duelist: 4, Strategist: 3 }, ROLES)
      const counts = countByRole(players)
      ROLES.forEach(role => {
        expect(counts[role], `${role} over-assigned on iteration ${i}`).toBe(comp[role])
      })
    }
  })

  test('assignment does not exit early when roles are not yet all filled', () => {
    // If allRolesFilled fired on partial fill, some players would be left unassigned.
    // Asymmetric composition (1/2/3) means roles fill at different times.
    const comp = { Vanguard: 1, Duelist: 2, Strategist: 3 }
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true, true, true],
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(players, comp, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
      players.forEach(p => expect(p.role).toBeTruthy())
      const counts = countByRole(players)
      expect(counts.Vanguard).toBe(1)
      expect(counts.Duelist).toBe(2)
      expect(counts.Strategist).toBe(3)
    }
  })
})

// ---------------------------------------------------------------------------
// Minimal roles
// ---------------------------------------------------------------------------
describe('assignRoles — minimal role constraint', () => {
  test('players are locked into a role when they are the only ones available for it', () => {
    const players = makePlayers([
      ['P1', true,  true,  false],
      ['P2', true,  true,  false],
      ['P3', true,  true,  false],
      ['P4', true,  true,  false],
      ['P5', false, false, true ],
      ['P6', false, false, true ],
    ])
    assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 4, Duelist: 4, Strategist: 2 }, ROLES)
    expect(players[4].role).toBe('Strategist')
    expect(players[5].role).toBe('Strategist')
  })
})

// ---------------------------------------------------------------------------
// Player name defaulting
// ---------------------------------------------------------------------------
describe('assignRoles — player name defaulting', () => {
  test('empty player names are set to "Player N"', () => {
    const players = makePlayers([
      ['', true, true, true],
      ['', true, true, true],
      ['', true, true, true],
      ['', true, true, true],
      ['', true, true, true],
      ['', true, true, true],
    ])
    assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
    players.forEach((p, i) => expect(p.name).toBe(`Player ${i + 1}`))
  })

  test('existing player names are preserved', () => {
    const players = makePlayers([
      ['Alice', true, true, true],
      ['Bob',   true, true, true],
      ['Carol', true, true, true],
      ['Dave',  true, true, true],
      ['Eve',   true, true, true],
      ['Frank', true, true, true],
    ])
    assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 6, Duelist: 6, Strategist: 6 }, ROLES)
    expect(players.map(p => p.name)).toEqual(['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'])
  })
})

// ---------------------------------------------------------------------------
// Force assignment
// ---------------------------------------------------------------------------
describe('assignRoles — force assignment', () => {
  test('player is placed in a non-preferred role when all preferred roles are full', () => {
    for (let i = 0; i < 50; i++) {
      const players = makePlayers([
        ['P1', true,  true,  false],
        ['P2', true,  true,  false],
        ['P3', true,  true,  false],
        ['P4', true,  true,  false],
        ['P5', true,  true,  false],
        ['P6', false, false, true ],
      ])
      assignRoles(players, { Vanguard: 2, Duelist: 2, Strategist: 2 }, { Vanguard: 5, Duelist: 5, Strategist: 1 }, ROLES)
      players.forEach(p => expect(p.role).toBeTruthy())
      const counts = countByRole(players)
      expect(counts.Vanguard).toBe(2)
      expect(counts.Duelist).toBe(2)
      expect(counts.Strategist).toBe(2)
      expect(players[5].role).toBe('Strategist')
    }
  })
})

// ---------------------------------------------------------------------------
// zeroCounts utility
// ---------------------------------------------------------------------------
describe('zeroCounts', () => {
  test('empty array returns empty object', () => {
    expect(zeroCounts([])).toEqual({})
  })

  test('single role returns object with that role at 0', () => {
    expect(zeroCounts(['Vanguard'])).toEqual({ Vanguard: 0 })
  })

  test('multiple roles all initialized to 0', () => {
    expect(zeroCounts(['Vanguard', 'Duelist', 'Strategist'])).toEqual({
      Vanguard: 0,
      Duelist: 0,
      Strategist: 0,
    })
  })

  test('does not mutate the input array', () => {
    const roles = ['Vanguard', 'Duelist']
    zeroCounts(roles)
    expect(roles).toEqual(['Vanguard', 'Duelist'])
  })
})

// ---------------------------------------------------------------------------
// Cascade minimal detection
// Filling one minimal role can expose a second minimal role among the
// remaining players, which must then also be locked in deterministically.
// ---------------------------------------------------------------------------
describe('assignRoles — cascade minimal detection', () => {
  test('locking first minimal role reveals second minimal role', () => {
    // P1+P2 want V+D (avail V=2 = comp V=2 → V is minimal in initial pass).
    // After V is filled, remaining players P3+P4 are the only D-eligible
    // players left (avail D among remaining = 2 = comp D = 2 → D becomes minimal).
    // P5+P6 are instalocked to S so they fill S before minimal detection runs.
    const players = makePlayers([
      ['P1', true,  true,  false],
      ['P2', true,  true,  false],
      ['P3', false, true,  true ],
      ['P4', false, true,  true ],
      ['P5', false, false, true ],  // instalock S
      ['P6', false, false, true ],  // instalock S
    ])
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      { Vanguard: 2, Duelist: 4, Strategist: 4 },
      ROLES,
    )
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Vanguard')
    expect(players[2].role).toBe('Duelist')
    expect(players[3].role).toBe('Duelist')
    expect(players[4].role).toBe('Strategist')
    expect(players[5].role).toBe('Strategist')
  })

  test('triple cascade: each locked role reveals the next minimal role', () => {
    // P1+P2 only want V → V minimal → locked.
    // That leaves P3+P4 as the only D-eligible remaining → D minimal → locked.
    // That leaves P5+P6 as the only S-eligible remaining → S minimal → locked.
    // All assignments are fully deterministic.
    const players = makePlayers([
      ['P1', true,  false, false],  // instalock V
      ['P2', true,  false, false],  // instalock V
      ['P3', false, true,  false],  // instalock D
      ['P4', false, true,  false],  // instalock D
      ['P5', false, false, true ],  // instalock S
      ['P6', false, false, true ],  // instalock S
    ])
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      ROLES,
    )
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Vanguard')
    expect(players[2].role).toBe('Duelist')
    expect(players[3].role).toBe('Duelist')
    expect(players[4].role).toBe('Strategist')
    expect(players[5].role).toBe('Strategist')
  })
})

// ---------------------------------------------------------------------------
// All instalocked
// ---------------------------------------------------------------------------
describe('assignRoles — all players instalocked', () => {
  test('all 6 players instalocked into perfect 2/2/2 composition', () => {
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', true,  false, false],
      ['P3', false, true,  false],
      ['P4', false, true,  false],
      ['P5', false, false, true ],
      ['P6', false, false, true ],
    ])
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      ROLES,
    )
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Vanguard')
    expect(players[2].role).toBe('Duelist')
    expect(players[3].role).toBe('Duelist')
    expect(players[4].role).toBe('Strategist')
    expect(players[5].role).toBe('Strategist')
  })

  test('throws when instalocked players exceed capacity for any role', () => {
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', true,  false, false],
      ['P3', true,  false, false],  // three instalock V but comp only allows 2
      ['P4', false, true,  false],
      ['P5', false, false, true ],
      ['P6', false, false, true ],
    ])
    expect(() =>
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 3, Duelist: 1, Strategist: 2 },
        ROLES,
      )
    ).toThrow('Too many people want to instalock Vanguard')
  })
})

// ---------------------------------------------------------------------------
// Composition edge cases
// ---------------------------------------------------------------------------
describe('assignRoles — composition edge cases', () => {
  test('role with composition 0 receives no assignments', () => {
    const players = makePlayers([
      ['P1', true, true, true],
      ['P2', true, true, true],
      ['P3', true, true, true],
      ['P4', true, true, true],
      ['P5', true, true, true],
      ['P6', true, true, true],
    ])
    assignRoles(
      players,
      { Vanguard: 3, Duelist: 3, Strategist: 0 },
      { Vanguard: 6, Duelist: 6, Strategist: 6 },
      ROLES,
    )
    players.forEach(p => expect(p.role).not.toBe('Strategist'))
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(3)
    expect(counts.Duelist).toBe(3)
    expect(counts.Strategist).toBe(0)
  })

  test('extreme: all players assigned to one role', () => {
    const players = makePlayers([
      ['P1', true, true, true],
      ['P2', true, true, true],
      ['P3', true, true, true],
      ['P4', true, true, true],
      ['P5', true, true, true],
      ['P6', true, true, true],
    ])
    assignRoles(
      players,
      { Vanguard: 6, Duelist: 0, Strategist: 0 },
      { Vanguard: 6, Duelist: 6, Strategist: 6 },
      ROLES,
    )
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(6)
    expect(counts.Duelist).toBe(0)
    expect(counts.Strategist).toBe(0)
  })

  test('asymmetric composition with instalocked players', () => {
    const players = makePlayers([
      ['P1', true,  false, false],  // instalock V
      ['P2', false, true,  false],  // instalock D
      ['P3', true,  true,  true ],
      ['P4', true,  true,  true ],
      ['P5', true,  true,  true ],
      ['P6', true,  true,  true ],
    ])
    assignRoles(
      players,
      { Vanguard: 1, Duelist: 3, Strategist: 2 },
      { Vanguard: 5, Duelist: 5, Strategist: 4 },
      ROLES,
    )
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Duelist')
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(1)
    expect(counts.Duelist).toBe(3)
    expect(counts.Strategist).toBe(2)
  })

  test('works with fewer than 6 players', () => {
    const players = makePlayers([
      ['P1', true, true, true],
      ['P2', true, true, true],
      ['P3', true, true, true],
    ])
    assignRoles(
      players,
      { Vanguard: 1, Duelist: 1, Strategist: 1 },
      { Vanguard: 3, Duelist: 3, Strategist: 3 },
      ROLES,
    )
    players.forEach(p => expect(p.role).toBeTruthy())
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(1)
    expect(counts.Duelist).toBe(1)
    expect(counts.Strategist).toBe(1)
  })

  test('works with a two-role setup', () => {
    const twoRoles = ['Vanguard', 'Duelist']
    const players = [
      { name: 'P1', Vanguard: true, Duelist: true },
      { name: 'P2', Vanguard: true, Duelist: true },
      { name: 'P3', Vanguard: true, Duelist: true },
      { name: 'P4', Vanguard: true, Duelist: true },
    ]
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2 },
      { Vanguard: 4, Duelist: 4 },
      twoRoles,
    )
    const counts = players.reduce((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1
      return acc
    }, {})
    expect(counts.Vanguard).toBe(2)
    expect(counts.Duelist).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Player name defaulting — mixed names
// ---------------------------------------------------------------------------
describe('assignRoles — mixed player names', () => {
  test('only empty names are replaced; existing names are preserved', () => {
    const players = makePlayers([
      ['Alice', true, true, true],
      ['',      true, true, true],
      ['Bob',   true, true, true],
      ['',      true, true, true],
      ['Carol', true, true, true],
      ['',      true, true, true],
    ])
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      { Vanguard: 6, Duelist: 6, Strategist: 6 },
      ROLES,
    )
    expect(players[0].name).toBe('Alice')
    expect(players[1].name).toBe('Player 2')
    expect(players[2].name).toBe('Bob')
    expect(players[3].name).toBe('Player 4')
    expect(players[4].name).toBe('Carol')
    expect(players[5].name).toBe('Player 6')
  })
})

// ---------------------------------------------------------------------------
// Randomization variance
// When no constraints force determinism, different players should receive
// different roles across repeated runs.
// ---------------------------------------------------------------------------
describe('assignRoles — randomization variance', () => {
  test('every player appears in every role across enough runs', () => {
    const seenIn = Object.fromEntries(ROLES.map(r => [r, new Set()]))
    for (let i = 0; i < 200; i++) {
      const players = makePlayers([
        ['P1', true, true, true],
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 6, Duelist: 6, Strategist: 6 },
        ROLES,
      )
      players.forEach(p => seenIn[p.role].add(p.name))
    }
    // Each role should have seen all 6 players across 200 runs
    ROLES.forEach(role => {
      expect(seenIn[role].size, `${role} never received some players`).toBe(6)
    })
  })

  test('same setup produces different role orderings across runs', () => {
    const snapshots = new Set()
    for (let i = 0; i < 50; i++) {
      const players = makePlayers([
        ['P1', true, true, true],
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 6, Duelist: 6, Strategist: 6 },
        ROLES,
      )
      snapshots.add(players.map(p => p.role).join(','))
    }
    // 90 possible orderings — 50 runs should yield many distinct ones
    expect(snapshots.size).toBeGreaterThan(5)
  })
})

// ---------------------------------------------------------------------------
// findSwappablePlayer — direct unit tests
//
// These tests bypass the random phase entirely by constructing the exact
// intermediate state that findSwappablePlayer receives. Every test is
// 100% deterministic.
//
// Double-swap bug: the buggy implementation had no guard on emptyPlayer.role
// and no guard on counts[emptyRole] >= teamComposition[emptyRole]. When P3
// was the emptyPlayer and both P1 and P2 were in rolePlayers[Duelist], the
// inner loop swapped P1→V (swap 1) then kept iterating and swapped P2→V
// (swap 2). Swap 2 vacated a Duelist slot without filling it (P3 was already
// in Duelist from swap 1), so counts.Duelist stayed overcounted and P4 was
// left with no role.
// ---------------------------------------------------------------------------
describe('findSwappablePlayer — direct unit tests', () => {
  // Shared helpers for building the state findSwappablePlayer receives.
  // Players: P1+P2 assigned to Duelist, P3+P4 unassigned, P5+P6 assigned to Strategist.
  // Vanguard needs 2 more players. P3 and P4 want Duelist+Strategist (both full).
  function makeSwapState() {
    const players = makePlayers([
      ['P1', true,  true,  false],  // V+D — currently in Duelist
      ['P2', true,  true,  false],  // V+D — currently in Duelist
      ['P3', false, true,  true ],  // D+S — unassigned
      ['P4', false, true,  true ],  // D+S — unassigned
      ['P5', true,  false, true ],  // V+S — currently in Strategist
      ['P6', true,  false, true ],  // V+S — currently in Strategist
    ])
    players[0].role = 'Duelist'
    players[1].role = 'Duelist'
    players[4].role = 'Strategist'
    players[5].role = 'Strategist'

    const comp = { Vanguard: 2, Duelist: 2, Strategist: 2 }
    // counts reflect the random-phase assignments above
    const counts = { Vanguard: 0, Duelist: 2, Strategist: 2 }

    // rolePlayers mirrors what populateRoleBuckets produced before the random phase
    const rolePlayers = new Map([
      ['Vanguard',   [players[0], players[1], players[4], players[5]]],
      ['Duelist',    [players[0], players[1], players[2], players[3]]],
      ['Strategist', [players[2], players[3], players[4], players[5]]],
    ])

    const assignableRoles = ROLES

    return { players, comp, counts, rolePlayers, assignableRoles }
  }

  test('BUG: double-swap leaves P4 unassigned and overcounts Duelist', () => {
    // With the buggy implementation this test fails — P4.role is '' and
    // counts.Duelist reports 2 while only P3 actually holds that role.
    const { players, comp, counts, rolePlayers, assignableRoles } = makeSwapState()

    findSwappablePlayer(players, rolePlayers, assignableRoles, counts, comp)

    // Every player must have a role after the swap phase.
    players.forEach(p => expect(p.role, `${p.name} has no role`).toBeTruthy())

    // Counts must reflect actual assignments, not stale bookkeeping.
    const actual = countByRole(players)
    expect(actual.Vanguard).toBe(2)
    expect(actual.Duelist).toBe(2)
    expect(actual.Strategist).toBe(2)
  })

  test('each swapped player receives a role they wanted', () => {
    const { players, comp, counts, rolePlayers, assignableRoles } = makeSwapState()

    findSwappablePlayer(players, rolePlayers, assignableRoles, counts, comp)

    players.forEach(p => {
      if (p.role) expect(p[p.role], `${p.name} got unwanted role ${p.role}`).toBe(true)
    })
  })

  test('happy path: single unassigned player placed via one swap', () => {
    // P3 is unassigned. P3 wants V+S. V is full, S is full, D is open.
    // P1 is in Vanguard and also wants Duelist.
    // Swap: P3 takes Vanguard (possibleRole), P1 moves to Duelist (emptyRole).
    // possibleRole ≠ emptyRole — this is a true displacement swap.
    const players = makePlayers([
      ['P1', true,  true,  false],  // V+D, currently in Vanguard
      ['P2', true,  false, false],  // V only, in Vanguard — fills V to 2/2
      ['P3', true,  false, true ],  // V+S, unassigned (V full, S full)
      ['P4', false, true,  false],  // D only, in Duelist
      ['P5', false, false, true ],  // S only, in Strategist
      ['P6', false, false, true ],  // S only, in Strategist
    ])
    players[0].role = 'Vanguard'
    players[1].role = 'Vanguard'
    // players[2].role stays '' — unassigned
    players[3].role = 'Duelist'
    players[4].role = 'Strategist'
    players[5].role = 'Strategist'

    const comp   = { Vanguard: 2, Duelist: 2, Strategist: 2 }
    const counts = { Vanguard: 2, Duelist: 1, Strategist: 2 }
    const rolePlayers = new Map([
      ['Vanguard',   [players[0], players[1], players[2]]],
      ['Duelist',    [players[0], players[3]]],
      ['Strategist', [players[2], players[4], players[5]]],
    ])

    findSwappablePlayer(players, rolePlayers, ROLES, counts, comp)

    // P3 should take Vanguard; P1 should move to Duelist to fill the open slot.
    expect(players[2].role).toBe('Vanguard')
    expect(players[0].role).toBe('Duelist')
    const actual = countByRole(players)
    expect(actual.Vanguard).toBe(2)
    expect(actual.Duelist).toBe(2)
    expect(actual.Strategist).toBe(2)
  })

  test('no-op when every unassigned player has no viable swap chain', () => {
    // P3 is unassigned and wants only Strategist. Strategist is full.
    // Nobody in rolePlayers[Strategist] can play Vanguard (the unfilled role).
    // findSwappablePlayer should leave P3 unassigned — no crash, no side effects.
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', true,  false, false],
      ['P3', false, false, true ],
      ['P4', false, true,  false],
      ['P5', false, true,  false],
      ['P6', false, false, true ],
    ])
    players[0].role = 'Vanguard'
    players[3].role = 'Duelist'
    players[4].role = 'Duelist'
    players[5].role = 'Strategist'
    // P2 and P3 unassigned. V needs 1 more, S needs 1 more.
    // P3 wants only S — can't chain to V. P2 wants only V — placed directly.
    players[1].role = ''
    players[2].role = ''

    const comp     = { Vanguard: 2, Duelist: 2, Strategist: 2 }
    const counts   = { Vanguard: 1, Duelist: 2, Strategist: 1 }
    const rolePlayers = new Map([
      ['Vanguard',   [players[0], players[1]]],
      ['Duelist',    [players[3], players[4]]],
      ['Strategist', [players[2], players[5]]],
    ])

    // Should not throw; P2 can be placed via swap (P2 wants V directly, so
    // findSwappablePlayer will assign P2 via swap or leave to force phase).
    expect(() =>
      findSwappablePlayer(players, rolePlayers, ROLES, counts, comp)
    ).not.toThrow()

    // counts must not exceed composition for any role
    ROLES.forEach(role => expect(counts[role]).toBeLessThanOrEqual(comp[role]))
  })
})

// ---------------------------------------------------------------------------
// Impossible assignment scenarios
// Cases where the numbers appear valid but assignment is impossible.
// ---------------------------------------------------------------------------
describe('assignRoles — impossible assignment scenarios', () => {
  test('instalock conflict: 3 players instalock a role with only 2 slots (playerAvailability passes, assignRoles throws)', () => {
    // validatePlayerRoles sees V:3 ≥ comp.V:2, D:2 ≥ comp.D:2, S:2 ≥ comp.S:2 — no errors.
    // But inside assignRoles, 3 players instalock V (only want V), overflowing the 2 V slots.
    const players = makePlayers([
      ['P1', true,  false, false],  // instalock V
      ['P2', false, true,  true ],  // D + S (flexible)
      ['P3', false, false, true ],  // instalock S
      ['P4', false, true,  false],  // instalock D
      ['P5', true,  false, false],  // instalock V
      ['P6', true,  false, false],  // instalock V — third V instalock
    ])
    expect(() =>
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 3, Duelist: 2, Strategist: 2 },
        ROLES,
      )
    ).toThrow('Too many people want to instalock Vanguard')
  })

  test('instalock conflict on Duelist: 3 D-only players fight for 1 D slot', () => {
    const players = makePlayers([
      ['P1', false, true,  false],  // instalock D
      ['P2', false, true,  false],  // instalock D
      ['P3', false, true,  false],  // instalock D — third D instalock for 1 slot
      ['P4', true,  false, false],  // instalock V
      ['P5', true,  false, false],  // instalock V
      ['P6', false, false, true ],  // instalock S
    ])
    expect(() =>
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 1, Strategist: 3 },
        { Vanguard: 2, Duelist: 3, Strategist: 1 },
        ROLES,
      )
    ).toThrow('Too many people want to instalock Duelist')
  })
})

// ---------------------------------------------------------------------------
// 0-role players
// The UI does not fully prevent deselecting all roles. When a player has
// all preferences false, they must be force-assigned to an unfilled slot.
// ---------------------------------------------------------------------------
describe('assignRoles — 0-role players', () => {
  test('single player with no role preferences is force-assigned to an unfilled slot', () => {
    const players = makePlayers([
      ['P1', false, false, false],  // no preferences at all
      ['P2', true,  true,  true ],
      ['P3', true,  true,  true ],
      ['P4', true,  true,  true ],
      ['P5', true,  true,  true ],
      ['P6', true,  true,  true ],
    ])
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      { Vanguard: 5, Duelist: 5, Strategist: 5 },
      ROLES,
    )
    expect(players[0].role).toBeTruthy()
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(2)
    expect(counts.Duelist).toBe(2)
    expect(counts.Strategist).toBe(2)
  })

  test('two players with no role preferences are both force-assigned', () => {
    const players = makePlayers([
      ['P1', false, false, false],
      ['P2', false, false, false],
      ['P3', true,  true,  true ],
      ['P4', true,  true,  true ],
      ['P5', true,  true,  true ],
      ['P6', true,  true,  true ],
    ])
    assignRoles(
      players,
      { Vanguard: 2, Duelist: 2, Strategist: 2 },
      { Vanguard: 4, Duelist: 4, Strategist: 4 },
      ROLES,
    )
    expect(players[0].role).toBeTruthy()
    expect(players[1].role).toBeTruthy()
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(2)
    expect(counts.Duelist).toBe(2)
    expect(counts.Strategist).toBe(2)
  })

  test('0-role player is never double-assigned: each role slot filled exactly once', () => {
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', false, false, false],
        ['P2', true,  true,  true ],
        ['P3', true,  true,  true ],
        ['P4', true,  true,  true ],
        ['P5', true,  true,  true ],
        ['P6', true,  true,  true ],
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 5, Duelist: 5, Strategist: 5 },
        ROLES,
      )
      const counts = countByRole(players)
      ROLES.forEach(role => expect(counts[role]).toBe(2))
    }
  })
})

// ---------------------------------------------------------------------------
// All 7 preference profiles
// Tests that cover every distinct role-preference combination a player can
// have (V, D, S, V+D, V+S, D+S, V+D+S).
// ---------------------------------------------------------------------------
describe('assignRoles — all 7 preference profiles', () => {
  test('V+S players: never assigned to Duelist when other options exist', () => {
    // P1+P2 want only V+S. With 2 V slots and 2 S slots, they should
    // always end up in V or S, never forced into D.
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true,  false, true ],  // V + S
        ['P2', true,  false, true ],  // V + S
        ['P3', false, true,  false],  // instalock D
        ['P4', false, true,  false],  // instalock D
        ['P5', true,  true,  true ],  // flexible
        ['P6', true,  true,  true ],  // flexible
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 4, Duelist: 4, Strategist: 2 },
        ROLES,
      )
      expect(players[0].role).not.toBe('Duelist')
      expect(players[1].role).not.toBe('Duelist')
      expect(players[2].role).toBe('Duelist')
      expect(players[3].role).toBe('Duelist')
    }
  })

  test('D+S players: never assigned to Vanguard when other options exist', () => {
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', false, true,  true ],  // D + S
        ['P2', false, true,  true ],  // D + S
        ['P3', true,  false, false],  // instalock V
        ['P4', true,  false, false],  // instalock V
        ['P5', true,  true,  true ],  // flexible
        ['P6', true,  true,  true ],  // flexible
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 4, Duelist: 4, Strategist: 2 },
        ROLES,
      )
      expect(players[0].role).not.toBe('Vanguard')
      expect(players[1].role).not.toBe('Vanguard')
      expect(players[2].role).toBe('Vanguard')
      expect(players[3].role).toBe('Vanguard')
    }
  })

  test('V+D players: never assigned to Strategist when other options exist', () => {
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true,  true,  false],  // V + D
        ['P2', true,  true,  false],  // V + D
        ['P3', false, false, true ],  // instalock S
        ['P4', false, false, true ],  // instalock S
        ['P5', true,  true,  true ],  // flexible
        ['P6', true,  true,  true ],  // flexible
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 4, Duelist: 4, Strategist: 2 },
        ROLES,
      )
      expect(players[0].role).not.toBe('Strategist')
      expect(players[1].role).not.toBe('Strategist')
      expect(players[2].role).toBe('Strategist')
      expect(players[3].role).toBe('Strategist')
    }
  })

  test('mixed game: all 7 profiles present, every player gets a role they wanted', () => {
    // Only 6 players so one profile is omitted; use V, D, S, V+D, V+S, D+S.
    // Every player should get a role that matches their preferences.
    for (let i = 0; i < 100; i++) {
      const players = makePlayers([
        ['P1', true,  false, false],  // V only (instalock)
        ['P2', false, true,  false],  // D only (instalock)
        ['P3', false, false, true ],  // S only (instalock)
        ['P4', true,  true,  false],  // V + D
        ['P5', true,  false, true ],  // V + S
        ['P6', false, true,  true ],  // D + S
      ])
      assignRoles(
        players,
        { Vanguard: 2, Duelist: 2, Strategist: 2 },
        { Vanguard: 3, Duelist: 3, Strategist: 3 },
        ROLES,
      )
      players.forEach(p => {
        expect(p.role).toBeTruthy()
        expect(p[p.role]).toBe(true)
      })
      const counts = countByRole(players)
      expect(counts.Vanguard).toBe(2)
      expect(counts.Duelist).toBe(2)
      expect(counts.Strategist).toBe(2)
    }
  })
})

// ---------------------------------------------------------------------------
// Additional composition coverage
// ---------------------------------------------------------------------------
describe('assignRoles — composition coverage', () => {
  test('composition 4/1/1: heavy Vanguard skew', () => {
    const players = makePlayers([
      ['P1', true,  true,  true ],
      ['P2', true,  true,  true ],
      ['P3', true,  true,  true ],
      ['P4', true,  true,  true ],
      ['P5', true,  true,  true ],
      ['P6', true,  true,  true ],
    ])
    assignRoles(
      players,
      { Vanguard: 4, Duelist: 1, Strategist: 1 },
      { Vanguard: 6, Duelist: 6, Strategist: 6 },
      ROLES,
    )
    const counts = countByRole(players)
    expect(counts.Vanguard).toBe(4)
    expect(counts.Duelist).toBe(1)
    expect(counts.Strategist).toBe(1)
  })

  test('composition 1/2/3: ascending skew, all players flexible', () => {
    for (let i = 0; i < 50; i++) {
      const players = makePlayers([
        ['P1', true, true, true],
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(
        players,
        { Vanguard: 1, Duelist: 2, Strategist: 3 },
        { Vanguard: 6, Duelist: 6, Strategist: 6 },
        ROLES,
      )
      const counts = countByRole(players)
      expect(counts.Vanguard).toBe(1)
      expect(counts.Duelist).toBe(2)
      expect(counts.Strategist).toBe(3)
    }
  })

  test('composition 3/3/0: Strategist unused, all players flexible', () => {
    for (let i = 0; i < 50; i++) {
      const players = makePlayers([
        ['P1', true, true, true],
        ['P2', true, true, true],
        ['P3', true, true, true],
        ['P4', true, true, true],
        ['P5', true, true, true],
        ['P6', true, true, true],
      ])
      assignRoles(
        players,
        { Vanguard: 3, Duelist: 3, Strategist: 0 },
        { Vanguard: 6, Duelist: 6, Strategist: 6 },
        ROLES,
      )
      const counts = countByRole(players)
      expect(counts.Vanguard).toBe(3)
      expect(counts.Duelist).toBe(3)
      expect(counts.Strategist).toBe(0)
      players.forEach(p => expect(p.role).not.toBe('Strategist'))
    }
  })

  test('composition 4/1/1 with all-instalock players filling exactly', () => {
    const players = makePlayers([
      ['P1', true,  false, false],
      ['P2', true,  false, false],
      ['P3', true,  false, false],
      ['P4', true,  false, false],
      ['P5', false, true,  false],
      ['P6', false, false, true ],
    ])
    assignRoles(
      players,
      { Vanguard: 4, Duelist: 1, Strategist: 1 },
      { Vanguard: 4, Duelist: 1, Strategist: 1 },
      ROLES,
    )
    expect(players[0].role).toBe('Vanguard')
    expect(players[1].role).toBe('Vanguard')
    expect(players[2].role).toBe('Vanguard')
    expect(players[3].role).toBe('Vanguard')
    expect(players[4].role).toBe('Duelist')
    expect(players[5].role).toBe('Strategist')
  })
})
