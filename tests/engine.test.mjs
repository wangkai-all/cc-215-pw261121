// 引擎单元测试：node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeIndex, toBaseUnitPrice, unitsPerBase, primarySeries, RULES_VERSION } from '../js/engine.js';
import { sampleDataset } from '../js/sample-data.js';

const P = sampleDataset.meta.periods; // 2025-01..2025-12
const idx = (period) => P.indexOf(period);
const baseConfig = () => ({
  basePeriod: '2025-01',
  weightScheme: 'laspeyres',
  activeSubstitutions: ['SUB1', 'SUB2'],
});

function run(cfg = {}) {
  return computeIndex(sampleDataset, { ...baseConfig(), ...cfg });
}

// ---------- R1 单位换算 ----------
test('R1 单位换算：3000ml 售价36元 → 1.2 元/100ml', () => {
  const milk = sampleDataset.products.find((p) => p.id === 'P01');
  assert.equal(unitsPerBase(milk), 30);
  assert.ok(Math.abs(toBaseUnitPrice(milk, 36) - 1.2) < 1e-9);
});

test('R1 单位换算：未知换算关系报错', () => {
  assert.throws(() => unitsPerBase({ id: 'X', specQty: 1, specUnit: '打', baseUnit: '100ml' }));
});

// ---------- R5 规格缩小衔接 ----------
test('R5 规格缩小：酸奶 100g→90g 包装价不变，单位价上涨约 11.1%', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P02');
  const jun = item.series.get('2025-06');
  const jul = item.series.get('2025-07');
  assert.equal(jun.source, 'P02');
  assert.equal(jul.source, 'P03');
  // 12.5元/800g=1.5625 → 12.5元/720g≈1.7361（各店略有抖动，按门店加权）
  const ratio = jul.price / jun.price;
  assert.ok(ratio > 1.08 && ratio < 1.14, `单位价比 ${ratio} 应约 1.111`);
  assert.ok(jul.flags.includes('规格衔接'));
  assert.ok(r.disclosures.some((d) => d.rule === 'R5' && d.itemKey === 'P02'));
});

// ---------- R2 促销处理 ----------
test('R2 跨期促销：3-4月促销价不计入，常规价插值估算且披露', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P04');
  const mar = item.series.get('2025-03');
  const apr = item.series.get('2025-04');
  // 相邻常规价均为 9.9 元/150g → 插值后单位价应≈9.9/1.5=6.6 元/100g
  assert.ok(Math.abs(mar.price - 6.6) < 0.05, `3月估算单位价 ${mar.price}`);
  assert.ok(Math.abs(apr.price - 6.6) < 0.05);
  assert.ok(mar.estimated && mar.flags.some((f) => f.startsWith('估算')));
  // 披露：促销（R2）与估算（R3）都有记录
  assert.ok(r.disclosures.filter((d) => d.rule === 'R2' && d.itemKey === 'P04').length >= 8);
  assert.ok(r.disclosures.some((d) => d.rule === 'R3' && d.itemKey === 'P04' && d.period === '2025-03'));
  // 指数在促销月不应出现下跌假象：固定篮子拉氏 2月→3月不应明显下降
  const L = r.indices.fixed.laspeyres;
  assert.ok(L[idx('2025-03')] >= L[idx('2025-02')] - 0.5, '促销不应拉低指数');
});

// ---------- R3 缺货估算 ----------
test('R3 缺货：洗衣液 S2 2025-08 缺货，按跨店均值估算并披露', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P05');
  const aug = item.series.get('2025-08');
  assert.ok(aug.estimated);
  const s2cell = aug.cells.find((c) => c.slotId === 'S2');
  assert.ok(s2cell.estimated && s2cell.method === '跨店均值');
  // S1/S4 8月常规价 29.9/29.5 元/2kg → 均值≈14.85 元/kg
  assert.ok(Math.abs(s2cell.price - 14.85) < 0.1, `S2估算价 ${s2cell.price}`);
  assert.ok(r.disclosures.some((d) => d.rule === 'R3' && d.itemKey === 'P05' && d.period === '2025-08'));
});

