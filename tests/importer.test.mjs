// 导入与校验模块测试
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../js/csv.js';
import { importFiles, validateDataset } from '../js/importer.js';
import { computeIndex } from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('CSV 解析：引号、逗号、换行', () => {
  const rows = parseCsv('a,b,c\n1,"x,y","他说""你好"""\n2,简单,"含\n换行"\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].b, 'x,y');
  assert.equal(rows[0].c, '他说"你好"');
  assert.equal(rows[1].c, '含\n换行');
});

test('样例 CSV 全套导入 → 与 JSON 数据集等价可计算', () => {
  const files = ['products.csv', 'stores.csv', 'quotes.csv', 'basket.csv', 'substitutions.csv', 'store_replacements.csv']
    .map((n) => ({ name: n, text: read(`sample-data/${n}`) }));
  const { dataset, errors, detected } = importFiles(files);
  assert.equal(errors.length, 0, errors.join('；'));
  assert.equal(detected.length, 6);
  assert.equal(dataset.products.length, 10);
  assert.equal(dataset.quotes.length, 265);
  assert.equal(dataset.meta.periods.length, 12);
  // 可正常计算且关键结论与 JSON 版一致
  const r = computeIndex(dataset, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: ['SUB1', 'SUB2'] });
  const rJson = computeIndex(JSON.parse(read('sample-data/dataset.json')), { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: ['SUB1', 'SUB2'] });
  assert.ok(Math.abs(r.indices.fixed.laspeyres.at(-1) - rJson.indices.fixed.laspeyres.at(-1)) < 1e-9);
});

test('JSON 数据集导入', () => {
  const { dataset, errors } = importFiles([{ name: 'dataset.json', text: read('sample-data/dataset.json') }]);
  assert.equal(errors.length, 0);
  assert.equal(dataset.products.length, 10);
});

test('坏数据：引用不存在的商品被检出', () => {
  const files = [
    { name: 'products.csv', text: 'id,name,categoryId,specQty,specUnit,baseUnit,onShelf,offShelf\nP1,甲,c,1,kg,kg,2025-01,\n' },
    { name: 'stores.csv', text: 'id,name,region,openPeriod,closePeriod\nS1,店,区,2025-01,\n' },
    { name: 'quotes.csv', text: 'productId,storeId,period,price,qty,promo,stockout\nP9,S1,2025-01,10,5,false,false\n' },
    { name: 'basket.csv', text: 'productId,weight\nP1,\n' },
  ];
  const { errors } = importFiles(files);
  assert.ok(errors.some((e) => e.includes('P9')));
});

test('校验：替代关系类型与重叠期检查', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.substitutions[0].type = 'wrong-type';
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('类型未知')));
});

test('校验：未知单位换算被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.products[0].specUnit = '打';
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('未知单位换算')));
});

test('CSV 解析：UTF-8 BOM 被剥离', () => {
  const rows = parseCsv('﻿id,name\nP1,甲\n');
  assert.equal(rows[0].id, 'P1');
});

test('导入：缺 id 的替代关系获得生成 id', () => {
  const files = [
    { name: 'products.csv', text: read('sample-data/products.csv') },
    { name: 'stores.csv', text: read('sample-data/stores.csv') },
    { name: 'quotes.csv', text: read('sample-data/quotes.csv') },
    { name: 'basket.csv', text: read('sample-data/basket.csv') },
    { name: 'substitutions.csv', text: 'from,to,type,switchPeriod,overlapPeriod,note\nP02,P03,spec-change,2025-07,,无id\n' },
  ];
  const { dataset, errors } = importFiles(files);
  assert.equal(errors.length, 0, errors.join('；'));
  assert.equal(dataset.substitutions[0].id, 'SUB1');
});

test('校验：报价期次越界（2025-13）被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.quotes.push({ productId: 'P01', storeId: 'S1', period: '2025-13', price: 36, qty: 100, promo: false, stockout: false });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('不在期次范围内')));
});

test('校验：非法月份格式被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.meta.periods = [...ds.meta.periods, '2025-13'];
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('YYYY-MM')));
});

test('校验：替代关系循环被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.substitutions.push({ id: 'SUBX', from: 'P03', to: 'P02', type: 'equivalent', switchPeriod: '2025-10', overlapPeriod: null, note: '' });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('循环')));
});

test('校验：门店更替循环被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.storeReplacements.push({ from: 'S5', to: 'S3', period: '2025-08', note: '' });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('循环')));
});

test('校验：衔接期不在期次范围内被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.substitutions[0].switchPeriod = '2026-01';
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('衔接期')));
});

test('校验：规格量缺失被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.products[0].specQty = null;
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('规格量无效')));
});

