<template>
  <div>
    <t-row :gutter="12">
      <div class="content-container">
        <t-row>
          <t-form :data="formData" ref="form"
                  @reset="onReset" @submit="onSubmit"
                  layout="inline" label-align="top">
            <t-tooltip content="OPC DA服务器的IP地址">
              <t-form-item label="服务器地址:" name="host" :rules="[{ required: true, message: '请输入服务器地址' }]">
                <t-input v-model="formData.host" placeholder="请输入服务器地址"></t-input>
              </t-form-item>
            </t-tooltip>

            <t-tooltip content="OPC DA服务器所在计算机的用户">
              <t-form-item label="用户名:" name="userName" :rules="[{ required: true, message: '请输入服务器用户名' }]">
                <t-input v-model="formData.userName" placeholder="请输入服务器用户名"></t-input>
              </t-form-item>
            </t-tooltip>

            <t-tooltip content="OPC DA服务器所在计算机用户密码">
              <t-form-item label="密码:" name="password" :rules="[{ required: true, message: '请输入密码' }]">
                <t-input v-model="formData.password" type="password" placeholder="请输入密码"></t-input>
              </t-form-item>
            </t-tooltip>

            <t-form-item style="margin-top: 31px">
              <t-space size="10px">
                <t-button theme="primary" type="submit"
                          :loading="findServerListLoading">
                  查找服务列表
                </t-button>
                <t-button theme="default" variant="base" type="reset">
                  重置
                </t-button>
              </t-space>
            </t-form-item>
          </t-form>
        </t-row>
        <t-divider></t-divider>
        <t-row>
          <t-col :span="4">
            <t-space>
              <t-tooltip :content="selectIsDisabled ? '请先查找服务列表' : 'OPC DA服务列表'">
                <t-select v-model="selectData" :options="selectOptions" :disabled="selectIsDisabled"
                          placeholder="请选择OPC DA服务器"/>
              </t-tooltip>
              <t-button theme="primary" variant="base" :disabled="connectState" @click="connect()">
                连接
              </t-button>

              <t-button theme="danger" variant="base" :disabled="!connectState" @click="disconnect()">
                断开
              </t-button>
            </t-space>
          </t-col>
          <t-col :span="4">
            <t-space align="center">
              <label>刷新速率：</label>
              <t-select :auto-width="true" v-model="refreshRate" :disabled="!connectState">
                <t-option label="500ms" value="500"></t-option>
                <t-option label="1s" value="1000"></t-option>
                <t-option label="2s" value="2000"></t-option>
                <t-option label="3s" value="3000"></t-option>
              </t-select>
              <label>实时数据：</label>
              <t-tooltip content="读取选中数据点实时数据">
                <t-switch size="large" :label="['开', '关']" :disabled="!connectState" @change="read"
                :value="switchValue"></t-switch>
              </t-tooltip>
            </t-space>
          </t-col>
          <t-col :span="2" :offset="2">
            <t-space :size="4">
              <label>连接状态：</label>
              <span :style="{color: this.connectState ? 'green' : '#d54941'}" :class="iconfont"></span>
              <t-tag :theme="this.connectState ? 'success' : 'danger'" variant="light">
                {{ this.connectState ? '已连接' : '未连接' }}
              </t-tag>
            </t-space>
          </t-col>
        </t-row>

        <t-row style="margin-top: 10px">
          <t-col :span="4">
            <t-tree
              :data="items"
              :lazy="true"
              :activable="true"
              :hover="true"
              :transition="true"
              height="50vh"
              :checkStrictly="true"
              :checkable="true"
              v-model="treeSelectedNode"
              @click="addItem"
            />
          </t-col>
          <t-col :span="8">
            <t-space :break-line="true">
              <on-line-card v-for="(id, index) in treeSelectedNode" :key="index" :id="id" :refresh="dataArray"/>
            </t-space>
          </t-col>
        </t-row>

      </div>
    </t-row>
  </div>
</template>

<script>

import OnLineCard from '@/pages/plcConnector/opc/da/component/onLineCard/index.vue';
import {v4 as uuidV4} from 'uuid';

const INITIAL_DATA = {
  host: "192.168.134.130",
  userName: "OPCUser",
  password: "8ik,9ol.",
}

const clientIdUUID = uuidV4();

let webSocket = {};

let isWebSocketOpen = false;