// ---------- R4 退市无替代 ----------
test('R4 退市无替代：饼干沿用2期后列为不可比，覆盖率下降', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P08');
  assert.ok(item.series.get('2025-06').flags.includes('退市沿用'));
  assert.ok(item.series.get('2025-07').flags.includes('退市沿用'));
  assert.equal(item.series.get('2025-08'), undefined, '第3期起退出');
  const nc = r.nonComparable.find((n) => n.key === 'P08');
  assert.ok(nc && nc.since === '2025-08' && nc.reason.includes('退市'));
  const covJun = r.coverage[idx('2025-06')].ratio;
  const covAug = r.coverage[idx('2025-08')].ratio;
  assert.ok(covJun === 1, '6月应全覆盖');
  assert.ok(covAug < 1 && covAug > 0.8, `8月覆盖率 ${covAug} 应下降`);
});

// ---------- R5 重叠衔接 ----------
test('R5 重叠衔接：洗发水不可替代换按重叠期价格比衔接，序列连续', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P09');
  assert.ok(item.overlapK != null);
  const sep = item.series.get('2025-09');
  const oct = item.series.get('2025-10');
  assert.equal(sep.source, 'P09');
  assert.equal(oct.source, 'P10');
  assert.ok(oct.flags.includes('重叠衔接'));
  // 衔接前后单位价应基本连续（k 已吸收品质差）
  assert.ok(Math.abs(oct.price / sep.price - 1) < 0.02, `衔接跳变 ${oct.price / sep.price}`);
});

// ---------- R6 门店更替 ----------
test('R6 门店更替：苹果 7 月起由城南新店承接老店槽位', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P06');
  const jul = item.series.get('2025-07');
  assert.ok(jul.flags.includes('门店更替'));
  const s3cell = jul.cells.find((c) => c.slotId === 'S3');
  assert.equal(s3cell.storeId, 'S5');
  assert.ok(r.disclosures.some((d) => d.rule === 'R6' && d.itemKey === 'P06'));
});

