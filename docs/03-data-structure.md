# OpenBD API データ構造

OpenBD APIのレスポンスは、3つの主要セクションで構成されています。

## レスポンスの全体構造

```json
{
  "summary": { ... },    // 基本情報の要約
  "onix": { ... },       // JPRO-ONIX準拠の詳細書誌情報
  "hanmoto": { ... }     // 版元ドットコム独自の追加情報
}
```

各セクションの詳細を以下に説明します。

---

## 1. `summary` - 基本情報

書籍の主要な情報をまとめたセクションです。最も頻繁に利用されるデータが含まれています。

### フィールド一覧

| フィールド名 | 型 | 説明 | 例 |
|------------|-----|------|-----|
| `isbn` | string | ISBNコード（13桁） | `"9784873117386"` |
| `title` | string | 書籍タイトル | `"リーダブルコード"` |
| `volume` | string | 巻数 | `"第1巻"`, `""` |
| `series` | string | シリーズ名 | `"理論Computer Science"` |
| `publisher` | string | 出版社名 | `"オライリー・ジャパン"` |
| `pubdate` | string | 発行日（YYYYMMDD形式） | `"20120623"` |
| `cover` | string | 書影画像URL | `"https://cover.openbd.jp/9784873117386.jpg"` |
| `author` | string | 著者名 | `"Dustin Boswell/Trevor Foucher 著、角征典 訳"` |

### 例

```json
{
  "summary": {
    "isbn": "9784873117386",
    "title": "リーダブルコード",
    "volume": "",
    "series": "",
    "publisher": "オライリー・ジャパン",
    "pubdate": "20120623",
    "cover": "https://cover.openbd.jp/9784873117386.jpg",
    "author": "Dustin Boswell/Trevor Foucher 著、角征典 訳"
  }
}
```

### 注意事項

- **`volume`、`series`**: 該当しない場合は空文字列
- **`cover`**: 画像が存在しない場合は空文字列
- **`pubdate`**: 近刊の場合は変更される可能性あり
- **`author`**: 複数著者は `/` で区切られる場合あり

---

## 2. `onix` - JPRO-ONIX準拠データ

JPRO（日本出版インフラセンター）のONIX規格に準拠した詳細な書誌情報です。

### 主要セクション

#### 2.1 `RecordReference` - 基本識別情報
```json
{
  "RecordReference": "9784873117386"
}
```

#### 2.2 `ProductIdentifier` - 製品識別子
```json
{
  "ProductIdentifier": {
    "ProductIDType": "15",  // ISBN-13
    "IDValue": "9784873117386"
  }
}
```

#### 2.3 `DescriptiveDetail` - 詳細書誌情報

```json
{
  "DescriptiveDetail": {
    "ProductComposition": "00",  // 単品
    "ProductForm": "BA",         // 書籍（紙）
    "ProductFormDetail": "B107", // A5判
    "TitleDetail": {
      "TitleType": "01",
      "TitleElement": {
        "TitleText": {
          "content": "リーダブルコード"
        }
      }
    },
    "Contributor": [
      {
        "SequenceNumber": "1",
        "ContributorRole": ["A01"],  // 著者
        "PersonName": {
          "content": "Dustin Boswell"
        }
      }
    ],
    "Language": [
      {
        "LanguageRole": "01",
        "LanguageCode": "jpn"
      }
    ],
    "Extent": [
      {
        "ExtentType": "11",  // ページ数
        "ExtentValue": "260",
        "ExtentUnit": "03"   // ページ
      }
    ],
    "Subject": [
      {
        "SubjectSchemeIdentifier": "78",  // Cコード
        "SubjectCode": "3004"              // C3004（専門、情報科学）
      }
    ]
  }
}
```

#### 2.4 `PublishingDetail` - 出版情報

```json
{
  "PublishingDetail": {
    "Imprint": {
      "ImprintName": "オライリー・ジャパン"
    },
    "Publisher": {
      "PublishingRole": "01",  // 出版社
      "PublisherName": "オライリー・ジャパン"
    },
    "PublishingDate": [
      {
        "PublishingDateRole": "01",  // 発売日
        "Date": "20120623"
      }
    ]
  }
}
```

#### 2.5 `ProductSupply` - 供給情報

```json
{
  "ProductSupply": {
    "SupplyDetail": {
      "ProductAvailability": "99",  // 在庫状況
      "Price": [
        {
          "PriceType": "03",      // 税込価格
          "PriceAmount": "2640",
          "CurrencyCode": "JPY"
        }
      ]
    }
  }
}
```