export default {
  name: 'OpcDa',
  components: {OnLineCard},
  data() {
    return {
      formData: INITIAL_DATA,
      selectData: '',
      selectOptions: [],
      isFindServerList: false,
      selectIsDisabled: true,
      findServerListLoading: false,
      items: [],
      connectState: false,
      refreshRate: '1000',
      iconfont: 'iconfont icon-duankailianjie',
      treeSelectedNode: [],
      dataArray: [],
      switchValue: false,
    }
  },
  mounted() {
    window.addEventListener('beforeunload', e => this.beforeunloadHandler(e))
  },
  beforeDestroy() {
    // 在组件销毁前关闭 WebSocket 连接
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.close();
    }
  },
  methods: {
    onReset() {
      this.formData = INITIAL_DATA
    },
    onSubmit({validateResult, firstError}) {
      if (validateResult === true) {
        this.findServerListLoading = true;
        this.$store.dispatch('opcConnection/getOPCDAServerList', this.formData).then(res => {
          if (res.code === 200) {
            this.$notify.success({title: "提示", content: `查找到${res.data.length}条服务`, closeBtn: true});
            this.isFindServerList = true;
            if (res.data.length > 0) {
              this.selectOptions = res.data;
              this.selectIsDisabled = false;
            }
          } else {
            this.$notify.error({title: "连接出错", content: res.msg, closeBtn: true});
            this.isFindServerList = false;
          }
        }).catch(err => {
          this.$notify.error({title: "未知错误", content: err.message, closeBtn: true});
          this.isFindServerList = false;
        }).finally(() => {
          this.findServerListLoading = false;
        })
      } else {
        this.$notify.warning({title: "提示", content: firstError, closeBtn: true});
      }
    },
    connect() {
      if (!this.isFindServerList) {
        this.$notify.warning({title: "提示", content: "请先查找服务列表", closeBtn: true});
        return;
      }
      if (this.selectData === '') {
        this.$notify.warning({title: "提示", content: "请先选择OPC DA服务器", closeBtn: true});
        return;
      }
      const serverInfo = this.getSerInfo();
      this.$store.dispatch("opcConnection/connectServer", serverInfo).then(res => {
        if (res.code === 200) {
          this.$notify.success({title: "提示", content: "连接成功", closeBtn: true});
          this.connectState = true;
          this.iconfont = 'iconfont icon-lianjie';
          this.items = res.data;
        } else {
          this.$notify.error({title: "连接出错", content: res.msg, closeBtn: true});
          this.connectState = false;
          this.iconfont = 'iconfont icon-duankailianjie';
        }
      }).catch(err => {
        this.$notify.error({title: "提示", content: err.message, closeBtn: true});
        this.connectState = false;
        this.iconfont = 'iconfont icon-duankailianjie';
      });
    },
    read(val) {
      if (val) {
        this.switchValue = true;
        this.$store.dispatch("opcConnection/start").then(res => {
          if (res.code !== 200) {
            throw new Error(res.msg);
          }
          if (!isWebSocketOpen) {
            webSocket = new WebSocket(`ws://localhost:8089/websocket/${clientIdUUID}`);
          }
          webSocket.onopen = () => {
            isWebSocketOpen = true;
            console.log('WebSocket connection opened.');
          };

          // 处理 WebSocket 错误事件
          webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
          };

          // 处理 WebSocket 关闭事件
          webSocket.onclose = () => {
            isWebSocketOpen = false;
            console.log('WebSocket connection closed.');
          };

          // 处理 WebSocket 接收到的消息
          webSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // 根据接收到的数据更新组件的状态
            this.handleReceivedData(data);
          };
        }).catch(err => {
          this.$notify.error({title: "提示", content: err.message, closeBtn: true});
        })
      } else {
        this.switchValue = false;
        // 关闭 WebSocket 连接
        webSocket.close();
        // 通知后端，暂停发送数据
        this.$store.dispatch("opcConnection/stop", clientIdUUID).then(res => {
          if (res.code !== 200) {
            throw new Error(res.msg);
          }
        }).catch(err => {
          this.$notify.error({title: "提示", content: err.message, closeBtn: true});
        })
      }
    },
    addItem(obj) {
      if (obj.node.data.checkable) {
        const readData = {
          refreshRate: this.refreshRate,
          item: obj.node.value,
          clientId: clientIdUUID
        }
        this.$store.dispatch("opcConnection/read", readData).then(res => {
          if (res.code === 200) {
            console.log("添加点位成功..")
          } else {
            this.$notify.error({title: "提示", content: res.msg, closeBtn: true});
          }
        }).catch(err => {
          this.$notify.error({title: "提示", content: err.message, closeBtn: true});
        })
      }
    },
    handleReceivedData(data) {
      // 更新 dataArray
      this.updateOrAddItem(this.dataArray, data);
    },
    getSerInfo() {
      return {
        host: this.formData.host,
        userName: this.formData.userName,
        password: this.formData.password,
        clsid: this.selectData,
      };
    },
    beforeunloadHandler() {
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        this.$store.dispatch("opcConnection/stop", clientIdUUID).then(res => {
          if (res.code !== 200) {
            this.$notify.error({title: "错误", content: "断开连接失败，请稍后再试", closeBtn: true});
          } else if (isWebSocketOpen) {
            webSocket.close();
          }
        }).catch(err => {
          this.$notify.error({title: "错误", content: err.message, closeBtn: true});
        })
      }
    },
    updateOrAddItem(array, item) {
      // 使用find查找数组中是否存在具有相同id的对象
      const existingItem = array.find(obj => obj.id === item.id);
      if (existingItem) {
        // 如果存在，则更新对象的属性
        Object.assign(existingItem, item);
      } else {
        // 如果不存在，则添加新对象到数组
        array.push(item);
      }
    },
    disconnect() {
      this.$store.dispatch("opcConnection/stop", clientIdUUID).then(res => {
        if (res.code !== 200) {
          this.$notify.error({title: "错误", content: "断开连接失败，请稍后再试", closeBtn: true});
        } else {
          if (isWebSocketOpen) {
            webSocket.close();
          }
          this.connectState = false;
          this.treeSelectedNode = [];
          this.switchValue = false;
          this.items = [];
        }
      }).catch(err => {
        this.$notify.error({title: "错误", content: err.message, closeBtn: true});
      })
    }
  }
}

</script>

<style scoped lang="less">
@import "index";
</style>

