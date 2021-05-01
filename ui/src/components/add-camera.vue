<template lang="pug">
.add-new-camera.d-flex.flex-wrap.justify-content-center.align-content-center.pulse(
  @mouseover="show = true"
  @mouseleave="show = false"
  :class="show ? 'add-new-camera-hover' : ''"
)
  b-link(to="/settings/cameras", v-if="show")
    b-icon.add-icon(
      v-if="show"
      icon="plus", 
      aria-hidden="true", 
      :class="show ? 'show-icon' : ''"
    )
</template>

<script>
import { BIcon, BIconPlus } from 'bootstrap-vue';

export default {
  name: 'AddCamera',
  components: {
    BIcon,
    BIconPlus,
  },
  data() {
    return {
      show: false,
      top: true,
    };
  },
  beforeDestroy() {
    document.removeEventListener('scroll', this.scrollHandler);
  },
  mounted() {
    document.addEventListener('scroll', this.scrollHandler);
  },
  methods: {
    scrollHandler() {
      if (window.scrollY > 50) {
        this.top = false;
      } else {
        this.top = true;
      }
    },
  },
};
</script>

<style scoped>
.add-new-camera {
  position: fixed;
  bottom: 62px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
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
</style>
