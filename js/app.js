// 页面装配：状态、渲染、交互
import { computeIndex, primarySeries, RULES, RULES_VERSION } from './engine.js';
import { sampleDataset } from './sample-data.js';
import { importFiles } from './importer.js';
import { lineChart, stackedBarChart, divergingBarChart, currentPalette } from './charts.js';

// ---------- 小工具 ----------
const $ = (sel) => document.querySelector(sel);

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return el;
}

// 单元格：字符串/数字，或 {cls, text|label}，或 {cls, children:[...]}
function buildTable(headers, rows) {
  const mkCell = (tag, c) => {
    if (c != null && typeof c === 'object' && !(c instanceof Node)) {
      return h(tag, { class: c.cls ?? '' }, ...(c.children ?? [c.text ?? c.label ?? '']));
    }
    return h(tag, {}, c ?? '');
  };
  return h('div', { class: 'table-scroll' },
    h('table', {},
      h('thead', {}, h('tr', {}, ...headers.map((hd) => mkCell('th', hd)))),
      h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((c) => mkCell('td', c)))))));
}

const f2 = (v) => (v == null ? '—' : v.toFixed(2));
const f3 = (v) => (v == null ? '—' : v.toFixed(3));
const pct1 = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const yuan = (v) => (v == null ? '—' : Math.round(v).toLocaleString('zh-CN'));
const signed = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`);

const flagSpans = (flags, warn = false) =>
  (flags ?? []).map((f) => h('span', { class: `flag${warn ? ' warn' : ''}` }, f));

const SCHEME_NAMES = {
  laspeyres: '基期支出加权（拉氏）',
  paasche: '报告期数量加权（帕氏）',
  fisher: '费雪理想指数',
  custom: '自定义权重（拉氏型）',
};

// ---------- 状态 ----------
const state = {
  dataset: null,
  result: null,
  config: {
    basePeriod: null,
    weightScheme: 'laspeyres',
    customWeights: {},
    activeSubstitutions: [],
    showFixed: true,
    showChained: true,
  },
  decompPeriod: null,
  traceItem: null,
  disclosureFilter: '',
};

const productById = (id) => state.dataset?.products.find((p) => p.id === id);
const storeName = (id) => state.dataset?.stores.find((s) => s.id === id)?.name ?? id;
const itemShortName = (item) => productById(item.segments[0].productId)?.name ?? item.key;

// ---------- 计算与渲染调度 ----------
function recompute() {
  if (!state.dataset) return;
  state.result = computeIndex(state.dataset, {
    basePeriod: state.config.basePeriod,
    weightScheme: state.config.weightScheme,
    customWeights: state.config.customWeights,
    activeSubstitutions: state.config.activeSubstitutions,
  });
  renderBasket();
  renderIndex();
  renderDecomp();
  renderTrace();
  renderCoverage();
}

function setDataset(ds) {
  state.dataset = ds;
  state.config.basePeriod = ds.meta.periods[0];
  state.config.activeSubstitutions = (ds.substitutions ?? []).map((s) => s.id);
  state.config.customWeights = {};
  state.decompPeriod = ds.meta.periods.at(-1);
  state.traceItem = null;
  state.disclosureFilter = '';
  // 基期选择
  $('#sel-base').replaceChildren(...ds.meta.periods.map((p) => h('option', { value: p }, p)));
  $('#sel-base').value = state.config.basePeriod;
  renderDatasetSummary();
  recompute();
}

// ---------- 数据导入 ----------
function renderDatasetSummary() {
  const ds = state.dataset;
  if (!ds) { $('#dataset-summary').replaceChildren(); return; }
  const rows = [
    ['名称', ds.meta.name],
    ['期次', `${ds.meta.periods[0]} ~ ${ds.meta.periods.at(-1)}（共 ${ds.meta.periods.length} 期）`],
    ['商品', `${ds.products.length} 个（含上下架区间）`],
    ['门店', `${ds.stores.length} 家`],
    ['报价', `${ds.quotes.length} 条`],
    ['篮子条目', `${ds.basket.length} 条`],
    ['替代关系', `${(ds.substitutions ?? []).length} 条`],
    ['门店更替', `${(ds.storeReplacements ?? []).length} 条`],
  ];
  $('#dataset-summary').replaceChildren(
    h('table', {}, h('tbody', {}, ...rows.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v))))),
    h('p', { class: 'hint' }, ds.meta.stories ?? ''),
    h('p', { class: 'hint' }, ds.meta.disclaimer ?? ''),
  );
}

function renderImportReport({ errors, warnings, detected }) {
  const box = $('#import-report');
  box.replaceChildren();
  if (detected?.length) {
    box.appendChild(h('ul', { class: 'import-list' },
      ...detected.map((d) => h('li', {}, `${d.file} → 识别为 ${d.type}（${d.rows} 行）`))));
  }
  for (const e of errors ?? []) box.appendChild(h('p', { class: 'import-err' }, `✗ ${e}`));
  for (const w of warnings ?? []) box.appendChild(h('p', { class: 'hint' }, `⚠ ${w}`));
  if (!errors?.length) box.appendChild(h('p', { class: 'import-ok' }, '✓ 校验通过，数据已载入'));
}

// ---------- 篮子核对 ----------
function renderBasket() {
  const r = state.result;
  const rows = r.items.map((item) => {
    const flagCount = new Map();
    for (const [, cell] of item.series) for (const f of cell.flags) flagCount.set(f, (flagCount.get(f) ?? 0) + 1);
    const flags = [...flagCount.entries()].map(([f, n]) => `${f}×${n}`);
    if (item.ncReason) flags.push(`不可比：${item.ncReason}`);
    const specs = item.segments.map((s) => {
      const p = productById(s.productId);
      return p ? `${p.specQty}${p.specUnit}` : s.productId;
    });
    return [
      { text: item.label },
      { text: specs.join(' → '), cls: 'num' },
      { text: `元/${productById(item.segments[0].productId)?.baseUnit ?? ''}` },
      { text: f3(item.basePrice), cls: 'num' },
      { text: `${yuan(item.weight)}（${pct1(r.totalWeight > 0 ? item.weight / r.totalWeight : 0)}）`, cls: 'num' },
      { text: `${item.series.size}/${r.periods.length}` , cls: 'num' },
      { children: flagSpans(flags, !!item.ncReason) },
    ];
  });
  $('#basket-table').replaceChildren(buildTable(
    ['篮子条目', '规格链', '可比单位', '基期单位价', '基期支出权重', '可比期数', '处理标记'].map((label, i) => ({ label, cls: [1, 3, 4, 5].includes(i) ? 'num' : '' })),
    rows,
  ));

  // 替代关系面板
  const subs = state.dataset.substitutions ?? [];
  $('#substitution-panel').replaceChildren(
    ...(subs.length === 0 ? [h('p', { class: 'hint' }, '数据集中没有定义替代关系。')] :
      subs.map((s) => h('label', { class: 'row gap', style: 'display:flex;margin:6px 0;' },
        h('input', {
          type: 'checkbox',
          checked: state.config.activeSubstitutions.includes(s.id) ? '' : null,
          onchange: (e) => {
            state.config.activeSubstitutions = e.target.checked
              ? [...state.config.activeSubstitutions, s.id]
              : state.config.activeSubstitutions.filter((x) => x !== s.id);
            recompute();
          },
        }),
        h('span', {}, `${productById(s.from)?.name ?? s.from} → ${productById(s.to)?.name ?? s.to}`),
        h('span', { class: 'flag rule' }, s.type),
        h('span', { class: 'hint' }, s.note ?? ''),
      ))),
  );

  // 披露列表
  const filterSel = $('#disclosure-filter');
  const ruleIds = [...new Set(r.disclosures.map((d) => d.rule))].sort();
  filterSel.replaceChildren(h('option', { value: '' }, '全部'),
    ...ruleIds.map((id) => h('option', { value: id }, `${id} ${RULES.find((x) => x.id === id)?.name ?? ''}`)));
  filterSel.value = state.disclosureFilter;
  const shown = r.disclosures.filter((d) => !state.disclosureFilter || d.rule === state.disclosureFilter);
  $('#disclosure-list').replaceChildren(
    h('p', { class: 'hint' }, `共 ${r.disclosures.length} 条披露，当前显示 ${shown.length} 条`),
    buildTable(
      [{ label: '规则' }, { label: '条目/商品' }, { label: '期次' }, { label: '说明' }],
      shown.map((d) => [
        { children: [h('span', { class: 'flag rule' }, d.rule)] },
        { text: productById(d.itemKey)?.name ?? d.itemKey },
        { text: d.period ?? '—' },
        { text: d.message },
      ]),
    ),
  );
}

// ---------- 指数计算 ----------
function renderIndex() {
  const r = state.result;
  const pal = currentPaletteSafe();
  const fixed = primarySeries(r, 'fixed');
  const chained = primarySeries(r, 'chained');
  const lastFixed = fixed.filter((v) => v != null).at(-1);
  const lastChained = chained.filter((v) => v != null).at(-1);
  const covAvg = r.coverage.reduce((s, c) => s + c.ratio, 0) / r.coverage.length;

  $('#index-tiles').replaceChildren(
    tile('期末固定篮子指数', f2(lastFixed), lastFixed == null ? '—' : `较基期 ${signed(lastFixed - 100)} 点`),
    tile('期末链式指数', f2(lastChained), lastChained == null ? '—' : `较基期 ${signed(lastChained - 100)} 点`),
    tile('平均覆盖率', pct1(covAvg), `最低 ${pct1(Math.min(...r.coverage.map((c) => c.ratio)))}`),
    tile('处理披露', String(r.disclosures.length), `规则版本 ${r.rulesVersion}`),
  );

  const series = [];
  if (state.config.showFixed) series.push({ name: `固定篮子（${SCHEME_NAMES[r.config.weightScheme]}）`, color: pal.series[0], values: fixed });
  if (state.config.showChained) series.push({ name: `链式（${SCHEME_NAMES[r.config.weightScheme]}）`, color: pal.series[1], values: chained });
  if (series.length === 0) series.push({ name: '固定篮子', color: pal.series[0], values: fixed });
  lineChart($('#index-chart'), {
    xLabels: r.periods.map((p) => p.slice(2)),
    series,
    yInclude: [100],
    yFormat: (v) => v.toFixed(1),
  });

  $('#index-table').replaceChildren(buildTable(
    [{ label: '期次' }, { label: '固定篮子指数', cls: 'num' }, { label: '链式指数', cls: 'num' }, { label: '覆盖率', cls: 'num' }],
    r.periods.map((p, i) => [
      { text: p },
      { text: f2(fixed[i]), cls: 'num' },
      { text: f2(chained[i]), cls: 'num' },
      { text: pct1(r.coverage[i].ratio), cls: 'num' },
    ]),
  ));

  // 自定义权重编辑器
  const editor = $('#custom-weights-editor');
  $('#custom-weights').classList.toggle('hidden', state.config.weightScheme !== 'custom');
  editor.replaceChildren(...r.items.map((item) =>
    h('label', { class: 'hint' }, `${itemShortName(item)} `,
      h('input', {
        type: 'number', min: '0', step: '0.01', style: 'width:90px',
        value: state.config.customWeights[item.key] ?? '',
        placeholder: f2(item.weight),
        onchange: (e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v) && v > 0) state.config.customWeights[item.key] = v;
          else delete state.config.customWeights[item.key];
          recompute();
        },
      }))));
}

function tile(label, value, sub) {
  return h('div', { class: 'tile' },
    h('div', { class: 'tile-label' }, label),
    h('div', { class: 'tile-value' }, value),
    h('div', { class: 'tile-sub' }, sub));
}

// ---------- 贡献分解 ----------
function renderDecomp() {
  const r = state.result;
  const pal = currentPaletteSafe();
  const sel = $('#sel-decomp-period');
  sel.replaceChildren(...r.periods.map((p) => h('option', { value: p }, p)));
  sel.value = state.decompPeriod;
  const t = r.periods.indexOf(state.decompPeriod);

  const items = r.items
    .map((item) => ({ name: itemShortName(item), value: r.contributions[item.key]?.[t] }))
    .filter((x) => x.value != null);
  divergingBarChart($('#decomp-chart'), {
    items,
    xFormat: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} 点`,
  });
  $('#decomp-table').replaceChildren(buildTable(
    [{ label: '条目' }, { label: '贡献（指数点）', cls: 'num' }],
    r.items.map((item) => [
      { text: item.label },
      { text: r.contributions[item.key]?.[t] == null ? '不可比' : signed(r.contributions[item.key][t]), cls: 'num' },
    ]),
  ));

  stackedBarChart($('#decomp-stacked'), {
    xLabels: r.periods.map((p) => p.slice(2)),
    series: [
      { name: '价格效应', color: pal.series[0], values: r.valueDecomp.map((d) => round0(d.priceEff)) },
      { name: '结构效应', color: pal.series[1], values: r.valueDecomp.map((d) => round0(d.structEff)) },
      { name: '交互效应', color: pal.series[2], values: r.valueDecomp.map((d) => round0(d.interEff)) },
    ],
    yFormat: (v) => `${Math.round(v).toLocaleString('zh-CN')}`,
  });
  $('#decomp-value-table').replaceChildren(buildTable(
    [{ label: '期次' }, { label: '销售额变化 ΔV（元）', cls: 'num' }, { label: '价格效应', cls: 'num' }, { label: '结构效应', cls: 'num' }, { label: '交互效应', cls: 'num' }],
    r.valueDecomp.map((d) => [
      { text: d.period },
      { text: yuan(d.dV), cls: 'num' },
      { text: yuan(d.priceEff), cls: 'num' },
      { text: yuan(d.structEff), cls: 'num' },
      { text: yuan(d.interEff), cls: 'num' },
    ]),
  ));
}
const round0 = (v) => Math.round(v);

