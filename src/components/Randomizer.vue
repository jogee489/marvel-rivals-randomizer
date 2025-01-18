<template>
  <v-container>
    <v-row>
      <!-- Left Side: Player Input -->
      <v-col cols="6">
        <v-card class="pa-3">
          <v-card-title>
            Player Names
            <v-spacer></v-spacer>
            <v-btn class="mx-1" icon @click="settingsDialog = true">
              <v-icon>mdi-cog</v-icon>
            </v-btn>
            <v-btn class="mx-1" icon @click="characterDialog = true">
              <v-icon>mdi-account-multiple</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text >
            <v-row dense v-for="(player, index) in players" :key="index">
              <v-text-field
                v-model="player.name"
                label="Player Name"
                :placeholder="`Player ${index + 1}`"
                outlined
                class="mb-2"
              ></v-text-field>
              <v-img v-for="role in characterRoles"
                :class="{'clickable': player[role.name], 'inactive': !player[role.name]}"
                @click="toggleRole(role.name, player)"
                :src="role.icon"
                max-height="60"
                max-width="60">
              </v-img>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Settings Dialog -->
        <v-dialog v-model="settingsDialog" max-width="400px">
          <v-card>
            <v-card-title>
              Team Composition
              <v-spacer></v-spacer>
              <v-btn icon @click="settingsDialog = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="teamComposition.Vanguard"
                label="Vanguard"
                type="number"
                min="0"
                max="6"
                outlined
                dense
                class="mb-2"
                @change="validateComposition"
              ></v-text-field>
              <v-text-field
                v-model="teamComposition.Duelist"
                label="Duelist"
                type="number"
                min="0"
                max="6"
                outlined
                dense
                class="mb-2"
                @change="validateComposition"
              ></v-text-field>
              <v-text-field
                v-model="teamComposition.Strategist"
                label="Strategist"
                type="number"
                min="0"
                max="6"
                outlined
                dense
                class="mb-2"
                @change="validateComposition"
              ></v-text-field>
              <p>Total: {{ totalRoles }} / 6</p>
            </v-card-text>
            <v-card-actions>
              <v-btn :disabled="totalRoles !== 6" color="primary" @click="saveSettings">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>

      <!-- Right Side: Randomized Team -->
      <v-col cols="6">
        <v-card class="pa-3">
          <v-card-title class="text-center">
            Vanguard: {{ teamComposition.Vanguard }} | Duelist: {{ teamComposition.Duelist }} | Strategist: {{ teamComposition.Strategist }}
          </v-card-title>
          <v-card-text class="text-center">
            <v-btn color="primary" @click="randomizeTeam" :disabled="totalRoles !== 6">
              Randomize Team
            </v-btn>
            <v-row v-if="randomizedTeam.length" dense>
              <v-col cols="6" v-for="(assignment, index) in randomizedTeam" :key="index">
                <v-card outlined class="pa-1 text-center">
                  <v-img
                    :src="assignment.image"
                    max-height="80"
                    max-width="80"
                    class="mx-auto"
                  ></v-img>
                  <v-card-title class="text-h6">{{ assignment.player.name }}</v-card-title>
                  <v-card-subtitle class="text-body-2">{{ assignment.role }}</v-card-subtitle>
                  <v-card-subtitle class="text-body-2">{{ assignment.name }}</v-card-subtitle>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error Dialog Box -->
    <v-dialog v-model="errorDialog" max-width="400px">
      <v-card>
        <v-card-title class="headline">Error</v-card-title>
        <v-card-subtitle v-for="error in errorMessages">
          {{ error }}
        </v-card-subtitle>
        <v-card-actions>
          <v-btn color="primary" @click="closeErrorDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
  <v-dialog v-model="characterDialog">
    <CharacterSelecter />
    <v-btn color="primary" @click="characterDialog = false">Close</v-btn>
  </v-dialog>
</template>


<script>
import characters from '@/data/characters.json';
import characterRoles from '@/data/character_roles.json';
import CharacterSelecter from '@/components/CharacterSelecter.vue';

const CHARACTER_ROLES = ["Vanguard", "Duelist", "Strategist"]

