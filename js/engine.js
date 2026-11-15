// 零售价格指数计算引擎（纯函数，无 DOM 依赖，浏览器与 Node 通用）
// 数据与结果均为虚构/教学用途，不复刻任何官方指数。

export const RULES_VERSION = '1.0.0';

// 公开的处理规则（与 README、页面"版本与公式"页一致）
export const RULES = [
  { id: 'R1', name: '可比计量单位换算', text: '所有报价先按商品规格换算为可比计量单位价格（如 元/100ml、元/kg、元/500g），规格不同的商品按单位价格比较。' },
  { id: 'R2', name: '促销价处理', text: '促销报价不直接作为常规价格计入指数。该期常规价格按规则 R3 估算（优先相邻常规价插值），促销报价、估算方法与结果逐条披露，不允许不说明地用促销价替换常规价。' },
  { id: 'R3', name: '缺价/缺货估算', text: '缺货或缺价的门店-期次：① 取同期其他门店常规价均值；② 相邻已知常规价线性插值；③ 沿用最近常规价（同一序列最多连续 2 期）。全部估算逐条披露。' },
  { id: 'R4', name: '退市处理', text: '商品退市且无启用中的替代品时，沿用最近常规价最多 2 期；之后列为不可比项目，自该期起退出指数计算，并反映到覆盖率。' },
  { id: 'R5', name: '新品替代衔接', text: '规格变化（spec-change）与同质同规格（equivalent）：按可比单位价格直接衔接。不可直接比较（non-comparable-overlap）：按重叠期单位价格比 k=旧/新 缩放新品序列衔接；无重叠期报价则列为不可比。' },
  { id: 'R6', name: '门店更替', text: '门店关闭或替换时，由指定接替门店自更替期起承接原门店的报价序列与权重，更替逐条披露。' },
];

// 单位换算表：1 个 specUnit = 多少个 baseUnit
const UNIT_CONV = {
  'ml->100ml': 0.01, 'l->100ml': 10, '100ml->100ml': 1,
  'g->100g': 0.01, 'kg->100g': 10, '100g->100g': 1,
  'g->500g': 0.002, 'kg->500g': 2, '500g->500g': 1,
  'kg->kg': 1, 'g->kg': 0.001,
  '枚->枚': 1, '件->件': 1, '包->包': 1, '瓶->瓶': 1,
};

/** 一个售卖规格包含多少个可比计量单位 */
export function unitsPerBase(product) {
  const key = `${product.specUnit}->${product.baseUnit}`;
  const conv = UNIT_CONV[key];
  if (conv == null) throw new Error(`未知单位换算：${key}（商品 ${product.id}）`);
  const qty = Number(product.specQty);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error(`商品 ${product.id} 规格量无效：${product.specQty}`);
  return qty * conv;
}

/** 售价 → 可比计量单位价格（R1） */
export function toBaseUnitPrice(product, price) {
  return price / unitsPerBase(product);
}

const lastOf = (arr) => arr[arr.length - 1];

/** 门店更替解析器（引擎与导入校验共用）：slot（原始门店）↔ 各期实际报价门店 */
export function makeStoreResolver(replacements = []) {
  // 同一门店多次被替换时取「不晚于当期、期次最新」的一条
  const latestRep = (list) => list.sort((a, b) => (a.period < b.period ? 1 : -1))[0];
  function actualStoreId(slotId, period) {
    let cur = slotId;
    const hops = [];
    const seen = new Set([cur]);
    for (;;) {
      const rep = latestRep(replacements.filter((r) => r.from === cur && period >= r.period));
      if (!rep) break;
      if (seen.has(rep.to)) break; // 更替成环（导入校验会报错），停止防死循环
      seen.add(rep.to);
      cur = rep.to;
      hops.push(rep);
    }
    return { storeId: cur, hops };
  }
  // 某条报价（storeId@period）归属的槽位：仅当更替已生效才映射到原门店
  function slotOf(storeId, period) {
    let cur = storeId;
    const seen = new Set([cur]);
    for (;;) {
      const rep = latestRep(replacements.filter((r) => r.to === cur && period >= r.period));
      if (!rep) break;
      if (seen.has(rep.from)) break; // 更替成环，停止防死循环
      seen.add(rep.from);
      cur = rep.from;
    }
    return cur;
  }
  return { actualStoreId, slotOf };
}