// ---------- 报价追溯 ----------
function renderTrace() {
  const r = state.result;
  if (!state.traceItem || !r.items.some((i) => i.key === state.traceItem)) {
    state.traceItem = r.items[0]?.key;
  }
  const sel = $('#sel-trace-item');
  sel.replaceChildren(...r.items.map((i) => h('option', { value: i.key }, i.label)));
  sel.value = state.traceItem;
  const item = r.items.find((i) => i.key === state.traceItem);

  $('#trace-item-info').replaceChildren(
    h('p', { class: 'hint' },
      `拼接链：${item.segments.map((s) => productById(s.productId)?.name ?? s.productId).join(' → ')}；` +
      `基期单位价 ${f3(item.basePrice)} 元/${productById(item.segments[0].productId)?.baseUnit ?? ''}` +
      (item.overlapK ? `；重叠衔接系数 k=${item.overlapK.toFixed(4)}` : '') +
      (item.ncReason ? `；不可比：${item.ncReason}（自 ${item.ncSince} 起）` : '')),
  );

  // 入指数序列
  $('#trace-series').replaceChildren(buildTable(
    [{ label: '期次' }, { label: '来源商品' }, { label: '可比单位价', cls: 'num' }, { label: '环比', cls: 'num' }, { label: '标记' }],
    r.periods.map((p) => {
      const cell = item.series.get(p);
      if (!cell) return [{ text: p }, { text: '—' }, { text: '不可比', cls: 'num' }, { text: '—', cls: 'num' }, { children: [] }];
      const prev = item.series.get(r.periods[r.periods.indexOf(p) - 1]);
      const mom = prev && prev.price ? (cell.price / prev.price - 1) : null;
      return [
        { text: p },
        { text: productById(cell.source)?.name ?? cell.source },
        { text: f3(cell.price), cls: 'num' },
        { text: mom == null ? '—' : pct1(mom), cls: 'num' },
        { children: flagSpans(cell.flags) },
      ];
    }),
  ));

  // 门店原始报价明细
  const rows = [];
  for (const p of r.periods) {
    const cell = item.series.get(p);
    if (!cell) continue;
    for (const c of cell.cells) {
      const rawStatus = c.rawStockout ? '缺货' : c.rawPromo ? '促销' : c.rawPrice != null ? '实际' : '无报价';
      rows.push([
        { text: p },
        { text: storeName(c.slotId) },
        { text: c.storeId === c.slotId ? '—' : storeName(c.storeId) },
        { text: c.rawPrice != null ? `${c.rawPrice} 元` : '—', cls: 'num' },
        { children: rawStatus === '实际' ? [] : flagSpans([rawStatus], rawStatus !== '无报价') },
        { text: c.price != null ? f3(c.price) : '—', cls: 'num' },
        { text: c.estimated ? c.method : '—' },
        { text: c.qty ? String(c.qty) : '0', cls: 'num' },
      ]);
    }
  }
  $('#trace-cells').replaceChildren(buildTable(
    [{ label: '期次' }, { label: '门店槽位' }, { label: '实际报价门店' }, { label: '原始报价', cls: 'num' }, { label: '原始状态' }, { label: '入指数单位价', cls: 'num' }, { label: '估算方式' }, { label: '销量', cls: 'num' }],
    rows,
  ));
}

