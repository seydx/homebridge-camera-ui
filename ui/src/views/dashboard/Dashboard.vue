<template lang="pug">
div
  BackToTop
  Navbar(:name="$t('dashboard')")
  main.inner-container.w-100.h-100vh-calc.pt-save.footer-offset
    .container.pt-3.d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
      b-spinner.text-color-primary
    .container.pt-3(v-else)
      draggable(v-model='cameras', ghost-class="ghost-box", @change="storeLayout", animation=200, delay="200" delay-on-touch-only="true")
        transition-group(type="transition", class="row")
          .col-lg-4.col-md-6.col-12.my-1(v-for="(camera, i) in cameras", :key="camera.name")
            VideoCard(
              :camera="camera",
              cardClass="card"
              headerPosition="top",
              :linkToCamera="true",
              :notificationOverlay="true",
              :showFullsizeIndicator="true",
              :showSpinner="true",
              :statusIndicator="true"
            )
  AddCamera
  Footer
</template>

<script>
import draggable from 'vuedraggable';

import { getCameras } from '@/api/cameras.api';
import { getNotifications } from '@/api/notifications.api';
import { getSetting } from '@/api/settings.api';
import AddCamera from '@/components/add-camera.vue';
import BackToTop from '@/components/back-to-top.vue';
import Footer from '@/components/footer.vue';
import Navbar from '@/components/navbar.vue';
import VideoCard from '@/components/video-card.vue';

export default {
  name: 'Dashboard',
  components: {
    AddCamera,
    BackToTop,
    draggable,
    Footer,
    Navbar,
    VideoCard,
  },
  data() {
    return {
      cameras: [],
      snapshotTimeout: null,
      loading: true,
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },
    dashboardLayout() {
      return this.$store.state.dashboard.layout;
    },
  },
  async mounted() {
    try {
      if (this.checkLevel(['cameras:access', 'settings:dashboard:access'])) {
        const cameras = await getCameras();
        const dashboardSettings = await getSetting('dashboard');

        for (const camera of cameras.data.result) {
          if (camera.settings.dashboard.favourite) {
            camera.live = camera.settings.dashboard.live || false;
            camera.refreshTimer = dashboardSettings.data.refreshTimer || 60;

            const lastNotification = await getNotifications(`?cameras=${camera.name}&pageSize=5`);
            camera.lastNotification = lastNotification.data.result.length > 0 ? lastNotification.data.result[0] : false;

            this.cameras.push(camera);
          }
        }

        await this.updateLayout();
        this.loading = false;
      } else {
        this.$toast.error(this.$t('no_access'));
      }
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
  methods: {
    storeLayout() {
      const cameras = this.cameras
        .map((camera, index) => {
          return {
            index: index,
            name: camera.name,
          };
        })
        .filter((camera) => camera);
      this.$store.dispatch('dashboard/updateElements', cameras);
    },
    updateLayout() {
      for (const [index, camFromLayout] of this.dashboardLayout.entries()) {
        if (!this.cameras.some((camera) => camera && camera.name === camFromLayout.name))
          this.dashboardLayout.splice(index, 1);
      }

      for (const camera of this.cameras) {
        if (!this.dashboardLayout.some((camFromLayout) => camFromLayout && camFromLayout.name === camera.name))
          this.dashboardLayout.push({
            index: this.dashboardLayout.length > 0 ? this.dashboardLayout.length : 0,
            name: camera.name,
          });
      }

      const cameras = [...this.cameras];

      this.cameras = this.dashboardLayout
        .map((camera) => {
          let index = cameras.findIndex((cam) => cam.name === camera.name);
          return cameras[index];
        })
        .filter((camera) => camera);

      this.storeLayout();
    },
  },
};
</script>

<style scoped>
.inner-container {
  margin-top: 100px;
}

.camera-fade-enter-active {
  transition: all 0.4s ease;
}
.camera-fade-leave-active {
  transition: all 0.4s cubic-bezier(1, 0.5, 0.8, 1);
}
.camera-fade-enter,
.camera-fade-leave-to {
  transform: translateY(-30px);
  opacity: 0;
}

.ghost-box {
  opacity: 0;
}
</style>