test('导入：非数字价格按缺失处理并警告，不污染指数', () => {
  const files = [
    { name: 'products.csv', text: 'id,name,categoryId,specQty,specUnit,baseUnit,onShelf,offShelf\nP1,甲,c,1,kg,kg,2025-01,\n' },
    { name: 'stores.csv', text: 'id,name,region,openPeriod,closePeriod\nS1,店,区,2025-01,\n' },
    { name: 'quotes.csv', text: 'productId,storeId,period,price,qty,promo,stockout\nP1,S1,2025-01,abc,5,false,false\nP1,S1,2025-02,11,5,false,false\n' },
    { name: 'basket.csv', text: 'productId,weight\nP1,\n' },
  ];
  const { dataset, errors, warnings } = importFiles(files);
  assert.equal(errors.length, 0, errors.join('；'));
  assert.ok(warnings.some((w) => w.includes('不是数字')));
  assert.equal(dataset.quotes[0].price, null);
});

test('校验：重复报价被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.quotes.push({ ...ds.quotes[0] });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('重复报价')));
});

test('校验：篮子重复条目被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.basket.push({ ...ds.basket[0] });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('重复条目')));
});

test('校验：替代关系 id 重复被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.substitutions.push({ ...ds.substitutions[0] });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('id 重复')));
});

test('导入：生成的替代关系 id 避开显式 id', () => {
  const files = [
    { name: 'products.csv', text: read('sample-data/products.csv') },
    { name: 'stores.csv', text: read('sample-data/stores.csv') },
    { name: 'quotes.csv', text: read('sample-data/quotes.csv') },
    { name: 'basket.csv', text: read('sample-data/basket.csv') },
    { name: 'substitutions.csv', text: 'id,from,to,type,switchPeriod,overlapPeriod,note\nSUB1,P02,P03,spec-change,2025-07,,显式\n,P09,P10,non-comparable-overlap,2025-10,2025-09,无id\n' },
  ];
  const { dataset, errors } = importFiles(files);
  assert.equal(errors.length, 0, errors.join('；'));
  const ids = dataset.substitutions.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'id 不应重复');
  assert.ok(ids.includes('SUB1'));
});

// ---------- 健壮性第三轮 ----------
test('JSON 路径：非数字价格归一化为缺失并警告，不污染指数', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.quotes[0].price = 'abc';
  const { dataset, warnings } = importFiles([{ name: 'd.json', text: JSON.stringify(ds) }]);
  assert.ok(warnings.some((w) => w.includes('不是数字')));
  assert.equal(dataset.quotes[0].price, null);
  const r = computeIndex(dataset, { basePeriod: '2025-01', weightScheme: 'laspeyres', activeSubstitutions: ['SUB1', 'SUB2'] });
  assert.ok(r.indices.fixed.laspeyres.every((v) => v == null || Number.isFinite(v)));
});

test('校验：商品/门店 id 重复被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.products.push({ ...ds.products[0] });
  ds.stores.push({ ...ds.stores[0] });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('商品 id 重复')));
  assert.ok(errors.some((e) => e.includes('门店 id 重复')));
});

test('校验：同一商品多条替代关系被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  ds.substitutions.push({ id: 'SUBX', from: 'P02', to: 'P05', type: 'equivalent', switchPeriod: '2025-09', overlapPeriod: null, note: '' });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('多条替代关系')));
});

test('校验：替代链衔接期不递增被检出', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  // P03 已有衔接期 2025-07 的入链（P02→P03），再加一条更早的出链
  ds.substitutions.push({ id: 'SUBX', from: 'P03', to: 'P05', type: 'equivalent', switchPeriod: '2025-06', overlapPeriod: null, note: '' });
  const { errors } = validateDataset(ds);
  assert.ok(errors.some((e) => e.includes('不递增')));
});

test('校验：被门店更替遮蔽的报价给出警告', () => {
  const ds = JSON.parse(read('sample-data/dataset.json'));
  // S3 在 2025-07 起被 S5 接替；补一条 S3 在 2025-08 的报价（应被遮蔽）
  ds.quotes.push({ productId: 'P01', storeId: 'S3', period: '2025-08', price: 36, qty: 100, promo: false, stockout: false });
  const { warnings } = validateDataset(ds);
  assert.ok(warnings.some((w) => w.includes('遮蔽') && w.includes('P01@S3/2025-08')));
});

test('导入：JSON 与 CSV 混用给出警告', () => {
  const files = [
    { name: 'dataset.json', text: read('sample-data/dataset.json') },
    { name: 'products.csv', text: read('sample-data/products.csv') },
  ];
  const { dataset, warnings } = importFiles(files);
  assert.ok(dataset);
  assert.ok(warnings.some((w) => w.includes('JSON 优先')));
});
