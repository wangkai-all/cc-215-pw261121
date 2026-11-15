// 数据导入与校验：把 CSV/JSON 文件组装成数据集，并做一致性检查
import { parseCsv } from './csv.js';
import { unitsPerBase, makeStoreResolver } from './engine.js';

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null; // 非数字按缺失处理（导入时给出警告）
};
const bool = (v) => ['true', '1', '是', 'TRUE', 'True'].includes(String(v).trim());
const str = (v) => (v === '' || v == null ? null : String(v).trim());

// 按表头特征识别 CSV 类型
function detectType(rows) {
  if (rows.length === 0) return null;
  const cols = new Set(Object.keys(rows[0]));
  const has = (...ks) => ks.every((k) => cols.has(k));
  if (has('productId', 'storeId', 'period', 'price')) return 'quotes';
  if (has('id', 'name', 'specQty', 'specUnit')) return 'products';
  if (has('id', 'name', 'region')) return 'stores';
  if (has('from', 'to', 'type')) return 'substitutions';
  if (has('from', 'to', 'period')) return 'storeReplacements';
  if (has('productId', 'weight')) return 'basket';
  return null;
}

const converters = {
  products: (r) => ({
    id: str(r.id), name: str(r.name), categoryId: str(r.categoryId) ?? 'uncategorized',
    specQty: num(r.specQty), specUnit: str(r.specUnit), baseUnit: str(r.baseUnit),
    onShelf: str(r.onShelf), offShelf: str(r.offShelf),
  }),
  stores: (r) => ({
    id: str(r.id), name: str(r.name), region: str(r.region) ?? '',
    openPeriod: str(r.openPeriod), closePeriod: str(r.closePeriod),
  }),
  quotes: (r) => ({
    productId: str(r.productId), storeId: str(r.storeId), period: str(r.period),
    price: num(r.price), qty: num(r.qty) ?? 0, promo: bool(r.promo), stockout: bool(r.stockout),
  }),
  basket: (r) => ({ productId: str(r.productId), weight: num(r.weight) }),
  substitutions: (r) => ({
    id: str(r.id), from: str(r.from), to: str(r.to), type: str(r.type),
    switchPeriod: str(r.switchPeriod), overlapPeriod: str(r.overlapPeriod), note: str(r.note) ?? '',
  }),
  storeReplacements: (r) => ({ from: str(r.from), to: str(r.to), period: str(r.period), note: str(r.note) ?? '' }),
};

/**
 * 导入文件列表 → { dataset, errors, warnings, detected }
 * files: [{ name, text }]
 */
export function importFiles(files) {
  const errors = [], warnings = [], detected = [];
  const parts = {};
  let jsonDataset = null;
  let jsonCount = 0;

  for (const f of files) {
    const trimmed = f.text.trim();
    if (f.name.endsWith('.json') || trimmed.startsWith('{')) {
      jsonCount += 1;
      try {
        jsonDataset = JSON.parse(trimmed);
        detected.push({ file: f.name, type: 'json 数据集', rows: 1 });
      } catch (e) {
        errors.push(`${f.name}：JSON 解析失败（${e.message}）`);
      }
      continue;
    }
    const rows = parseCsv(f.text);
    const type = detectType(rows);
    if (!type) { warnings.push(`${f.name}：无法识别的表头，已跳过`); continue; }
    if (type === 'quotes') {
      const bad = rows.filter((r) =>
        (r.price !== '' && r.price != null && !Number.isFinite(Number(r.price))) ||
        (r.qty !== '' && r.qty != null && !Number.isFinite(Number(r.qty))));
      if (bad.length > 0) {
        warnings.push(`${f.name}：${bad.length} 行的价格/销量不是数字，已按缺失处理（首个：${bad[0].productId ?? '?'}@${bad[0].storeId ?? '?'}/${bad[0].period ?? '?'}）`);
      }
    }
    parts[type] = (parts[type] ?? []).concat(rows.map(converters[type]));
    detected.push({ file: f.name, type, rows: rows.length });
  }

  const dataset = jsonDataset ?? (parts.products ? (() => {
    // 替代关系缺 id 时生成不与显式 id 冲突的 id
    const usedSubIds = new Set((parts.substitutions ?? []).map((s) => s.id).filter(Boolean));
    const substitutions = (parts.substitutions ?? []).map((s, i) => {
      if (s.id) return s;
      let n = i + 1;
      while (usedSubIds.has(`SUB${n}`)) n += 1;
      usedSubIds.add(`SUB${n}`);
      return { ...s, id: `SUB${n}` };
    });
    return {
      meta: {
        name: '导入的 CSV 数据',
        currency: '元',
        periods: [...new Set((parts.quotes ?? []).map((q) => q.period))].sort(),
        disclaimer: '用户导入数据。',
      },
      categories: [...new Set((parts.products ?? []).map((p) => p.categoryId))].map((id) => ({ id, name: id })),
      products: parts.products ?? [],
      stores: parts.stores ?? [],
      storeReplacements: parts.storeReplacements ?? [],
      substitutions,
      basket: parts.basket ?? [],
      quotes: parts.quotes ?? [],
    };
  })() : null);

  if (!dataset) {
    errors.push('未找到可组装的数据：需要 dataset.json 或至少 products.csv');
    return { dataset: null, errors, warnings, detected };
  }
  if (jsonCount > 1) warnings.push(`提供了 ${jsonCount} 个 JSON 文件，仅使用最后一个`);
  if (jsonDataset && Object.keys(parts).length > 0) warnings.push('同时提供了 JSON 数据集与 CSV 文件：JSON 优先，CSV 未使用');
  // 补全缺省字段
  dataset.storeReplacements ??= [];
  dataset.substitutions ??= [];
  dataset.categories ??= [];
  dataset.meta ??= { name: '数据集', currency: '元', periods: [] };
  if (!dataset.meta.periods?.length) {
    dataset.meta.periods = [...new Set((dataset.quotes ?? []).map((q) => q.period))].sort();
  }
  // 数值归一化（JSON 路径不做 CSV 转换，尤其需要）
  const normWarnings = normalizeDataset(dataset);

  const check = validateDataset(dataset);
  return { dataset, errors: [...errors, ...check.errors], warnings: [...warnings, ...normWarnings, ...check.warnings], detected };
}

