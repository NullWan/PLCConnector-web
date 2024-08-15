import request from "@/utils/request";

// 定义方法
const actions = {

  async getOPCDAServerList({state}, formData) {
    try {
      const res = await request.request({
        url: '/opc/da/serverList',
        method: 'post',
        data: formData,
        timeout: 15000
      });
      return res.data;
    } catch (error) {
      return {
        code: 500,
        msg: "查找服务器列表超时，请检查服务器地址是否正确！"
      }
    }
  },

  async connectServer({state}, serverInfo) {
    try {
      const res = await request.request({
        url: '/opc/da/connect',
        method: 'post',
        data: serverInfo,
      });
      return res.data;
    } catch (e) {
      return {
        code: 500,
        msg: "连接出错，请重试！"
      }
    }
  },

  async read({state}, readInfo) {
    try {
      const res = await request.request({
        url: '/opc/da/read',
        method: 'post',
        data: readInfo,
      });
      return res.data;
    } catch (e) {
      return {
        code: 500,
        msg: "连接出错，请重试！"
      }
    }
  },
  async start({state}) {
    try {
      const res = await request.request({
        url: '/opc/da/start',
        method: 'get',
      });
      return res.data;
    } catch (e) {
      return {
        code: 500,
        msg: "连接出错，请重试！"
      }
    }
  },
  async stop({state}, clientId) {
    try {
      const res = await request.request({
        url: `/opc/da/stop/${clientId}`,
        method: 'get',
      });
      return res.data;
    } catch (e) {
      return {
        code: 500,
        msg: "连接出错，请重试！"
      }
    }
  },
}


export default {
  namespaced: true,
  actions,
};
