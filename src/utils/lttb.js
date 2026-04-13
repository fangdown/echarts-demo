/**
 * Largest-Triangle-Three-Buckets downsampling.
 * Returns array of [x, y] for ECharts.
 */
export function lttbXY(xs, ys, threshold) {
  const n = xs.length
  if (threshold >= n || threshold < 3) {
    const out = new Array(n)
    for (let i = 0; i < n; i++) out[i] = [xs[i], ys[i]]
    return out
  }

  const sampled = []
  const bucketSize = (n - 2) / (threshold - 2)
  let a = 0
  sampled.push([xs[a], ys[a]])

  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1
    const rangeEnd = Math.floor((i + 2) * bucketSize) + 1
    const rangeEndClamped = Math.min(rangeEnd, n - 1)

    let avgX = 0
    let avgY = 0
    let count = 0
    for (let j = rangeStart; j < rangeEndClamped; j++) {
      avgX += xs[j]
      avgY += ys[j]
      count++
    }
    if (count > 0) {
      avgX /= count
      avgY /= count
    }

    let maxArea = -1
    let maxIdx = rangeStart
    for (let j = rangeStart; j < rangeEndClamped; j++) {
      const area = Math.abs(
        (xs[a] - avgX) * (ys[j] - ys[a]) - (xs[a] - xs[j]) * (avgY - ys[a])
      )
      if (area > maxArea) {
        maxArea = area
        maxIdx = j
      }
    }
    sampled.push([xs[maxIdx], ys[maxIdx]])
    a = maxIdx
  }

  sampled.push([xs[n - 1], ys[n - 1]])
  return sampled
}

export function sliceByIndex(xs, ys, i0, i1) {
  const start = Math.max(0, Math.min(i0, i1))
  const end = Math.min(xs.length, Math.max(i0, i1) + 1)
  const outX = []
  const outY = []
  for (let i = start; i < end; i++) {
    outX.push(xs[i])
    outY.push(ys[i])
  }
  return { xs: outX, ys: outY, start, end: end - 1 }
}
