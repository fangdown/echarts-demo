# ECharts 大数据渲染示例

基于 Vue 3 + Vite + ECharts 6，展示多种大数据量图表的渲染策略。

## 功能演示

### 1. A 股 2025 年度概览
- 柱状图：主要指数年度涨跌幅
- 折线图：月度个股涨跌家数与上证收盘

### 2. 大数据折线图（160,000 点）
- dataZoom 决定可视索引窗口
- LTTB（Largest-Triangle-Three-Buckets）下采样，降至约 4,000 点
- 配合 `lazyUpdate` 与 `progressive` 优化渲染性能

### 3. 散点大数据（280,000 点）
- `large: true` 启用 ECharts 大数据模式
- 仅推送可视范围内的下采样点到 series
- 步进采样控制实际渲染量

### 4. 增量追加（流式）
- 使用 `appendData` 增量追加批次，避免全量 `setOption`
- 每批 600 点，周期性重置窗口

### 5. 虚拟列表
- 仅在视区内挂载 ECharts 实例
- 随滚动动态创建/销毁图表
- 100 个序列图表仅需维护约 5 个实例

## 技术栈

- Vue 3 (`<script setup>`)
- Vite
- ECharts 6

## 启动

```bash
npm install
npm run dev
```

## 数据

`public/data/ashare-2025.json` 提供 A 股 2025 年度行情数据（需自行准备或模拟）。
