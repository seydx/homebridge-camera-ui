import { i18n, loadLanguage, supportedLanguages } from '@/i18n';
import { getConfig } from '@/api/config.api';

const initialState = { ui: false };

export const config = {
  namespaced: true,
  state: initialState,
  actions: {
    async loadConfig({ commit }) {
      try {
        const response = await getConfig('?target=ui');

        commit('saveConfig', response.data);
        commit('setTheme', response.data.theme);
        commit('setLang', response.data.language);
      } catch (error) {
        console.log(error);
      }
    },
  },
  mutations: {
    saveConfig(state, config) {
      state.ui = {
        ...config,
        currentLanguage: i18n.locale,
      };
    },
    setLang(state, lang) {
      if (lang && lang !== 'auto') {
        lang = supportedLanguages(lang);

        if (lang in i18n.messages) {
          i18n.locale = lang;
        } else {
          const messages = loadLanguage(lang);
          i18n.setLocaleMessage(lang, messages[lang]);
          i18n.locale = lang;
        }

        state.ui.currentLanguage = lang;
      }
    },
    setTheme(state, theme) {
      const validThemes = [
        'light-pink',
        'light-blue',
        'light-orange',
        'light-green',
        'light-gray',
        'dark-pink',
        'dark-blue',
        'dark-orange',
        'dark-green',
        'dark-gray',
      ];

      if (validThemes.includes(theme)) {
        const darkMode = theme.split('-')[0];
        const colorTheme = theme.split('-')[1];

        document.documentElement.dataset.theme = darkMode;
        document.documentElement.dataset.themeColor = colorTheme;

        localStorage.setItem('theme', darkMode);
        localStorage.setItem('theme-color', colorTheme);
      }
    },
  },
  getters: {
    getConfig(state) {
      return state.ui;
    },
  },
};