/** 字段数值归一化：非数字价格/销量按缺失处理并警告（防止 NaN 污染指数） */
function normalizeDataset(ds) {
  const warnings = [];
  ds.quotes = (ds.quotes ?? []).map((q) => {
    const nq = { ...q, promo: !!q.promo, stockout: !!q.stockout };
    if (nq.price == null) nq.price = null;
    else {
      const n = Number(nq.price);
      if (Number.isFinite(n)) nq.price = n;
      else {
        warnings.push(`报价价格不是数字，已按缺失处理：${q.productId}@${q.storeId}/${q.period}`);
        nq.price = null;
      }
    }
    if (nq.qty == null) nq.qty = 0;
    else {
      const n = Number(nq.qty);
      if (Number.isFinite(n)) nq.qty = n;
      else {
        warnings.push(`报价销量不是数字，已按 0 处理：${q.productId}@${q.storeId}/${q.period}`);
        nq.qty = 0;
      }
    }
    return nq;
  });
  for (const p of ds.products ?? []) {
    p.specQty = p.specQty === '' || p.specQty == null ? null : Number(p.specQty);
  }
  for (const b of ds.basket ?? []) {
    b.weight = b.weight === '' || b.weight == null ? null : Number(b.weight);
  }
  return [...new Set(warnings)];
}

