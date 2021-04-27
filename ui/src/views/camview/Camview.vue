<template lang="pug">
  main.w-100.h-100vh.overflow-hidden
    b-button.mt-save-m.ml-3.back-button(pill, @click="goBack") {{ $t("back") }}
    b-button.btn-primary.mt-save-m.mr-3.logout-button(pill, @click="logOut") {{ $t("signout") }}
    .grid-stack.h-100vh.d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
      b-spinner.text-color-primary
    .grid-stack.h-100vh(v-else)
      .grid-stack-item(v-for="(camera, index) in cameras" :gs-id="index")
        VideoCard(
          :camera="camera",
          cardClass="grid-stack-item-content",
          :fullsize="true",
          :nameOverlay="true",
          :notificationOverlay="true",
          :showFullsizeIndicator="true",
          :showSpinner="true",
        )
</template>

<script>
import 'gridstack/dist/gridstack.min.css';
import { GridStack } from 'gridstack';
import 'gridstack/dist/jq/gridstack-dd-jqueryui';

import { getCameras } from '@/api/cameras.api';
import { getNotifications } from '@/api/notifications.api';
import { getSetting } from '@/api/settings.api';
import VideoCard from '@/components/video-card.vue';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'CamView',
  components: {
    VideoCard,
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      vm.prevRoute = from;
    });
  },
  data() {
    return {
      cameras: [],
      grid: null,
      loading: true,
      prevRoute: null,
      serializedData: [],
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },
    camviewLayout() {
      return this.$store.state.camview.layout;
    },
  },
  created() {
    const body = document.querySelector('body');
    const html = document.querySelector('html');
    body.classList.add('body-bg-dark');
    html.classList.add('body-bg-dark');
  },
  async mounted() {
    try {
      if (this.prevRoute && !this.prevRoute.name && !this.prevRoute.meta.name) {
        const backButton = document.querySelector('.back-button');
        if (backButton) {
          backButton.innerHTML = 'Dashboard';
        }
      }

      if (this.checkLevel(['cameras:access', 'settings:camview:access'])) {
        const cameras = await getCameras();
        const camviewSettings = await getSetting('camview');

        for (const camera of cameras.data.result) {
          if (camera.settings.camview.favourite) {
            camera.live = camera.settings.camview.live || false;
            camera.refreshTimer = camviewSettings.data.refreshTimer || 60;

            const lastNotification = await getNotifications(`?cameras=${camera.name}&pageSize=1`);
            camera.lastNotification = lastNotification.data.result.length > 0 ? lastNotification.data.result[0] : false;

            this.cameras.push(camera);
          }
        }

        this.loading = false;
        await timeout(100); //need to wait a lil bit for grid to create all components
        await this.updateLayout();

        document.addEventListener('click', this.clickHandler);
        window.addEventListener('resize', this.resizeHandler);
      } else {
        this.$toast.error(this.$t('no_access'));
      }
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
  beforeDestroy() {
    const body = document.querySelector('body');
    const html = document.querySelector('html');
    body.classList.remove('body-bg-dark');
    html.classList.remove('body-bg-dark');

    document.removeEventListener('click', this.clickHandler);
    window.removeEventListener('resize', this.resizeHandler);
  },
  methods: {
    goBack() {
      if (this.prevRoute && !this.prevRoute.name && !this.prevRoute.meta.name) {
        return this.$router.push('/dashboard');
      } else {
        this.$router.go(-1);
      }
    },
    clickHandler() {
      const backButton = document.querySelector('.back-button');
      const logoutButton = document.querySelector('.logout-button');

      if (backButton.classList.contains('btn-slide-animation')) {
        backButton.classList.remove('btn-slide-animation');
        logoutButton.classList.remove('btn-slide-animation');
      } else {
        backButton.classList.add('btn-slide-animation');
        logoutButton.classList.add('btn-slide-animation');
      }
    },
    isMobile() {
      let isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      return isMobile;
    },
    items() {
      return document.querySelectorAll('.grid-stack-item');
    },
    logOut() {
      this.$store.dispatch('auth/logout');
      this.$router.push('/');
    },
    resizeHandler() {
      if (this.grid) {
        this.grid.cellHeight(this.windowHeight() / 12, true);
      }
    },
    saveToStorage() {
      this.serializedData = this.grid.save();
      for (const element of this.serializedData) delete element.content;
      //console.log(`Storing layout: ${JSON.stringify(this.serializedData)}`);
      this.$store.dispatch('camview/updateElements', this.serializedData);
    },
    updateLayout() {
      this.grid = GridStack.init({
        alwaysShowResizeHandle: this.isMobile(),
        disableOneColumnMode: this.items().length > 1,
        animate: true,
        margin: 2,
        row: 12,
        float: true,
        column: 12,
        resizable: {
          autoHide: !this.isMobile(),
          handles: 'e, se, s, sw, w',
        },
        cellHeight: this.windowHeight() / 12,
      });

      this.grid.on('dragstop resizestop', () => {
        this.saveToStorage();
      });

      if (this.camviewLayout.length > 0 && this.camviewLayout.length === this.items().length) {
        const layout = [...this.camviewLayout];
        //console.log(`Loading layout: ${JSON.stringify(layout)}`);
        //this.grid.load(layout, true);
        //this.grid.load(layout, true); //TODO - .load() not updating (y) with gridstack v4.x
        for (const element of this.items()) {
          for (const pos of layout) {
            const id = element.getAttribute('gs-id');
            if (id === pos.id) {
              this.grid.update(element, pos);
            }
          }
        }
      } else {
        let index_ = 0;

        let x = 0;
        let y = 0;
        let w = this.items().length < 7 ? 6 : 4;
        let h =
          12 /
          Math.round(
            (this.items().length % 2 === 0 ? this.items().length : this.items().length + 1) /
              (this.items().length < 7 ? 2 : 3)
          );

        for (const [index, element] of this.items().entries()) {
          const beforeElement = this.items()[index ? index - 1 : index];
          let lastX = Number.parseInt(beforeElement.getAttribute('gs-x'));

          x = this.items().length < 7 ? (index && !lastX ? 6 : 0) : index && !lastX ? 4 : lastX == 4 ? 8 : 0;

          if (this.items().length < 7 && index % 2 == 0) {
            y = index_ * h;
            index_++;
          }

          if (this.items().length >= 7 && index % 3 == 0) {
            y = index_ * h;
            index_++;
          }

          if (this.items().length === 1) {
            x = 0;
            y = 0;
            w = 12;
            h = 12;
          }

          if (this.items().length === 2) {
            x = 0;
            y = index * 6;
            w = 12;
            h = 6;
          }

          this.grid.update(element, {
            x: x,
            y: y,
            w: w,
            h: h,
          });

          /*console.log(
            `New layout: ${JSON.stringify({
              id: index,
              x: x,
              y: y,
              w: w,
              h: h,
            })}`
          );*/
        }
      }
    },
    windowHeight() {
      let windowHeight =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
          ? typeof window.outerHeight != 'undefined'
            ? Math.max(window.outerHeight, document.documentElement.clientHeight)
            : document.documentElement.clientHeight
          : document.documentElement.clientHeight;
      return windowHeight;
    },
    windowWidth() {
      let windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
      return windowWidth;
    },
  },
};
</script>

<style scoped>
.back-button {
  position: absolute;
  top: -120px;
  left: 0;
  z-index: 99;
  transition: 0.3s all;
}

.logout-button {
  position: absolute;
  top: -120px;
  right: 0;
  z-index: 99;
  transition: 0.3s all;
}

.btn-slide-animation {
  top: 0;
}

.grid-stack-item,
.grid-stack >>> .grid-stack-item {
  box-shadow: 0 0 1rem 0 rgb(0 0 0 / 30%);
}

.grid-stack-item-content,
.grid-stack >>> .grid-stack-item-content {
  background: #000000 !important;
  overflow: hidden !important;
}

.canvas,
.grid-stack-item-content >>> .canvas {
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.img-overlay,
.grid-stack-item-content >>> .img-overlay {
  object-fit: fill !important;
  height: 100% !important;
  width: 100% !important;
  max-height: 100% !important;
}
</style>
