<template lang="pug">
div(
  :class="cardClass",
  :style="fullscreen ? 'transform: unset !important' : ''"
)
  div.dif-wrapper(
    :style="fullsize ? 'top: 0' : ''"
  )
    b-icon.fullsizeOverlay(
      :icon="fullscreen ? 'arrows-angle-contract' : 'arrows-angle-expand'",
      :class="fullscreen ? 'fullsizeOverlay-on' : ''"
      v-if="showFullsizeIndicator",
      @click="handleFullscreen(camera)"
    )
    b-link.notOverlay.text-center(
      v-if="notificationOverlay && camera.lastNotification", 
      :data-stream-notification="camera.name"
      :class="fullscreen ? 'notOverlay-on' : ''"
      @click="index = 0"
    ) {{ $t("last_notification") + ": " + camera.lastNotification.time }}
    router-link.nameOverlay.mt-save(
      v-if="nameOverlay", :to='\'/cameras/\' + camera.name'
      :class="fullscreen ? 'nameOverlay-on' : ''"
    )  {{ camera.name }}
    .updateOverlay(
      v-if="camera.live === false", 
      :data-stream-timer="camera.name"
      :class="fullscreen ? 'updateOverlay-on' : ''"
    )
    .lds-ring(v-if="showSpinner", 
      :data-stream-spinner="camera.name"
      ref="lds_spinner"
    )
      div
      div
      div
      div
    svg.b-icon.bi.bi-camera-video-off-fill.text-white.position-absolute-center.offlineOverlay(
      :data-stream-offline="camera.name"
      ref="offline_icon"
      viewBox='0 0 16 16' 
      width='50px' 
      height='50px' 
      focusable='false' 
      role='img' 
      aria-label='camera video off fill' 
      xmlns='http://www.w3.org/2000/svg' 
      fill='currentColor'
    )
      g
        path(fill-rule='evenodd' d='M10.961 12.365a1.99 1.99 0 0 0 .522-1.103l3.11 1.382A1 1 0 0 0 16 11.731V4.269a1 1 0 0 0-1.406-.913l-3.111 1.382A2 2 0 0 0 9.5 3H4.272l6.69 9.365zm-10.114-9A2.001 2.001 0 0 0 0 5v6a2 2 0 0 0 2 2h5.728L.847 3.366zm9.746 11.925l-10-14 .814-.58 10 14-.814.58z')
  b-card-body(v-if="headerPosition === 'top' && !fullsize")
    b-card-title.float-left {{ camera.name }}
    b-icon.float-right.card-icon-status.ml-2(v-if="statusIndicator", icon="circle-fill", aria-hidden="true", :data-stream-status="camera.name", variant="danger")
    b-icon.float-right.text-color-primary.card-icon(v-if="notificationBell && camera.lastNotification", icon="bell-fill", aria-hidden="true", :id='\'popover-target-\' + camera.name.replace(/\s/g,"")')
    b-popover(v-if="notificationBell && camera.lastNotification", :target='\'popover-target-\' + camera.name.replace(/\s/g,"")' triggers="hover" placement="top") 
      b {{ $t("last_notification") + ": " }}
      | {{ camera.lastNotification.time }}
  router-link.position-relative.bg-dark(
    v-if="linkToCamera", 
    :to='\'/cameras/\' + camera.name', 
    :data-stream-wrapper="camera.name"
    :class="!fullsize ? headerPosition === 'top' ? 'card-img-bottom' : 'card-img-top' : ''",
    :aria-label="camera.name"
  )
    canvas.canvas.card-img.img-overlay(
      :data-stream-box="camera.name",
      :class="!fullsize ? headerPosition === 'top' ? 'card-img-bottom' : 'card-img-top' : ''",
    )
  div.h-100(
    v-else
    :data-stream-wrapper="camera.name",
    :class="!fullsize ? headerPosition === 'top' ? 'card-img-bottom' : 'card-img-top' : ''",
  )
    canvas.canvas.card-img.img-overlay(
      :data-stream-box="camera.name",
      :class="!fullsize ? headerPosition === 'top' ? 'card-img-bottom' : 'card-img-top' : ''",
    )
  b-card-body(v-if="headerPosition === 'bottom' && !fullsize")
    b-card-title.float-left {{ camera.name }}
    b-icon.float-right.card-icon-status.ml-2(v-if="statusIndicator", icon="circle-fill", aria-hidden="true", :data-stream-status="camera.name", variant="danger")
    b-icon.float-right.text-color-primary.card-icon(v-if="notificationBell && camera.lastNotification", icon="bell-fill", aria-hidden="true", :id='\'popover-target-\' + camera.name.replace(/\s/g,"")')
    b-popover(v-if="notificationBell && camera.lastNotification", :target='\'popover-target-\' + camera.name.replace(/\s/g,"")' triggers="hover" placement="top") 
      b {{ $t("last_notification") + ": " }}
      | {{ camera.lastNotification.time }}
  #cameraFsBg(v-if="showFullsizeIndicator")
  CoolLightBox(
    v-if="notificationOverlay && camera.lastNotification"
    :items="images" 
    :index="index"
    @close="index = null"
    :closeOnClickOutsideMobile="true"
    :useZoomBar="true"
  )
