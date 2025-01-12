<template>
  <v-container>
    <v-row>
      <!-- Left Side: Player Input -->
      <v-col cols="6">
        <v-card class="pa-3">
          <v-card-title>
            Player Names
            <v-spacer></v-spacer>
            <v-btn icon @click="settingsDialog = true">
              <v-icon>mdi-cog</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-for="(player, index) in players"
              :key="index"
              v-model="players[index]"
              label="Player Name"
              :placeholder="`Player ${index + 1}`"
              outlined
              dense
              class="mb-2"
            ></v-text-field>
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
                  <v-card-title class="text-h6">{{ assignment.player || "Player " + (index + 1)}}</v-card-title>
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
  <CharacterSelecter />
</template>


<script>
import characters from '@/data/characters.json';
import CharacterSelecter from '@/components/CharacterSelecter.vue';

export default {
  data() {
    return {
      players: Array(6).fill(''), // Fixed list of 6 players
      randomizedTeam: [],
      characters, // Load characters from JSON file
      teamComposition: {
        Vanguard: 2,
        Duelist: 2,
        Strategist: 2,
      },
      settingsDialog: false, // Controls the visibility of the settings dialog
      errorDialog: false,
      errorMessages: "",
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

      // Create roles array based on user composition
      const roles = [
        ...Array(Vanguard).fill('Vanguard'),
        ...Array(Duelist).fill('Duelist'),
        ...Array(Strategist).fill('Strategist'),
      ];

      // Shuffle roles to add randomness
      const shuffledRoles = roles.sort(() => Math.random() - 0.5);

      // Clone characters to avoid mutating the original JSON
      const roleCharacters = {
        Vanguard: this.characters.Vanguard.filter(character => !character.disabled),
        Duelist: this.characters.Duelist.filter(character => !character.disabled),
        Strategist: this.characters.Strategist.filter(character => !character.disabled),
      };

      // Display an error if not enough characters are enabled
      var errors = []
      if (roleCharacters["Vanguard"].length < this.teamComposition.Vanguard) {
        errors.push("There are not enough Vanguards selected")
      }
      if (roleCharacters["Duelist"].length < this.teamComposition.Vanguard) {
        errors.push("There are not enough Duelists selected")
      }
      if (roleCharacters["Strategist"].length < this.teamComposition.Vanguard) {
        errors.push("There are not enough Strategists selected")
      }

      if (errors.length > 0) {
        this.showErrorDialog(errors)
        return;
      }

      // Assign characters to players
      this.randomizedTeam = this.players.map((player, index) => {
        const role = shuffledRoles[index];
        const characterIndex = Math.floor(Math.random() * roleCharacters[role].length);
        const character = roleCharacters[role].splice(characterIndex, 1)[0];

        return { player, role, name: character.name, image: character.image };
      });

      // Sort by role to group characters together in the UI
      const roleOrder = { Vanguard: 0, Duelist: 1, Strategist: 2 };
      this.randomizedTeam.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    },

    showErrorDialog(message) {
      this.errorMessages = message;
      this.errorDialog = true; // Show the error dialog
    },

    closeErrorDialog() {
      this.errorDialog = false; // Close the error dialog
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
</style>
