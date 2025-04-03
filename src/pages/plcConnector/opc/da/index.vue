<template>
  <div>
    <t-row :gutter="12">
      <div class="content-container">
        <t-row>
          <t-form :data="formData" ref="form"
                  @reset="onReset" @submit="handleServerSearch"
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
              <t-button theme="primary" variant="base" :disabled="isConnected" @click="connect()">
                连接
              </t-button>

              <t-button theme="danger" variant="base" :disabled="!isConnected" @click="disconnect()">
                断开
              </t-button>
            </t-space>
          </t-col>
          <t-col :span="4">
            <t-space align="center">
              <label>刷新速率：</label>
              <t-select :auto-width="true" v-model="refreshRate" :disabled="!isConnected">
                <t-option :label="item.label" :value="item.value" v-for="(item, index) in initRefreshRate"
                          :key="index"></t-option>
              </t-select>
              <label>实时数据：</label>
              <t-tooltip content="读取选中数据点实时数据">
                <t-switch size="large" :label="['开', '关']" :disabled="!isConnected" @change="toggleDataStream"
                          :value="connectionState.isDataStreamActive"></t-switch>
              </t-tooltip>
            </t-space>
          </t-col>
          <t-col :span="2" :offset="2">
            <t-space :size="4">
              <label>连接状态：</label>
              <span :style="{color: statusColor}" :class="statusIcon"></span>
              <t-tag :theme="stateTheme" variant="light">
                {{ connectionStatus }}
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
              @click="handleTreeNodeClick"
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
import {Client, ActivationState} from '@stomp/stompjs';
import Fingerprint from '@fingerprintjs/fingerprintjs';

const INITIAL_DATA = {
  host: "192.168.134.130",
  userName: "OPCUser",
  password: "8ik,9ol.",
}