</template>

<script>
import CoolLightBox from 'vue-cool-lightbox';
import 'vue-cool-lightbox/dist/vue-cool-lightbox.min.css';

import { BIcon, BIconArrowsAngleExpand, BIconArrowsAngleContract, BIconBellFill, BIconCircleFill } from 'bootstrap-vue';

import { getCameraSnapshot, getCameraStatus } from '@/api/cameras.api';
import { fetchSnapshot, loadSnapshot } from '@/services/snapshots.service';
import { loadStream, startStream, stopStream } from '@/services/streams.service';

export default {
  name: 'VideoCard',
  components: {
    BIcon,
    BIconArrowsAngleExpand,
    BIconArrowsAngleContract,
    BIconBellFill,
    BIconCircleFill,
    CoolLightBox,
  },
  props: {
    camera: {
      type: Object,
      required: true,
    },
    cardClass: {
      type: String,
      default: '',
    },
    headerPosition: {
      type: String,
      default: 'top',
    },
    fullsize: {
      type: Boolean,
      default: false,
    },
    linkToCamera: {
      type: Boolean,
      default: false,
    },
    nameOverlay: {
      type: Boolean,
      default: false,
    },
    notificationOverlay: {
      type: Boolean,
      default: false,
    },
    notificationBell: {
      type: Boolean,
      default: false,
    },
    onlySnapshot: {
      type: Boolean,
      default: false,
    },
    onlyStream: {
      type: Boolean,
      default: false,
    },
    showFullsizeIndicator: {
      type: Boolean,
      default: false,
    },
    showSpinner: {
      type: Boolean,
      default: false,
    },
    statusIndicator: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      images: [],
      index: null,
      fullscreen: false,
      stopped: false,
      timer: null,
      timerCounter: 0,
      ldsVisible: null,
      offVisible: null,
    };
  },
  mounted() {
    this.stopped = false;

    if (this.camera.lastNotification) {
      const notification = this.camera.lastNotification;
      this.images = [
        {
          title: `${notification.camera} - ${notification.time}`,
          src: `/files/${notification.fileName}`,
          thumb:
            notification.recordType === 'Video'
              ? `/files/${notification.name}@2.jpeg`
              : `/files/${notification.fileName}`,
        },
      ];
    }

    if (this.checkLevel('cameras:access')) {
      if (this.camera.live || this.onlyStream) {
        this.startLivestream();
      } else {
        this.startSnapshot();
      }
    }
  },
  beforeDestroy() {
    this.stopped = true;
    this.stopLivestream();
    this.stopSnapshot();
  },
  methods: {
    handleFullscreen(camera) {
      const fullscreenBg = document.querySelector('#cameraFsBg');
      const videoCard = document.querySelector(`[data-stream-box="${camera.name}"]`);
      this.fullscreen = videoCard.classList.contains('camera-fs');

      const ldsSpinnerVisible = this.$refs.lds_spinner.classList.contains('d-block');
      const offlineIconVisible = this.$refs.offline_icon.classList.contains('d-block');

      if (this.fullscreen) {
        this.fullscreen = false;
        videoCard.classList.remove('camera-fs');
        fullscreenBg.classList.remove('camera-fs-bg');
        videoCard.classList.add('img-overlay');

        this.$refs.offline_icon.classList.remove('offlineOverlay-on');
        this.$refs.lds_spinner.classList.remove('lds-ring-on');
      } else {
        this.fullscreen = true;
        videoCard.classList.add('camera-fs');
        fullscreenBg.classList.add('camera-fs-bg');
        videoCard.classList.remove('img-overlay');

        this.$refs.offline_icon.classList.add('offlineOverlay-on');
        this.$refs.lds_spinner.classList.add('lds-ring-on');
      }

      if (ldsSpinnerVisible) {
        this.$refs.lds_spinner.classList.remove('d-none');
        this.$refs.lds_spinner.classList.add('d-block');
      } else {
        this.$refs.lds_spinner.classList.remove('d-block');
        this.$refs.lds_spinner.classList.add('d-none');
      }

      if (offlineIconVisible) {
        this.$refs.offline_icon.classList.remove('d-none');
        this.$refs.offline_icon.classList.add('d-block');
      } else {
        this.$refs.offline_icon.classList.remove('d-block');
        this.$refs.offline_icon.classList.add('d-none');
      }
    },
    setTimer() {
      let timerIndicator = document.querySelector(`[data-stream-timer="${this.camera.name}"]`);

      if (timerIndicator) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }

        this.timerCounter = 0;
        this.timer = setInterval(() => {
          this.timerCounter++;
          timerIndicator.textContent = this.timerCounter + 's';
        }, 1500);
      }
    },
    async startSnapshot() {
      loadSnapshot(this.camera);

      const status = await getCameraStatus(this.camera.name);
      const snapshot = await getCameraSnapshot(this.camera.name, '?buffer=true');

      if (!this.stopped) {
        fetchSnapshot(this.camera, status, snapshot);

        if (!this.onlySnapshot) {
          this.setTimer();

          this.snapshotTimeout = setTimeout(async () => {
            this.startSnapshot();
          }, this.camera.refreshTimer * 1000);
        }
      }
    },
    stopSnapshot() {
      if (this.snapshotTimeout) {
        clearTimeout(this.snapshotTimeout);
        this.snapshotTimeout = null;
      }
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    async startLivestream() {
      loadStream(this.camera);

      const status = await getCameraStatus(this.camera.name);

      if (!this.stopped) {
        startStream(this.camera, status);
      }
    },
    stopLivestream() {
      stopStream(this.camera);
    },
  },
};
</script>