// ---------- 指数公式正确性（手工构造小数据集） ----------
function tinyDataset() {
  return {
    meta: { name: 'tiny', currency: '元', periods: ['2025-01', '2025-02', '2025-03'] },
    categories: [],
    products: [
      { id: 'A', name: 'A', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null },
      { id: 'B', name: 'B', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null },
    ],
    stores: [{ id: 'S1', name: 'S1', region: '', openPeriod: '2025-01', closePeriod: null }],
    storeReplacements: [],
    substitutions: [],
    basket: [{ productId: 'A', weight: null }, { productId: 'B', weight: null }],
    quotes: [
      { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
      { productId: 'A', storeId: 'S1', period: '2025-02', price: 12, qty: 110, promo: false, stockout: false },
      { productId: 'A', storeId: 'S1', period: '2025-03', price: 15, qty: 120, promo: false, stockout: false },
      { productId: 'B', storeId: 'S1', period: '2025-01', price: 20, qty: 50, promo: false, stockout: false },
      { productId: 'B', storeId: 'S1', period: '2025-02', price: 18, qty: 60, promo: false, stockout: false },
      { productId: 'B', storeId: 'S1', period: '2025-03', price: 24, qty: 40, promo: false, stockout: false },
    ],
  };
}

test('拉氏/帕氏/费雪指数与手算一致', () => {
  const r = computeIndex(tinyDataset(), { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  // 基期支出：A 1000，B 1000 → 权重各半
  // 2月 L = 0.5×1.2 + 0.5×0.9 = 1.05
  assert.ok(Math.abs(r.indices.fixed.laspeyres[1] - 105) < 1e-9);
  // 3月 L = 0.5×1.5 + 0.5×1.2 = 1.35
  assert.ok(Math.abs(r.indices.fixed.laspeyres[2] - 135) < 1e-9);
  // 3月 P = (15×120+24×40)/(10×120+20×40) = 2760/2000 = 1.38
  assert.ok(Math.abs(r.indices.fixed.paasche[2] - 138) < 1e-9);
  // F = sqrt(1.35×1.38)
  assert.ok(Math.abs(r.indices.fixed.fisher[2] - Math.sqrt(135 * 138)) < 1e-6);
});

test('链式指数 = 月环比链接连乘', () => {
  const r = computeIndex(tinyDataset(), { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const c = r.indices.chained.laspeyres;
  assert.ok(Math.abs(c[0] - 100) < 1e-9);
  // link2 = (12×100+18×50)/(10×100+20×50) = 2100/2000 = 1.05
  assert.ok(Math.abs(c[1] - 105) < 1e-9);
  // link3 = (15×110+24×60)/(12×110+18×60) = 3090/2400 = 1.2875
  assert.ok(Math.abs(c[2] - 105 * 1.2875) < 1e-6);
});

test('条目贡献合计 = 拉氏指数 - 100', () => {
  const r = run();
  for (let t = 0; t < P.length; t++) {
    const L = r.indices.fixed.laspeyres[t];
    if (L == null) continue;
    const sum = Object.values(r.contributions).reduce((s, arr) => s + (arr[t] ?? 0), 0);
    assert.ok(Math.abs(sum - (L - 100)) < 1e-6, `期次 ${P[t]}：贡献和 ${sum} vs ${L - 100}`);
  }
});

test('价值分解：价格效应+结构效应+交互效应 = 价值变化', () => {
  const r = run();
  for (const d of r.valueDecomp) {
    assert.ok(Math.abs(d.priceEff + d.structEff + d.interEff - d.dV) < 1e-6, `期次 ${d.period}`);
  }
});

test('基期可选：以 2025-06 为基期时该期指数=100', () => {
  const r = run({ basePeriod: '2025-06' });
  assert.ok(Math.abs(r.indices.fixed.laspeyres[idx('2025-06')] - 100) < 1e-9);
  assert.ok(Math.abs(r.indices.chained.laspeyres[idx('2025-06')] - 100) < 1e-9);
  // 退市饼干在6月基期下处于沿用期，仍有基价 → 可比
  const nc = r.nonComparable.find((n) => n.key === 'P08');
  assert.ok(nc && nc.since === '2025-08');
});

test('停用替代关系：酸奶条目在旧规格退市后变为不可比', () => {
  const r = run({ activeSubstitutions: ['SUB2'] }); // 停用 SUB1
  const nc = r.nonComparable.find((n) => n.key === 'P02');
  assert.ok(nc, 'P02 应列为不可比');
  assert.equal(nc.since, '2025-09'); // 退市于6月，沿用7月(1)、8月(2)，9月起不可比
});

test('自定义权重方案生效', () => {
  const custom = Object.fromEntries(sampleDataset.basket.map((b) => [b.productId, 1]));
  const r = run({ weightScheme: 'custom', customWeights: custom });
  // 等权下拉氏 = 各条目相对价格的简单平均
  const t = idx('2025-02');
  const M = r.items.filter((i) => i.basePrice != null && i.series.get(P[t])?.price != null);
  const expect = (M.reduce((s, i) => s + i.series.get(P[t]).price / i.basePrice, 0) / M.length) * 100;
  assert.ok(Math.abs(r.indices.fixed.laspeyres[t] - expect) < 1e-9);
});

test('规则版本号随结果返回', () => {
  const r = run();
  assert.equal(r.rulesVersion, RULES_VERSION);
});

test('primarySeries 按方案选择指数列', () => {
  const r = run({ weightScheme: 'fisher' });
  assert.equal(primarySeries(r, 'fixed'), r.indices.fixed.fisher);
  const r2 = run({ weightScheme: 'custom', customWeights: {} });
  assert.equal(primarySeries(r2, 'chained'), r2.indices.chained.laspeyres);
});

// ---------- 健壮性（回归：审查发现的问题） ----------
function miniBase() {
  return {
    meta: { name: 'mini', currency: '元', periods: ['2025-01', '2025-02', '2025-03'] },
    categories: [],
    products: [
      { id: 'A', name: 'A', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null },
      { id: 'B', name: 'B', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null },
    ],
    stores: [{ id: 'S1', name: 'S1', region: '', openPeriod: '2025-01', closePeriod: null }],
    storeReplacements: [],
    substitutions: [],
    basket: [{ productId: 'A', weight: null }],
    quotes: [
      { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
      { productId: 'A', storeId: 'S1', period: '2025-02', price: 11, qty: 100, promo: false, stockout: false },
      { productId: 'A', storeId: 'S1', period: '2025-03', price: 12, qty: 100, promo: false, stockout: false },
      { productId: 'B', storeId: 'S1', period: '2025-01', price: 20, qty: 50, promo: false, stockout: false },
      { productId: 'B', storeId: 'S1', period: '2025-02', price: 21, qty: 50, promo: false, stockout: false },
      { productId: 'B', storeId: 'S1', period: '2025-03', price: 22, qty: 50, promo: false, stockout: false },
    ],
  };
}

test('替代关系成环：不挂死并披露', () => {
  const ds = miniBase();
  ds.substitutions = [
    { id: 'SUB1', from: 'A', to: 'B', type: 'equivalent', switchPeriod: '2025-02', overlapPeriod: null, note: '' },
    { id: 'SUB2', from: 'B', to: 'A', type: 'equivalent', switchPeriod: '2025-03', overlapPeriod: null, note: '' },
  ];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: ['SUB1', 'SUB2'] });
  assert.ok(r.disclosures.some((d) => d.message.includes('循环')));
  assert.ok(r.indices.fixed.laspeyres.every((v) => v != null));
});

test('门店更替成环：不挂死', () => {
  const ds = miniBase();
  ds.stores.push({ id: 'S2', name: 'S2', region: '', openPeriod: '2025-01', closePeriod: null });
  ds.storeReplacements = [
    { from: 'S1', to: 'S2', period: '2025-01', note: '' },
    { from: 'S2', to: 'S1', period: '2025-01', note: '' },
  ];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  assert.ok(r.indices.fixed.laspeyres[0] === 100);
});

test('规格量缺失：unitsPerBase 抛错而非产生 Infinity', () => {
  assert.throws(() => unitsPerBase({ id: 'X', specQty: null, specUnit: 'kg', baseUnit: 'kg' }));
  assert.throws(() => unitsPerBase({ id: 'X', specQty: 0, specUnit: 'kg', baseUnit: 'kg' }));
});

test('门店缺开业期：按全程开业处理，报价不丢失', () => {
  const ds = miniBase();
  ds.stores[0].openPeriod = null;
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const item = r.items.find((i) => i.key === 'A');
  assert.ok(item.basePrice != null, '缺开业期的门店报价应被使用');
});

test('衔接期无效：替代被忽略并披露，条目沿用旧品', () => {
  const ds = miniBase();
  ds.substitutions = [{ id: 'SUB1', from: 'A', to: 'B', type: 'equivalent', switchPeriod: '2025-7', overlapPeriod: null, note: '' }];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: ['SUB1'] });
  const item = r.items.find((i) => i.key === 'A');
  assert.ok(r.disclosures.some((d) => d.message.includes('无效')));
  assert.equal(item.series.get('2025-03').source, 'A', '无效替代不应拼接新品');
});

test('R4 退市前缺价估算用尽：仍按退市沿用并入不可比清单', () => {
  const ds = {
    meta: { name: 'gap', currency: '元', periods: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08'] },
    categories: [],
    products: [{ id: 'C', name: 'C', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: '2025-05' }],
    stores: [{ id: 'S1', name: 'S1', region: '', openPeriod: '2025-01', closePeriod: null }],
    storeReplacements: [],
    substitutions: [],
    basket: [{ productId: 'C', weight: null }],
    // 只有 1 月有报价：2、3 月由 R3 沿用，4、5 月缺价，退市后由 R4 沿用 6、7 月
    quotes: [{ productId: 'C', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false }],
  };
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const item = r.items.find((i) => i.key === 'C');
  assert.ok(item.series.get('2025-06').flags.includes('退市沿用'));
  assert.ok(item.series.get('2025-07').flags.includes('退市沿用'));
  assert.equal(item.series.get('2025-08'), undefined);
  const nc = r.nonComparable.find((n) => n.key === 'C');
  assert.ok(nc && nc.since === '2025-08');
  assert.ok(r.disclosures.filter((d) => d.rule === 'R4').length >= 3);
});

// ---------- 健壮性第二轮 ----------
test('基期不在期次范围内：抛出明确错误', () => {
  assert.throws(
    () => computeIndex(miniBase(), { basePeriod: '2024-12', weightScheme: 'laspeyres', activeSubstitutions: [] }),
    /基期 .* 不在数据期次范围内/,
  );
});

test('篮子引用不存在的商品：抛出明确错误而非 TypeError', () => {
  const ds = miniBase();
  ds.basket = [{ productId: 'ZZ', weight: null }];
  assert.throws(
    () => computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] }),
    /不存在的商品：ZZ/,
  );
});

