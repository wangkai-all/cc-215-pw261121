// 内联 SVG 图表：折线（十字线+提示框）、堆叠柱、正负条形图
// 配色来自 docs 化调色板（见 css/style.css 注释与 README），文字一律用文本色，不用系列色。

const PALETTES = {
  light: {
    surface: '#fcfcfb', text: '#0b0b0b', textSecondary: '#52514e', muted: '#898781',
    grid: '#e1e0d9', baseline: '#c3c2b7',
    series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    pos: '#2a78d6', neg: '#e34948',
  },
  dark: {
    surface: '#1a1a19', text: '#f0efec', textSecondary: '#c3c2b7', muted: '#898781',
    grid: '#2c2c2a', baseline: '#383835',
    series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
    pos: '#3987e5', neg: '#e66767',
  },
};

export function currentPalette() {
  const dark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return dark ? PALETTES.dark : PALETTES.light;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
function textEl(attrs, text) {
  const t = svgEl('text', attrs);
  t.textContent = text; // 标签属不可信数据，一律 textContent
  return t;
}

// 整洁刻度
function niceTicks(min, max, count = 5) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.2 ? 5 : norm >= 1.2 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step === 0 && Math.abs(v) < step / 2 ? 0 : Number(v.toFixed(6)));
  return { ticks, lo, hi };
}

// 共享提示框
let tooltipEl = null;
function tooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'chart-tooltip';
    tooltipEl.setAttribute('role', 'status');
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}
function showTooltip(x, y, title, rows) {
  const tt = tooltip();
  tt.replaceChildren();
  const head = document.createElement('div');
  head.className = 'tt-title';
  head.textContent = title;
  tt.appendChild(head);
  for (const r of rows) {
    const line = document.createElement('div');
    line.className = 'tt-row';
    if (r.color) {
      const key = document.createElement('span');
      key.className = 'tt-key';
      key.style.background = r.color;
      line.appendChild(key);
    }
    const val = document.createElement('strong');
    val.textContent = r.value;
    const name = document.createElement('span');
    name.className = 'tt-name';
    name.textContent = r.name;
    line.append(val, name);
    tt.appendChild(line);
  }
  tt.style.display = 'block';
  const rect = tt.getBoundingClientRect();
  tt.style.left = `${Math.min(x + 14, window.innerWidth - rect.width - 8)}px`;
  tt.style.top = `${Math.max(y - rect.height - 10, 8)}px`;
}
function hideTooltip() { if (tooltipEl) tooltipEl.style.display = 'none'; }

function fmtDefault(v) { return v == null ? '—' : Number(v.toFixed(2)).toLocaleString('zh-CN'); }

/**
 * 折线图：{ xLabels, series: [{name, color, values}], yFormat, yInclude, height }
 */
