<template lang="pug">
v-app.app.tw-p-4
  .tw-flex.tw-items-center.tw-justify-center.tw-flex-col
    v-img(src="@/assets/img/logo.png" alt="camera.ui" width="100px")
    h5 Welcome to 
    h1.subtitle camera.ui
    .tw-my-3.text-muted User Interface for RTSP capable cameras.
    a.github-link(href="https://github.com/SeydX/homebridge-camera-ui" target="_blank")
      v-icon.text-default.tw-mr-1(style="margin-top: -3px;") {{ icons['mdiGithub'] }} 
      | Github
    .tw-mt-3
      router-link(to="/cameras") Cameras
      |  | 
      router-link(to="/config") Config
    router-view
</template>

<script>
import { mdiGithub } from '@mdi/js';

export default {
  name: 'App',

  data() {
    return {
      icons: {
        mdiGithub,
      },
    };
  },

  mounted() {
    window.homebridge.showSpinner();

    window.homebridge.addEventListener('ready', async () => {
      if (window.document.body.classList.contains('dark-mode')) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      document.documentElement.setAttribute('data-theme-color', 'pink');

      window.homebridge.hideSpinner();
    });
  },
};
</script>

<style>
.v-application--wrap {
  height: 100% !important;
  min-height: 100% !important;
}

.app {
  font-family: Avenir, Helvetica, Arial, sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-align: center !important;
  color: var(--cui-text-default) !important;
  background: rgba(0, 0, 0, 0.05) !important;
  border-radius: 10px !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
}

.router-link-exact-active {
  color: var(--cui-primary) !important;
  text-decoration: none !important;
}

.subtitle {
  font-weight: 900;
  line-height: 0.5;
}
</style>