/**
 * 主入口：计算指数
 * @param {object} dataset 数据集（products/stores/quotes/basket/substitutions/storeReplacements/meta）
 * @param {object} config { basePeriod, weightScheme: 'laspeyres'|'paasche'|'fisher'|'custom',
 *                          customWeights: {itemKey: number}, activeSubstitutions: [id] }
 */
export function computeIndex(dataset, config) {
  const periods = [...dataset.meta.periods].sort();
  const basePeriod = config.basePeriod ?? periods[0];
  if (!periods.includes(basePeriod)) throw new Error(`基期 ${basePeriod} 不在数据期次范围内`);
  const disclosures = [];
  const addDisclosure = (rule, itemKey, period, message) =>
    disclosures.push({ rule, itemKey, period, message });

  const products = new Map(dataset.products.map((p) => [p.id, p]));
  const stores = new Map(dataset.stores.map((s) => [s.id, s]));
  const quoteMap = new Map();
  for (const q of dataset.quotes) quoteMap.set(`${q.productId}|${q.storeId}|${q.period}`, q);

  // ---- R6 门店更替：slot（原始门店）↔ 各期实际报价门店 ----
  const { actualStoreId, slotOf } = makeStoreResolver(dataset.storeReplacements ?? []);
  const storeOpenAt = (storeId, period) => {
    const s = stores.get(storeId);
    if (!s) return false;
    // 缺省上架/关店期视为全程开业（导入校验会对缺失给出警告）
    return (!s.openPeriod || period >= s.openPeriod) && (!s.closePeriod || period <= s.closePeriod);
  };

  // ---- 单产品 × 门店槽位 的有效常规价序列（R1/R2/R3） ----
  // 返回 Map: `${slotId}|${period}` -> cell
  function buildProductCells(product) {
    // 找出该商品出现过的所有门店槽位（按报价归属）
    const slotIds = new Set();
    for (const q of dataset.quotes) if (q.productId === product.id) slotIds.add(slotOf(q.storeId, q.period));
    const cells = new Map();
    const upb = unitsPerBase(product);
    const onShelfEnd = product.offShelf ?? lastOf(periods);

    // 第一遍：所有槽位收集已知常规价（促销/缺货不计）
    const knownBySlot = new Map(); // slotId -> Map(period -> 单位价)
    for (const slotId of slotIds) {
      const known = new Map();
      for (const period of periods) {
        if (period < product.onShelf || period > onShelfEnd) continue;
        const { storeId } = actualStoreId(slotId, period);
        if (!storeOpenAt(storeId, period)) continue;
        if (slotOf(storeId, period) !== slotId) continue; // 报价归属于其他槽位
        const q = quoteMap.get(`${product.id}|${storeId}|${period}`);
        if (!q) continue;
        if (q.stockout) {
          addDisclosure('R3', product.id, period, `${stores.get(storeId)?.name ?? storeId} 缺货，按缺价处理`);
          continue;
        }
        if (q.promo) {
          addDisclosure('R2', product.id, period,
            `${stores.get(storeId)?.name ?? storeId} 促销价 ${q.price} 元未计入指数，常规价按 R3 估算`);
          continue;
        }
        if (q.price == null) continue;
        known.set(period, q.price / upb);
      }
      knownBySlot.set(slotId, known);
    }

    // 第二遍：逐期生成有效常规价（缺失则按 R3 估算）
    for (const slotId of slotIds) {
      const known = knownBySlot.get(slotId);
      let carryStreak = 0; // 连续「沿用」次数（任何已知价或其他估算都会清零）
      let lastPrice = null; // 最近有效价（已知或估算），「沿用」取其值
      let lastKnown = null; // 最近已知常规价 {period, price}，插值锚点
      for (const period of periods) {
        if (period < product.onShelf || period > onShelfEnd) continue;
        const { storeId, hops } = actualStoreId(slotId, period);
        if (!storeOpenAt(storeId, period)) continue;
        if (slotOf(storeId, period) !== slotId) continue; // 报价归属于其他槽位
        const q = quoteMap.get(`${product.id}|${storeId}|${period}`);
        const flags = [];
        if (hops.length > 0) {
          flags.push('门店更替');
          addDisclosure('R6', product.id, period,
            `${stores.get(slotId)?.name ?? slotId} 的报价由 ${stores.get(storeId)?.name ?? storeId} 承接`);
        }
        let price = known.get(period);
        let estimated = false;
        let method = null;
        if (price != null) {
          carryStreak = 0;
          lastPrice = price;
          lastKnown = { period, price };
        } else {
          // R3 估算：① 同期跨店均值 ② 线性插值 ③ 沿用最近有效价（连续 ≤2 期）
          const peers = [...slotIds]
            .filter((s) => s !== slotId)
            .map((s) => knownBySlot.get(s)?.get(period))
            .filter((v) => v != null);
          if (peers.length > 0) {
            price = peers.reduce((a, b) => a + b, 0) / peers.length;
            estimated = true; method = '跨店均值';
          } else {
            const afterPeriod = periods.find((p) => p > period && known.has(p));
            if (lastKnown && afterPeriod) {
              const p0 = lastKnown.price, p1 = known.get(afterPeriod);
              const i0 = periods.indexOf(lastKnown.period), i1 = periods.indexOf(afterPeriod), i = periods.indexOf(period);
              price = p0 + ((p1 - p0) * (i - i0)) / (i1 - i0);
              estimated = true; method = '插值';
            } else if (lastPrice != null && carryStreak < 2) {
              price = lastPrice;
              estimated = true; method = '沿用';
            }
          }
          if (price != null) {
            if (method === '沿用') carryStreak += 1;
            else carryStreak = 0;
            lastPrice = price;
            flags.push(`估算·${method}`);
            addDisclosure('R3', product.id, period,
              `${stores.get(slotId)?.name ?? slotId} 常规价缺失，按${method}估算为 ${price.toFixed(3)} 元/${product.baseUnit}`);
          }
        }
        cells.set(`${slotId}|${period}`, {
          slotId, storeId, period,
          price: price ?? null,
          estimated, method, flags,
          qty: q?.qty ?? 0,
          rawPrice: q?.price ?? null,
          rawPromo: q?.promo ?? false,
          rawStockout: q?.stockout ?? false,
        });
      }
    }
    return { cells, slotIds: [...slotIds], upb };
  }

  // ---- 产品级期价：跨门店槽位按基期销量加权 ----
  const productCache = new Map();
  function productSeries(productId) {
    if (productCache.has(productId)) return productCache.get(productId);
    const product = products.get(productId);
    const { cells, slotIds, upb } = buildProductCells(product);
    // 槽位权重：基期销量（可比单位），基期缺失取首个已知
    const slotWeight = new Map();
    for (const slotId of slotIds) {
      let w = cells.get(`${slotId}|${basePeriod}`)?.qty;
      if (!w) {
        const first = periods.map((p) => cells.get(`${slotId}|${p}`)).find((c) => c && c.qty > 0);
        w = first?.qty ?? 1;
      }
      slotWeight.set(slotId, w * upb);
    }
    const series = new Map(); // period -> {price, qtyBase, estimated, flags, cells}
    for (const period of periods) {
      const slotCells = slotIds.map((s) => cells.get(`${s}|${period}`)).filter(Boolean);
      if (slotCells.length === 0) continue;
      let wSum = 0, pSum = 0, qSum = 0;
      const flags = new Set();
      let estimated = false;
      for (const c of slotCells) {
        if (c.price != null) {
          const w = slotWeight.get(c.slotId);
          wSum += w; pSum += w * c.price;
        }
        qSum += c.qty * upb;
        c.flags.forEach((f) => flags.add(f));
        if (c.estimated) estimated = true;
      }
      series.set(period, {
        price: wSum > 0 ? pSum / wSum : null,
        qtyBase: qSum,
        estimated,
        flags: [...flags],
        cells: slotCells,
      });
    }
    const out = { product, series, upb, slotIds, cells };
    productCache.set(productId, out);
    return out;
  }

  // ---- 篮子条目：按替代关系拼接（R4/R5） ----
  const activeSubs = new Map(
    (dataset.substitutions ?? [])
      .filter((s) => (config.activeSubstitutions ?? dataset.substitutions.map((x) => x.id)).includes(s.id))
      .map((s) => [s.from, s])
  );

  const items = [];
  const nonComparable = [];
  const seenBasket = new Set();

  for (const entry of dataset.basket) {
    const startId = entry.productId;
    if (!products.has(startId)) throw new Error(`篮子引用了不存在的商品：${startId}`);
    if (seenBasket.has(startId)) {
      addDisclosure('DATA', startId, null, '篮子中重复的条目已忽略（保留首个）');
      continue;
    }
    seenBasket.add(startId);
    const key = startId;
    // 组装拼接段（含衔接期校验、链上单调性与循环保护）
    const segments = [];
    let cur = startId;
    let prevSwitchIdx = 0;
    const seenProducts = new Set([cur]);
    for (;;) {
      const prod = products.get(cur);
      if (!prod) throw new Error(`替代关系引用了不存在的商品：${cur}`);
      const sub = activeSubs.get(cur);
      const switchIdx = sub ? periods.indexOf(sub.switchPeriod) : -1;
      const monotonicOk = switchIdx > prevSwitchIdx;
      if (sub && (switchIdx < 1 || !monotonicOk)) {
        addDisclosure('R5', key, null,
          `替代关系 ${sub.id} 的衔接期 ${sub.switchPeriod ?? '（缺失）'} ${switchIdx < 1 ? '无效' : '不满足链上递增'}，已忽略该替代`);
      }
      const useSub = sub != null && switchIdx >= 1 && monotonicOk;
      const segEnd = useSub ? periods[switchIdx - 1] : (prod.offShelf ?? lastOf(periods));
      segments.push({ productId: cur, sub: useSub ? sub : null, end: segEnd });
      if (!useSub) break;
      prevSwitchIdx = switchIdx;
      if (seenProducts.has(sub.to)) {
        addDisclosure('R5', key, null, `替代关系在 ${sub.to} 处形成循环，后续衔接已忽略`);
        const last = segments.at(-1);
        last.sub = null;
        last.end = products.get(cur).offShelf ?? lastOf(periods);
        break;
      }
      seenProducts.add(sub.to);
      cur = sub.to;
    }
    const label = segments.map((s) => products.get(s.productId)?.name ?? s.productId).join(' → ');

    // 预计算各段衔接系数与标记（R5）
    let comparable = true;
    let ncReason = null;
    let ncSince = null;
    let overlapK = null;
    const segScale = segments.map(() => 1);
    const segTag = segments.map(() => null);
    for (let si = 0; si < segments.length - 1; si++) {
      const sub = segments[si].sub;
      if (sub.type === 'non-comparable-overlap') {
        const pFrom = productSeries(sub.from).series.get(sub.overlapPeriod)?.price;
        const pTo = productSeries(sub.to).series.get(sub.overlapPeriod)?.price;
        if (pFrom != null && pTo != null) {
          overlapK = pFrom / pTo;
          segScale[si + 1] = segScale[si] * overlapK;
          segTag[si + 1] = '重叠衔接';
          addDisclosure('R5', key, sub.switchPeriod,
            `不可替代换：按重叠期 ${sub.overlapPeriod} 单位价格比 k=${overlapK.toFixed(4)} 衔接（${products.get(sub.to)?.name} 序列 ×k）`);
        } else {
          comparable = false;
          ncReason = `替代品 ${products.get(sub.to)?.name} 与旧品无重叠期报价，无法衔接`;
          ncSince = sub.switchPeriod;
          addDisclosure('R5', key, sub.switchPeriod, ncReason);
          segments.length = si + 1; // 后续段不可用，序列到此为止
          break;
        }
      } else {
        segTag[si + 1] = sub.type === 'spec-change' ? '规格衔接' : '直接衔接';
        addDisclosure('R5', key, sub.switchPeriod,
          `${segTag[si + 1]}：${products.get(sub.from)?.name} → ${products.get(sub.to)?.name}（按可比单位价格）`);
      }
    }

    // 拼接单位价序列
    const series = new Map(); // period -> {price, qtyBase, estimated, flags, source}
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      const ps = productSeries(seg.productId);
      const segStart = si === 0 ? periods[0] : segments[si - 1].sub.switchPeriod;
      for (const period of periods) {
        if (period < segStart || period > seg.end) continue;
        const cell = ps.series.get(period);
        if (!cell || cell.price == null) continue;
        const flags = [...cell.flags];
        if (segTag[si]) flags.push(segTag[si]);
        series.set(period, { ...cell, price: cell.price * segScale[si], source: seg.productId, flags });
      }
    }

    // R4：无替代退市 → 沿用≤2期 → 不可比
    const lastSeg = lastOf(segments);
    if (!lastSeg.sub && products.get(lastSeg.productId).offShelf) {
      const off = products.get(lastSeg.productId).offShelf;
      // 最后一个有有效价格的期次（可能因缺价估算用尽而早于退市期）
      let lastPriced = null;
      for (const period of periods) {
        if (period > off) break;
        if (series.get(period)?.price != null) lastPriced = period;
      }
      if (lastPriced) {
        const lastCell = series.get(lastPriced);
        let carried = 0;
        for (const period of periods) {
          if (period <= off) continue;
          if (carried < 2) {
            // cells 置空：沿用期的门店明细不应显示上一期的原始报价
            series.set(period, { ...lastCell, qtyBase: 0, cells: [], estimated: true, flags: ['估算·沿用', '退市沿用'], source: lastSeg.productId });
            addDisclosure('R4', key, period, `已退市，沿用 ${lastPriced} 常规价（第 ${carried + 1}/2 期）`);
            carried += 1;
          } else {
            ncReason = ncReason ?? '退市超过 2 期且无替代品';
            ncSince = ncSince ?? period;
            addDisclosure('R4', key, period, ncReason);
            break;
          }
        }
      } else {
        ncReason = ncReason ?? '退市前无任何有效价格';
        ncSince = ncSince ?? periods[0];
        addDisclosure('R4', key, null, ncReason);
      }
    }

    // 基期价格与权重
    const baseCell = series.get(basePeriod);
    const p0 = baseCell?.price ?? null;
    let q0 = baseCell?.qtyBase ?? 0;
    if (p0 != null && q0 === 0) {
      const first = periods.map((p) => series.get(p)).find((c) => c && c.qtyBase > 0);
      q0 = first?.qtyBase ?? 0;
    }
    if (p0 == null) {
      comparable = false;
      ncReason = ncReason ?? `基期 ${basePeriod} 无有效价格`;
      ncSince = ncSince ?? basePeriod;
    }
    const w0 = p0 != null ? p0 * q0 : 0;

    items.push({
      key, label, segments, series,
      basePrice: p0, baseQty: q0, weight: w0,
      comparable, ncReason, ncSince, overlapK,
      customWeight: entry.weight ?? null,
    });
    if (!comparable || ncReason) {
      nonComparable.push({ key, label, reason: ncReason, since: ncSince, weight: w0 });
    }
  }

  // ---- 权重向量 ----
  const scheme = config.weightScheme ?? 'laspeyres';
  const weightOf = (item) =>
    scheme === 'custom'
      ? (config.customWeights?.[item.key] ?? item.weight)
      : item.weight;
  const totalWeight = items.reduce((s, i) => s + (weightOf(i) || 0), 0);

  // ---- 指数计算 ----
  const matchedAt = (period) =>
    items.filter((i) => i.basePrice != null && i.series.get(period)?.price != null);

  const fixed = { laspeyres: [], paasche: [], fisher: [] };
  const coverage = [];
  const contributions = {}; // itemKey -> [] 对拉氏固定篮子的贡献（百分点）
  const valueDecomp = [];

  for (const period of periods) {
    const M = matchedAt(period);
    const wSum = M.reduce((s, i) => s + (weightOf(i) || 0), 0);
    // 拉氏（固定篮子）
    let L = null;
    if (wSum > 0) {
      L = M.reduce((s, i) => s + (weightOf(i) / wSum) * (i.series.get(period).price / i.basePrice), 0);
    }
    // 帕氏（报告期数量）
    let Pnum = 0, Pden = 0;
    for (const i of M) {
      const qt = i.series.get(period).qtyBase;
      const pt = i.series.get(period).price;
      Pnum += pt * qt;
      Pden += i.basePrice * qt;
    }
    const P = Pden > 0 ? Pnum / Pden : null;
    fixed.laspeyres.push(L != null ? L * 100 : null);
    fixed.paasche.push(P != null ? P * 100 : null);
    fixed.fisher.push(L != null && P != null ? Math.sqrt(L * P) * 100 : null);

    // 覆盖率
    coverage.push({ period, matched: wSum, total: totalWeight, ratio: totalWeight > 0 ? wSum / totalWeight : 0 });

    // 条目贡献（相对基期的指数点）
    for (const i of items) {
      const c = M.includes(i) && wSum > 0
        ? (weightOf(i) / wSum) * (i.series.get(period).price / i.basePrice - 1) * 100
        : null;
      (contributions[i.key] ??= []).push(c);
    }

    // 价值分解：ΔV = 价格效应 + 结构效应 + 交互效应
    let dV = 0, priceEff = 0, structEff = 0, interEff = 0;
    for (const i of M) {
      const p0 = i.basePrice, q0 = i.baseQty;
      const pt = i.series.get(period).price, qt = i.series.get(period).qtyBase;
      dV += pt * qt - p0 * q0;
      priceEff += (pt - p0) * q0;
      structEff += (qt - q0) * p0;
      interEff += (pt - p0) * (qt - q0);
    }
    valueDecomp.push({ period, dV, priceEff, structEff, interEff });
  }

  // 链式指数（月环比链接，基期=100，向前后两个方向链接）
  const chained = { laspeyres: [], paasche: [], fisher: [] };
  const links = [];
  for (let t = 1; t < periods.length; t++) {
    const prev = matchedAt(periods[t - 1]).filter((i) => i.series.get(periods[t])?.price != null);
    let numL = 0, denL = 0, numP = 0, denP = 0;
    for (const i of prev) {
      const pPrev = i.series.get(periods[t - 1]).price;
      const pCur = i.series.get(periods[t]).price;
      const qPrev = i.series.get(periods[t - 1]).qtyBase;
      const qCur = i.series.get(periods[t]).qtyBase;
      numL += pCur * qPrev; denL += pPrev * qPrev;
      numP += pCur * qCur; denP += pPrev * qCur;
    }
    const lL = denL > 0 ? numL / denL : null;
    const lP = denP > 0 ? numP / denP : null;
    links.push({ period: periods[t], laspeyres: lL, paasche: lP, fisher: lL != null && lP != null ? Math.sqrt(lL * lP) : null });
  }
  const baseIdx = periods.indexOf(basePeriod);
  const chainInit = () => { const a = new Array(periods.length).fill(null); a[baseIdx] = 100; return a; };
  const cL = chainInit(), cP = chainInit(), cF = chainInit();
  for (let t = baseIdx + 1; t < periods.length; t++) {
    const lk = links[t - 1];
    if (lk.laspeyres != null && cL[t - 1] != null) cL[t] = cL[t - 1] * lk.laspeyres;
    if (lk.paasche != null && cP[t - 1] != null) cP[t] = cP[t - 1] * lk.paasche;
    if (lk.fisher != null && cF[t - 1] != null) cF[t] = cF[t - 1] * lk.fisher;
  }
  for (let t = baseIdx - 1; t >= 0; t--) {
    const lk = links[t];
    // 链接为 0 或缺失时后向链接无定义（除零），保持 null
    if (lk.laspeyres && cL[t + 1] != null) cL[t] = cL[t + 1] / lk.laspeyres;
    if (lk.paasche && cP[t + 1] != null) cP[t] = cP[t + 1] / lk.paasche;
    if (lk.fisher && cF[t + 1] != null) cF[t] = cF[t + 1] / lk.fisher;
  }
  chained.laspeyres = cL; chained.paasche = cP; chained.fisher = cF;

  return {
    config: { ...config, basePeriod, weightScheme: scheme },
    rulesVersion: RULES_VERSION,
    periods,
    items,
    nonComparable,
    indices: { fixed, chained, links },
    contributions,
    valueDecomp,
    coverage,
    disclosures,
    totalWeight,
  };
}

/** 主指数序列选择器 */
export function primarySeries(result, mode /* 'fixed'|'chained' */) {
  const scheme = result.config.weightScheme;
  const key = scheme === 'custom' ? 'laspeyres' : scheme;
  return result.indices[mode][key];
}
