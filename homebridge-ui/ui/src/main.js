import Vue from 'vue';
import App from './App.vue';
import router from './router';
import vuetify from '@/plugins/vuetify';

import '@/assets/css/tailwind.css';
import '@/assets/css/main.css';
import '@/assets/css/theme.css';

Vue.config.productionTip = false;

new Vue({
  router,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');
