<template lang="pug">
.w-100.h-100
  .d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
    b-spinner.text-color-primary
  transition-group(name="fade", mode="out-in", v-if="loading")
  transition-group(name="fade", mode="out-in", v-else)
    .d-flex.flex-wrap.justify-content-between(key="loaded")
      .col-12.z-index-1.mb-5(data-aos="fade-up" data-aos-duration="1000" v-if="checkLevel('settings:general:edit')")
        h5 {{ $t("general") }}
        div.mt-4
          .settings-box.container
            .row
              .col-8.d-flex.flex-wrap.align-content-center {{ $t("at_home") }}
              .col-4.d-flex.flex-wrap.align-content-center.justify-content-end
                toggle-button(
                  v-model="general.atHome"
                  color="var(--primary-color) !important",
                  :height="30",
                  :sync="true",
                )
            hr
            .row
              .col-12.d-flex.flex-wrap.align-content-center {{ $t("exclude") }}
              .col-12.d-flex.flex-wrap.align-content-center.justify-content-end.mt-3
                multiselect(
                  v-model="general.exclude",
                  :options="cameras.map(camera => { return camera.name })",
                  :searchable="false",
                  :close-on-select="false",
                  :show-labels="false"
                  :placeholder="$t('select')",
                  :multiple="true",
                  :limit="2"
                )
                  template(slot="noOptions")
                    strong {{ $t("empty") }}
      .col-12.mb-5(data-aos="fade-up" data-aos-duration="1000", v-if="!uiConfig || (uiConfig && uiConfig.theme === 'auto')")
        h5 {{ $t("themes") }}
        div.mt-4
          .settings-box.container
            .row
              .col-8.d-flex.flex-wrap.align-content-center {{ $t("darkmode") }}
              .col-4.d-flex.flex-wrap.align-content-center.justify-content-end
                toggle-button.darkmode-toggle(
                  color="var(--primary-color) !important",
                  :height="30",
                  :sync="true",
                  v-model="darkmode"
                  @input="switchDarkmode"
                )
            hr
            .row
              .col-4.d-flex.flex-wrap.align-content-center {{ $t("themes") }}
              .col-8.d-flex.flex-wrap.align-content-center.justify-content-end
                input#switch-pink.theme-switches.switch-pink(@input="switchTheme('pink')", type="radio", name="theme-group")
                label.m-0(for="switch-pink")
                input#switch-blue.theme-switches.switch-blue(@input="switchTheme('blue')", type="radio", name="theme-group")
                label.m-0(for="switch-blue")
                input#switch-yellow.theme-switches.switch-yellow(@input="switchTheme('yellow')", type="radio", name="theme-group")
                label.m-0(for="switch-yellow")
                input#switch-green.theme-switches.switch-green(@input="switchTheme('green')", type="radio", name="theme-group")
                label.m-0(for="switch-green")
                input#switch-gray.theme-switches.switch-gray(@input="switchTheme('gray')", type="radio", name="theme-group")
                label.m-0(for="switch-gray")
      .col-12(data-aos="fade-up" data-aos-duration="1000" v-if="checkLevel('settings:general:edit')")
        h5 {{ $t("rooms") }}
        div.mt-4
          .settings-box.container
            .row
              .col-10.d-flex.flex-wrap.align-content-center
                b-form-input(
                  type='text',
                  :placeholder="$t('room_name')",
                  v-model="form.newRoom",
                  :state="roomState",
                  lazy
                )
              .col.d-flex.flex-wrap.align-content-center.justify-content-end.align-content-center.pl-0
                b-link.text-success
                  b-icon(icon="plus-circle-fill", @click="addRoom()")
            hr
            div(v-for="(room, index) in general.rooms" :key="room" data-aos="fade-up" data-aos-duration="1000")
              .row
                .col-10
                  span.fs-6 {{ room === 'Standard' ? $t("standard") : room }}
                .col.d-flex.flex-wrap.align-content-center.justify-content-end.align-content-center.pl-0
                  b-link.text-danger
                    b-icon(icon="x-circle-fill", v-if="room !== 'Standard'", @click="removeRoom(room, index)")
              hr
