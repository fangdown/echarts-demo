<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import { generateBigSeries, generateScatterLarge } from '../utils/bigSeries.js'
import { lttbXY, sliceByIndex } from '../utils/lttb.js'
import VirtualChartList from './VirtualChartList.vue'

const LINE_POINTS = 160_000
const SCATTER_PAIRS = 280_000
const VISIBLE_LINE_CAP = 4_000
const VISIBLE_SCATTER_CAP = 12_000

const lineRef = ref(null)
const scatterRef = ref(null)
const incrRef = ref(null)
const virtRef = ref(null)

const lineChart = shallowRef(null)
const scatterChart = shallowRef(null)
const incrChart = shallowRef(null)

const lineMeta = ref('')
const scatterMeta = ref('')
const incrMeta = ref('')

let fullLine = { xs: null, ys: null }
let scatterBuf = null

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function applyVisibleLine(startPct, endPct) {
  const n = fullLine.xs.length
  const i0 = Math.floor((startPct / 100) * (n - 1))
  const i1 = Math.ceil((endPct / 100) * (n - 1))
  const { xs, ys } = sliceByIndex(fullLine.xs, fullLine.ys, i0, i1)
  const sampled = lttbXY(xs, ys, VISIBLE_LINE_CAP)
  if (!sampled.length) return
  lineMeta.value = `全量 ${n.toLocaleString()} 点 · 可视索引 [${Math.min(i0, i1)}, ${Math.max(i0, i1)}] · 采样后 ${sampled.length.toLocaleString()} 点`
  lineChart.value?.setOption(
    {
      xAxis: { min: sampled[0][0], max: sampled[sampled.length - 1][0] },
      series: [{ data: sampled }]
    },
    { lazyUpdate: true }
  )
}

function buildScatterVisible(xMin, xMax) {
  const buf = scatterBuf
  const pairs = buf.length / 2
  let inRange = 0
  for (let i = 0; i < pairs; i++) {
    const x = buf[i * 2]
    if (x >= xMin && x <= xMax) inRange++
  }
  const stride = Math.max(1, Math.ceil(inRange / VISIBLE_SCATTER_CAP))
  const out = []
  let c = 0
  for (let i = 0; i < pairs; i++) {
    const x = buf[i * 2]
    const y = buf[i * 2 + 1]
    if (x < xMin || x > xMax) continue
    if (c % stride === 0) out.push([x, y])
    c++
    if (out.length >= VISIBLE_SCATTER_CAP) break
  }
  return { data: out, inRange, stride }
}

function applyVisibleScatter(startPct, endPct) {
  const span = 100
  const xMin = (startPct / 100) * span
  const xMax = (endPct / 100) * span
  const { data, inRange, stride } = buildScatterVisible(xMin, xMax)
  scatterMeta.value = `全量 ${(scatterBuf.length / 2).toLocaleString()} 点 · 可视区内约 ${inRange.toLocaleString()} 点 · 步进 ${stride} · 实际渲染 ${data.length.toLocaleString()} 点 · large: true`
  scatterChart.value?.setOption(
    {
      xAxis: { min: xMin, max: xMax },
      series: [{ data }]
    },
    { lazyUpdate: true }
  )
}

const debouncedLineZoom = debounce((s, e) => applyVisibleLine(s, e), 80)
const debouncedScatterZoom = debounce((s, e) => applyVisibleScatter(s, e), 80)

function readDataZoomPercents(chart) {
  const opt = chart.getOption()
  const dz = opt.dataZoom?.[0]
  if (!dz) return { start: 0, end: 5 }
  return { start: dz.start ?? 0, end: dz.end ?? 100 }
}

