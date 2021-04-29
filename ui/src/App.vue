<template lang="pug">
  #app.h-100vh
    button.add-button(v-if="$route.meta.name !== 'login'", style="display: none;") Add to home screen
    audio#soundFx(v-if="$route.meta.name !== 'login' && checkLevel('notifications:access')")
      source(src="@/assets/sounds/notification.wav")
    transition(name='fade' mode='out-in')
      router-view
    CoolLightBox(
      :items="images" 
      :index="index"
      @close="closeHandler"
      :closeOnClickOutsideMobile="true"
      :useZoomBar="true",
      :zIndex=99999
    )
</template>

<script>
import CoolLightBox from 'vue-cool-lightbox';
import 'vue-cool-lightbox/dist/vue-cool-lightbox.min.css';

import UpdateBanner from '@/components/update-banner.vue';
import NotificationBanner from '@/components/notification-banner.vue';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  components: {
    CoolLightBox,
  },
  data() {
    return {
      id: '',
      idInfo: '',
      images: [],
      index: null,
      refreshing: false,
      registration: null,
      updateExists: false,
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },
    uiConfig() {
      return this.$store.state.config.ui;
    },
  },
  sockets: {
    notification(notification) {
      this.id = notification.id;

      if (notification.recordStoring) {
        this.images = [
          {
            title: `${notification.camera} - ${notification.time}`,
            src:
              notification.recordType === 'Video'
                ? `/files/${notification.name}@2.jpeg`
                : `/files/${notification.fileName}`,
            thumb:
              notification.recordType === 'Video'
                ? `/files/${notification.name}@2.jpeg`
                : `/files/${notification.fileName}`,
          },
        ];
      }

      const content = {
        component: NotificationBanner,
        props: {
          headerTxt: this.$t('notifications'),
          timeTxt: this.$t('now'),
          triggerTxt: notification.trigger === 'motion' ? this.$t('motion') : this.$t('doorbell'),
          notification: notification,
        },
        listeners: {
          showNotification: () => {
            this.index = notification.recordStoring ? 0 : null;
          },
        },
      };

      this.$toast.info(content, {
        id: this.id,
        containerClassName: 'notification-container',
        toastClassName: 'notification-toast',
      });
    },
  },
  created() {
    if ('serviceWorker' in navigator) {
      document.addEventListener('swUpdated', this.updateAvailable, { once: true });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.refreshing) return;
        this.refreshing = true;
        window.location.reload(true);
      });
    }

    this.$store.dispatch('config/loadConfig');
  },
  async mounted() {
    const preloader = document.querySelector('#preloader');

    if (preloader) {
      preloader.classList.add('preloader-hide');
      await timeout(200);
      preloader.remove();
    }
  },
  methods: {
    closeHandler() {
      this.index = null;
      this.$toast.dismiss(this.id);
      this.id = '';
    },
    updateAvailable(event) {
      this.registration = event.detail;
      this.updateExists = true;

      this.idInfo = 'swUpdate';

      const content = {
        component: UpdateBanner,
        props: {
          updateInformTxt: this.$t('new_content_available'),
          updateNowTxt: this.$t('refresh'),
        },
        listeners: {
          updateClicked: () => this.refreshApp(),
        },
      };

      this.$toast(content, {
        id: this.idInfo,
      });
    },
    refreshApp() {
      this.updateExists = false;
      this.$toast.dismiss(this.idInfo);
      if (!this.registration || !this.registration.waiting) return;
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    },
  },
};
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition-duration: 0.3s;
  transition-property: opacity;
  transition-timing-function: ease;
}

.fade-enter,
.fade-leave-active {
  opacity: 0;
}

.footer-offset {
  margin-bottom: calc(env(safe-area-inset-bottom, -100px) + 100px) !important;
}

.offline-icon {
  position: absolute;
  left: 50%;
  top: 50%;
  -webkit-transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
  font-size: 30px;
  color: #c4c4c4;
}

.Vue-Toastification__toast {
  margin-bottom: calc(env(safe-area-inset-top, -5px) + 5px) !important;
}

.page-link {
  color: var(--primary-color) !important;
}

.page-item.active .page-link {
  z-index: 0 !important;
  color: #fff !important;
  background-color: var(--primary-color) !important;
  border-color: var(--secondary-color) !important;
}

.page-link:hover {
  color: var(--primary-color) !important;
}

.page-link:focus {
  box-shadow: none !important;
}

.infinite-status-prompt {
  color: var(--secondary-font-color) !important;
}

@media only screen and (max-width: 600px) {
  .Vue-Toastification__container .Vue-Toastification__toast {
    width: 80% !important;
    margin: 0 auto !important;
    margin-bottom: env(safe-area-inset-bottom) !important;
  }
}
</style>