export function lineChart(container, opts) {
  const pal = currentPalette();
  const W = 760, H = opts.height ?? 300, XB = 26, YW = 52, TR = 14, RIGHT = 118;
  const plotW = W - YW - RIGHT, plotH = H - TR - XB;
  const n = opts.xLabels.length;
  const fmt = opts.yFormat ?? fmtDefault;

  const all = opts.series.flatMap((s) => s.values).filter((v) => v != null);
  const extras = opts.yInclude ?? [];
  const { ticks, lo, hi } = niceTicks(Math.min(...all, ...extras), Math.max(...all, ...extras));
  const x = (i) => YW + (plotW * (n === 1 ? 0.5 : i / (n - 1)));
  const y = (v) => TR + plotH * (1 - (v - lo) / (hi - lo));

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart line-chart', role: 'img', tabindex: '0' });
  // 网格与轴
  for (const t of ticks) {
    svg.appendChild(svgEl('line', { x1: YW, x2: W - RIGHT, y1: y(t), y2: y(t), stroke: pal.grid, 'stroke-width': 1 }));
    svg.appendChild(textEl({ x: YW - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'axis-label' }, fmt(t)));
  }
  svg.appendChild(svgEl('line', { x1: YW, x2: W - RIGHT, y1: TR + plotH, y2: TR + plotH, stroke: pal.baseline, 'stroke-width': 1 }));
  opts.xLabels.forEach((lab, i) => {
    svg.appendChild(textEl({ x: x(i), y: H - 8, 'text-anchor': 'middle', class: 'axis-label' }, lab));
  });

  // 系列线 + 端点
  opts.series.forEach((s) => {
    const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)]));
    let d = '', pen = false;
    for (const p of pts) {
      if (!p) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
      pen = true;
    }
    svg.appendChild(svgEl('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const lastIdx = s.values.map((v, i) => [v, i]).filter(([v]) => v != null).at(-1)?.[1];
    if (lastIdx != null) {
      svg.appendChild(svgEl('circle', { cx: x(lastIdx), cy: y(s.values[lastIdx]), r: 4.5, fill: s.color, stroke: pal.surface, 'stroke-width': 2 }));
      // 端点直接标注（值）
      svg.appendChild(textEl({ x: x(lastIdx) + 9, y: y(s.values[lastIdx]) + 4, class: 'end-label' }, fmt(s.values[lastIdx])));
    }
  });

  // 十字线层
  const cross = svgEl('line', { y1: TR, y2: TR + plotH, stroke: pal.muted, 'stroke-width': 1, visibility: 'hidden' });
  svg.appendChild(cross);
  const hit = svgEl('rect', { x: YW, y: TR, width: plotW, height: plotH, fill: 'transparent' });
  svg.appendChild(hit);
  let focusIdx = null;
  const showAt = (i, px, py) => {
    if (i == null || i < 0 || i >= n) return hideTooltip();
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    showTooltip(px, py, opts.xLabels[i], opts.series.map((s) => ({
      color: s.color, name: s.name, value: fmt(s.values[i]),
    })));
  };
  hit.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - YW) / plotW) * (n - 1));
    showAt(Math.max(0, Math.min(n - 1, i)), e.clientX, e.clientY);
  });
  hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); hideTooltip(); });
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    focusIdx = focusIdx == null ? 0 : Math.max(0, Math.min(n - 1, focusIdx + (e.key === 'ArrowRight' ? 1 : -1)));
    const rect = svg.getBoundingClientRect();
    showAt(focusIdx, rect.left + (x(focusIdx) / W) * rect.width, rect.top + 40);
    e.preventDefault();
  });
  svg.addEventListener('blur', () => { cross.setAttribute('visibility', 'hidden'); hideTooltip(); });

  container.replaceChildren(wrapWithLegend(svg, opts.series));
}

/**
 * 堆叠柱图（支持负值）：{ xLabels, series: [{name, color, values}], yFormat, height }
 */
export function stackedBarChart(container, opts) {
  const pal = currentPalette();
  const W = 760, H = opts.height ?? 300, XB = 26, YW = 64, TR = 14;
  const plotW = W - YW - 16, plotH = H - TR - XB;
  const n = opts.xLabels.length;
  const fmt = opts.yFormat ?? fmtDefault;

  let lo = 0, hi = 0;
  for (let i = 0; i < n; i++) {
    let pos = 0, neg = 0;
    for (const s of opts.series) {
      const v = s.values[i] ?? 0;
      if (v >= 0) pos += v; else neg += v;
    }
    hi = Math.max(hi, pos); lo = Math.min(lo, neg);
  }
  const t = niceTicks(lo, hi);
  lo = t.lo; hi = t.hi;
  const y = (v) => TR + plotH * (1 - (v - lo) / (hi - lo));
  const slot = plotW / n;
  const barW = Math.min(24, slot * 0.6);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart bar-chart', role: 'img' });
  for (const tv of t.ticks) {
    svg.appendChild(svgEl('line', { x1: YW, x2: W - 16, y1: y(tv), y2: y(tv), stroke: pal.grid, 'stroke-width': 1 }));
    svg.appendChild(textEl({ x: YW - 6, y: y(tv) + 4, 'text-anchor': 'end', class: 'axis-label' }, fmt(tv)));
  }
  svg.appendChild(svgEl('line', { x1: YW, x2: W - 16, y1: y(0), y2: y(0), stroke: pal.baseline, 'stroke-width': 1 }));

  for (let i = 0; i < n; i++) {
    const cx = YW + slot * i + slot / 2;
    svg.appendChild(textEl({ x: cx, y: H - 8, 'text-anchor': 'middle', class: 'axis-label' }, opts.xLabels[i]));
    let posAcc = 0, negAcc = 0;
    for (const s of opts.series) {
      const v = s.values[i] ?? 0;
      if (v === 0) continue;
      const from = v > 0 ? posAcc : negAcc;
      const to = from + v;
      if (v > 0) posAcc = to; else negAcc = to;
      const yTop = y(Math.max(from, to)), hgt = Math.abs(y(from) - y(to));
      const rect = svgEl('rect', {
        x: cx - barW / 2, y: yTop + 1, width: barW, height: Math.max(hgt - 2, 1),
        fill: s.color, tabindex: '0', class: 'mark',
      });
      const show = (e) => showTooltip(e.clientX, e.clientY, opts.xLabels[i], [{ color: s.color, name: s.name, value: fmt(v) }]);
      rect.addEventListener('pointermove', show);
      rect.addEventListener('focus', (e) => {
        const r = e.target.getBoundingClientRect();
        showTooltip(r.left + r.width / 2, r.top, opts.xLabels[i], [{ color: s.color, name: s.name, value: fmt(v) }]);
      });
      rect.addEventListener('pointerleave', hideTooltip);
      rect.addEventListener('blur', hideTooltip);
      svg.appendChild(rect);
    }
  }
  container.replaceChildren(wrapWithLegend(svg, opts.series));
}

