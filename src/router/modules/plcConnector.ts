import Layout from '@/layouts/index.vue';


// export default [
//   {
//     path: '/plcConnector',
//     name: 'plcConnector',
//     component: Layout,
//     redirect: '/plcConnector/opcDa',
//     meta: {title: 'PLC连接器', icon: 'map-connection'},
//     children: [
//       {
//         path: 'opcDa',
//         name: 'plcConnectorOpcDa',
//         component: () => import('@/pages/plcConnector/opc/opcda/index.vue'),
//         meta: {title: 'OPC DA连接器'},
//       }
//     ],
//   },
// ];

export default [
  {
    path: '/connector',
    name: 'connector',
    component: Layout,
    redirect: '/connector/opc/da',
    meta: { title: 'PLC连接器', icon: 'map-connection' },
    children: [
      {
        path: 'opc/da',
        name: 'UserIndex',
        component: () => import('@/pages/plcConnector/opc/da/index.vue'),
        meta: { title: 'OPC DA连接器' },
      },
    ],
  },
];