// ---------- 不可比与覆盖 ----------
function renderCoverage() {
  const r = state.result;
  const pal = currentPaletteSafe();
  $('#nc-table').replaceChildren(
    r.nonComparable.length === 0
      ? h('p', { class: 'hint' }, '当前配置下没有不可比项目。')
      : buildTable(
        [{ label: '篮子条目' }, { label: '原因' }, { label: '起始期' }, { label: '基期权重份额', cls: 'num' }],
        r.nonComparable.map((n) => [
          { text: n.label },
          { text: n.reason },
          { text: n.since ?? '—' },
          { text: pct1(r.totalWeight > 0 ? n.weight / r.totalWeight : 0), cls: 'num' },
        ]),
      ),
  );
  lineChart($('#coverage-chart'), {
    xLabels: r.periods.map((p) => p.slice(2)),
    series: [{ name: '覆盖率', color: pal.series[0], values: r.coverage.map((c) => c.ratio * 100) }],
    yInclude: [100],
    yFormat: (v) => `${v.toFixed(1)}%`,
  });
  $('#coverage-table').replaceChildren(buildTable(
    [{ label: '期次' }, { label: '可比权重（元）', cls: 'num' }, { label: '总权重（元）', cls: 'num' }, { label: '覆盖率', cls: 'num' }],
    r.coverage.map((c) => [
      { text: c.period },
      { text: yuan(c.matched), cls: 'num' },
      { text: yuan(c.total), cls: 'num' },
      { text: pct1(c.ratio), cls: 'num' },
    ]),
  ));
}

