<template lang="pug">
.tw-mt-5.tw-w-full
  v-progress-circular(indeterminate color="var(--cui-primary)" v-if="loading")
  div(v-else-if="cameras.length")
    v-expansion-panels(v-model="cameraPanel" accordion)
      v-expansion-panel(v-for="(camera, index) in cameras" :key="camera.name" @click="showCamera($event, camera.name)")
        v-expansion-panel-header {{ camera.name }}
        v-expansion-panel-content
          canvas.canvas(:ref="camera.name" width="1280" height="720")
  .text-muted(v-else) No Cameras :(
</template>

<script>
import JSMpeg from 'jsmpeg-fast-player';
import JSMpegWritableSource from '@/common/jsmpeg-source';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'Cameras',

  data() {
    return {
      cameraPanel: [],
      cameras: [],
      loading: true,
      player: null,
    };
  },

  async mounted() {
    this.cameras = await window.homebridge.request('/cameras');

    this.cameras.forEach((camera) => {
      window.homebridge.addEventListener(`stream/${camera.name}`, (buffer) => {
        if (this.player && this.player.name === camera.name) {
          this.player.source.write(buffer.data.data);
        }
      });
    });

    await timeout(1000);
    this.loading = false;
  },

  beforeDestroy() {
    if (this.player) {
      this.player = null;
      window.homebridge.request('/stopStreams');
      window.homebridge.toast.info('Streams were stopped!');
    }
  },

  methods: {
    async showCamera(event, cameraName) {
      if (event.currentTarget.classList.contains('v-expansion-panel-header--active')) {
        window.homebridge.request('/stopStream', cameraName);
      } else {
        await timeout(250);

        this.preparePlayer(cameraName);

        window.homebridge.toast.info(`${cameraName}: Loading stream...`);

        try {
          await window.homebridge.request('/startStream', cameraName);
          console.log('DONE');
        } catch (err) {
          console.log(err);
          window.homebridge.toast.error(err.message);
          window.homebridge.request('/stopStream', cameraName);
        }
      }
    },

    preparePlayer(cameraName) {
      this.player = new JSMpeg.Player(null, {
        source: JSMpegWritableSource,
        canvas: this.$refs[cameraName][0],
        audio: false,
        disableWebAssembly: true,
        pauseWhenHidden: false,
        videoBufferSize: 1024 * 1024,
        onSourceEstablished: () => {
          window.homebridge.toast.success(`${cameraName}: Connection established!`);
        },
      });

      this.player.volume = 0;
      this.player.name = cameraName;
    },
  },
};
</script>

<style scoped>
.canvas {
  background: #000000;
  margin: 0;
  padding: 0;
  display: block;
  width: 100%;
  border: 1px solid var(--cui-bg-app-bar-border);
}

.theme--light.v-expansion-panels .v-expansion-panel {
  background-color: var(--cui-bg-dialog) !important;
  color: var(--cui-text-default) !important;
}

div >>> .theme--light.v-expansion-panels .v-expansion-panel-header .v-expansion-panel-header__icon .v-icon {
  color: var(--cui-text-default) !important;
}
</style>
