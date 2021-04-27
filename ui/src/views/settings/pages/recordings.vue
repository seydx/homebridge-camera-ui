<template lang="pug">
.w-100.h-100
  .d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
    b-spinner.text-color-primary
  transition-group(name="fade", mode="out-in", v-if="loading")
  transition-group(name="fade", mode="out-in", v-else)
    .d-flex.flex-wrap.justify-content-between(key="loaded")
      .col-12(data-aos="fade-up" data-aos-duration="1000" v-if="checkLevel('settings:recordings:edit')")
        h5 {{ $t("recordings") }}
        div.mt-4
          .settings-box.container
            .row
              .col-8.d-flex.flex-wrap.align-content-center {{ $t("active") }}
              .col-4.d-flex.flex-wrap.align-content-center.justify-content-end
                toggle-button(
                  v-model="recordings.active"
                  color="var(--primary-color) !important",
                  :height="30",
                  :sync="true"
                )
            hr(v-if="recordings.active")
            .row(v-if="recordings.active")
              .col-12.d-flex.flex-wrap.align-content-center {{ $t("recording_type") }}
              .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                b-form-select(
                  v-model="recordings.type"
                  :options="['Snapshot', 'Video']"
                )
            hr(v-if="recordings.active")
            .row(v-if="recordings.active")
              .col-12.d-flex.flex-wrap.align-content-center {{ $t("recording_time") }}
              .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                b-form-select(
                  v-model="recordings.timer"
                  :options="[10, 20, 30, 40, 50, 60]"
                )
            hr(v-if="recordings.active")
            .row(v-if="recordings.active")
              .col-12.d-flex.flex-wrap.align-content-center {{ $t("save_as") }}
              .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                b-form-input(
                  type='text',
                  :placeholder="$t('save_as')",
                  v-model="recordings.path"
                )
            hr(v-if="recordings.active")
            .row(v-if="recordings.active")
              .col-12.d-flex.flex-wrap.align-content-center {{ $t("remove_after_d") }}
              .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                b-form-select(
                  v-model="recordings.removeAfter"
                  :options="[1, 3, 5, 7, 10]"
                )
</template>

<script>
import { ToggleButton } from 'vue-js-toggle-button';

import { getSetting, changeSetting } from '@/api/settings.api';

export default {
  name: 'SettingsRecordings',
  components: {
    ToggleButton,
  },
  data() {
    return {
      recordings: {},
      recordingsTimer: null,
      loading: true,
    };
  },
  watch: {
    recordings: {
      async handler(newValue) {
        if (!this.loading) {
          if (this.recordingsTimer) {
            clearTimeout(this.recordingsTimer);
            this.recordingsTimer = null;
          }

          this.recordingsTimer = setTimeout(async () => {
            try {
              await changeSetting('recordings', newValue);
            } catch (error) {
              this.$toast.error(error.message);
            }
          }, 1500);
        }
      },
      deep: true,
    },
  },
  async created() {
    try {
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
