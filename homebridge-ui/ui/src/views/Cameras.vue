<template lang="pug">
  .mt-5
    .lds-ring(v-if="loading")
      div
      div
      div
      div
    div(v-else)
      .accordion(role="tablist", v-if="cameras.length")
        b-card.mb-1(no-body v-for="(camera, index) in cameras" :key="camera.name")
          b-card-header.p-1(header-tag="header" role="tab")
            b-button(block v-b-toggle="camera.id" variant="primary") {{ camera.name }}
          b-collapse(:id="camera.id" accordion="my-accordion" role="tabpanel")
            b-card-body
              canvas.canvas(:data-stream-box="camera.name")
      div.text-muted(v-else) No Cameras
</template>

<script>
import JSMpeg from 'jsmpeg-fast-player';
import JSMpegWritableSource from '../../../../ui/src/common/jsmpeg-source';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'Cameras',
  data: function () {
    return {
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

    this.$root.$on('bv::collapse::state', (cameraId, shown) => {
      const camera = this.cameras.find((camera) => camera && camera.id === cameraId);

      if (camera && !this.loading) {
        if (shown) {
          this.preparePlayer(camera.name);

          window.homebridge.toast.info(`${camera.name}: Loading stream...`);
          window.homebridge.request('/startStream', camera.name);
        } else {
          window.homebridge.request('/stopStream', camera.name);
        }
      }
    });

    await timeout(1000);
    this.loading = false;
  },
  beforeDestroy() {
    this.player = null;
    window.homebridge.request('/stopStreams');
    window.homebridge.toast.info('Streams were stopped!');
  },
  methods: {
    preparePlayer(cameraName) {
      this.player = new JSMpeg.Player(null, {
        source: JSMpegWritableSource,
        canvas: document.querySelector(`[data-stream-box="${cameraName}"]`),
        audio: true,
        disableWebAssembly: true,
        pauseWhenHidden: false,
        onSourceEstablished: () => {
          window.homebridge.toast.success(`${cameraName}: Connection established!`);
        },
      });

      this.player.volume = 1;
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
}

.btn {
  font-size: 14px !important;
  border: none !important;
  box-shadow: none !important;
}

.btn-primary {
  background-color: var(--primary-color) !important;
  font-size: 14px !important;
  color: #fff;
}

.btn-primary:hover {
  background-color: var(--secondary-color) !important;
  color: #fff;
}

.btn-primary:focus,
.btn-primary:active,
.btn-primary:active:focus {
  background-color: var(--secondary-color) !important;
}

.lds-ring {
  display: inline-block;
  position: relative;
  width: 32px;
  height: 32px;
}

.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 32px;
  height: 32px;
  margin: 4px;
  border: 8px solid var(--primary-color);
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: var(--primary-color) transparent transparent transparent;
}

.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}

.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}

.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}

@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
