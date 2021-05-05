<template lang="pug">
  div.app-bg.h-100.w-100.p-4
    #app.h-100.w-100
      div
        img(src="@/assets/img/logo.png" alt="camera.ui" width="100px")
        h5 Welcome to 
        h1.subtitle camera.ui
        .mt-3.mb-2.text-muted User Interface for RTSP capable cameras.
        b-link.github-link(href="https://github.com/SeydX/homebridge-camera-ui" target="_blank")
          b-icon(icon="github")
          |  Github
      #nav.mt-3
        router-link(to="/cameras") Cameras
        |  | 
        router-link(to="/config") Config
      router-view
</template>

<script>
import { BIcon, BIconGithub } from 'bootstrap-vue';

export default {
  components: {
    BIcon,
    BIconGithub,
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
.app-bg {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--primary-font-color);
}

a.router-link-exact-active {
  color: var(--primary-color) !important;
  text-decoration: none !important;
}

.subtitle {
  font-weight: 900;
  line-height: 0.5;
}
</style>