### 主要コード値

#### ProductForm（判型）
- `BA`: 書籍
- `BB`: ペーパーバック
- `BC`: 文庫

#### ContributorRole（著者役割）
- `A01`: 著者
- `B01`: 編集者
- `B06`: 翻訳者
- `A12`: イラストレーター

#### SubjectSchemeIdentifier（分類コード）
- `78`: Cコード
- `79`: NDC（日本十進分類法）

---

## 3. `hanmoto` - 版元ドットコム独自データ

版元ドットコム会員社が提供する追加情報です。非会員社の書籍では `null` または空の場合があります。

### 主要フィールド

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| `datecreated` | string | データ作成日時（YYYY-MM-DD HH:MM:SS） |
| `datemodified` | string | データ更新日時（YYYY-MM-DD HH:MM:SS） |
| `dateshuppan` | string | 出版日（YYYY-MM-DD） |
| `daterelease` | string | 発売日（YYYY-MM-DD） |
| `datekoukai` | string | 公開日（YYYY-MM-DD） |

#### 在庫・販売情報
| フィールド名 | 型 | 説明 |
|------------|-----|------|
| `zaiko` | number | 在庫状態コード |
| `maegakinado` | string | まえがき・内容紹介 |
| `hanmotokarahitokoto` | string | 版元からひとこと |

**在庫状態コード (`zaiko`)**:
- `1`: 在庫あり
- `2`: 重版未定
- `3`: 品切れ
- `4`: 絶版

#### 書評・レビュー
| フィールド名 | 型 | 説明 |
|------------|-----|------|
| `reviews` | array | 書評情報の配列 |
| `reviews[].date` | string | 書評掲載日 |
| `reviews[].reviewer` | string | 書評者 |
| `reviews[].source` | string | 掲載媒体 |
| `reviews[].post_user` | string | 投稿者 |
| `reviews[].kubun_id` | number | 区分ID |
| `reviews[].link` | string | 書評記事URL |

#### 分類・タグ
| フィールド名 | 型 | 説明 |
|------------|-----|------|
| `genrename` | string | ジャンル名 |
| `genrecode` | string | ジャンルコード |
| `ndccode` | string | NDC分類コード |
| `kankoukeitai` | string | 刊行形態 |

#### 著者情報
| フィールド名 | 型 | 説明 |
|------------|-----|------|
| `author` | array | 著者情報の配列 |
| `author[].listseq` | number | 表示順序 |
| `author[].dokujikubun` | string | 独自区分 |

#### 販売価格
| フィールド名 | 型 | 説明 |
|------------|-----|------|
| `jyuhan` | array | 重版情報の配列 |
| `hatsubai` | string | 発売元 |
| `hatsubaiyomi` | string | 発売予定 |

### 例

```json
{
  "hanmoto": {
    "datecreated": "2012-06-01 12:00:00",
    "datemodified": "2023-10-15 09:30:00",
    "dateshuppan": "2012-06-23",
    "daterelease": "2012-06-23",
    "zaiko": 1,
    "maegakinado": "コードは理解しやすくなければならない...",
    "hanmotokarahitokoto": "読みやすいコードを書くための実践的ガイド",
    "genrename": "コンピュータ・情報科学",
    "genrecode": "3004",
    "reviews": [
      {
        "date": "2012-07-01",
        "reviewer": "○○○○",
        "source": "技術評論社",
        "link": "https://example.com/review/12345"
      }
    ]
  }
}
```

### 注意事項

- **版元ドットコム会員外**: データが少ない、または `null`
- **更新頻度**: 出版社により異なる
- **必須フィールドなし**: すべてのフィールドが省略される可能性あり

---

## データが存在しない場合

ISBNが見つからない場合、配列の該当位置に `null` が返されます。

```json
[
  { "summary": {...}, "onix": {...}, "hanmoto": {...} },
  null,  // このISBNは見つからなかった
  { "summary": {...}, "onix": {...}, "hanmoto": {...} }
]
```

---

## 型定義の取得

完全な型定義は `/schema` エンドポイントから取得できます:

```
GET https://api.openbd.jp/v1/schema
```

---

## 次のステップ

- MCP ツール仕様: [04-mcp-tools.md](./04-mcp-tools.md)
- 使用例: [05-usage-examples.md](./05-usage-examples.md)
- 制限事項: [06-limitations.md](./06-limitations.md)