// ---------- 版本 ----------
const LS_KEY = 'rpi-versions-v1';
const loadVersions = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; }
};

function saveVersion() {
  const r = state.result;
  if (!r) return;
  const versions = loadVersions();
  const fixed = primarySeries(r, 'fixed');
  const chained = primarySeries(r, 'chained');
  versions.push({
    version: `v${versions.length + 1}`,
    time: new Date().toLocaleString('zh-CN'),
    config: {
      basePeriod: r.config.basePeriod,
      weightScheme: r.config.weightScheme,
      customWeights: { ...state.config.customWeights },
      activeSubstitutions: [...state.config.activeSubstitutions],
    },
    rulesVersion: r.rulesVersion,
    periods: r.periods,
    fixed, chained,
    coverageAvg: r.coverage.reduce((s, c) => s + c.ratio, 0) / r.coverage.length,
    disclosures: r.disclosures.length,
  });
  localStorage.setItem(LS_KEY, JSON.stringify(versions));
  renderVersions();
}

function renderVersions() {
  const versions = loadVersions();
  $('#rules-version').textContent = RULES_VERSION;
  $('#rules-list').replaceChildren(
    buildTable([{ label: '规则' }, { label: '名称' }, { label: '内容' }],
      RULES.map((x) => [{ text: x.id }, { text: x.name }, { text: x.text }])),
  );
  const box = $('#version-list');
  if (versions.length === 0) {
    box.replaceChildren(h('p', { class: 'hint' }, '还没有保存的版本。在"指数计算"页点击"保存为版本"。'));
    $('#version-compare').replaceChildren();
    return;
  }
  box.replaceChildren(
    buildTable(
      [{ label: '版本' }, { label: '保存时间' }, { label: '基期' }, { label: '权重方案' }, { label: '规则版本' }, { label: '期末固定', cls: 'num' }, { label: '期末链式', cls: 'num' }, { label: '对比' }],
      versions.map((v, i) => [
        { text: v.version },
        { text: v.time },
        { text: v.config.basePeriod },
        { text: SCHEME_NAMES[v.config.weightScheme] ?? v.config.weightScheme },
        { text: v.rulesVersion },
        { text: f2(v.fixed.filter((x) => x != null).at(-1)), cls: 'num' },
        { text: f2(v.chained.filter((x) => x != null).at(-1)), cls: 'num' },
        { children: [h('input', { type: 'checkbox', class: 'cmp-check', 'data-i': i })] },
      ]),
    ),
    h('div', { class: 'version-actions', style: 'margin-top:10px;' },
      h('button', { class: 'btn', onclick: compareSelected }, '对比勾选的两个版本'),
      h('button', {
        class: 'btn', onclick: () => { localStorage.removeItem(LS_KEY); renderVersions(); },
      }, '清空全部版本')),
  );
  $('#version-compare').replaceChildren();
}

