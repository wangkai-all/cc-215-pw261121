// 图表模块冒烟测试：用最小 DOM 存根验证三个图表函数能正常构建 SVG 树
import test from 'node:test';
import assert from 'node:assert/strict';

function makeEl(tag) {
  return {
    tagName: tag,
    children: [],
    attrs: {},
    style: {},
    className: '',
    _text: '',
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { cs.forEach((c) => this.appendChild(c)); },
    replaceChildren(...cs) { this.children = []; cs.forEach((c) => this.appendChild(c)); },
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 300 }; },
    set textContent(v) { this._text = String(v); },
    get textContent() { return this._text; },
  };
}

globalThis.document = {
  createElement: (t) => makeEl(t),
  createElementNS: (_ns, t) => makeEl(t),
  body: makeEl('body'),
};

const { lineChart, stackedBarChart, divergingBarChart, currentPalette } = await import('../js/charts.js');

const labels = ['25-01', '25-02', '25-03'];
const pal = currentPalette();

test('折线图：生成 SVG 并含图例与端点标注', () => {
  const box = makeEl('div');
  lineChart(box, {
    xLabels: labels,
    series: [
      { name: '固定篮子', color: pal.series[0], values: [100, 101.5, 103.2] },
      { name: '链式', color: pal.series[1], values: [100, 101.2, 102.8] },
    ],
    yInclude: [100],
  });
  assert.equal(box.children.length, 1);
  const wrap = box.children[0];
  const svg = wrap.children.find((c) => c.tagName === 'svg');
  assert.ok(svg, '应包含 svg');
  assert.ok(svg.children.length > 10, 'svg 应有网格、轴、线、点等元素');
  const legend = wrap.children.find((c) => c.className === 'chart-legend');
  assert.ok(legend, '两个系列应有图例');
});

test('单系列折线不生成图例；空数据不抛错', () => {
  const box = makeEl('div');
  lineChart(box, { xLabels: labels, series: [{ name: '覆盖率', color: pal.series[0], values: [100, 98, null] }] });
  const wrap = box.children[0];
  assert.ok(!wrap.children.find((c) => c.className === 'chart-legend'));
});

test('堆叠柱图：正负值分列零线两侧', () => {
  const box = makeEl('div');
  stackedBarChart(box, {
    xLabels: labels,
    series: [
      { name: '价格效应', color: pal.series[0], values: [10, -5, 8] },
      { name: '结构效应', color: pal.series[1], values: [3, 2, -4] },
    ],
  });
  const svg = box.children[0].children.find((c) => c.tagName === 'svg');
  const rects = svg.children.filter((c) => c.tagName === 'rect' && c.attrs.fill !== 'transparent');
  assert.ok(rects.length >= 5, `应有至少5个柱段，实际 ${rects.length}`);
});

test('正负条形图：按值降序、空值过滤', () => {
  const box = makeEl('div');
  divergingBarChart(box, {
    items: [
      { name: '乙', value: -1.2 },
      { name: '甲', value: 3.4 },
      { name: '丙', value: null },
      { name: '丁', value: 0.8 },
    ],
  });
  const svg = box.children[0];
  const rowLabels = svg.children.filter((c) => c.attrs.class === 'row-label').map((c) => c.textContent);
  assert.deepEqual(rowLabels, ['甲', '丁', '乙']); // 丙(null)被过滤，按值降序
});