test('篮子重复条目：忽略重复，贡献数组与期次轴对齐', () => {
  const ds = miniBase();
  ds.basket = [{ productId: 'A', weight: null }, { productId: 'A', weight: null }];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  assert.equal(r.items.length, 1);
  assert.equal(r.contributions.A.length, ds.meta.periods.length);
});

test('同一门店多次被替换：取期次最新的一条', () => {
  const ds = miniBase();
  ds.stores = [
    { id: 'S1', name: 'S1', region: '', openPeriod: '2025-01', closePeriod: null },
    { id: 'S2', name: 'S2', region: '', openPeriod: '2025-01', closePeriod: null },
    { id: 'S3', name: 'S3', region: '', openPeriod: '2025-01', closePeriod: null },
  ];
  ds.storeReplacements = [
    { from: 'S1', to: 'S2', period: '2025-02', note: '' },
    { from: 'S1', to: 'S3', period: '2025-03', note: '' },
  ];
  ds.quotes = [
    { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S2', period: '2025-02', price: 20, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S3', period: '2025-03', price: 30, qty: 100, promo: false, stockout: false },
  ];
  ds.basket = [{ productId: 'A', weight: null }];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const item = r.items.find((i) => i.key === 'A');
  assert.equal(item.series.get('2025-02').price, 20);
  assert.equal(item.series.get('2025-03').price, 30, '应使用最新的 S3 而非 S2');
});

