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
          <v-card-text>
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
                v-for="role in characterRoles"
                :key="role.name"
                v-model="teamComposition[role.name]"
                :label="role.name"
                type="number"
                min="0"
                max="6"
                outlined
                dense
                class="mb-2"
                @input="validateComposition"
              ></v-text-field>
              <p>Total: {{ totalRoles }} / 6</p>
            </v-card-text>
            <v-card-actions>
              <v-btn :disabled="totalRoles !== 6" color="primary" @click="settingsDialog = false">
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
            <span v-for="(role, i) in characterRoles" :key="role.name">
              {{ role.name }}: {{ teamComposition[role.name] }}<span v-if="i < characterRoles.length - 1"> | </span>
            </span>
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
        <v-card-title class="headline">{{ errorTitle }}</v-card-title>
        <v-card-subtitle v-for="error in errorMessages" :key="error">
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
import characterRolesData from '@/data/character_roles.json';
import CharacterSelecter from '@/components/CharacterSelecter.vue';
import { assignRoles } from '@/utils/roleAssignment.js';

const CHARACTER_ROLES = characterRolesData.map(r => r.name);

export default {
  data() {
    return {
      players: Array.from({ length: 6 }, () => ({
        name: '',
        ...Object.fromEntries(CHARACTER_ROLES.map(r => [r, true])),
      })),
      randomizedTeam: [],
      characters,
      characterRoles: characterRolesData,
      teamComposition: Object.fromEntries(CHARACTER_ROLES.map(r => [r, 2])),
      playerAvailability: {},
      settingsDialog: false,
      errorDialog: false,
      errorTitle: '',
      errorMessages: [],
      characterDialog: false,
    };
  },
  computed: {
    totalRoles() {
      return CHARACTER_ROLES.reduce((sum, role) => {
        return sum + (parseInt(this.teamComposition[role]) || 0);
      }, 0);
    },
  },
  methods: {
    validateComposition() {
      CHARACTER_ROLES.forEach(role => {
        const val = parseInt(this.teamComposition[role]) || 0;
        this.teamComposition[role] = Math.min(6, Math.max(0, val));
      });
    },

    randomizeTeam() {
      this.errorMessages = [];
      this.randomizedTeam = [];

      const roleCharacters = Object.fromEntries(
        CHARACTER_ROLES.map(role => [
          role,
          this.characters[role].filter(c => !c.disabled),
        ])
      );

      const poolErrors = [];
      CHARACTER_ROLES.forEach(role => {
        if (roleCharacters[role].length < this.teamComposition[role]) {
          poolErrors.push(`Not enough ${role}s enabled — need ${this.teamComposition[role]}, have ${roleCharacters[role].length}`);
        }
      });

      const configErrors = this.validatePlayerRoles();

      if (poolErrors.length > 0 || configErrors.length > 0) {
        if (poolErrors.length > 0 && configErrors.length === 0) {
          this.errorTitle = 'Not Enough Characters';
          this.errorMessages = poolErrors;
        } else if (configErrors.length > 0 && poolErrors.length === 0) {
          this.errorTitle = 'Invalid Role Configuration';
          this.errorMessages = configErrors;
        } else {
          this.errorTitle = 'Configuration Errors';
          this.errorMessages = [...poolErrors, ...configErrors];
        }
        this.errorDialog = true;
        return;
      }

      try {
        assignRoles(this.players, this.teamComposition, this.playerAvailability, CHARACTER_ROLES);
      } catch (e) {
        this.errorTitle = 'Assignment Failed';
        this.errorMessages = [e.message];
        this.errorDialog = true;
        return;
      }

      const roleOrder = Object.fromEntries(CHARACTER_ROLES.map((r, i) => [r, i]));
      this.randomizedTeam = this.players.map(player => {
        const role = player.role;
        const pool = roleCharacters[role];
        const idx = Math.floor(Math.random() * pool.length);
        const character = pool.splice(idx, 1)[0];
        return { player, role, name: character.name, image: character.image };
      });
      this.randomizedTeam.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    },

    toggleRole(roleName, player) {
      player[roleName] = !player[roleName];
    },

    closeErrorDialog() {
      this.errorMessages = [];
      this.errorTitle = '';
      this.errorDialog = false;
    },

    validatePlayerRoles() {
      const counts = CHARACTER_ROLES.reduce((acc, role) => ({
        ...acc,
        [role]: this.players.filter(p => p[role]).length,
      }), {});
      this.playerAvailability = counts;

      const errors = [];
      CHARACTER_ROLES.forEach(role => {
        if (counts[role] < this.teamComposition[role]) {
          errors.push(`More players need to be willing to play ${role}`);
        }
      });
      return errors;
    },
  },
};
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
