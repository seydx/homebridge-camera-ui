import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const routes = [
  {
    path: '/cameras',
    name: 'Cameras',
    component: () => import(/* webpackChunkName: "cameras" */ '../views/Cameras.vue'),
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import(/* webpackChunkName: "config" */ '../views/Config.vue'),
  },
];

const router = new VueRouter({
  routes,
});

export default router;
