export default {
  watch: {
    settingsLayout: {
      handler() {
        if (!this.loading) {
          this.setLsSettings(this.settingsLayout);
        }
      },
      deep: true,
    },
  },
  created() {
    this.settingsLayout = this.getLsSettings();
  },
  methods: {
    getLsSettings() {
      const settings = localStorage.getItem('settings')
        ? JSON.parse(localStorage.getItem('settings'))
        : {
            profile: {},
            general: {
              general: {
                expand: true,
              },
              themes: {
                expand: true,
              },
              rooms: {
                expand: true,
              },
            },
            dashboard: {
              dashboard: {
                expand: true,
              },
              favourites: {
                expand: true,
              },
            },
            cameras: {
              aws: {
                expand: true,
              },
              cameras: {
                expand: true,
              },
            },
            recordings: {
              recordings: {
                expand: true,
              },
            },
            notifications: {
              notifications: {
                expand: true,
              },
              telegram: {
                expand: true,
              },
              webhook: {
                expand: true,
              },
            },
            camview: {
              camview: {
                expand: true,
              },
              favourites: {
                expand: true,
              },
            },
          };

      return settings;
    },
    setLsSettings(settingsLayout) {
      if (settingsLayout) {
        localStorage.setItem('settings', JSON.stringify(settingsLayout));
      }
    },
  },
};