test('接替门店在更替前的报价：计入其自身槽位', () => {
  const ds = miniBase();
  ds.stores = [
    { id: 'S1', name: 'S1', region: '', openPeriod: '2025-01', closePeriod: null },
    { id: 'S2', name: 'S2', region: '', openPeriod: '2025-01', closePeriod: null },
  ];
  ds.storeReplacements = [{ from: 'S1', to: 'S2', period: '2025-02', note: '' }];
  ds.quotes = [
    { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S2', period: '2025-01', price: 20, qty: 300, promo: false, stockout: false },
    { productId: 'A', storeId: 'S2', period: '2025-02', price: 30, qty: 300, promo: false, stockout: false },
    { productId: 'A', storeId: 'S2', period: '2025-03', price: 30, qty: 300, promo: false, stockout: false },
  ];
  ds.basket = [{ productId: 'A', weight: null }];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const item = r.items.find((i) => i.key === 'A');
  // 1月：S1(10,权重100) 与 S2自身槽位(20,权重300) 加权 → 17.5
  assert.ok(Math.abs(item.series.get('2025-01').price - 17.5) < 1e-9);
  // 2月起：S2 报价归属 S1 槽位 → 30
  assert.equal(item.series.get('2025-02').price, 30);
});

test('R4 沿用期不携带上期门店明细（报价追溯不显示幻影报价）', () => {
  const r = run();
  const item = r.items.find((i) => i.key === 'P08');
  assert.equal(item.series.get('2025-06').cells.length, 0);
  assert.equal(item.series.get('2025-07').cells.length, 0);
});

test('费雪链接为 0 时不被误判为缺失', () => {
  const ds = miniBase();
  ds.quotes = [
    { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S1', period: '2025-02', price: 0, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S1', period: '2025-03', price: 0, qty: 100, promo: false, stockout: false },
  ];
  ds.basket = [{ productId: 'A', weight: null }];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'fisher', activeSubstitutions: [] });
  assert.equal(r.indices.chained.fisher[1], 0, '零链接应链出 0 而非 null');
  // 02→03 链接分母为 0（两期价格均为 0），数学上无定义 → null 是正确行为
  assert.equal(r.indices.chained.fisher[2], null);
});

