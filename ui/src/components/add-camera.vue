<template lang="pug">
div
  .wrapper.add-new-camera.d-flex.flex-wrap.justify-content-center.align-content-center.add-new-camera-hover.pulse
    b-icon.add-icon.show-icon(icon="plus", aria-hidden="true", @click="show = !show")
  b-modal(v-model="show" modal-class="overflow-hidden" dialog-class="modal-bottom" hide-footer hide-header)
    div(v-for="(camera, i) in cameras" :key="camera.name")
      .row
        .col.d-flex.flex-wrap.align-content-center {{ camera.name }}
        .col.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
          toggle-button(
            v-model="camera.favourite"
            color="var(--primary-color) !important",
            :height="30",
            :sync="true"
            @change="$emit('favCamera', { name: camera.name, state: camera.favourite })"
          )
      hr(v-if="i !== (cameras.length - 1)")
      div.safe-height(v-else)
</template>

<script>
import { BIcon, BIconPlus } from 'bootstrap-vue';
import { ToggleButton } from 'vue-js-toggle-button';

export default {
  name: 'AddCamera',
  components: {
    BIcon,
    BIconPlus,
    ToggleButton,
  },
  props: {
    cameras: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      show: false,
    };
  },
  beforeDestroy() {},
  mounted() {},
  methods: {},
};
</script>

<style scoped>
.wrapper {
  position: fixed;
  bottom: 62px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.add-new-camera {
  z-index: 2;
  width: 16px;
  height: 16px;
  border-radius: 9px;
  background: var(--primary-color);
  transition: 0.3s all;
  cursor: pointer;
  opacity: 0.3;
  color: #fff;
}

.add-new-camera-hover {
  opacity: 1;
  bottom: 48px;
  width: 50px;
  height: 50px;
  border-radius: 26px;
}

.add-icon {
  opacity: 0;
  transition: 0.3s all;
  font-size: 1.8rem;
  color: #fff;
}

.show-icon {
  opacity: 1;
}

.camera-list {
  position: fixed;
  bottom: 62px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 9px;
  background: var(--primary-color);
  color: var(--primary-font-color);
  z-index: 1;
  transition: 0.3s all;
  height: 200px;
  width: 300px;
}

.safe-height {
  height: env(safe-area-inset-bottom) !important;
}
</style>
