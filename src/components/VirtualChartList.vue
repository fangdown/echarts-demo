<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  total: { type: Number, default: 100 },
  itemHeight: { type: Number, default: 176 },
  buffer: { type: Number, default: 2 }
})

const scrollRef = ref(null)
const scrollTop = ref(0)
const viewH = ref(400)

const innerHeight = computed(() => props.total * props.itemHeight)

const startIdx = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
)
const endIdx = computed(() =>
  Math.min(
    props.total - 1,
    Math.ceil((scrollTop.value + viewH.value) / props.itemHeight) + props.buffer
  )
)

const chartMap = shallowRef(new Map())
const elMap = new Map()

function indexSet(s, e) {
  const out = new Set()
  for (let i = s; i <= e; i++) out.add(i)
  return out
}

function miniOption(seed) {
  const n = 120
  const data = []
  let y = 50 + (seed % 17)
  for (let i = 0; i < n; i++) {
    y += (Math.random() - 0.5) * 3
    data.push([i, y])
  }
  return {
    animation: false,
    grid: { left: 36, right: 8, top: 8, bottom: 20 },
    xAxis: { type: 'value', show: false, min: 0, max: n - 1 },
    yAxis: { type: 'value', show: false, scale: true },
    series: [
      {
        type: 'line',
        data,
        symbol: 'none',
        lineStyle: { width: 1, color: seed % 2 ? '#c23531' : '#5470c6' },
        sampling: 'lttb',
        progressive: 800,
        progressiveThreshold: 1200
      }
    ]
  }
}

function mountChart(index, el) {
  if (!el || chartMap.value.has(index)) return
  const inst = echarts.init(el, null, { renderer: 'canvas' })
  inst.setOption(miniOption(index), { lazyUpdate: true })
  const m = new Map(chartMap.value)
  m.set(index, inst)
  chartMap.value = m
}

function unmountChart(index) {
  const inst = chartMap.value.get(index)
  if (!inst) return
  inst.dispose()
  const m = new Map(chartMap.value)
  m.delete(index)
  chartMap.value = m
}

function bindEl(index, el) {
  if (!el) {
    elMap.delete(index)
    unmountChart(index)
    return
  }
  elMap.set(index, el)
  if (index >= startIdx.value && index <= endIdx.value) {
    nextTick(() => mountChart(index, el))
  }
}

watch(
  [startIdx, endIdx],
  ([s, e], prev) => {
    const prevSet = prev ? indexSet(prev[0], prev[1]) : new Set()
    const currSet = indexSet(s, e)
    nextTick(() => {
      for (const i of prevSet) {
        if (!currSet.has(i)) unmountChart(i)
      }
      for (const i of currSet) {
        if (!prevSet.has(i)) {
          const el = elMap.get(i)
          if (el) mountChart(i, el)
        }
      }
    })
  },
  { flush: 'post' }
)

const visibleCount = computed(() => Math.max(0, endIdx.value - startIdx.value + 1))

const chartInstanceCount = computed(() => chartMap.value.size)

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
  viewH.value = e.target.clientHeight
}

let ro
onMounted(() => {
  const el = scrollRef.value
  if (el) viewH.value = el.clientHeight
  ro = new ResizeObserver(() => {
    if (scrollRef.value) viewH.value = scrollRef.value.clientHeight
    chartMap.value.forEach((c) => c.resize())
  })
  if (scrollRef.value) ro.observe(scrollRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
  chartMap.value.forEach((c) => c.dispose())
})

function resizeAll() {
  chartMap.value.forEach((c) => c.resize())
}

defineExpose({ resizeAll })
</script>

<template>
  <div class="virt-wrap">
    <p class="virt-hint">
      虚拟列表：可视行约 {{ visibleCount }} / {{ total }}，当前仅挂载约
      {{ chartInstanceCount }} 个 ECharts 实例（随滚动创建/销毁）。
    </p>
    <div ref="scrollRef" class="virt-scroll" @scroll.passive="onScroll">
      <div class="virt-track" :style="{ height: innerHeight + 'px' }">
        <div
          v-for="i in endIdx - startIdx + 1"
          :key="startIdx + i - 1"
          class="virt-row"
          :style="{
            top: (startIdx + i - 1) * itemHeight + 'px',
            height: itemHeight + 'px'
          }"
        >
          <span class="virt-label">序列 #{{ startIdx + i }}</span>
          <div class="virt-chart" :ref="(el) => bindEl(startIdx + i - 1, el)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virt-wrap {
  margin-top: 8px;
}
.virt-hint {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: #666;
}
.virt-scroll {
  height: 420px;
  overflow: auto;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  background: #fafafa;
}
.virt-track {
  position: relative;
}
.virt-row {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #eee;
  background: #fff;
}
.virt-label {
  flex: 0 0 88px;
  font-size: 12px;
  color: #888;
}
.virt-chart {
  flex: 1;
  height: 140px;
  min-width: 0;
}
</style>