function compareSelected() {
  const checked = [...document.querySelectorAll('.cmp-check:checked')].map((c) => Number(c.dataset.i));
  const versions = loadVersions();
  const box = $('#version-compare');
  if (checked.length !== 2) {
    box.replaceChildren(h('p', { class: 'hint' }, '请勾选恰好两个版本。'));
    return;
  }
  const [a, b] = checked.map((i) => versions[i]);
  const periods = [...new Set([...a.periods, ...b.periods])].sort();
  box.replaceChildren(
    h('h3', {}, `${a.version} vs ${b.version}（固定篮子指数）`),
    buildTable(
      [{ label: '期次' }, { label: a.version, cls: 'num' }, { label: b.version, cls: 'num' }, { label: '差值', cls: 'num' }],
      periods.map((p) => {
        const va = a.fixed[a.periods.indexOf(p)];
        const vb = b.fixed[b.periods.indexOf(p)];
        return [
          { text: p },
          { text: f2(va), cls: 'num' },
          { text: f2(vb), cls: 'num' },
          { text: va != null && vb != null ? signed(va - vb) : '—', cls: 'num' },
        ];
      }),
    ),
  );
}

// ---------- 事件装配 ----------
function currentPaletteSafe() {
  try { return currentPalette(); } catch { return { series: ['#2a78d6', '#eb6834', '#1baf7a'] }; }
}

