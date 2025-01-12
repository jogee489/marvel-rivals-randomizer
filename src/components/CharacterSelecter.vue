<template>
    <v-card-title class="text-center">
        <v-btn class = "mx-2" color="primary" @click="toggleDisable(false)">Enable All</v-btn>
        <v-btn class = "mx-2" color="primary" @click="toggleDisable(true)">Disable All</v-btn>
    </v-card-title>
    <div v-for="(group, roleName) in characters" :key="roleName">
      <v-card-title class="text-center"> {{ roleName }} </v-card-title>
      <v-row>
        <v-col cols="2" v-for="(item, index) in group" :key="index">
          <v-card @click="toggleItem(roleName, index)" outlined class="pa-1 text-center">
            <div :class="{'disabled': item.disabled}">  
              <v-img
                  :src="item.image"
                  max-height="80"
                  max-width="80"
                  class="mx-auto"
                ></v-img>
                <v-card-subtitle class="text-body-2">{{ item.name }}</v-card-subtitle>
                <v-card-subtitle class="text-body-2">Status: {{ item.disabled ? 'Disabled' : 'Enabled' }}</v-card-subtitle>
              </div>
            </v-card>
        </v-col>
    </v-row>
  </div>
</template>

<script>

import characters from '@/data/characters.json';

export default {
  data() {
    return {
      characters
    };
  },
  methods: {
    // Enable all characters
    toggleDisable(isDisabled) {
      for (const roleName in this.characters) {
        for (const character in this.characters[roleName]) {
          this.characters[roleName][character].disabled = isDisabled;
        }
      }
    },

    // Toggle disable/enable for a specific character
    toggleItem(roleName, index) {
      this.characters[roleName][index].disabled = !this.characters[roleName][index].disabled;
    }
  }
};
</script>

<style>
.disabled {
  opacity: 0.5;
}
</style>