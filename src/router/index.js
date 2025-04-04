import VueRouter from 'vue-router';

// import baseRouters from './modules/base';

// import othersRouters from "@/router/modules/others";
import plcConnector from "@/router/modules/plcConnector";


const env = import.meta.env.MODE || 'development';

// 存放动态路由
// export const asyncRouterList = [...baseRouters, ...othersRouters, ...plcConnector];
export const asyncRouterList = [...plcConnector];
// 存放固定的路由
const defaultRouterList = [
  // {
  //   path: '/login',
  //   name: 'login',
  //   component: () => import('@/pages/login/index.vue'),
  // },
  {
    path: '*',
    redirect: '/connector/opc/da',
  },

  ...asyncRouterList,
];

const createRouter = () =>
  new VueRouter({
    mode: 'history',
    base: env === 'site' ? '/starter/vue/' : null,
    routes: defaultRouterList,
    scrollBehavior() {
      return {x: 0, y: 0};
    },
  });

const router = createRouter();

export function resetRouter() {
  const newRouter = createRouter();
  router.matcher = newRouter.matcher; // reset router
}

export default router;
