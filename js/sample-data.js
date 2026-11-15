// 本文件由 scripts/gen-sample.mjs 生成，请勿手改。数据为完全虚构的教学演示数据。
export const sampleDataset = {
  "meta": {
    "name": "虚构零售样例数据（2025年1–12月）",
    "currency": "元",
    "periods": [
      "2025-01",
      "2025-02",
      "2025-03",
      "2025-04",
      "2025-05",
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12"
    ],
    "disclaimer": "本数据为教学演示用的完全虚构数据，不来自任何真实企业，也不复刻任何官方指数。",
    "stories": "覆盖场景：规格缩小（P02→P03）、跨期促销（P04）、缺货（P05/S2/2025-08）、门店更替（S3→S5）、退市无替代（P08）、重叠衔接替代（P09→P10）。"
  },
  "categories": [
    {
      "id": "dairy",
      "name": "乳制品"
    },
    {
      "id": "snack",
      "name": "零食"
    },
    {
      "id": "household",
      "name": "日化"
    },
    {
      "id": "fresh",
      "name": "生鲜"
    },
    {
      "id": "egg",
      "name": "蛋品"
    }
  ],
  "products": [
    {
      "id": "P01",
      "name": "纯牛奶 250ml×12盒",
      "categoryId": "dairy",
      "specQty": 3000,
      "specUnit": "ml",
      "baseUnit": "100ml",
      "onShelf": "2025-01",
      "offShelf": null
    },
    {
      "id": "P02",
      "name": "原味酸奶 100g×8杯",
      "categoryId": "dairy",
      "specQty": 800,
      "specUnit": "g",
      "baseUnit": "100g",
      "onShelf": "2025-01",
      "offShelf": "2025-06"
    },
    {
      "id": "P03",
      "name": "原味酸奶 90g×8杯（新规格）",
      "categoryId": "dairy",
      "specQty": 720,
      "specUnit": "g",
      "baseUnit": "100g",
      "onShelf": "2025-07",
      "offShelf": null
    },
    {
      "id": "P04",
      "name": "香脆薯片 150g",
      "categoryId": "snack",
      "specQty": 150,
      "specUnit": "g",
      "baseUnit": "100g",
      "onShelf": "2025-01",
      "offShelf": null
    },
    {
      "id": "P05",
      "name": "洗衣液 2kg",
      "categoryId": "household",
      "specQty": 2,
      "specUnit": "kg",
      "baseUnit": "kg",
      "onShelf": "2025-01",
      "offShelf": null
    },
    {
      "id": "P06",
      "name": "红富士苹果（散装）",
      "categoryId": "fresh",
      "specQty": 1,
      "specUnit": "500g",
      "baseUnit": "500g",
      "onShelf": "2025-01",
      "offShelf": null
    },
    {
      "id": "P07",
      "name": "鲜鸡蛋 30枚",
      "categoryId": "egg",
      "specQty": 30,
      "specUnit": "枚",
      "baseUnit": "枚",
      "onShelf": "2025-01",
      "offShelf": null
    },
    {
      "id": "P08",
      "name": "进口黄油饼干 200g",
      "categoryId": "snack",
      "specQty": 200,
      "specUnit": "g",
      "baseUnit": "100g",
      "onShelf": "2025-01",
      "offShelf": "2025-05"
    },
    {
      "id": "P09",
      "name": "柔顺洗发水 400ml",
      "categoryId": "household",
      "specQty": 400,
      "specUnit": "ml",
      "baseUnit": "100ml",
      "onShelf": "2025-01",
      "offShelf": "2025-09"
    },
    {
      "id": "P10",
      "name": "清爽洗发水 450ml",
      "categoryId": "household",
      "specQty": 450,
      "specUnit": "ml",
      "baseUnit": "100ml",
      "onShelf": "2025-09",
      "offShelf": null
    }
  ],
  "stores": [
    {
      "id": "S1",
      "name": "城东旗舰店",
      "region": "城东",
      "openPeriod": "2025-01",
      "closePeriod": null
    },
    {
      "id": "S2",
      "name": "城西社区店",
      "region": "城西",
      "openPeriod": "2025-01",
      "closePeriod": null
    },
    {
      "id": "S3",
      "name": "城南老店",
      "region": "城南",
      "openPeriod": "2025-01",
      "closePeriod": "2025-06"
    },
    {
      "id": "S4",
      "name": "城北仓储店",
      "region": "城北",
      "openPeriod": "2025-01",
      "closePeriod": null
    },
    {
      "id": "S5",
      "name": "城南新店",
      "region": "城南",
      "openPeriod": "2025-07",
      "closePeriod": null
    }
  ],
  "storeReplacements": [
    {
      "from": "S3",
      "to": "S5",
      "period": "2025-07",
      "note": "城南老店2025-06末闭店，城南新店自2025-07承接该门店报价与权重"
    }
  ],
  "substitutions": [
    {
      "id": "SUB1",
      "from": "P02",
      "to": "P03",
      "type": "spec-change",
      "switchPeriod": "2025-07",
      "overlapPeriod": null,
      "note": "规格缩小 100g×8→90g×8，按每100g单价直接衔接（可比单位价格已体现规格变化）"
    },
    {
      "id": "SUB2",
      "from": "P09",
      "to": "P10",
      "type": "non-comparable-overlap",
      "switchPeriod": "2025-10",
      "overlapPeriod": "2025-09",
      "note": "品牌与配方不同、不可直接比较；两产品2025-09均有报价，按重叠期单位价格比衔接"
    }
  ],
  "basket": [
    {
      "productId": "P01",
      "weight": null
    },
    {
      "productId": "P02",
      "weight": null
    },
    {
      "productId": "P04",
      "weight": null
    },
    {
      "productId": "P05",
      "weight": null
    },
    {
      "productId": "P06",
      "weight": null
    },
    {
      "productId": "P07",
      "weight": null
    },
    {
      "productId": "P08",
      "weight": null
    },
    {
      "productId": "P09",
      "weight": null
    }
  ],
  "quotes": [
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-01",
      "price": 36.1,
      "qty": 139,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-02",
      "price": 35.9,
      "qty": 142,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-03",
      "price": 36.1,
      "qty": 141,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-04",
      "price": 35.9,
      "qty": 157,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-05",
      "price": 36.2,
      "qty": 152,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-06",
      "price": 37.7,
      "qty": 150,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-07",
      "price": 37.5,
      "qty": 144,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-08",
      "price": 37.7,
      "qty": 146,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-09",
      "price": 37.7,
      "qty": 141,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-10",
      "price": 37.5,
      "qty": 158,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-11",
      "price": 37.5,
      "qty": 143,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S1",
      "period": "2025-12",
      "price": 37.5,
      "qty": 145,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-01",
      "price": 35.7,
      "qty": 127,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-02",
      "price": 35.4,
      "qty": 128,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-03",
      "price": 35.4,
      "qty": 116,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-04",
      "price": 35.3,
      "qty": 128,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-05",
      "price": 35.3,
      "qty": 122,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-06",
      "price": 37,
      "qty": 118,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-07",
      "price": 37,
      "qty": 115,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-08",
      "price": 36.9,
      "qty": 128,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-09",
      "price": 36.9,
      "qty": 127,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-10",
      "price": 37.1,
      "qty": 129,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-11",
      "price": 37.1,
      "qty": 123,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S2",
      "period": "2025-12",
      "price": 37,
      "qty": 127,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-01",
      "price": 34.9,
      "qty": 213,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-02",
      "price": 35,
      "qty": 195,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-03",
      "price": 34.8,
      "qty": 207,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-04",
      "price": 34.9,
      "qty": 214,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-05",
      "price": 34.7,
      "qty": 214,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-06",
      "price": 36.2,
      "qty": 202,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-07",
      "price": 35.9,
      "qty": 214,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-08",
      "price": 36.1,
      "qty": 214,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-09",
      "price": 36.1,
      "qty": 201,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-10",
      "price": 36.2,
      "qty": 201,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-11",
      "price": 36,
      "qty": 186,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P01",
      "storeId": "S4",
      "period": "2025-12",
      "price": 35.8,
      "qty": 199,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S1",
      "period": "2025-01",
      "price": 12,
      "qty": 99,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S1",
      "period": "2025-02",
      "price": 12,
      "qty": 106,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S1",
      "period": "2025-03",
      "price": 12,
      "qty": 97,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S1",
      "period": "2025-04",
      "price": 12.5,
      "qty": 107,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S1",
      "period": "2025-05",
      "price": 12.5,
      "qty": 100,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S1",
      "period": "2025-06",
      "price": 12.5,
      "qty": 100,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S2",
      "period": "2025-01",
      "price": 12,
      "qty": 82,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S2",
      "period": "2025-02",
      "price": 12,
      "qty": 76,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S2",
      "period": "2025-03",
      "price": 12,
      "qty": 79,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S2",
      "period": "2025-04",
      "price": 12.4,
      "qty": 82,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S2",
      "period": "2025-05",
      "price": 12.5,
      "qty": 83,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S2",
      "period": "2025-06",
      "price": 12.5,
      "qty": 75,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S4",
      "period": "2025-01",
      "price": 11.9,
      "qty": 136,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S4",
      "period": "2025-02",
      "price": 11.9,
      "qty": 125,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S4",
      "period": "2025-03",
      "price": 11.8,
      "qty": 124,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S4",
      "period": "2025-04",
      "price": 12.3,
      "qty": 130,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S4",
      "period": "2025-05",
      "price": 12.3,
      "qty": 135,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P02",
      "storeId": "S4",
      "period": "2025-06",
      "price": 12.3,
      "qty": 135,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S1",
      "period": "2025-07",
      "price": 12.5,
      "qty": 99,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S1",
      "period": "2025-08",
      "price": 12.5,
      "qty": 97,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S1",
      "period": "2025-09",
      "price": 12.5,
      "qty": 98,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S1",
      "period": "2025-10",
      "price": 12.5,
      "qty": 89,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S1",
      "period": "2025-11",
      "price": 12.5,
      "qty": 101,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S1",
      "period": "2025-12",
      "price": 12.5,
      "qty": 96,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S2",
      "period": "2025-07",
      "price": 12.5,
      "qty": 73,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S2",
      "period": "2025-08",
      "price": 12.5,
      "qty": 74,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S2",
      "period": "2025-09",
      "price": 12.5,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S2",
      "period": "2025-10",
      "price": 12.5,
      "qty": 72,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S2",
      "period": "2025-11",
      "price": 12.6,
      "qty": 73,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S2",
      "period": "2025-12",
      "price": 12.4,
      "qty": 75,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S4",
      "period": "2025-07",
      "price": 12.4,
      "qty": 130,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S4",
      "period": "2025-08",
      "price": 12.3,
      "qty": 123,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S4",
      "period": "2025-09",
      "price": 12.4,
      "qty": 121,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S4",
      "period": "2025-10",
      "price": 12.3,
      "qty": 117,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S4",
      "period": "2025-11",
      "price": 12.2,
      "qty": 130,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P03",
      "storeId": "S4",
      "period": "2025-12",
      "price": 12.3,
      "qty": 117,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-01",
      "price": 9.9,
      "qty": 191,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-02",
      "price": 9.9,
      "qty": 214,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-03",
      "price": 7.9,
      "qty": 486,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-04",
      "price": 7.9,
      "qty": 513,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-05",
      "price": 9.9,
      "qty": 194,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-06",
      "price": 9.9,
      "qty": 193,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-07",
      "price": 9.9,
      "qty": 196,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-08",
      "price": 9.9,
      "qty": 196,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-09",
      "price": 9.9,
      "qty": 206,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-10",
      "price": 9.9,
      "qty": 196,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-11",
      "price": 8.9,
      "qty": 520,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S1",
      "period": "2025-12",
      "price": 10.5,
      "qty": 192,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-01",
      "price": 9.9,
      "qty": 180,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-02",
      "price": 9.9,
      "qty": 190,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-03",
      "price": 7.9,
      "qty": 507,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-04",
      "price": 7.9,
      "qty": 501,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-05",
      "price": 9.9,
      "qty": 172,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-06",
      "price": 9.9,
      "qty": 175,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-07",
      "price": 9.9,
      "qty": 180,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-08",
      "price": 9.9,
      "qty": 168,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-09",
      "price": 9.9,
      "qty": 169,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-10",
      "price": 9.9,
      "qty": 190,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-11",
      "price": 8.9,
      "qty": 476,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S2",
      "period": "2025-12",
      "price": 10.5,
      "qty": 178,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S3",
      "period": "2025-01",
      "price": 9.9,
      "qty": 159,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S3",
      "period": "2025-02",
      "price": 9.9,
      "qty": 158,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S3",
      "period": "2025-03",
      "price": 7.9,
      "qty": 419,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S3",
      "period": "2025-04",
      "price": 7.9,
      "qty": 483,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S3",
      "period": "2025-05",
      "price": 9.9,
      "qty": 152,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S3",
      "period": "2025-06",
      "price": 9.9,
      "qty": 167,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S5",
      "period": "2025-07",
      "price": 9.9,
      "qty": 159,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S5",
      "period": "2025-08",
      "price": 9.9,
      "qty": 159,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S5",
      "period": "2025-09",
      "price": 9.9,
      "qty": 161,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S5",
      "period": "2025-10",
      "price": 9.9,
      "qty": 157,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S5",
      "period": "2025-11",
      "price": 8.9,
      "qty": 449,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S5",
      "period": "2025-12",
      "price": 10.5,
      "qty": 159,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-01",
      "price": 9.9,
      "qty": 148,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-02",
      "price": 9.9,
      "qty": 147,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-03",
      "price": 7.9,
      "qty": 450,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-04",
      "price": 7.9,
      "qty": 406,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-05",
      "price": 9.9,
      "qty": 133,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-06",
      "price": 9.9,
      "qty": 137,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-07",
      "price": 9.9,
      "qty": 140,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-08",
      "price": 9.9,
      "qty": 147,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-09",
      "price": 9.9,
      "qty": 131,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-10",
      "price": 9.9,
      "qty": 142,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-11",
      "price": 8.9,
      "qty": 401,
      "promo": true,
      "stockout": false
    },
    {
      "productId": "P04",
      "storeId": "S4",
      "period": "2025-12",
      "price": 10.5,
      "qty": 150,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-01",
      "price": 29.9,
      "qty": 90,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-02",
      "price": 30,
      "qty": 89,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-03",
      "price": 29.9,
      "qty": 81,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-04",
      "price": 29.9,
      "qty": 85,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-05",
      "price": 30,
      "qty": 82,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-06",
      "price": 29.8,
      "qty": 83,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-07",
      "price": 30,
      "qty": 79,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-08",
      "price": 29.8,
      "qty": 91,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-09",
      "price": 32,
      "qty": 84,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-10",
      "price": 31.8,
      "qty": 85,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-11",
      "price": 32,
      "qty": 81,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S1",
      "period": "2025-12",
      "price": 31.9,
      "qty": 80,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-01",
      "price": 29.9,
      "qty": 67,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-02",
      "price": 29.8,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-03",
      "price": 29.8,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-04",
      "price": 30,
      "qty": 68,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-05",
      "price": 29.8,
      "qty": 68,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-06",
      "price": 29.9,
      "qty": 69,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-07",
      "price": 29.8,
      "qty": 73,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-08",
      "price": null,
      "qty": 0,
      "promo": false,
      "stockout": true
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-09",
      "price": 31.9,
      "qty": 67,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-10",
      "price": 31.8,
      "qty": 67,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-11",
      "price": 32,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S2",
      "period": "2025-12",
      "price": 31.9,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-01",
      "price": 29.5,
      "qty": 110,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-02",
      "price": 29.4,
      "qty": 102,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-03",
      "price": 29.5,
      "qty": 102,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-04",
      "price": 29.6,
      "qty": 118,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-05",
      "price": 29.6,
      "qty": 115,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-06",
      "price": 29.5,
      "qty": 106,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-07",
      "price": 29.4,
      "qty": 108,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-08",
      "price": 29.6,
      "qty": 102,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-09",
      "price": 31.6,
      "qty": 113,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-10",
      "price": 31.5,
      "qty": 116,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-11",
      "price": 31.5,
      "qty": 109,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P05",
      "storeId": "S4",
      "period": "2025-12",
      "price": 31.4,
      "qty": 105,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-01",
      "price": 6.5,
      "qty": 224,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-02",
      "price": 6.8,
      "qty": 202,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-03",
      "price": 7.2,
      "qty": 190,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-04",
      "price": 7.5,
      "qty": 172,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-05",
      "price": 7.9,
      "qty": 169,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-06",
      "price": 8.5,
      "qty": 134,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-07",
      "price": 9,
      "qty": 132,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-08",
      "price": 8.8,
      "qty": 148,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-09",
      "price": 7.5,
      "qty": 177,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-10",
      "price": 6.9,
      "qty": 218,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-11",
      "price": 6.5,
      "qty": 244,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S1",
      "period": "2025-12",
      "price": 6.8,
      "qty": 214,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S3",
      "period": "2025-01",
      "price": 6.3,
      "qty": 130,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S3",
      "period": "2025-02",
      "price": 6.6,
      "qty": 119,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S3",
      "period": "2025-03",
      "price": 7,
      "qty": 110,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S3",
      "period": "2025-04",
      "price": 7.3,
      "qty": 100,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S3",
      "period": "2025-05",
      "price": 7.7,
      "qty": 101,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S3",
      "period": "2025-06",
      "price": 8.3,
      "qty": 82,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S5",
      "period": "2025-07",
      "price": 9.2,
      "qty": 96,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S5",
      "period": "2025-08",
      "price": 9,
      "qty": 101,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S5",
      "period": "2025-09",
      "price": 7.7,
      "qty": 134,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S5",
      "period": "2025-10",
      "price": 7.1,
      "qty": 150,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S5",
      "period": "2025-11",
      "price": 6.7,
      "qty": 165,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P06",
      "storeId": "S5",
      "period": "2025-12",
      "price": 7,
      "qty": 149,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-01",
      "price": 21.8,
      "qty": 117,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-02",
      "price": 21.9,
      "qty": 116,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-03",
      "price": 21.9,
      "qty": 125,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-04",
      "price": 21,
      "qty": 125,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-05",
      "price": 20.9,
      "qty": 128,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-06",
      "price": 20.9,
      "qty": 118,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-07",
      "price": 20,
      "qty": 124,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-08",
      "price": 20,
      "qty": 128,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-09",
      "price": 21.5,
      "qty": 112,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-10",
      "price": 21.4,
      "qty": 117,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-11",
      "price": 22.9,
      "qty": 124,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S1",
      "period": "2025-12",
      "price": 23,
      "qty": 122,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-01",
      "price": 21.6,
      "qty": 93,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-02",
      "price": 21.5,
      "qty": 94,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-03",
      "price": 21.5,
      "qty": 88,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-04",
      "price": 20.7,
      "qty": 83,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-05",
      "price": 20.6,
      "qty": 86,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-06",
      "price": 20.7,
      "qty": 86,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-07",
      "price": 19.6,
      "qty": 89,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-08",
      "price": 19.6,
      "qty": 95,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-09",
      "price": 21.2,
      "qty": 90,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-10",
      "price": 21.2,
      "qty": 91,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-11",
      "price": 22.7,
      "qty": 86,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S2",
      "period": "2025-12",
      "price": 22.6,
      "qty": 85,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S3",
      "period": "2025-01",
      "price": 21.8,
      "qty": 71,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S3",
      "period": "2025-02",
      "price": 21.9,
      "qty": 67,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S3",
      "period": "2025-03",
      "price": 22,
      "qty": 73,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S3",
      "period": "2025-04",
      "price": 20.9,
      "qty": 72,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S3",
      "period": "2025-05",
      "price": 21,
      "qty": 65,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S3",
      "period": "2025-06",
      "price": 21,
      "qty": 69,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S5",
      "period": "2025-07",
      "price": 20.1,
      "qty": 80,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S5",
      "period": "2025-08",
      "price": 20,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S5",
      "period": "2025-09",
      "price": 21.6,
      "qty": 72,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S5",
      "period": "2025-10",
      "price": 21.6,
      "qty": 77,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S5",
      "period": "2025-11",
      "price": 23.2,
      "qty": 74,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P07",
      "storeId": "S5",
      "period": "2025-12",
      "price": 23,
      "qty": 73,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S1",
      "period": "2025-01",
      "price": 15.7,
      "qty": 74,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S1",
      "period": "2025-02",
      "price": 15.8,
      "qty": 72,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S1",
      "period": "2025-03",
      "price": 15.8,
      "qty": 70,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S1",
      "period": "2025-04",
      "price": 15.8,
      "qty": 71,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S1",
      "period": "2025-05",
      "price": 15.9,
      "qty": 68,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S4",
      "period": "2025-01",
      "price": 15.5,
      "qty": 86,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S4",
      "period": "2025-02",
      "price": 15.4,
      "qty": 85,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S4",
      "period": "2025-03",
      "price": 15.5,
      "qty": 90,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S4",
      "period": "2025-04",
      "price": 15.4,
      "qty": 88,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P08",
      "storeId": "S4",
      "period": "2025-05",
      "price": 15.5,
      "qty": 92,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-01",
      "price": 39.8,
      "qty": 62,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-02",
      "price": 39.8,
      "qty": 62,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-03",
      "price": 40.1,
      "qty": 61,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-04",
      "price": 40.1,
      "qty": 61,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-05",
      "price": 40.1,
      "qty": 58,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-06",
      "price": 39.9,
      "qty": 61,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-07",
      "price": 40,
      "qty": 61,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-08",
      "price": 40.8,
      "qty": 59,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S1",
      "period": "2025-09",
      "price": 41.1,
      "qty": 59,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-01",
      "price": 40,
      "qty": 45,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-02",
      "price": 40.1,
      "qty": 44,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-03",
      "price": 40.1,
      "qty": 43,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-04",
      "price": 39.8,
      "qty": 44,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-05",
      "price": 40.1,
      "qty": 46,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-06",
      "price": 39.8,
      "qty": 42,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-07",
      "price": 39.8,
      "qty": 43,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-08",
      "price": 40.8,
      "qty": 46,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S2",
      "period": "2025-09",
      "price": 41,
      "qty": 47,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-01",
      "price": 39.6,
      "qty": 78,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-02",
      "price": 39.4,
      "qty": 76,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-03",
      "price": 39.5,
      "qty": 75,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-04",
      "price": 39.7,
      "qty": 82,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-05",
      "price": 39.4,
      "qty": 83,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-06",
      "price": 39.4,
      "qty": 75,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-07",
      "price": 39.4,
      "qty": 80,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-08",
      "price": 40.3,
      "qty": 81,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P09",
      "storeId": "S4",
      "period": "2025-09",
      "price": 40.5,
      "qty": 82,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S1",
      "period": "2025-09",
      "price": 45.7,
      "qty": 55,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S1",
      "period": "2025-10",
      "price": 45.8,
      "qty": 56,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S1",
      "period": "2025-11",
      "price": 46,
      "qty": 59,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S1",
      "period": "2025-12",
      "price": 46,
      "qty": 58,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S2",
      "period": "2025-09",
      "price": 45.7,
      "qty": 37,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S2",
      "period": "2025-10",
      "price": 45.9,
      "qty": 42,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S2",
      "period": "2025-11",
      "price": 46.1,
      "qty": 40,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S2",
      "period": "2025-12",
      "price": 45.9,
      "qty": 38,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S4",
      "period": "2025-09",
      "price": 45.5,
      "qty": 71,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S4",
      "period": "2025-10",
      "price": 45.6,
      "qty": 77,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S4",
      "period": "2025-11",
      "price": 45.5,
      "qty": 71,
      "promo": false,
      "stockout": false
    },
    {
      "productId": "P10",
      "storeId": "S4",
      "period": "2025-12",
      "price": 45.3,
      "qty": 80,
      "promo": false,
      "stockout": false
    }
  ]
};