const REFRESH_RATE_OPTIONS = [
  {label: "500ms", value: "500"},
  {label: "1s", value: "1000"},
  {label: "2s", value: "2000"},
  {label: "3s", value: "3000"}
]

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
      refreshRate: '1000',
      treeSelectedNode: [],
      dataArray: [],
      switchValue: false,
      stompClient: null,
      browserKey: null,
      connectionState: {
        isConnected: false,
        isDataStreamActive: false
      }
    }
  },
  computed: {
    isConnected() {
      return this.connectionState.isConnected
    },
    isDataStreamActive() {
      return this.connectionState.isDataStreamActive
    },
    connectionStatus() {
      return this.isConnected ? '已连接' : '未连接'
    },
    statusColor() {
      return this.isConnected ? 'green' : '#d54941'
    },
    statusIcon() {
      return this.isConnected
        ? 'iconfont icon-lianjie'
        : 'iconfont icon-duankailianjie'
    },
    stateTheme() {
      return this.isConnected ? 'success' : 'danger'
    },
    initRefreshRate() {
      return REFRESH_RATE_OPTIONS;
    }
  },
  async created() {
    await this.generateBrowserFingerprint()
  },
  beforeDestroy() {
    // 在组件销毁前,关闭STOMP连接
    if (this.stompClient !== null && this.stompClient.state === ActivationState.ACTIVE) {
      this.stompClient.deactivate();
    }
    // 断开连接
    this.disconnect();
  },
  methods: {
    // 生成浏览器指纹
    async generateBrowserFingerprint() {
      try {
        const fp = await Fingerprint.load()
        const result = await fp.get()
        this.browserKey = result.visitorId
      } catch (error) {
        console.error('生成浏览器指纹失败:', error)
        // 降级方案：使用随机ID
        this.browserKey = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    },
    onReset() {
      this.formData = INITIAL_DATA
    },
    // 连接前验证
    validateBeforeConnect() {
      if (!this.isFindServerList) {
        this.handleWarning("提示", "请先查找服务列表")
        return false
      }
      if (!this.selectData) {
        this.handleWarning("提示", "请先选择OPC DA服务器")
        return false
      }
      return true
    },
    async handleServerSearch({validateResult, firstError}) {
      if (validateResult === true) {
        this.findServerListLoading = true;
        try {
          const response = await this.$store.dispatch('opcConnection/getOPCDAServerList', this.formData);
          if (response.code === 200) {
            await this.$notify.success({title: "提示", content: `查找到${response.data.length}条服务`, closeBtn: true});
            this.isFindServerList = true;
            this.selectOptions = response.data
            this.selectIsDisabled = response.data.length === 0
          } else {
            this.handleError("连接出错", response.msg);
          }
        } catch (error) {
          this.handleError("未知错误", error.message);
          this.isFindServerList = false;
        } finally {
          this.findServerListLoading = false;
        }
      } else {
        await this.$notify.warning({title: "提示", content: firstError, closeBtn: true});
      }
    },
    async connect() {
      if (!this.validateBeforeConnect()) return;
      try {
        const serverInfo = this.getSerInfo();
        const response = await this.$store.dispatch(
          "opcConnection/connectServer",
          serverInfo
        )

        if (response.code === 200) {
          await this.$notify.success({title: "提示", content: "连接成功", closeBtn: true})
          this.updateConnectionState({isConnected: true})
          this.items = response.data
        } else {
          this.handleError("连接出错", response.msg)
          this.updateConnectionState({isConnected: false})
        }
      } catch (error) {
        this.handleError("连接错误", error.message)
        this.updateConnectionState({isConnected: false})
      }
    },
    // 切换数据流
    async toggleDataStream(isActive) {
      if (isActive) {
        await this.startDataStream()
      } else {
        await this.stopDataStream()
      }
    },
    async startDataStream() {
      this.setupStompClient();
      try {
        const response = await this.$store.dispatch(
          "opcConnection/start",
          this.browserKey
        )
        if (response.code === 200) {
          this.updateConnectionState({isDataStreamActive: true})
        } else {
          this.updateConnectionState({isDataStreamActive: false})
          this.handleError("提示", "数据推送失败！")
        }
      } catch (error) {
        this.updateConnectionState({isDataStreamActive: false})
        this.handleError("提示", "数据推送失败！")
        console.error(error)
      }
    },
    // 停止数据流
    async stopDataStream() {
      try {
        const response = await this.$store.dispatch(
          "opcConnection/stop",
          this.browserKey
        )
        if (response.code === 200) {
          this.updateConnectionState({isDataStreamActive: false})
          this.disconnectStompClient()
        } else {
          this.handleError("提示", "数据停止推送失败！")
          console.error(response.msg)
        }
      } catch (error) {
        this.handleError("提示", "数据停止推送失败！")
        console.error(error)
      }
    },
    disconnectStompClient() {
      if (this.stompClient?.state === ActivationState.ACTIVE) {
        this.stompClient.deactivate()
      }
      this.stompClient = null
    },
    // 设置STOMP客户端
    setupStompClient() {
      this.stompClient = new Client({
        brokerURL: 'ws://localhost:8089/opc-websocket',
        debug: (str) => console.log('STOMP: ', str),
        onConnect: () => {
          console.log('STOMP连接成功')
          this.subscribeToDataTopic()
        },
        onStompError: (frame) => {
          this.handleError("错误", 'STOMP组件初始化失败！')
          console.error(frame)
        },
        onWebSocketError: (evt) => {
          this.handleError("错误", '连接到WebSocket失败')
          console.error(evt)
        }
      })
      this.stompClient.activate()
    },
    handleTreeNodeClick(obj) {
      if (!obj.node.data.checkable) return;
      const operation = obj.node.checked ? "remove" : "add"
      const payload = {
        refreshRate: this.refreshRate,
        item: obj.node.value,
        clientId: this.browserKey
      }

      this.$store.dispatch(
        `opcConnection/${operation}`,
        payload
      ).then(res => {
        if (res.code === 200) {
          console.log(`${operation === 'add' ? '添加' : '移除'}点位成功`)
        } else {
          this.handleError("提示", res.msg)
        }
      }).catch(error => {
        this.handleError("提示", `${operation === 'add' ? '添加' : '移除'}点位失败！`)
        console.error(error)
      })

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
      this.$store.dispatch("opcConnection/disconnect", this.browserKey).then(res => {
        if (res.code !== 200) {
          this.$notify.error({title: "错误", content: "断开连接失败，请稍后再试", closeBtn: true});
        } else {
          if (this.stompClient !== null && this.stompClient.state === ActivationState.ACTIVE) {
            this.stompClient.deactivate();
          }
          this.updateConnectionState({isConnected: false, isDataStreamActive: false});
          this.treeSelectedNode = [];
          this.switchValue = false;
          this.items = [];
        }
      }).catch(err => {
        this.$notify.error({title: "错误", content: err.message, closeBtn: true});
        console.error(err)
      })
    },
    subscribeToDataTopic() {
      if (this.stompClient.state === ActivationState.ACTIVE) {
        this.stompClient.subscribe('/topic/opc/realtime', (message) => {
          console.log('Received message: ', message.body);
          const data = JSON.parse(message.body);
          this.handleReceivedData(data);
        })
      } else {
        this.$notify.error({title: "错误", content: "后端连接未建立，无法订阅主题！", closeBtn: true});
      }
    },
    // 更新连接状态
    updateConnectionState(newState) {
      this.connectionState = {...this.connectionState, ...newState}
    },
    // 统一错误处理
    handleError(title, message) {
      this.$notify.error({title, content: message, closeBtn: true})
      console.error(`${title}: ${message}`)
    },

    // 统一警告处理
    handleWarning(title, message) {
      this.$notify.warning({title, content: message, closeBtn: true})
    }
  },
}

</script>

<style scoped lang="less">
@import "index";
</style>