/**
 * 正负条形图（横向、按值排序）：{ items: [{name, value}], xFormat, posColor, negColor }
 */
export function divergingBarChart(container, opts) {
  const pal = currentPalette();
  const items = [...opts.items].filter((it) => it.value != null).sort((a, b) => b.value - a.value);
  const fmt = opts.xFormat ?? fmtDefault;
  const LABELW = 190, VALW = 64, ROWH = 26, BARH = 16, TR = 8;
  const W = 760;
  const H = TR * 2 + items.length * ROWH + 4;
  const maxAbs = Math.max(1e-9, ...items.map((it) => Math.abs(it.value)));
  const zeroX = LABELW + (W - LABELW - VALW) * (items.some((i) => i.value < 0) ? 0.35 : 0.02);
  const scale = (v) => (v / maxAbs) * (W - LABELW - VALW) * (items.some((i) => i.value < 0) ? (v >= 0 ? 0.63 : 0.33) : 0.96);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart diverging-chart', role: 'img' });
  svg.appendChild(svgEl('line', { x1: zeroX, x2: zeroX, y1: TR, y2: H - TR, stroke: pal.baseline, 'stroke-width': 1 }));
  items.forEach((it, i) => {
    const cy = TR + i * ROWH + ROWH / 2;
    svg.appendChild(textEl({ x: LABELW - 8, y: cy + 4, 'text-anchor': 'end', class: 'row-label' }, it.name));
    const w = Math.abs(scale(it.value));
    const bx = it.value >= 0 ? zeroX : zeroX - w;
    const color = it.value >= 0 ? (opts.posColor ?? pal.pos) : (opts.negColor ?? pal.neg);
    const rect = svgEl('rect', { x: bx + 1, y: cy - BARH / 2, width: Math.max(w - 2, 1), height: BARH, rx: 3, fill: color, tabindex: '0', class: 'mark' });
    const show = (e) => showTooltip(e.clientX, e.clientY, it.name, [{ color, name: '贡献', value: fmt(it.value) }]);
    rect.addEventListener('pointermove', show);
    rect.addEventListener('focus', (e) => {
      const r = e.target.getBoundingClientRect();
      showTooltip(r.left + r.width / 2, r.top, it.name, [{ color, name: '贡献', value: fmt(it.value) }]);
    });
    rect.addEventListener('pointerleave', hideTooltip);
    rect.addEventListener('blur', hideTooltip);
    svg.appendChild(rect);
    svg.appendChild(textEl({ x: it.value >= 0 ? bx + w + 6 : bx - 6, y: cy + 4, 'text-anchor': it.value >= 0 ? 'start' : 'end', class: 'value-label' }, fmt(it.value)));
  });
  container.replaceChildren(svg);
}

function wrapWithLegend(svg, series) {
  const wrap = document.createElement('div');
  if (series.length >= 2) {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    for (const s of series) {
      const item = document.createElement('span');
      item.className = 'legend-item';
      const key = document.createElement('span');
      key.className = 'legend-key';
      key.style.background = s.color;
      const name = document.createElement('span');
      name.textContent = s.name;
      item.append(key, name);
      legend.appendChild(item);
    }
    wrap.appendChild(legend);
  }
  wrap.appendChild(svg);
  return wrap;
}
