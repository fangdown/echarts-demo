/** 模拟日内/逐笔级序列：随机游走 + 轻微周期 */
export function generateBigSeries(total) {
  const xs = new Float64Array(total)
  const ys = new Float64Array(total)
  let y = 100
  for (let i = 0; i < total; i++) {
    xs[i] = i
    y += (Math.random() - 0.48) * 0.15 + Math.sin(i / 800) * 0.02
    ys[i] = y
  }
  return { xs, ys }
}

/** 散点用：二维大量点 */
export function generateScatterLarge(total) {
  const data = new Float32Array(total * 2)
  for (let i = 0; i < total; i++) {
    const t = i / total
    data[i * 2] = t * 100 + (Math.random() - 0.5) * 2
    data[i * 2 + 1] = Math.sin(t * Math.PI * 8) * 30 + 50 + (Math.random() - 0.5) * 8
  }
  return data
}
