<template lang="pug">
.w-100.h-100
  .d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
    b-spinner.text-color-primary
  transition-group(name="fade", mode="out-in", v-if="loading")
  transition-group(name="fade", mode="out-in", v-else)
    .d-flex.flex-wrap.justify-content-between(key="loaded")
      .col-12(data-aos="fade-up" data-aos-duration="1000" v-if="checkLevel('settings:recordings:edit')")
        b-icon.cursor-pointer.expandTriangle(icon="triangle-fill", aria-hidden="true", :rotate='expand.recordings ? "180" : "-90"', @click="expand.recordings = !expand.recordings")
        h5.cursor-pointer.settings-box-top(@click="expand.recordings = !expand.recordings") {{ $t("recordings") }}
        b-collapse(
          v-model="expand.recordings",
          id="expandRecordings"
        )
          div.mt-2.mb-4
            .settings-box.container
              .row
                .col-8.d-flex.flex-wrap.align-content-center {{ $t("active") }}
                .col-4.d-flex.flex-wrap.align-content-center.justify-content-end
                  toggle-button(
                    v-model="recordings.active"
                    color="var(--primary-color) !important",
                    :height="30",
                    :sync="true",
                    :aria-expanded="recordings.active ? 'true' : 'false'"
                    aria-controls="recordings"
                  )
              b-collapse(
                v-model="recordings.active",
                id="recordings"
              )
                hr(v-if="!recordings.hsv")
                .row(v-if="!recordings.hsv")
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("recording_type") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-select(
                      v-model="recordings.type"
                      :options="recordingTypes",
                      :disabled="recordings.hsv"
                    )
                hr(v-if="!recordings.hsv")
                .row(v-if="!recordings.hsv")
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("recording_time") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-select(
                      v-model="recordings.timer"
                      :options="recordingTimer",
                      :disabled="recordings.hsv"
                    )
                hr
                .row
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("save_as") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-input(
                      type='text',
                      :placeholder="$t('save_as')",
                      v-model="recordings.path"
                    )
                hr
                .row
                  .col-12.d-flex.flex-wrap.align-content-center {{ $t("remove_after_d") }}
                  .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                    b-form-select(
                      v-model="recordings.removeAfter"
                      :options="removeAfterTimer"
                    )
</template>

<script>
import { BIcon, BIconTriangleFill } from 'bootstrap-vue';
import { ToggleButton } from 'vue-js-toggle-button';

import { getSetting, changeSetting } from '@/api/settings.api';

export default {
  name: 'SettingsRecordings',
  components: {
    BIcon,
    BIconTriangleFill,
    ToggleButton,
  },
  data() {
    return {
      expand: {
        recordings: true,
      },
      recordings: {},
      recordingsTimer: null,
      loading: true,
      recordingTimer: [
        { value: 10, text: '10' },
        { value: 20, text: '20' },
        { value: 30, text: '30' },
        { value: 40, text: '40' },
        { value: 50, text: '50' },
        { value: 60, text: '60' },
      ],
      recordingTypes: ['Snapshot', 'Video'],
      removeAfterTimer: [1, 3, 7, 14, 30],
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

      if (this.recordings.prebuffering > 0) {
        this.recordingTimer.forEach((timer) => {
          timer.text += ` (+10s ${
            this.recordings.prebuffering === 1 ? this.$t('prebuffering') : this.$t('prebuffering_if_enabled')
          })`;
        });
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
