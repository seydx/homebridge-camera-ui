<template lang="pug">
div
  BackToTop
  Navbar(:name="$t('cameras')")
  BreadcrumbFilter(
    :active="true",
    :showFilterCameras="true",
    :showFilterRooms="true",
    :showFilterStatus="true",
    @filter="filterCameras"
  )
  main.inner-container.w-100.h-100vh.pt-save.footer-offset
    .container.pt-3.d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
      b-spinner.text-color-primary
    .container.pt-3(v-else)
      transition-group(name="camera-fade", tag="div", class="row")
        .col-lg-4.col-md-6.col-12.my-1(v-for="(camera, i) in cameras", :key="camera.name" :data-camera-aos="camera.name" data-aos="fade-up" data-aos-duration="1000" data-aos-mirror="true")
          VideoCard(
            :camera="camera",
            cardClass="card"
            headerPosition="bottom",
            :linkToCamera="true",
            :notificationBell="true",
            :showSpinner="true",
            :onlySnapshot="true",
          )
  Footer
</template>

<script>
import { getCameras, getCameraStatus } from '@/api/cameras.api';
import { getNotifications } from '@/api/notifications.api';
import BackToTop from '@/components/back-to-top.vue';
import BreadcrumbFilter from '@/components/breadcrumb-filter.vue';
import Footer from '@/components/footer.vue';
import Navbar from '@/components/navbar.vue';
import VideoCard from '@/components/video-card.vue';

export default {
  name: 'Cameras',
  components: {
    BackToTop,
    BreadcrumbFilter,
    Footer,
    Navbar,
    VideoCard,
  },
  data() {
    return {
      cameras: [],
      loading: true,
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },
  },
  async mounted() {
    try {
      if (this.checkLevel('cameras:access')) {
        const cameras = await getCameras();

        for (const camera of cameras.data.result) {
          const lastNotification = await getNotifications(`?cameras=${camera.name}&pageSize=5`);
          camera.lastNotification = lastNotification.data.result.length > 0 ? lastNotification.data.result[0] : false;

          this.cameras.push(camera);
          this.loading = false;
        }
      } else {
        this.$toast.error(this.$t('no_access'));
      }
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
  methods: {
    async filterCameras(filter) {
      try {
        if (filter) {
          this.loading = true;
          this.cameras = [];
          const cameras = await getCameras();

          for (const camera of cameras.data.result) {
            let camerasFilter = true;
            if (filter.cameras.length > 0) {
              camerasFilter = filter.cameras.includes(camera.name);
            }

            let roomsFilter = true;
            if (filter.rooms.length > 0) {
              roomsFilter = filter.rooms.includes(camera.settings.room);
            }

            let statusFilter = true;
            if (filter.status.length > 0) {
              const status = filter.status.map((filterStatus) => filterStatus.toLowerCase());
              let cameraStatus = await getCameraStatus(camera.name);
              statusFilter = status.includes(cameraStatus.data.status.toLowerCase());
            }

            let show = camerasFilter && roomsFilter && statusFilter;
            if (show) {
              const lastNotification = await getNotifications(`?cameras=${camera.name}&pageSize=1`);
              camera.lastNotification =
                lastNotification.data.result.length > 0 ? lastNotification.data.result[0] : false;

              this.cameras.push(camera);
            }
          }

          this.loading = false;
        }
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
  },
};
</script>

<style scoped>
.inner-container {
  margin-top: 140px;
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
</style>