<style scoped>
.dif-wrapper {
  position: absolute;
  top: 3rem;
  left: 0;
  right: 0;
  bottom: 0;
}

.card {
  font-family: Open Sans, sans-serif;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  border-radius: 0.5rem;
  background-color: var(--secondary-bg-color);
  background-clip: border-box;
  border: 1px solid var(--secondary-bg-color);
  box-shadow: 0 0 2rem 0 rgb(136 152 170 / 30%);
  margin-bottom: 30px;
  -webkit-box-shadow: rgba(0, 0, 0, 0.68) 0px 17px 28px -21px;
  box-shadow: rgba(0, 0, 0, 0.68) 0px 17px 28px -21px;
}

.card-body {
  padding: 0.8rem 1rem;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.card-img-bottom,
a >>> .card-img-bottom,
div >>> .card-img-bottom {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: calc(0.5rem - 1px);
  border-bottom-right-radius: calc(0.5rem - 1px);
}

.card-img-top,
a >>> .card-img-top,
div >>> .card-img-top {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: calc(0.5rem - 1px);
  border-top-right-radius: calc(0.5rem - 1px);
}

.card-icon {
  font-size: 12px;
  cursor: pointer;
  margin-top: 3px;
}

.card-icon-status {
  font-size: 10px;
  margin-top: 3px;
}

.loading-spinner {
  color: var(--primary-color);
}

.canvas {
  background: #000000;
  margin: 0;
  padding: 0;
  display: block;
}

.nameOverlay {
  position: absolute;
  left: 50%;
  -webkit-transform: translateX(-50%);
  -ms-transform: translateX(-50%);
  transform: translateX(-50%);
  top: 5px;
  display: block;
  background: rgb(0 0 0 / 30%);
  padding: 5px;
  border-radius: 5px;
  color: #ffffff;
  font-size: 10px;
  z-index: 1;
}

.nameOverlay:hover {
  text-decoration: none !important;
}

.nameOverlay-on {
  position: fixed;
  top: calc(env(safe-area-inset-bottom, -17px) + 17px);
  z-index: 201;
}

.offlineOverlay {
  z-index: 1;
}

.offlineOverlay-on {
  position: fixed;
  z-index: 201;
}

.updateOverlay {
  z-index: 20;
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: block;
  background: rgb(0 0 0 / 30%);
  padding: 5px;
  border-radius: 5px;
  color: #ffffff;
  font-size: 10px;
  z-index: 1;
}

.updateOverlay-on {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, -17px) + 17px);
  right: calc(env(safe-area-inset-right, -17px) + 17px);
  z-index: 201;
}

