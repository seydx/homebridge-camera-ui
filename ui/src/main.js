import Vue from 'vue';
import App from '@/App.vue';

import router from '@/router';
import store from '@/store';
import '@/registerServiceWorker';
import '@/assets/css/main.css';

import permission from '@/mixins/permission.mixin';

import { i18n } from '@/i18n';

import AOS from 'aos';
import 'aos/dist/aos.css';

import {
  ButtonPlugin,
  CardPlugin,
  FormFilePlugin,
  FormInputPlugin,
  FormPlugin,
  FormSelectPlugin,
  LinkPlugin,
  ModalPlugin,
  OverlayPlugin,
  NavbarPlugin,
  PopoverPlugin,
  SpinnerPlugin,
} from 'bootstrap-vue';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

import Toast from 'vue-toastification';
import ToastOptions from '@/common/toast.defaults.js';
import 'vue-toastification/dist/index.css';

import VueSocketIOExt from 'vue-socket.io-extended';
import socket from '@/common/socket-instance';

Vue.mixin(permission);

Vue.use(ButtonPlugin);
Vue.use(CardPlugin);
Vue.use(FormFilePlugin);
Vue.use(FormInputPlugin);
Vue.use(FormPlugin);
Vue.use(FormSelectPlugin);
Vue.use(LinkPlugin);
Vue.use(ModalPlugin);
Vue.use(OverlayPlugin);
Vue.use(NavbarPlugin);
Vue.use(PopoverPlugin);
Vue.use(SpinnerPlugin);
Vue.use(Toast, ToastOptions);
Vue.use(VueSocketIOExt, socket, { store });

Vue.config.productionTip = false;

const app = new Vue({
  router,
  store,
  i18n: i18n,
  created() {
    AOS.init({
      offset: 0,
    });
  },
  render: (h) => h(App),
}).$mount('#app');

export default app;
