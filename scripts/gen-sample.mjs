// 生成虚构零售样例数据（完全虚构，不代表任何真实企业或官方统计）
// 输出：js/sample-data.js（ESM）、sample-data/dataset.json、sample-data/*.csv
// 运行：node scripts/gen-sample.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 确定性伪随机（保证每次生成一致）
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250101);
const jitter = (base, pct) => Math.round(base * (1 + (rand() - 0.5) * pct) * 10) / 10;
const qtyJitter = (base, pct) => Math.round(base * (1 + (rand() - 0.5) * pct));

const PERIODS = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`);

const categories = [
  { id: 'dairy', name: '乳制品' },
  { id: 'snack', name: '零食' },
  { id: 'household', name: '日化' },
  { id: 'fresh', name: '生鲜' },
  { id: 'egg', name: '蛋品' },
];

// specQty/specUnit：售卖规格；baseUnit：可比计量单位（价格换算目标）
const products = [
  { id: 'P01', name: '纯牛奶 250ml×12盒', categoryId: 'dairy', specQty: 3000, specUnit: 'ml', baseUnit: '100ml', onShelf: '2025-01', offShelf: null },
  { id: 'P02', name: '原味酸奶 100g×8杯', categoryId: 'dairy', specQty: 800, specUnit: 'g', baseUnit: '100g', onShelf: '2025-01', offShelf: '2025-06' },
  { id: 'P03', name: '原味酸奶 90g×8杯（新规格）', categoryId: 'dairy', specQty: 720, specUnit: 'g', baseUnit: '100g', onShelf: '2025-07', offShelf: null },
  { id: 'P04', name: '香脆薯片 150g', categoryId: 'snack', specQty: 150, specUnit: 'g', baseUnit: '100g', onShelf: '2025-01', offShelf: null },
  { id: 'P05', name: '洗衣液 2kg', categoryId: 'household', specQty: 2, specUnit: 'kg', baseUnit: 'kg', onShelf: '2025-01', offShelf: null },
  { id: 'P06', name: '红富士苹果（散装）', categoryId: 'fresh', specQty: 1, specUnit: '500g', baseUnit: '500g', onShelf: '2025-01', offShelf: null },
  { id: 'P07', name: '鲜鸡蛋 30枚', categoryId: 'egg', specQty: 30, specUnit: '枚', baseUnit: '枚', onShelf: '2025-01', offShelf: null },
  { id: 'P08', name: '进口黄油饼干 200g', categoryId: 'snack', specQty: 200, specUnit: 'g', baseUnit: '100g', onShelf: '2025-01', offShelf: '2025-05' },
  { id: 'P09', name: '柔顺洗发水 400ml', categoryId: 'household', specQty: 400, specUnit: 'ml', baseUnit: '100ml', onShelf: '2025-01', offShelf: '2025-09' },
  { id: 'P10', name: '清爽洗发水 450ml', categoryId: 'household', specQty: 450, specUnit: 'ml', baseUnit: '100ml', onShelf: '2025-09', offShelf: null },
];

const stores = [
  { id: 'S1', name: '城东旗舰店', region: '城东', openPeriod: '2025-01', closePeriod: null },
  { id: 'S2', name: '城西社区店', region: '城西', openPeriod: '2025-01', closePeriod: null },
  { id: 'S3', name: '城南老店', region: '城南', openPeriod: '2025-01', closePeriod: '2025-06' },
  { id: 'S4', name: '城北仓储店', region: '城北', openPeriod: '2025-01', closePeriod: null },
  { id: 'S5', name: '城南新店', region: '城南', openPeriod: '2025-07', closePeriod: null },
];

const storeReplacements = [
  { from: 'S3', to: 'S5', period: '2025-07', note: '城南老店2025-06末闭店，城南新店自2025-07承接该门店报价与权重' },
];

const substitutions = [
  { id: 'SUB1', from: 'P02', to: 'P03', type: 'spec-change', switchPeriod: '2025-07', overlapPeriod: null,
    note: '规格缩小 100g×8→90g×8，按每100g单价直接衔接（可比单位价格已体现规格变化）' },
  { id: 'SUB2', from: 'P09', to: 'P10', type: 'non-comparable-overlap', switchPeriod: '2025-10', overlapPeriod: '2025-09',
    note: '品牌与配方不同、不可直接比较；两产品2025-09均有报价，按重叠期单位价格比衔接' },
];

const basket = ['P01', 'P02', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09'].map((productId) => ({ productId, weight: null }));

// ---- 报价故事线（常规价；促销与缺货单独标注） ----
// priceMap: { storeId: { period: price } }，qtyMap 同理；缺省周期不生成报价
const P = PERIODS;
const inRange = (a, b) => P.filter((p) => p >= a && p <= b);
const fill = (periods, price) => Object.fromEntries(periods.map((p) => [p, price]));

const stories = [];

// P01 纯牛奶：6月常规价上调
stories.push({
  productId: 'P01',
  rows: [
    { storeId: 'S1', prices: { ...fill(inRange('2025-01', '2025-05'), 36.0), ...fill(inRange('2025-06', '2025-12'), 37.5) }, qty: 150 },
    { storeId: 'S2', prices: { ...fill(inRange('2025-01', '2025-05'), 35.5), ...fill(inRange('2025-06', '2025-12'), 36.9) }, qty: 120 },
    { storeId: 'S4', prices: { ...fill(inRange('2025-01', '2025-05'), 34.9), ...fill(inRange('2025-06', '2025-12'), 36.0) }, qty: 200 },
  ],
});
// P02 酸奶（旧规格）：4月小涨，6月末退市
stories.push({
  productId: 'P02',
  rows: [
    { storeId: 'S1', prices: { ...fill(inRange('2025-01', '2025-03'), 12.0), ...fill(inRange('2025-04', '2025-06'), 12.5) }, qty: 100 },
    { storeId: 'S2', prices: { ...fill(inRange('2025-01', '2025-03'), 12.0), ...fill(inRange('2025-04', '2025-06'), 12.5) }, qty: 80 },
    { storeId: 'S4', prices: { ...fill(inRange('2025-01', '2025-03'), 11.8), ...fill(inRange('2025-04', '2025-06'), 12.3) }, qty: 130 },
  ],
});
// P03 酸奶（新规格 90g）：7月上市，包装价与旧规格退市时相同 → 单位价上涨约11%
stories.push({
  productId: 'P03',
  rows: [
    { storeId: 'S1', prices: fill(inRange('2025-07', '2025-12'), 12.5), qty: 95 },
    { storeId: 'S2', prices: fill(inRange('2025-07', '2025-12'), 12.5), qty: 75 },
    { storeId: 'S4', prices: fill(inRange('2025-07', '2025-12'), 12.3), qty: 125 },
  ],
});
// P04 薯片：3-4月跨期促销（7.9），11月单月促销（8.9），12月常规价上调；S3 6月末关闭，S5 7月接续
const chipPrices = {
  ...fill(inRange('2025-01', '2025-02'), 9.9),
  ...fill(inRange('2025-05', '2025-11'), 9.9),
  '2025-12': 10.5,
};
const chipPromos = { '2025-03': 7.9, '2025-04': 7.9, '2025-11': 8.9 };
stories.push({
  productId: 'P04',
  rows: [
    { storeId: 'S1', prices: chipPrices, promos: chipPromos, qty: 200, promoQty: 500 },
    { storeId: 'S2', prices: chipPrices, promos: chipPromos, qty: 180, promoQty: 470 },
    { storeId: 'S3', prices: chipPrices, promos: chipPromos, qty: 160, promoQty: 440, only: inRange('2025-01', '2025-06') },
    { storeId: 'S5', prices: chipPrices, promos: chipPromos, qty: 150, promoQty: 430, only: inRange('2025-07', '2025-12') },
    { storeId: 'S4', prices: chipPrices, promos: chipPromos, qty: 140, promoQty: 410 },
  ],
});
// P05 洗衣液：9月涨价；S2 在 2025-08 缺货
stories.push({
  productId: 'P05',
  rows: [
    { storeId: 'S1', prices: { ...fill(inRange('2025-01', '2025-08'), 29.9), ...fill(inRange('2025-09', '2025-12'), 31.9) }, qty: 85 },
    { storeId: 'S2', prices: { ...fill(inRange('2025-01', '2025-08'), 29.9), ...fill(inRange('2025-09', '2025-12'), 31.9) }, qty: 70, stockouts: ['2025-08'] },
    { storeId: 'S4', prices: { ...fill(inRange('2025-01', '2025-08'), 29.5), ...fill(inRange('2025-09', '2025-12'), 31.5) }, qty: 110 },
  ],
});
// P06 苹果：季节价格；S3 报到 6 月，S5 从 7 月接续（门店更替）
const appleSeason = { '2025-01': 6.5, '2025-02': 6.8, '2025-03': 7.2, '2025-04': 7.5, '2025-05': 7.9, '2025-06': 8.5, '2025-07': 9.0, '2025-08': 8.8, '2025-09': 7.5, '2025-10': 6.9, '2025-11': 6.5, '2025-12': 6.8 };
const appleQty = { '2025-01': 220, '2025-02': 210, '2025-03': 190, '2025-04': 180, '2025-05': 160, '2025-06': 140, '2025-07': 130, '2025-08': 140, '2025-09': 180, '2025-10': 210, '2025-11': 230, '2025-12': 220 };
stories.push({
  productId: 'P06',
  rows: [
    { storeId: 'S1', prices: appleSeason, qtyByPeriod: appleQty },
    { storeId: 'S3', prices: Object.fromEntries(inRange('2025-01', '2025-06').map((p) => [p, appleSeason[p] - 0.2])), qtyByPeriod: Object.fromEntries(inRange('2025-01', '2025-06').map((p) => [p, appleQty[p] * 0.6])) },
    { storeId: 'S5', prices: Object.fromEntries(inRange('2025-07', '2025-12').map((p) => [p, appleSeason[p] + 0.2])), qtyByPeriod: Object.fromEntries(inRange('2025-07', '2025-12').map((p) => [p, appleQty[p] * 0.7])) },
  ],
});
// P07 鸡蛋：价格波动；S3→S5 更替
const eggPrice = (p) => (p <= '2025-03' ? 21.9 : p <= '2025-06' ? 20.9 : p <= '2025-08' ? 19.9 : p <= '2025-10' ? 21.5 : 22.9);
stories.push({
  productId: 'P07',
  rows: [
    { storeId: 'S1', prices: Object.fromEntries(P.map((p) => [p, eggPrice(p)])), qty: 120 },
    { storeId: 'S2', prices: Object.fromEntries(P.map((p) => [p, eggPrice(p) - 0.3])), qty: 90 },
    { storeId: 'S3', prices: Object.fromEntries(inRange('2025-01', '2025-06').map((p) => [p, eggPrice(p)])), qty: 70 },
    { storeId: 'S5', prices: Object.fromEntries(inRange('2025-07', '2025-12').map((p) => [p, eggPrice(p) + 0.2])), qty: 75 },
  ],
});
// P08 饼干：5月末退市，无替代
stories.push({
  productId: 'P08',
  rows: [
    { storeId: 'S1', prices: fill(inRange('2025-01', '2025-05'), 15.8), qty: 70 },
    { storeId: 'S4', prices: fill(inRange('2025-01', '2025-05'), 15.5), qty: 90 },
  ],
});
// P09 洗发水（旧）：8月小涨，9月末退市
stories.push({
  productId: 'P09',
  rows: [
    { storeId: 'S1', prices: { ...fill(inRange('2025-01', '2025-07'), 39.9), ...fill(inRange('2025-08', '2025-09'), 40.9) }, qty: 60 },
    { storeId: 'S2', prices: { ...fill(inRange('2025-01', '2025-07'), 39.9), ...fill(inRange('2025-08', '2025-09'), 40.9) }, qty: 45 },
    { storeId: 'S4', prices: { ...fill(inRange('2025-01', '2025-07'), 39.5), ...fill(inRange('2025-08', '2025-09'), 40.5) }, qty: 80 },
  ],
});
// P10 洗发水（新）：9月上市（与P09重叠一个月），单位价与P09基本持平
stories.push({
  productId: 'P10',
  rows: [
    { storeId: 'S1', prices: fill(inRange('2025-09', '2025-12'), 45.9), qty: 55 },
    { storeId: 'S2', prices: fill(inRange('2025-09', '2025-12'), 45.9), qty: 40 },
    { storeId: 'S4', prices: fill(inRange('2025-09', '2025-12'), 45.5), qty: 75 },
  ],
});

// ---- 生成报价行 ----
const quotes = [];
for (const story of stories) {
  for (const row of story.rows) {
    for (const period of P) {
      if (row.only && !row.only.includes(period)) continue;
      const promoPrice = row.promos?.[period];
      const regular = row.prices?.[period];
      const stockout = row.stockouts?.includes(period) ?? false;
      if (stockout) {
        quotes.push({ productId: story.productId, storeId: row.storeId, period, price: null, qty: 0, promo: false, stockout: true });
        continue;
      }
      if (promoPrice != null) {
        quotes.push({ productId: story.productId, storeId: row.storeId, period, price: promoPrice, qty: qtyJitter(row.promoQty ?? row.qty * 2, 0.2), promo: true, stockout: false });
        continue;
      }
      if (regular == null) continue;
      const qty = row.qtyByPeriod ? row.qtyByPeriod[period] : row.qty;
      quotes.push({ productId: story.productId, storeId: row.storeId, period, price: jitter(regular, 0.01), qty: qtyJitter(qty, 0.15), promo: false, stockout: false });
    }
  }
}

const dataset = {
  meta: {
    name: '虚构零售样例数据（2025年1–12月）',
    currency: '元',
    periods: PERIODS,
    disclaimer: '本数据为教学演示用的完全虚构数据，不来自任何真实企业，也不复刻任何官方指数。',
    stories: '覆盖场景：规格缩小（P02→P03）、跨期促销（P04）、缺货（P05/S2/2025-08）、门店更替（S3→S5）、退市无替代（P08）、重叠衔接替代（P09→P10）。',
  },
  categories,
  products,
  stores,
  storeReplacements,
  substitutions,
  basket,
  quotes,
};

// ---- 写出文件 ----
const toCsv = (rows, cols) => {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
};

mkdirSync(join(root, 'sample-data'), { recursive: true });
mkdirSync(join(root, 'js'), { recursive: true });

writeFileSync(join(root, 'sample-data', 'dataset.json'), JSON.stringify(dataset, null, 2) + '\n');
writeFileSync(join(root, 'sample-data', 'products.csv'), toCsv(products, ['id', 'name', 'categoryId', 'specQty', 'specUnit', 'baseUnit', 'onShelf', 'offShelf']));
writeFileSync(join(root, 'sample-data', 'stores.csv'), toCsv(stores, ['id', 'name', 'region', 'openPeriod', 'closePeriod']));
writeFileSync(join(root, 'sample-data', 'store_replacements.csv'), toCsv(storeReplacements, ['from', 'to', 'period', 'note']));
writeFileSync(join(root, 'sample-data', 'substitutions.csv'), toCsv(substitutions, ['id', 'from', 'to', 'type', 'switchPeriod', 'overlapPeriod', 'note']));
writeFileSync(join(root, 'sample-data', 'basket.csv'), toCsv(basket, ['productId', 'weight']));
writeFileSync(join(root, 'sample-data', 'quotes.csv'), toCsv(quotes, ['productId', 'storeId', 'period', 'price', 'qty', 'promo', 'stockout']));

const js = `// 本文件由 scripts/gen-sample.mjs 生成，请勿手改。数据为完全虚构的教学演示数据。
export const sampleDataset = ${JSON.stringify(dataset, null, 2)};
`;
writeFileSync(join(root, 'js', 'sample-data.js'), js);

console.log(`生成完成：${quotes.length} 条报价，${products.length} 个商品，${stores.length} 家门店`);