export default {
  data() {
    return {
      players: Array.from({length: 6}, () => {
        return {name:'', Vanguard: true, Duelist: true, Strategist: true}
      }),
      randomizedTeam: [],
      characters, // Load characters from JSON file
      characterRoles, // Load role name and icon from JSON file
      teamComposition: {
        Vanguard: 2,
        Duelist: 2,
        Strategist: 2,
      },
      desiredRoleCount: {
        Vanguard: 6,
        Duelist: 6,
        Strategist: 6,
      },
      settingsDialog: false, // Controls the visibility of the settings dialog
      errorDialog: false,
      errorMessages: [],
      characterDialog: false,
    };
  },
  computed: {
    totalRoles() {
      return (
        this.teamComposition.Vanguard +
        this.teamComposition.Duelist +
        this.teamComposition.Strategist
      );
    },
  },
  methods: {
    validateComposition() {
      const { Vanguard, Duelist, Strategist } = this.teamComposition;

      // Prevent negative values
      this.teamComposition.Vanguard = Math.max(0, Vanguard);
      this.teamComposition.Duelist = Math.max(0, Duelist);
      this.teamComposition.Strategist = Math.max(0, Strategist);

      // Ensure total does not exceed 6
      if (this.totalRoles > 6) {
        const excess = this.totalRoles - 6;
        if (this.teamComposition.Vanguard > excess) {
          this.teamComposition.Vanguard -= excess;
        } else if (this.teamComposition.Duelist > excess) {
          this.teamComposition.Duelist -= excess;
        } else if (this.teamComposition.Strategist > excess) {
          this.teamComposition.Strategist -= excess;
        }
      }
    },
    saveSettings() {
      this.settingsDialog = false; // Close the dialog after saving
    },
    randomizeTeam() {
      const { Vanguard, Duelist, Strategist } = this.teamComposition;
      this.errorMessages = [];

      // Create roles array based on user composition
      const roles = [
        ...Array(Vanguard).fill('Vanguard'),
        ...Array(Duelist).fill('Duelist'),
        ...Array(Strategist).fill('Strategist'),
      ];

      // Clone characters to avoid mutating the original JSON
      const roleCharacters = {
        Vanguard: this.characters.Vanguard.filter(character => !character.disabled),
        Duelist: this.characters.Duelist.filter(character => !character.disabled),
        Strategist: this.characters.Strategist.filter(character => !character.disabled),
      };

      // Display an error if not enough characters are enabled
      CHARACTER_ROLES.forEach(roleName => {
        if (roleCharacters[roleName].length < this.teamComposition[roleName]) {
          this.errorMessages.push("Character error: not enough " + roleName +"s selected");
        }
      });

      this.validatePlayerRoles()
      if (this.errorMessages.length > 0) {
        this.showErrorDialog();
        return;
      }

      // Assign characters to players
      try {
        this.assignRoles();
      } catch(e) {
        this.errorMessages.push(e.message);
        this.showErrorDialog();
        return;
      }

      this.randomizedTeam = this.players.map(player => {
        const role = player.role;
        const characterIndex = Math.floor(Math.random() * roleCharacters[role].length);
        const character = roleCharacters[role].splice(characterIndex, 1)[0];

        return { player, role, name: character.name, image: character.image };
      });

      // Sort by role to group characters together in the UI
      const roleOrder = { Vanguard: 0, Duelist: 1, Strategist: 2 };
      this.randomizedTeam.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    },

    toggleRole(roleName, player) {
      player[roleName] = !player[roleName];
    },

    showErrorDialog() {
      this.errorDialog = true; // Show the error dialog
    },

    closeErrorDialog() {
      this.errorMessages = [];
      this.errorDialog = false; // Close the error dialog
    },
    
    /**
     * Ensure that the players have roles enabled such that
     * the team composition can be met
     */
    validatePlayerRoles() {
      var currentCounts = {Vanguard: 0, Duelist: 0, Strategist: 0}
      this.players.forEach(player => {
        CHARACTER_ROLES.forEach(roleName => {
          if (player[roleName]) currentCounts[roleName]++;
        })
      });
      CHARACTER_ROLES.forEach(role => {
        if (currentCounts[role] < this.teamComposition[role]) {
          this.errorMessages.push("Player error: more players need to be " + role);
        }
      });
      this.desiredRoleCount = currentCounts;
    },

    /**
     * Assigns roles to the players and tries to be random about it
     */
    assignRoles() {
      this.players.forEach((player, index) => {
        if (player.name == '') player.name = "Player " + (index + 1);
        player.role = ''; // Clear current role assignments
      });
      var rolePlayers = new Map(); // A hashmap of the roles to the players available for that role
      var minimalPlayers = []; // Holds the roles that have just enough possible players
      // First assign characters that only have one role to play
      var currentAssignmentCounts = this.assignInstalockPlayerRoles();

      //check assignable roles and assignable players
      var assignablePlayers = this.players.filter(player => { return !player.role });
      var assignableRoles = CHARACTER_ROLES.filter(role => {
        return this.teamComposition[role] > currentAssignmentCounts[role]
      });

      // We can have minimal if one player instalock and only one other wants the role.
      assignableRoles.forEach(roleName => {
        rolePlayers.set(roleName, []);
        if (this.teamComposition[roleName] == this.desiredRoleCount[roleName]) {
          minimalPlayers.push(roleName);
        }
      });

      // Put each player in a role bucket for the roles they would like to do
      this.populateRoleBuckets(assignablePlayers, assignableRoles, rolePlayers);

      // Do this while there are miminal players within a role assignment
      while (minimalPlayers.length > 0) {
        this.fillMinimalRoles(minimalPlayers, rolePlayers);

        // Recalculate what is assignable
        assignablePlayers = assignablePlayers.filter(player => { return !player.role });
        assignableRoles = assignableRoles.filter(item => { return !minimalPlayers.includes(item)});
        minimalPlayers = [];

        // Calculate roles placements and roles with minimal players
        if (assignableRoles.length > 0) {
          this.populateRoleBuckets(assignablePlayers, assignableRoles, rolePlayers);
          assignableRoles.forEach(roleName => {
            if (this.teamComposition[roleName] == rolePlayers.get(roleName).length) {
              minimalPlayers.push(roleName);
            }
          });
        }
      }
      if (assignableRoles.length > 0) {
        this.randomlyAssignRoles(rolePlayers, assignableRoles, currentAssignmentCounts);
      }
      console.log("Finished assigning roles");
    },

    /**
     * Assign a role to the players randomly. Force players into a role if a role's
     * requirements are unfulfilled
     * @param rolePlayers a Map of roles to arrays of players that prefer said role
     * @param assignableRoles an array of the names of roles that can be assigned
     * @param currentAssignmentCounts a map of role to count of players assigned to that role
     */
    randomlyAssignRoles(rolePlayers, assignableRoles, currentAssignmentCounts) {
      // Flatten the map of rolePlayers so that each role/player combo is present once in the array
      var eligiableAssignments = [];
      rolePlayers.forEach((players, role) => {
        players.forEach(player => {
          var item = new Map();
          item.set(role, player);
          eligiableAssignments.push(item);
        });
      });

      // Assign out roles to players until we have two of each
      this.shuffleArray(eligiableAssignments);
      for (var i = 0; i < eligiableAssignments.length; i++) {
        const role = [...eligiableAssignments[i].keys()][0]
        const player = eligiableAssignments[i].get(role);
        const desiredCount = this.teamComposition[role];
        if (player.role.length > 0) continue;

        if (currentAssignmentCounts[role] < desiredCount) {
          console.log(player.name + " randomly assigned to " + role);
          currentAssignmentCounts[role]++;
          player.role = role;
        }

        // Break if all the desired role numbers are filled
        if (assignableRoles.every(role => { return desiredCount == currentAssignmentCounts[role]})) {
          break;
        }
      }

      // Try to find a player to swap roles with the unassigned players.
      this.findSwappablePlayer(rolePlayers, assignableRoles, currentAssignmentCounts);

      // Force last players into a unfilled and undesired roles
      for (var i = 0; i < eligiableAssignments.length; i++) {
        const player = [...eligiableAssignments[i].values()][0];
        if (player.role.length > 0) continue;
        assignableRoles.forEach(role => {
          const desiredCount = this.teamComposition[role];
          if (currentAssignmentCounts[role] < desiredCount) {
            console.log(player.name + " forced to be " + role);
            currentAssignmentCounts[role]++;
            player.role = role;
          }
        });
      }
    },

    /**
     * Populate the rolePlayers Map by placing players in the role buckets they are
     * willing to perform.
     * 
     * @param assignablePlayers an array of players that can be assigned to a role
     * @param assignableRoles an array of the names of roles that can be assigned
     * @param rolePlayers a map of a role to an array of players to be reset and populated
     */
    populateRoleBuckets(assignablePlayers, assignableRoles, rolePlayers) {
      assignableRoles.forEach(roleName => { rolePlayers.set(roleName, []) });
      assignablePlayers.forEach(player => {
        assignableRoles.forEach(roleName => {
          if (player[roleName]) rolePlayers.get(roleName).push(player)
        });
      });
    },

    /**
     * Assigns desired roles to players that only want to play one role
     * @returns a map of roles to the number of players assigned to that role 
     */
    assignInstalockPlayerRoles() {
      var instalockPlayers = [];
      this.players.forEach(player => {
        var roleCount = CHARACTER_ROLES.reduce((counter, role) => 
          player[role] ? counter += 1 : counter, 0
        );
        if (roleCount == 1) instalockPlayers.push(player);
      });

      var currentAssignmentCounts = {};
      CHARACTER_ROLES.forEach(role => {
        currentAssignmentCounts[role] = 0;
      })
      instalockPlayers.forEach(player => {
        CHARACTER_ROLES.forEach(role => {
          if (currentAssignmentCounts[role] == this.teamComposition[role]) {
            throw new Error("Too many people want to instalock " + role);
          } else if(player[role]) {
            console.log(player.name + " has instalocked " + role);
            player.role = role;
            currentAssignmentCounts[role]++;
            return;
          }
        })
      });
      return currentAssignmentCounts;
    },

    /**
     * Fill all the roles that have just enough players to sastify the role/player requirement.
     * 
     * @param minimalPlayerRoles an array with the name of each role to be filled
     * @param rolePlayers a map of roles to potential players for that role
     */
    fillMinimalRoles(minimalPlayerRoles, rolePlayers) {
      minimalPlayerRoles.forEach(roleName => {
        rolePlayers.get(roleName).forEach(player => {
          if (player.role) {
            throw new Error("It is impossible to assign player roles!");
          } else {
            console.log(player.name + " required to be " + roleName);
            player.role = roleName;
          }
        });
      });
    },

    findSwappablePlayer(rolePlayers, assignableRoles, currentAssignmentCounts) {
      var unassignedPlayers = this.players.filter(player => {return !player.role});
      var unassignedRoles = assignableRoles.filter(role => {
        return this.teamComposition[role] > currentAssignmentCounts[role];
      });
      unassignedPlayers.forEach(emptyPlayer => {
        assignableRoles.forEach(possibleRole => {
          if (emptyPlayer[possibleRole]) {
            // find a player to swap with the unassigned player
            rolePlayers.get(possibleRole).forEach(player => {
              unassignedRoles.forEach(emptyRole => {
                const desiredCount = this.teamComposition[emptyRole];
                if (assignableRoles.every(role => {return desiredCount == currentAssignmentCounts[role]})) {
                  return;
                }
                if (player[emptyRole] && player.role != emptyRole) {
                  console.log(emptyPlayer.name + " is taking over " + player.role + " from " + player.name);
                  console.log(player.name + " is switching to " + emptyRole);
                  emptyPlayer.role = possibleRole;
                  player.role = emptyRole;
                  currentAssignmentCounts[emptyRole]++;
                }
              });
            })
          }
        });
      });
    },

    /**
     * Shuffles the elements of an array
     * @param array the array to be shuffles
     */
    shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
  }
}
</script>

<style scoped>
.text-right {
  text-align: right;
  font-size: 14px;
  color: #666;
}

.clickable {
  position: relative;
  padding: 0.1em 0.1em;
  border: 0;
  border-radius: 0.5em;
  box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.inactive {
  cursor: pointer;
  opacity: 0.5;
}
</style>
