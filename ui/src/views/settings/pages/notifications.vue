<template lang="pug">
.w-100.h-100
  .d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
    b-spinner.text-color-primary
  transition-group(name="fade", mode="out-in", v-if="loading")
  transition-group(name="fade", mode="out-in", v-else)
    .d-flex.flex-wrap.justify-content-between(key="loaded")
      .col-12(data-aos="fade-up" data-aos-duration="1000" v-if="checkLevel(['settings:cameras:edit', 'settings:notifications:edit'])")
        b-icon.cursor-pointer.expandTriangle(icon="triangle-fill", aria-hidden="true", :rotate='expand.notifications ? "180" : "-90"', @click="expand.notifications = !expand.notifications")
        h5.cursor-pointer.settings-box-top(@click="expand.notifications = !expand.notifications") {{ $t("notifications") }}
        b-collapse(
          v-model="expand.notifications",
          id="expandNotifications"
        )
          div.mt-2.mb-4
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
                hr.hr-underline(v-if="notifications.active")
                .row(v-if="notifications.active")
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("remove_after_h") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-select(
                      v-model="notifications.removeAfter"
                      :options="removeAfterTimer"
                    )
      b-collapse.w-100(
        v-model="notifications.active",
        id="notifications"
      )
        .col-12.mt-2(data-aos="fade-up" data-aos-duration="1000")
          b-icon.cursor-pointer.expandTriangle(icon="triangle-fill", aria-hidden="true", :rotate='expand.telegram ? "180" : "-90"', @click="expand.telegram = !expand.telegram")
          h5.cursor-pointer.settings-box-top(@click="expand.telegram = !expand.telegram") {{ $t("telegram") }}
          b-collapse(
            v-model="expand.telegram",
            id="expandTelegram"
          )
            div.mt-2.mb-4
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
                  hr.hr-underline(v-if="notifications.telegram.active")
                  .row(v-if="notifications.telegram.active")
                    .col-12.d-flex.flex-wrap.align-content-center {{ $t("token") }}
                    .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                      b-form-input(
                        type='text',
                        :placeholder="$t('token')",
                        v-model="notifications.telegram.token"
                      )
                  hr.hr-underline(v-if="notifications.telegram.active")
                  .row(v-if="notifications.telegram.active")
                    .col-12.d-flex.flex-wrap.align-content-center {{ $t("chat_id") }}
                    .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                      b-form-input(
                        type='text',
                        :placeholder="$t('chat_id')",
                        v-model="notifications.telegram.chatID"
                      )
                  hr.hr-underline(v-if="notifications.telegram.active")
                  .row(v-if="notifications.telegram.active")
                    .col-12.d-flex.flex-wrap.align-content-center {{ $t("motion_message") }}
                    .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                      b-form-input(
                        type='text',
                        :placeholder="$t('motion_message')",
                        v-model="notifications.telegram.message"
                      )
                  hr.hr-underline(v-if="notifications.telegram.active")
                  div(v-if="notifications.telegram.active")
                    div(v-for="(camera, index) in cameras", :key="camera.name")
                      .row(:id='"telegramType" + index')
                        .col-12.d-flex.flex-wrap.align-content-center {{ camera.name }}
                        .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                          b-form-select(
                            v-model="camera.telegramType"
                            :options="telegramTypes"
                          )
                      hr.hr-underline
        .col-12.mt-2(data-aos="fade-up" data-aos-duration="1000")
          b-icon.cursor-pointer.expandTriangle(icon="triangle-fill", aria-hidden="true", :rotate='expand.webhook ? "180" : "-90"', @click="expand.webhook = !expand.webhook")
          h5.cursor-pointer.settings-box-top(@click="expand.webhook = !expand.webhook") {{ $t("webhook") }}
          b-collapse(
            v-model="expand.webhook",
            id="expandWebhook"
          )
            div.mt-2.mb-4
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
                  hr.hr-underline
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
                      hr.hr-underline
</template>

<script>
import { BIcon, BIconTriangleFill } from 'bootstrap-vue';
import { ToggleButton } from 'vue-js-toggle-button';

import { getSetting, changeSetting } from '@/api/settings.api';

export default {
  name: 'SettingsNotifications',
  components: {
    BIcon,
    BIconTriangleFill,
    ToggleButton,
  },
  data() {
    return {
      cameras: [],
      expand: {
        notifications: true,
        telegram: true,
        webhook: true,
      },
      form: {
        snapshotTimer: 10,
      },
      notifications: {
        telegram: {},
        webhook: {},
      },
      recordings: {},
      notificationsTimer: null,
      loading: true,
      removeAfterTimer: [1, 3, 6, 12, 24],
      telegramTypes: ['Text', 'Snapshot', 'Video', 'Disabled'],
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

      if (this.checkLevel('settings:recordings:access')) {
        const recordings = await getSetting('recordings');
        this.recordings = recordings.data;
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