function init() {
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${btn.dataset.tab}`));
  });
  document.querySelector('.tab').classList.add('active');
  $('#tab-import').classList.add('active');

  $('#btn-load-sample').addEventListener('click', () => {
    setDataset(structuredClone(sampleDataset));
    $('#import-status').textContent = '已加载内置样例数据';
    renderImportReport({ errors: [], warnings: [], detected: [{ file: '内置样例', type: 'json 数据集', rows: 1 }] });
  });
  $('#file-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (files.length === 0) return;
    const texts = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
    const res = importFiles(texts);
    renderImportReport(res);
    if (res.dataset && res.errors.length === 0) {
      setDataset(res.dataset);
      $('#import-status').textContent = '导入成功';
    } else {
      $('#import-status').textContent = '导入失败，请修正后重试';
    }
    e.target.value = '';
  });

  $('#sel-base').addEventListener('change', (e) => { state.config.basePeriod = e.target.value; recompute(); });
  $('#sel-scheme').addEventListener('change', (e) => { state.config.weightScheme = e.target.value; recompute(); });
  $('#chk-fixed').addEventListener('change', (e) => { state.config.showFixed = e.target.checked; renderIndex(); });
  $('#chk-chained').addEventListener('change', (e) => { state.config.showChained = e.target.checked; renderIndex(); });
  $('#btn-save-version').addEventListener('click', saveVersion);
  $('#sel-decomp-period').addEventListener('change', (e) => { state.decompPeriod = e.target.value; renderDecomp(); });
  $('#sel-trace-item').addEventListener('change', (e) => { state.traceItem = e.target.value; renderTrace(); });
  $('#disclosure-filter').addEventListener('change', (e) => { state.disclosureFilter = e.target.value; renderBasket(); });

  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (state.result) { renderIndex(); renderDecomp(); renderCoverage(); }
  });

  renderVersions();
  setDataset(structuredClone(sampleDataset)); // 启动即加载样例
}

init();
