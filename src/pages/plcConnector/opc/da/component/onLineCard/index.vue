<template>
  <t-card style="width: 220px; height: 100px;" :hover-shadow="true">
    <t-tooltip :content="data.id">
      <t-tag max-width="160" variant="light" :theme="getQualityColor(data.quality)">
        {{ data.id }}
      </t-tag>
    </t-tooltip>
    <p class="card-value">{{ data.value }}</p>

    <p class="card-time">{{ timeChange(data.timestamp) }}</p>
  </t-card>
</template>

<style scoped lang="less">
@import "index";
</style>

<script>

const DATA_INITIAL = {
  id: '',
  name: '',
  label: '',
  value: '无数据',
  timestamp: Date.now(),
  quality: '',
  unit: '',
  description: '',
}

export default {
  name: 'onLineCard',
  props: {
    id: {
      type: String,
      required: true
    },
    refresh: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      data: {...DATA_INITIAL, id: this.id},
    }
  },
  watch: {
    refresh: {
      handler(newRefresh) {
        if (newRefresh) {
          this.data = newRefresh.find(item => item.id === this.id);
        }
      },
      deep: true,
    }
  },
  methods: {
    timeChange(time) {
      const date = new Date(time);
      const Y = `${date.getFullYear()}-`;
      const M = `${date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1}-`;
      const D = `${date.getDate()} `;
      const h = `${date.getHours()}:`;
      const m = date.getMinutes() < 10 ? `0${date.getMinutes()}:` : `${date.getMinutes()}:`;
      const s = date.getSeconds() < 10 ? `0${date.getSeconds()}` : `${date.getSeconds()}`;
      return Y + M + D + h + m + s;
    },
    getQualityColor(value) {
      switch (value) {
      case 0:
        return 'danger';
      case 64:
        return 'warning';
      case 192:
        return 'success';
      default:
        return 'default';
      }
    }
  }
}
</script>
