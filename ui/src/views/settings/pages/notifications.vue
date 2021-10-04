<template lang="pug">
.w-100.h-100
  .d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
    b-spinner.text-color-primary
  transition-group(name="fade", mode="out-in", v-if="loading")
  transition-group(name="fade", mode="out-in", v-else)
    .d-flex.flex-wrap.justify-content-between(key="loaded")
      .col-12(data-aos="fade-up" data-aos-duration="1000" v-if="checkLevel(['settings:cameras:edit', 'settings:notifications:edit'])")
        h5 {{ $t("notifications") }}
        div.mt-4
          .settings-box.container
            .row
              .col-7.d-flex.flex-wrap.align-content-center {{ $t("active") }}
              .col-5.d-flex.flex-wrap.align-content-center.justify-content-end
                toggle-button(
                  v-model="notifications.active"
                  color="var(--primary-color) !important",
                  :height="30",
                  :sync="true",
                  :aria-expanded="notifications.active ? 'true' : 'false'"
                  aria-controls="notifications"
                )
            b-collapse(
              v-model="notifications.active",
              id="notifications"
            )
              hr(v-if="notifications.active")
              .row(v-if="notifications.active")
                .col-12.d-flex.flex-wrap.align-content-center {{ $t("remove_after_h") }}
                .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                  b-form-select(
                    v-model="notifications.removeAfter"
                    :options="[1, 3, 5, 9, 12, 24]"
                  )
      b-collapse.w-100(
        v-model="notifications.active",
        id="notifications"
      )
        .col-12.mt-5(data-aos="fade-up" data-aos-duration="1000")
          h5 {{ $t("telegram") }}
          div.mt-4
            .settings-box.container
              .row
                .col-7.d-flex.flex-wrap.align-content-center {{ $t("active") }}
                .col-5.d-flex.flex-wrap.align-content-center.justify-content-end
                  toggle-button(
                    v-model="notifications.telegram.active"
                    color="var(--primary-color) !important",
                    :height="30",
                    :sync="true",
                    :aria-expanded="notifications.telegram.active ? 'true' : 'false'"
                    aria-controls="telegram"
                  )
              b-collapse(
                v-model="notifications.telegram.active",
                id="telegram"
              )
                hr(v-if="notifications.telegram.active")
                .row(v-if="notifications.telegram.active")
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("token") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-input(
                      type='text',
                      :placeholder="$t('token')",
                      v-model="notifications.telegram.token"
                    )
                hr(v-if="notifications.telegram.active")
                .row(v-if="notifications.telegram.active")
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("chat_id") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-input(
                      type='text',
                      :placeholder="$t('chat_id')",
                      v-model="notifications.telegram.chatID"
                    )
                hr(v-if="notifications.telegram.active")
                .row(v-if="notifications.telegram.active")
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("motion_message") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-input(
                      type='text',
                      :placeholder="$t('motion_message')",
                      v-model="notifications.telegram.message"
                    )
                hr(v-if="notifications.telegram.active")
                div(v-if="notifications.telegram.active")
                  div(v-for="camera in cameras", :key="camera.name")
                    .row
                      .col-12.d-flex.flex-wrap.align-content-center {{ camera.name }}
                      .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                        b-form-select(
                          v-model="camera.telegramType"
                          :options="['Text', 'Snapshot', 'Video', 'Disabled']"
                        )
                    hr
        .col-12.mt-5(data-aos="fade-up" data-aos-duration="1000")
          h5 {{ $t("webhook") }}
          div.mt-4
            .settings-box.container
              .row
                .col-7.d-flex.flex-wrap.align-content-center {{ $t("active") }}
                .col-5.d-flex.flex-wrap.align-content-center.justify-content-end
                  toggle-button(
                    v-model="notifications.webhook.active"
                    color="var(--primary-color) !important",
                    :height="30",
                    :sync="true",
                    :aria-expanded="notifications.webhook.active ? 'true' : 'false'"
                    aria-controls="webhook"
                  )
              b-collapse(
                v-model="notifications.webhook.active",
                id="webhook"
              )
                hr
                div
                  div(v-for="camera in cameras", :key="camera.name")
                    .row
                      .col-12.d-flex.flex-wrap.align-content-center {{ camera.name }}
                      .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                        b-form-input(
                          type='text',
                          placeholder="https://webhook.site/88e98f7e",
                          v-model="camera.webhookUrl"
                        )
                    hr
</template>

<script>
import { ToggleButton } from 'vue-js-toggle-button';

import { getSetting, changeSetting } from '@/api/settings.api';

export default {
  name: 'SettingsNotifications',
  components: {
    ToggleButton,
  },
  data() {
    return {
      cameras: [],
      form: {
        snapshotTimer: 10,
      },
      notifications: {
        telegram: {},
        webhook: {},
      },
      notificationsTimer: null,
      loading: true,
    };
  },
  watch: {
    cameras: {
      async handler(newValue) {
        if (!this.loading) {
          try {
            await changeSetting('cameras', newValue, '?stopStream=true');
          } catch (error) {
            this.$toast.error(error.message);
          }
        }
      },
      deep: true,
    },
    notifications: {
      async handler(newValue) {
        if (!this.loading) {
          if (this.notificationsTimer) {
            clearTimeout(this.notificationsTimer);
            this.notificationsTimer = null;
          }

          this.notificationsTimer = setTimeout(async () => {
            try {
              await changeSetting('notifications', newValue);
            } catch (error) {
              this.$toast.error(error.message);
            }
          }, 1500);
        }
      },
      deep: true,
    },
  },
  async mounted() {
    try {
      if (this.checkLevel('settings:notifications:access')) {
        const notifications = await getSetting('notifications');
        this.notifications = notifications.data;
      }

      if (this.checkLevel('settings:cameras:access')) {
        const cameras = await getSetting('cameras');
        this.cameras = cameras.data;
      }

      this.loading = false;
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease-out;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
