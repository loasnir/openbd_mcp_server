# OpenBD API v1 エンドポイント

## ベースURL

```
https://api.openbd.jp/v1
```

すべてのエンドポイントはこのベースURLに対して呼び出します。

## エンドポイント一覧

### 1. `/get` - 書籍情報取得

ISBNコードを指定して書籍の詳細情報を取得します。

#### HTTPメソッド
- `GET`
- `POST`

#### パラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `isbn` | string | ✓ | ISBNコード。複数指定する場合はカンマ区切り。GETは最大1,000件、POSTは最大10,000件 |

#### GETとPOSTの使い分け

| メソッド | 最大ISBN数 | 用途 | 推奨 |
|---------|-----------|------|------|
| GET | 1,000件 | 少量〜中量の取得 | ✓ 通常はこちらを使用 |
| POST | 10,000件 | 大量取得 | 1,000件超の場合のみ |

**推奨事項**:
- 実運用では1,000件以下を推奨（パフォーマンス、タイムアウト考慮）
- 大量取得が必要な場合は分割処理を検討

#### リクエスト例

**単一ISBN（GET）**:
```
GET https://api.openbd.jp/v1/get?isbn=9784873117386
```

**複数ISBN（GET）**:
```
GET https://api.openbd.jp/v1/get?isbn=9784873117386,9784873119038,9784873119373
```

**POST リクエスト（1,000件超の場合）**:
```http
POST https://api.openbd.jp/v1/get
Content-Type: application/x-www-form-urlencoded

isbn=9784873117386,9784873119038,...(最大10,000件)
```

**curlの例**:
```bash
# GET (1,000件以下)
curl "https://api.openbd.jp/v1/get?isbn=9784873117386,9784873119038"

# POST (1,000件超)
curl -X POST https://api.openbd.jp/v1/get \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "isbn=9784873117386,9784873119038,..."
```

#### レスポンス形式

配列形式で返却されます。各要素は以下のいずれか:
- 書籍情報オブジェクト（ISBN が見つかった場合）
- `null`（ISBN が見つからなかった場合）

**成功時（200 OK）**:
```json
[
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
    },
    "onix": { ... },
    "hanmoto": { ... }
  },
  null,
  {
    "summary": { ... },
    "onix": { ... },
    "hanmoto": { ... }
  }
]
```

**配列の順序**:
リクエストで指定したISBNの順序と、レスポンス配列の順序は一致します。

#### 特徴
- **高速**: 1件あたり1ミリ秒以下のレスポンス
- **一括取得**: GET最大1,000件、POST最大10,000件
- **データ完全性**: 見つからないISBNは `null` として返却

#### エラーハンドリングの重要な仕様

⚠️ **OpenBD APIの特殊な挙動**: このAPIは**エラー時でも HTTP 200 を返します**

**実際のレスポンス例**:

**ISBNが見つからない場合**:
```http
HTTP/2 200
Content-Type: application/json; charset=UTF-8

[null]
```

**無効なISBN・パラメータなしの場合**:
```http
HTTP/2 200
Content-Type: application/json; charset=UTF-8

[null]
```

**複数ISBNで一部が見つからない場合**:
```json
[
  { "summary": {...}, "onix": {...}, "hanmoto": {...} },  // 見つかった
  null,                                                    // 見つからない
  { "summary": {...}, "onix": {...}, "hanmoto": {...} }   // 見つかった
]
```

**エラー判定方法**:
```javascript
// HTTPステータスコードではなく、レスポンスボディで判定
if (response.status === 200) {
  const data = response.data;

  // 単一ISBN
  if (data[0] === null) {
    console.log('ISBNが見つかりませんでした');
  } else {
    console.log('書籍情報:', data[0]);
  }

  // 複数ISBN
  data.forEach((book, index) => {
    if (book === null) {
      console.log(`${index + 1}番目のISBNが見つかりませんでした`);
    } else {
      console.log(`${index + 1}番目の書籍:`, book.summary.title);
    }
  });
}
```

**サーバーエラー（稀）**:
真のサーバーエラー時のみ、4xx/5xxステータスが返される可能性があります。

---

### 2. `/coverage` - カバレッジ情報取得

OpenBDに収録されている全ISBNのリストを取得します。

#### HTTPメソッド
- `GET`

#### パラメータ
なし

#### リクエスト例

```
GET https://api.openbd.jp/v1/coverage
```

#### レスポンス形式

**成功時（200 OK）**:
```json
[
  "9784000000000",
  "9784000000017",
  "9784000000024",
  ...
  "9784999999999"
]
```

#### 特徴
- **全データ取得**: 約163万件のISBNが含まれる
- **レスポンスサイズ**: 10MB以上の大容量データ
- **更新頻度**: データベースの更新に応じて変動

#### 用途
- データベース同期
- ローカルキャッシュの構築
- データカバレッジの確認

#### 注意事項
⚠️ **大容量データ**: レスポンスサイズが非常に大きいため、適切なタイムアウト設定とメモリ管理が必要です。

---

### 3. `/schema` - スキーマ情報取得

OpenBD APIのレスポンスデータ構造（JSON Schema）を取得します。

#### HTTPメソッド
- `GET`

#### パラメータ
なし

#### リクエスト例

```
GET https://api.openbd.jp/v1/schema
```

#### レスポンス形式

**成功時（200 OK）**:
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "summary": {
      "type": "object",
      "properties": {
        "isbn": { "type": "string" },
        "title": { "type": "string" },
        ...
      }
    },
    "onix": { ... },
    "hanmoto": { ... }
  }
}
```

#### 特徴
- **JSON Schema draft-04形式**: 標準的なスキーマ定義
- **詳細なフィールド定義**: 各フィールドの型、制約、説明が含まれる
- **バリデーション対応**: レスポンスの検証に利用可能

#### 用途
- データ構造の理解
- レスポンスのバリデーション
- 型定義の自動生成（TypeScript、Go等）

---

## レート制限

現時点では公式なレート制限は設定されていませんが、適切な利用が推奨されます。

### 推奨事項
- 不要なリクエストを避ける
- キャッシュを活用する
- 一括取得機能を活用する（GET最大1,000件、POST最大10,000件）
- 実運用では1,000件以下を推奨（パフォーマンス考慮）

---

## CORS対応

OpenBD APIはCORSに対応しているため、ブラウザからの直接アクセスが可能です。

---

## HTTPステータスコード

⚠️ **重要**: `/get` エンドポイントはエラー時も HTTP 200 を返すため、レスポンスボディで判定してください。

| コード | 説明 | 備考 |
|-------|------|------|
| 200 | 成功（またはISBNが見つからない） | `/get` エンドポイントは常に200を返す |
| 404 | エンドポイントが存在しない | `/coverage`, `/schema` 等 |
| 500 | サーバー内部エラー | 稀に発生 |
| 503 | サービス一時停止中 | メンテナンス時 |

---

## 注意事項

1. **データの変更**: 書籍情報は予告なく変更される可能性があります
2. **サービス停止**: メンテナンス等で一時的に利用できない場合があります
3. **バージョン1の終了**: 将来的にバージョン2への移行が予定されています

---

## 技術仕様

- **プロトコル**: HTTPS
- **レスポンス形式**: JSON（UTF-8）
- **圧縮**: gzip対応
- **キャッシュ**: CDNによるキャッシュ対応（書影画像）

---

## 次のステップ

- データ構造の詳細: [03-data-structure.md](./03-data-structure.md)
- MCP ツール仕様: [04-mcp-tools.md](./04-mcp-tools.md)
- 使用例: [05-usage-examples.md](./05-usage-examples.md)