// ---------- 健壮性第三轮 ----------
test('后向链接遇零链接：保持 null 而非 Infinity', () => {
  const ds = miniBase();
  ds.quotes = [
    { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S1', period: '2025-02', price: 5, qty: 100, promo: false, stockout: false },
    { productId: 'A', storeId: 'S1', period: '2025-03', price: 0, qty: 100, promo: false, stockout: false },
  ];
  ds.basket = [{ productId: 'A', weight: null }];
  const r = computeIndex(ds, { basePeriod: '2025-03', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const c = r.indices.chained.laspeyres;
  assert.equal(c[2], 100);
  assert.equal(c[1], null, 'link(02→03)=0 时后向链接无定义');
  assert.ok(!c.some((v) => v === Infinity || (v != null && Number.isNaN(v))));
});

test('替代链衔接期不递增：后段替代被忽略并披露', () => {
  const ds = miniBase();
  ds.products.push({ id: 'C', name: 'C', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null });
  ds.quotes.push(
    { productId: 'C', storeId: 'S1', period: '2025-01', price: 100, qty: 10, promo: false, stockout: false },
    { productId: 'C', storeId: 'S1', period: '2025-02', price: 100, qty: 10, promo: false, stockout: false },
    { productId: 'C', storeId: 'S1', period: '2025-03', price: 100, qty: 10, promo: false, stockout: false },
  );
  ds.substitutions = [
    { id: 'SUB1', from: 'A', to: 'B', type: 'equivalent', switchPeriod: '2025-03', overlapPeriod: null, note: '' },
    { id: 'SUB2', from: 'B', to: 'C', type: 'equivalent', switchPeriod: '2025-02', overlapPeriod: null, note: '' },
  ];
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: ['SUB1', 'SUB2'] });
  const item = r.items.find((i) => i.key === 'A');
  assert.ok(r.disclosures.some((d) => d.message.includes('递增')));
  assert.equal(item.series.get('2025-03').source, 'B', '不递增的 SUB2 应被忽略');
  assert.ok(![...item.series.values()].some((c) => c.source === 'C'));
});

test('R3 沿用：取最近有效价且连续不超过 2 期', () => {
  const ds = {
    meta: { name: 'carry', currency: '元', periods: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'] },
    categories: [],
    products: [{ id: 'A', name: 'A', categoryId: 'c', specQty: 1, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null }],
    stores: [
      { id: 'S1', name: 'S1', region: '', openPeriod: '2025-01', closePeriod: null },
      { id: 'S2', name: 'S2', region: '', openPeriod: '2025-01', closePeriod: null },
    ],
    storeReplacements: [],
    substitutions: [],
    basket: [{ productId: 'A', weight: null }],
    quotes: [
      { productId: 'A', storeId: 'S1', period: '2025-01', price: 10, qty: 100, promo: false, stockout: false },
      { productId: 'A', storeId: 'S2', period: '2025-01', price: 20, qty: 100, promo: false, stockout: false },
      { productId: 'A', storeId: 'S2', period: '2025-03', price: 20, qty: 100, promo: false, stockout: false },
    ],
  };
  const r = computeIndex(ds, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: [] });
  const cells = r.items[0].series;
  // S1 槽位：02 沿用 10；03 跨店均值 20（重置连续计数）；04、05 沿用 20；06 超出连续 2 期 → 无
  const s1 = (p) => cells.get(p)?.cells.find((c) => c.slotId === 'S1');
  assert.equal(s1('2025-02').price, 10);
  assert.equal(s1('2025-02').method, '沿用');
  assert.equal(s1('2025-03').price, 20);
  assert.equal(s1('2025-03').method, '跨店均值');
  assert.equal(s1('2025-04').price, 20, '沿用应取最近有效价（03 的估算值）');
  assert.equal(s1('2025-04').method, '沿用');
  assert.equal(s1('2025-05').method, '沿用');
  assert.equal(s1('2025-06'), undefined, '连续沿用超过 2 期应停止');
});