onMounted(() => {
  fullLine = generateBigSeries(LINE_POINTS)
  scatterBuf = generateScatterLarge(SCATTER_PAIRS)

  lineChart.value = echarts.init(lineRef.value)
  lineChart.value.setOption({
    animation: false,
    title: {
      text: '大数据折线：仅渲染可视窗口（LTTB 采样）',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600 }
    },
    tooltip: { trigger: 'axis' },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 4,
        filterMode: 'none'
      },
      {
        type: 'slider',
        start: 0,
        end: 4,
        height: 22,
        bottom: 8,
        filterMode: 'none'
      }
    ],
    grid: { left: 52, right: 20, top: 48, bottom: 52 },
    xAxis: { type: 'value', scale: true },
    yAxis: { type: 'value', scale: true },
    series: [
      {
        type: 'line',
        name: '模拟行情',
        showSymbol: false,
        data: [],
        sampling: 'lttb',
        progressive: 2500,
        progressiveThreshold: 4000
      }
    ]
  })
  const lz = readDataZoomPercents(lineChart.value)
  applyVisibleLine(lz.start, lz.end)
  lineChart.value.on('dataZoom', (ev) => {
    const b = ev.batch?.[0]
    if (b && typeof b.start === 'number') {
      debouncedLineZoom(b.start, b.end)
    } else {
      const p = readDataZoomPercents(lineChart.value)
      debouncedLineZoom(p.start, p.end)
    }
  })

  scatterChart.value = echarts.init(scatterRef.value)
  scatterChart.value.setOption({
    animation: false,
    title: {
      text: '散点大数据：large + 可视区过滤',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600 }
    },
    tooltip: { show: false },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, start: 0, end: 8, filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 8,
        height: 22,
        bottom: 8,
        filterMode: 'none'
      }
    ],
    grid: { left: 48, right: 16, top: 44, bottom: 48 },
    xAxis: { type: 'value', min: 0, max: 100 },
    yAxis: { type: 'value', scale: true },
    series: [
      {
        type: 'scatter',
        name: '散点',
        data: [],
        large: true,
        largeThreshold: 2000,
        itemStyle: { opacity: 0.35 }
      }
    ]
  })
  const sz = readDataZoomPercents(scatterChart.value)
  applyVisibleScatter(sz.start, sz.end)
  scatterChart.value.on('dataZoom', (ev) => {
    const b = ev.batch?.[0]
    if (b && typeof b.start === 'number') {
      debouncedScatterZoom(b.start, b.end)
    } else {
      const p = readDataZoomPercents(scatterChart.value)
      debouncedScatterZoom(p.start, p.end)
    }
  })

  incrChart.value = echarts.init(incrRef.value)
  const chunk = 600
  let nextX = 0
  const seedBatch = () => {
    const batch = []
    for (let k = 0; k < chunk; k++) {
      const x = nextX++
      batch.push([x, 50 + Math.sin(x / 40) * 8 + (Math.random() - 0.5) * 4])
    }
    return batch
  }
  incrChart.value.setOption({
    animation: false,
    title: {
      text: '增量 appendData（非全量 setOption 重绘）',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600 }
    },
    grid: { left: 48, right: 16, top: 44, bottom: 28 },
    xAxis: { type: 'value', min: 0, max: 80_000 },
    yAxis: { type: 'value', scale: true },
    series: [
      {
        type: 'line',
        name: '流式',
        showSymbol: false,
        data: seedBatch()
      }
    ]
  })
  let appended = chunk
  incrMeta.value = `已增量追加 0 点（首批 ${chunk}）`
  const timer = setInterval(() => {
    if (!incrChart.value) return
    const batch = seedBatch()
    incrChart.value.appendData({ seriesIndex: 0, data: batch })
    appended += chunk
    if (appended > 120_000) {
      incrChart.value.setOption({
        xAxis: { max: appended + 20_000 },
        series: [{ data: seedBatch() }]
      })
      nextX = 0
      appended = chunk
    }
    incrMeta.value = `累计增量约 ${appended.toLocaleString()} 点（每批 ${chunk}，周期性重置窗口）`
  }, 280)

  const onResize = () => {
    lineChart.value?.resize()
    scatterChart.value?.resize()
    incrChart.value?.resize()
    virtRef.value?.resizeAll?.()
  }
  window.addEventListener('resize', onResize)

  onUnmounted(() => {
    clearInterval(timer)
    window.removeEventListener('resize', onResize)
    lineChart.value?.dispose()
    scatterChart.value?.dispose()
    incrChart.value?.dispose()
  })
})
</script>

<template>
  <section class="big-demo">
    <h2 class="section-title">模拟大数据渲染</h2>
    <p class="section-desc">
      折线：dataZoom 决定索引窗口 → 切片后用 LTTB 压到约 {{ VISIBLE_LINE_CAP.toLocaleString() }} 点，配合
      <code>lazyUpdate</code> 与线系 <code>progressive</code>。散点：仅向 series 推送可视范围内的下采样点，并开启
      <code>large: true</code>。折线增量：<code>appendData</code> 追加批次。下方列表为虚拟滚动，仅挂载视区内图表实例。
    </p>

    <p v-if="lineMeta" class="stat">{{ lineMeta }}</p>
    <div ref="lineRef" class="chart big" />

    <p v-if="scatterMeta" class="stat">{{ scatterMeta }}</p>
    <div ref="scatterRef" class="chart big" />

    <p v-if="incrMeta" class="stat">{{ incrMeta }}</p>
    <div ref="incrRef" class="chart mid" />

    <VirtualChartList ref="virtRef" :total="100" :item-height="176" :buffer="2" />
  </section>
</template>

<style scoped>
.big-demo {
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid #e8eaed;
}

.section-title {
  margin: 0 0 8px;
  font-size: 1.2rem;
}

.section-desc {
  margin: 0 0 16px;
  font-size: 0.82rem;
  line-height: 1.65;
  color: #555;
}

.section-desc code {
  font-size: 0.78rem;
  padding: 1px 5px;
  background: #f0f0f0;
  border-radius: 4px;
}

.stat {
  margin: 12px 0 6px;
  font-size: 0.78rem;
  color: #666;
}

.chart {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8eaed;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.chart.big {
  height: 360px;
}

.chart.mid {
  height: 280px;
}
</style>