.notOverlay {
  position: absolute;
  left: 50%;
  -webkit-transform: translateX(-50%);
  -ms-transform: translateX(-50%);
  transform: translateX(-50%);
  bottom: 20px;
  display: block;
  background: rgb(0 0 0 / 30%);
  padding: 5px;
  border-radius: 5px;
  color: #ffffff;
  font-size: 10px;
  z-index: 1;
}

.notOverlay-on {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, -17px) + 17px);
  z-index: 201;
}

.notOverlay:hover {
  text-decoration: none !important;
}

.notOverlay span,
.notOverlay a,
.notOverlay a:hover {
  color: rgba(255, 255, 255, 0.5);
}

.fullsizeOverlay {
  position: absolute;
  right: 10px;
  background: rgb(255 255 255 / 25%);
  padding: 3px;
  border-radius: 4px;
  z-index: 1;
  top: 10px;
  cursor: pointer;
  transition: 0.3s all;
  font-size: 1.3rem;
}

.fullsizeOverlay-on {
  z-index: 202;
  top: calc(env(safe-area-inset-top, -17px) + 17px);
  right: calc(env(safe-area-inset-right, -17px) + 17px);
  position: fixed;
}

.fullsizeOverlay:hover {
  background: rgb(255 255 255 / 45%);
}

.fix-top-50 {
  top: 50px !important;
}

.camera-fs,
div >>> .camera-fs {
  position: fixed;
  z-index: 200;
  top: 50%;
  border-radius: 0 !important;
  right: 0;
  bottom: 0;
  border: none !important;
  transition: all 0.6s;
  max-height: 90% !important;
  max-width: 90% !important;
  left: 50%;
  transform: translate(-50%, -50%);
}

.camera-fs-bg {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 199;
  background: #000000;
  transition: all 0.6s;
  bottom: 0;
}

.lds-ring {
  background: rgb(0 0 0 / 51%);
  border-radius: 30px;
  z-index: 1;
}

.lds-ring-on {
  z-index: 201;
  position: fixed;
}

/* Equal-height card images, cf. https://stackoverflow.com/a/47698201/1375163*/
a >>> .img-overlay {
  /*height: 11vw;*/
  object-fit: cover;
  height: 50vw;
}
/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) {
  a >>> .img-overlay {
    height: 35vw;
  }
}
/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) {
  a >>> .img-overlay {
    height: 18vw;
  }
}
/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) {
  a >>> .img-overlay {
    height: 15vw;
  }
}
/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) {
  a >>> .img-overlay {
    height: 11vw;
  }
}
</style>