/** 数据集一致性校验 */
export function validateDataset(ds) {
  const errors = [], warnings = [];
  const periods = ds.meta.periods ?? [];
  const periodSet = new Set(periods);
  const duplicateIds = (ids) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (periods.length === 0) errors.push('缺少期次（meta.periods）');
  for (const p of periods) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p)) errors.push(`期次格式应为 YYYY-MM（月份 01-12）：${p}`);
  }
  const dupProducts = duplicateIds((ds.products ?? []).map((p) => p.id));
  if (dupProducts.length > 0) errors.push(`商品 id 重复：${dupProducts.join('、')}`);
  const dupStores = duplicateIds((ds.stores ?? []).map((s) => s.id));
  if (dupStores.length > 0) errors.push(`门店 id 重复：${dupStores.join('、')}`);
  const productIds = new Set((ds.products ?? []).map((p) => p.id));
  const storeIds = new Set((ds.stores ?? []).map((s) => s.id));

  for (const p of ds.products ?? []) {
    try { unitsPerBase(p); } catch (e) { errors.push(e.message); }
    if (!p.onShelf) warnings.push(`商品 ${p.id} 缺少上架期，按首个期次处理`);
  }
  for (const s of ds.stores ?? []) {
    if (!s.openPeriod) warnings.push(`门店 ${s.id} 缺少开业期，按全程开业处理`);
  }
  const qSeen = new Set();
  for (const q of ds.quotes ?? []) {
    const qk = `${q.productId}|${q.storeId}|${q.period}`;
    if (qSeen.has(qk)) errors.push(`重复报价（同一商品/门店/期次）：${qk}`);
    qSeen.add(qk);
    if (!productIds.has(q.productId)) errors.push(`报价引用了不存在的商品：${q.productId}`);
    if (!storeIds.has(q.storeId)) errors.push(`报价引用了不存在的门店：${q.storeId}`);
    if (periodSet.size > 0 && !periodSet.has(q.period)) errors.push(`报价期次不在期次范围内：${q.productId}@${q.storeId}/${q.period}`);
    if (!q.promo && !q.stockout && q.price == null) warnings.push(`${q.productId}@${q.storeId}/${q.period}：非常规报价缺价格`);
    const prod = (ds.products ?? []).find((p) => p.id === q.productId);
    if (prod && ((prod.onShelf && q.period < prod.onShelf) || (prod.offShelf && q.period > prod.offShelf))) {
      warnings.push(`报价超出商品上下架区间：${q.productId}@${q.storeId}/${q.period}`);
    }
    const store = (ds.stores ?? []).find((s) => s.id === q.storeId);
    if (store && ((store.openPeriod && q.period < store.openPeriod) || (store.closePeriod && q.period > store.closePeriod))) {
      warnings.push(`报价超出门店营业区间：${q.productId}@${q.storeId}/${q.period}`);
    }
  }
  const basketIds = (ds.basket ?? []).map((b) => b.productId);
  const dupBasket = basketIds.filter((id, i) => basketIds.indexOf(id) !== i);
  if (dupBasket.length > 0) errors.push(`篮子中存在重复条目：${[...new Set(dupBasket)].join('、')}`);
  for (const b of ds.basket ?? []) {
    if (!productIds.has(b.productId)) errors.push(`篮子引用了不存在的商品：${b.productId}`);
  }
  if ((ds.basket ?? []).length === 0) errors.push('商品篮子为空');
  const subIds = (ds.substitutions ?? []).map((s) => s.id).filter(Boolean);
  const dupSubIds = duplicateIds(subIds);
  if (dupSubIds.length > 0) errors.push(`替代关系 id 重复：${dupSubIds.join('、')}`);
  const dupFrom = duplicateIds((ds.substitutions ?? []).map((s) => s.from));
  if (dupFrom.length > 0) errors.push(`同一商品存在多条替代关系（歧义）：${dupFrom.join('、')}`);
  const SUB_TYPES = ['spec-change', 'equivalent', 'non-comparable-overlap'];
  for (const s of ds.substitutions ?? []) {
    if (!productIds.has(s.from) || !productIds.has(s.to)) errors.push(`替代关系 ${s.id} 引用了不存在的商品`);
    if (!SUB_TYPES.includes(s.type)) errors.push(`替代关系 ${s.id} 类型未知：${s.type}（应为 ${SUB_TYPES.join('/')}）`);
    if (s.type === 'non-comparable-overlap' && !s.overlapPeriod) errors.push(`替代关系 ${s.id} 缺少重叠期 overlapPeriod`);
    if (periodSet.size > 0 && s.switchPeriod && !periodSet.has(s.switchPeriod)) {
      errors.push(`替代关系 ${s.id} 的衔接期不在期次范围内：${s.switchPeriod}`);
    }
    if (periodSet.size > 0 && s.overlapPeriod && !periodSet.has(s.overlapPeriod)) {
      errors.push(`替代关系 ${s.id} 的重叠期不在期次范围内：${s.overlapPeriod}`);
    }
  }
  // 替代关系循环检测
  const subByFrom = new Map((ds.substitutions ?? []).map((s) => [s.from, s.to]));
  for (const s of ds.substitutions ?? []) {
    const seen = new Set([s.from]);
    let cur = s.from;
    while (subByFrom.has(cur)) {
      cur = subByFrom.get(cur);
      if (seen.has(cur)) { errors.push(`替代关系存在循环：${[...seen, cur].join('→')}`); break; }
      seen.add(cur);
    }
  }
  // 替代链衔接期单调性（沿篮子条目顺链检查）
  const subObjByFrom = new Map((ds.substitutions ?? []).map((s) => [s.from, s]));
  for (const b of ds.basket ?? []) {
    let cur = b.productId;
    let prevSwitch = null;
    const seen = new Set([cur]);
    while (subObjByFrom.has(cur)) {
      const s = subObjByFrom.get(cur);
      if (seen.has(s.to)) break; // 循环已单独报错
      if (prevSwitch && s.switchPeriod && s.switchPeriod <= prevSwitch) {
        errors.push(`替代链衔接期不递增：${s.id ?? s.from} 的衔接期 ${s.switchPeriod} 不晚于前一段 ${prevSwitch}`);
        break;
      }
      prevSwitch = s.switchPeriod ?? prevSwitch;
      seen.add(s.to);
      cur = s.to;
    }
  }
  for (const r of ds.storeReplacements ?? []) {
    if (!storeIds.has(r.from) || !storeIds.has(r.to)) errors.push(`门店更替引用了不存在的门店：${r.from}→${r.to}`);
    if (periodSet.size > 0 && r.period && !periodSet.has(r.period)) warnings.push(`门店更替 ${r.from}→${r.to} 的更替期不在期次范围内：${r.period}`);
  }
  // 门店更替循环检测
  const repByFrom = new Map((ds.storeReplacements ?? []).map((r) => [r.from, r.to]));
  for (const r of ds.storeReplacements ?? []) {
    const seen = new Set([r.from]);
    let cur = r.from;
    while (repByFrom.has(cur)) {
      cur = repByFrom.get(cur);
      if (seen.has(cur)) { errors.push(`门店更替存在循环：${[...seen, cur].join('→')}`); break; }
      seen.add(cur);
    }
  }
  // 被更替关系遮蔽的报价（其槽位在该期实际读取其他门店）
  const { actualStoreId, slotOf } = makeStoreResolver(ds.storeReplacements ?? []);
  for (const q of ds.quotes ?? []) {
    const reader = actualStoreId(slotOf(q.storeId, q.period), q.period).storeId;
    if (reader !== q.storeId) {
      warnings.push(`报价被门店更替关系遮蔽（不会被读取）：${q.productId}@${q.storeId}/${q.period}`);
    }
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
