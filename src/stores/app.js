import { defineStore } from 'pinia'

export const useCharacterStore = defineStore('characters', {
  state: () => ({
    disabledCharacters: {},
  }),
  actions: {
    toggle(name) {
      this.disabledCharacters[name] = !this.disabledCharacters[name];
    },
    enableAll() {
      this.disabledCharacters = {};
    },
    disableAll(allNames) {
      this.disabledCharacters = Object.fromEntries(allNames.map(n => [n, true]));
    },
    isDisabled(name) {
      return !!this.disabledCharacters[name];
    },
  },
})