</template>

<script>
import { BIcon, BIconPlusCircleFill, BIconXCircleFill } from 'bootstrap-vue';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import { ToggleButton } from 'vue-js-toggle-button';

import { getSetting, changeSetting } from '@/api/settings.api';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'SettingsGeneral',
  components: {
    BIcon,
    BIconPlusCircleFill,
    BIconXCircleFill,
    Multiselect,
    ToggleButton,
  },
  data() {
    return {
      cameras: [],
      darkmode: false,
      form: {
        newRoom: '',
      },
      general: {
        exclude: [],
        rooms: [],
      },
      generalTimer: null,
      loading: true,
    };
  },
  computed: {
    roomState() {
      const state =
        this.form.newRoom.length > 0 ? (!this.general.rooms.includes(this.form.newRoom) ? true : false) : null;
      return state;
    },
    uiConfig() {
      return this.$store.state.config.ui;
    },
  },
  watch: {
    general: {
      async handler(newValue) {
        if (!this.loading) {
          if (this.generalTimer) {
            clearTimeout(this.generalTimer);
            this.generalTimer = null;
          }

          this.generalTimer = setTimeout(async () => {
            try {
              await changeSetting('general', newValue);
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
      if (this.checkLevel('settings:general:access')) {
        const general = await getSetting('general');
        this.general = general.data;
      }

      if (this.checkLevel('settings:cameras:access')) {
        const cameras = await getSetting('cameras');
        this.cameras = cameras.data;
      }

      this.loading = false;
      await timeout(300);

      const togglePinkSwitch = document.querySelector('.switch-pink');
      const toggleBlueSwitch = document.querySelector('.switch-blue');
      const toggleYellowSwitch = document.querySelector('.switch-yellow');
      const toggleGreenSwitch = document.querySelector('.switch-green');
      const toggleGraySwitch = document.querySelector('.switch-gray');

      const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;

      const currentColorTheme = localStorage.getItem('theme-color')
        ? localStorage.getItem('theme-color')
        : togglePinkSwitch
        ? togglePinkSwitch.click()
        : 'pink';

      this.darkmode = currentTheme === 'dark';

      if (currentColorTheme === 'pink' && togglePinkSwitch) {
        togglePinkSwitch.checked = true;
      } else if (currentColorTheme === 'blue' && toggleBlueSwitch) {
        toggleBlueSwitch.checked = true;
      } else if (currentColorTheme === 'yellow' && toggleYellowSwitch) {
        toggleYellowSwitch.checked = true;
      } else if (currentColorTheme === 'green' && toggleGreenSwitch) {
        toggleGreenSwitch.checked = true;
      } else if (currentColorTheme === 'gray' && toggleGraySwitch) {
        toggleGraySwitch.checked = true;
      }
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
  methods: {
    addRoom() {
      if (this.roomState) {
        this.general.rooms.push(this.form.newRoom);
        this.$toast.success(this.$t('successfully_created'));
      } else if (this.roomState === null) {
        this.$toast.error(this.$t('no_roomname_defined'));
      } else {
        this.$toast.error(this.$t('room_already_exists'));
      }
    },
    removeRoom(room, index) {
      this.$toast.success(this.$t('successfully_removed'));
      this.$delete(this.general.rooms, index);
    },
    switchDarkmode(state) {
      document.documentElement.dataset.theme = state ? 'dark' : 'light';
      localStorage.setItem('theme', state ? 'dark' : 'light');
    },
    switchTheme(theme) {
      document.documentElement.dataset.themeColor = theme;
      localStorage.setItem('theme-color', theme);

      const images = document.querySelectorAll('.theme-img');

      for (const img of images) {
        let imgSource = img.src;
        imgSource = imgSource.split('/');
        imgSource = imgSource[imgSource.length - 1].split('.png')[0].split('.')[0].split('@')[0];

        img.src = require(`@/assets/img/${imgSource}@${theme}.png`);
      }
    },
  },
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease-out;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

[type='radio'].theme-switches:checked + label,
[type='radio'].theme-switches:not(:checked) + label {
  width: auto;
}

[type='radio'].theme-switches:checked,
[type='radio'].theme-switches:not(:checked) {
  position: absolute;
  left: -9999px;
}

[type='radio'].theme-switches:checked + label,
[type='radio'].theme-switches:not(:checked) + label {
  position: relative;
  padding-left: 25px;
  cursor: pointer;
  line-height: 20px;
  display: inline-block;
  color: #666;
  top: -12px;
}

[type='radio'].theme-switches:checked + label:before,
[type='radio'].theme-switches:not(:checked) + label:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border-radius: 100%;
}

[type='radio'].theme-switches:checked.switch-pink + label:before,
[type='radio'].theme-switches:not(:checked).switch-pink + label:before {
  background: #d12049;
}

[type='radio'].theme-switches:checked.switch-blue + label:before,
[type='radio'].theme-switches:not(:checked).switch-blue + label:before {
  background: rgb(10, 132, 255);
}

[type='radio'].theme-switches:checked.switch-yellow + label:before,
[type='radio'].theme-switches:not(:checked).switch-yellow + label:before {
  background: #f9d74b;
}

[type='radio'].theme-switches:checked.switch-green + label:before,
[type='radio'].theme-switches:not(:checked).switch-green + label:before {
  background: #67ce67;
}

[type='radio'].theme-switches:checked.switch-gray + label:before,
[type='radio'].theme-switches:not(:checked).switch-gray + label:before {
  background: rgb(99, 99, 102);
}

[type='radio'].theme-switches:checked.switch-pink + label:before,
[type='radio'].theme-switches:not(:checked).switch-pink + label:before {
  border: 2px solid #d12049;
}

[type='radio'].theme-switches:checked.switch-blue + label:before,
[type='radio'].theme-switches:not(:checked).switch-blue + label:before {
  border: 2px solid rgb(10, 132, 255);
}

[type='radio'].theme-switches:checked.switch-yellow + label:before,
[type='radio'].theme-switches:not(:checked).switch-yellow + label:before {
  border: 2px solid #f9d74b;
}

[type='radio'].theme-switches:checked.switch-green + label:before,
[type='radio'].theme-switches:not(:checked).switch-green + label:before {
  border: 2px solid #67ce67;
}

[type='radio'].theme-switches:checked.switch-gray + label:before,
[type='radio'].theme-switches:not(:checked).switch-gray + label:before {
  border: 2px solid rgb(99, 99, 102);
}

[type='radio'].theme-switches:checked + label:after,
[type='radio'].theme-switches:not(:checked) + label:after {
  content: '';
  width: 21px;
  height: 21px;
  position: absolute;
  top: -1px;
  left: -1px;
  border-radius: 100%;
  -webkit-transition: all 0.2s ease;
  -o-transition: all 0.2s ease;
  transition: all 0.2s ease;
}

[type='radio'].theme-switches:checked.switch-pink + label:after,
[type='radio']:not(:checked) + label:after {
  border: 5px solid #6f0d0d;
}

[type='radio'].theme-switches:checked.switch-blue + label:after,
[type='radio'].theme-switches:not(:checked) + label:after {
  border: 5px solid #165390;
}

[type='radio'].theme-switches:checked.switch-yellow + label:after,
[type='radio'].theme-switches:not(:checked) + label:after {
  border: 5px solid #b0941d;
}

[type='radio'].theme-switches:checked.switch-green + label:after,
[type='radio']:not(:checked) + label:after {
  border: 5px solid #259225;
}

[type='radio'].theme-switches:checked.switch-gray + label:after,
[type='radio'].theme-switches:not(:checked) + label:after {
  border: 5px solid #2f2f2f;
}

[type='radio'].theme-switches:not(:checked) + label:after {
  opacity: 0;
  -webkit-transform: scale(0);
  -ms-transform: scale(0);
  transform: scale(0);
}

[type='radio'].theme-switches:checked + label:after {
  opacity: 1;
  -webkit-transform: scale(1);
  -ms-transform: scale(1);
  transform: scale(1);
}
</style>
