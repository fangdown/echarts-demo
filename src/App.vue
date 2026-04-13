<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import BigDataDemo from './components/BigDataDemo.vue'

const barRef = ref(null)
const lineRef = ref(null)
const barChart = shallowRef(null)
const lineChart = shallowRef(null)
const payload = ref(null)
const loadError = ref(null)

function buildBarOption(data) {
  const names = data.indices.map((i) => i.name)
  const values = data.indices.map((i) => i.changePct)
  return {
    title: {
      text: '2025 年 A 股主要指数年度涨跌幅',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => `${v}%`
    },
    grid: { left: 48, right: 24, bottom: 48, top: 56, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { interval: 0, rotate: names.length > 5 ? 20 : 0 }
    },
    yAxis: {
      type: 'value',
      name: '涨跌幅(%)',
      axisLabel: { formatter: '{value}%' }
    },
    series: [
      {
        name: '年度涨跌幅',
        type: 'bar',
        data: values,
        itemStyle: {
          color: (params) => (params.value >= 0 ? '#c23531' : '#2f4554')
        },
        label: { show: true, position: 'top', formatter: '{c}%' }
      }
    ]
  }
}

function buildLineOption(data) {
  const months = data.breadthMonthly.map((m) => m.month)
  const up = data.breadthMonthly.map((m) => m.up)
  const down = data.breadthMonthly.map((m) => m.down)
  const closes = data.shanghaiMonthlyClose.map((m) => m.close)
  return {
    title: {
      text: '2025 年月度个股涨跌家数（示意）与上证收盘',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600 }
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['上涨家数', '下跌家数', '上证指数收盘'], top: 32 },
    grid: { left: 56, right: 56, bottom: 40, top: 72, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: months },
    yAxis: [
      {
        type: 'value',
        name: '家数',
        position: 'left',
        alignTicks: true
      },
      {
        type: 'value',
        name: '上证收盘',
        position: 'right',
        alignTicks: true,
        scale: true
      }
    ],
    series: [
      {
        name: '上涨家数',
        type: 'line',
        smooth: true,
        data: up,
        itemStyle: { color: '#c23531' }
      },
      {
        name: '下跌家数',
        type: 'line',
        smooth: true,
        data: down,
        itemStyle: { color: '#2f4554' }
      },
      {
        name: '上证指数收盘',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: closes,
        itemStyle: { color: '#d48265' }
      }
    ]
  }
}

function resizeCharts() {
  barChart.value?.resize()
  lineChart.value?.resize()
}

onMounted(async () => {
  try {
    const res = await fetch('/data/ashare-2025.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    payload.value = data

    barChart.value = echarts.init(barRef.value)
    barChart.value.setOption(buildBarOption(data))

    lineChart.value = echarts.init(lineRef.value)
    lineChart.value.setOption(buildLineOption(data))
  } catch (e) {
    loadError.value = e?.message || String(e)
  }
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  barChart.value?.dispose()
  lineChart.value?.dispose()
})
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>A 股 2025 年度大盘与个股涨跌概览</h1>
      <p v-if="payload" class="meta">{{ payload.meta.note }}</p>
      <p v-if="loadError" class="error">数据加载失败：{{ loadError }}</p>
    </header>

    <section v-if="payload" class="summary">
      <div class="card">
        <span class="label">上市公司约</span>
        <strong>{{ payload.summary.totalListed }}</strong>
        <span class="unit">家</span>
      </div>
      <div class="card up">
        <span class="label">年度上涨家数约</span>
        <strong>{{ payload.summary.upStocks }}</strong>
        <span class="unit">家（{{ payload.summary.upRatioPct }}%）</span>
      </div>
      <div class="card down">
        <span class="label">年度下跌家数约</span>
        <strong>{{ payload.summary.downStocks }}</strong>
        <span class="unit">家</span>
      </div>
      <div class="card">
        <span class="label">沪深两市全年成交额约</span>
        <strong>{{ payload.summary.yearTurnoverTrillionYuan }}</strong>
        <span class="unit">万亿元</span>
      </div>
    </section>

    <div class="charts">
      <div ref="barRef" class="chart" />
      <div ref="lineRef" class="chart" />
    </div>

    <BigDataDemo />
  </div>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #1a1a1a;
}

.header h1 {
  margin: 0 0 12px;
  font-size: 1.5rem;
  font-weight: 700;
}

.meta {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #666;
}

.error {
  color: #b71c1c;
  margin-top: 8px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.card {
  background: #f7f8fa;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #e8eaed;
}

.card.up {
  border-color: #ffcdd2;
  background: #fff5f5;
}

.card.down {
  border-color: #cfd8dc;
  background: #f5f7f8;
}

.card .label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 6px;
}

.card strong {
  font-size: 1.35rem;
  font-weight: 700;
}

.card .unit {
  margin-left: 4px;
  font-size: 0.85rem;
  color: #555;
}

.charts {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.chart {
  width: 100%;
  height: 380px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8eaed;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
</style>
