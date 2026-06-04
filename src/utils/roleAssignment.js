export function zeroCounts(roleNames) {
  return Object.fromEntries(roleNames.map(r => [r, 0]));
}

function allRolesFilled(roles, counts, comp) {
  return roles.every(r => counts[r] >= comp[r]);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function assignInstalockPlayerRoles(players, teamComposition, roleNames) {
  const instalockPlayers = players.filter(player =>
    roleNames.reduce((n, role) => player[role] ? n + 1 : n, 0) === 1
  );

  const counts = zeroCounts(roleNames);
  instalockPlayers.forEach(player => {
    roleNames.forEach(role => {
      if (player[role]) {
        if (counts[role] === teamComposition[role]) {
          throw new Error('Too many people want to instalock ' + role);
        }
        player.role = role;
        counts[role]++;
      }
    });
  });
  return counts;
}

function populateRoleBuckets(assignablePlayers, assignableRoles, rolePlayers) {
  assignableRoles.forEach(roleName => { rolePlayers.set(roleName, []); });
  assignablePlayers.forEach(player => {
    assignableRoles.forEach(roleName => {
      if (player[roleName]) rolePlayers.get(roleName).push(player);
    });
  });
}

function fillMinimalRoles(minimalPlayerRoles, rolePlayers) {
  minimalPlayerRoles.forEach(roleName => {
    rolePlayers.get(roleName).forEach(player => {
      if (player.role) throw new Error('It is impossible to assign player roles!');
      player.role = roleName;
    });
  });
}

export function findSwappablePlayer(players, rolePlayers, assignableRoles, counts, teamComposition) {
  const unassignedPlayers = players.filter(p => !p.role);
  const unassignedRoles = assignableRoles.filter(r => teamComposition[r] > counts[r]);

  unassignedPlayers.forEach(emptyPlayer => {
    assignableRoles.forEach(possibleRole => {
      if (!emptyPlayer[possibleRole]) return;
      rolePlayers.get(possibleRole).forEach(player => {
        unassignedRoles.forEach(emptyRole => {
          if (emptyPlayer.role) return;
          if (counts[emptyRole] >= teamComposition[emptyRole]) return;
          if (player[emptyRole] && player.role !== emptyRole) {
            emptyPlayer.role = possibleRole;
            player.role = emptyRole;
            counts[emptyRole]++;
          }
        });
      });
    });
  });
}

function randomlyAssignRoles(rolePlayers, assignableRoles, counts, teamComposition, players) {
  const eligible = [];
  rolePlayers.forEach((ps, role) => {
    ps.forEach(player => eligible.push({ role, player }));
  });

  shuffleArray(eligible);
  for (let i = 0; i < eligible.length; i++) {
    const { role, player } = eligible[i];
    if (player.role) continue;
    if (counts[role] < teamComposition[role]) {
      counts[role]++;
      player.role = role;
    }
    if (allRolesFilled(assignableRoles, counts, teamComposition)) break;
  }

  findSwappablePlayer(players, rolePlayers, assignableRoles, counts, teamComposition);

  // Last-resort: assign remaining players to any open slot they prefer.
  // Players who still have no role after this are caught by the force-assign
  // in assignRoles, which ignores preferences entirely.
  for (let i = 0; i < eligible.length; i++) {
    const { player } = eligible[i];
    if (player.role) continue;
    assignableRoles.forEach(role => {
      if (!player[role]) return;
      if (counts[role] < teamComposition[role]) {
        counts[role]++;
        player.role = role;
      }
    });
  }
}

/**
 * Assigns roles to players in-place. Modifies player.role on each player object.
 * @param {Array} players - array of player objects
 * @param {Object} teamComposition - map of role name → desired count
 * @param {Object} playerAvailability - map of role name → count of players willing to play it
 * @param {string[]} roleNames - ordered list of role names
 */
export function assignRoles(players, teamComposition, playerAvailability, roleNames) {
  players.forEach((player, i) => {
    if (!player.name) player.name = 'Player ' + (i + 1);
    player.role = '';
  });

  const rolePlayers = new Map();
  const counts = assignInstalockPlayerRoles(players, teamComposition, roleNames);

  let assignablePlayers = players.filter(p => !p.role);
  let assignableRoles = roleNames.filter(r => teamComposition[r] > counts[r]);

  let minimalRoles = [];
  assignableRoles.forEach(roleName => {
    rolePlayers.set(roleName, []);
    // teamComposition values are numbers — validateComposition parses them before randomizeTeam calls assignRoles
    if (teamComposition[roleName] === playerAvailability[roleName]) {
      minimalRoles.push(roleName);
    }
  });

  populateRoleBuckets(assignablePlayers, assignableRoles, rolePlayers);

  while (minimalRoles.length > 0) {
    fillMinimalRoles(minimalRoles, rolePlayers);
    assignablePlayers = assignablePlayers.filter(p => !p.role);
    assignableRoles = assignableRoles.filter(r => !minimalRoles.includes(r));
    minimalRoles = [];

    if (assignableRoles.length > 0) {
      populateRoleBuckets(assignablePlayers, assignableRoles, rolePlayers);
      assignableRoles.forEach(roleName => {
        if (teamComposition[roleName] === rolePlayers.get(roleName).length) {
          minimalRoles.push(roleName);
        }
      });
    }
  }

  if (assignableRoles.length > 0) {
    randomlyAssignRoles(rolePlayers, assignableRoles, counts, teamComposition, players);
  }

  // Catch any players not in the eligible pool (e.g. zero role preferences)
  // and force them into any remaining unfilled slots.
  players.forEach(player => {
    if (player.role) return;
    roleNames.forEach(role => {
      if (!player.role && counts[role] < teamComposition[role]) {
        counts[role]++;
        player.role = role;
      }
    });
  });
}
