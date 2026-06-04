<template>
  <v-card>
    <v-card-title class="text-center">
        <v-btn class="mx-2" color="primary" @click="enableAll">Enable All</v-btn>
        <v-btn class="mx-2" color="primary" @click="disableAll">Disable All</v-btn>
    </v-card-title>
    <div v-for="(group, roleName) in characters" :key="roleName">
      <v-card-title class="text-center"> {{ roleName }} </v-card-title>
      <v-row>
        <v-col cols="2" v-for="(item, index) in group" :key="index">
          <v-card @click="characterStore.toggle(item.name)" outlined class="pa-1 text-center">
            <div :class="{'disabled': characterStore.isDisabled(item.name)}">
              <v-img
                  :src="item.image"
                  max-height="80"
                  max-width="80"
                  class="mx-auto"
                ></v-img>
                <v-card-subtitle class="text-body-2">{{ item.name }}</v-card-subtitle>
                <v-card-subtitle class="text-body-2">Status: {{ characterStore.isDisabled(item.name) ? 'Disabled' : 'Enabled' }}</v-card-subtitle>
              </div>
            </v-card>
        </v-col>
    </v-row>
  </div>
</v-card>
</template>

<script>
import characters from '@/data/characters.json';
import { useCharacterStore } from '@/stores/app.js';

export default {
  setup() {
    const characterStore = useCharacterStore();
    return { characterStore };
  },
  data() {
    return { characters };
  },
  methods: {
    enableAll() {
      this.characterStore.enableAll();
    },
    disableAll() {
      const allNames = Object.values(this.characters).flat().map(c => c.name);
      this.characterStore.disableAll(allNames);
    },
  },
};
</script>

<style scoped>
.disabled {
  opacity: 0.5;
}
</style>
