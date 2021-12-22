import Vue from 'vue';
import App from './App.vue';
import router from './router';

import '@/assets/css/main.css';
import '@/assets/css/theme.css';

import { ButtonPlugin, CardPlugin, CollapsePlugin, LinkPlugin } from 'bootstrap-vue';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

Vue.config.productionTip = false;

Vue.use(ButtonPlugin);
Vue.use(CardPlugin);
Vue.use(CollapsePlugin);
Vue.use(LinkPlugin);

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');
