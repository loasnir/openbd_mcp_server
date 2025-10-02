# OpenBD MCP Server ツール仕様

このドキュメントでは、OpenBD MCP Server が提供する各ツールの詳細仕様を定義します。

## 設計方針

### トークン効率重視
AI agentによる利用を前提とし、以下の方針でツールを設計します:

- **コンパクトなレスポンス**: すべてのAPIリクエストで `pretty` オプションを使用せず、最小限のトークン消費
- **シンプルなインターフェース**: 必要最小限のパラメータのみ提供
- **明確なエラーハンドリング**: エラー時は分かりやすいメッセージを返却

---

## ツール一覧

### 1. `get_book_info` - 単一書籍情報取得

単一のISBNコードから書籍の詳細情報を取得します。

#### パラメータ

```typescript
{
  isbn: string  // ISBNコード（10桁または13桁、ハイフンあり/なし両対応）
}
```

#### 戻り値

**成功時**: 書籍情報オブジェクト
```typescript
{
  summary: {
    isbn: string
    title: string
    volume: string
    series: string
    publisher: string
    pubdate: string
    cover: string
    author: string
  }
  onix: { ... }      // JPRO-ONIX準拠データ
  hanmoto: { ... }   // 版元ドットコム独自データ（存在しない場合は null）
}
```

**書籍が見つからない場合**: `null`

**エラー時**: エラーオブジェクト
```typescript
{
  error: string      // エラーメッセージ
  code: string       // エラーコード
}
```

#### 内部実装

**リクエスト処理**:
1. ISBN正規化
   - ハイフン除去
   - 10桁→13桁変換（978プレフィックス）
   - 入力検証
2. OpenBD API呼び出し
   - `GET https://api.openbd.jp/v1/get?isbn={normalized_isbn}`
3. レスポンス処理
   - HTTP 200 + `[null]` → 書籍が見つからない（null 返却）
   - HTTP 200 + `[{...}]` → 成功（書籍情報返却）
   - HTTP 500/503 → APIエラー

**ISBN正規化ロジック**:
```typescript
function normalizeIsbn(isbn: string): string {
  // ハイフン・スペース除去
  let cleaned = isbn.replace(/[-\s]/g, '');

  // 10桁の場合は13桁に変換
  if (cleaned.length === 10) {
    // 978プレフィックスを追加
    cleaned = '978' + cleaned.slice(0, 9);
    // チェックディジットは再計算不要（OpenBD側で対応）
  }

  // 検証: 13桁の数字（Xは旧ISBN-10のチェックディジット）
  if (!/^97[89]\d{10}$/.test(cleaned)) {
    throw new Error('INVALID_ISBN');
  }

  return cleaned;
}
```

#### エラーハンドリング

**OpenBD API の特殊な仕様**:
- APIは**エラー時でも HTTP 200 を返す**
- 書籍が見つからない場合: `[null]`

| エラーコード | 説明 | 判定方法 |
|------------|------|---------|
| `INVALID_ISBN` | ISBNの形式が不正 | 正規化処理での検証失敗 |
| `NOT_FOUND` | 書籍が見つからない | `[null]` レスポンス → null 返却 |
| `API_ERROR` | OpenBD APIエラー（稀） | HTTP 500/503 |
| `NETWORK_ERROR` | ネットワークエラー | 接続失敗、タイムアウト |

**レスポンス判定**:
```typescript
async function getBookInfo(isbn: string) {
  const normalized = normalizeIsbn(isbn);
  const response = await fetch(`https://api.openbd.jp/v1/get?isbn=${normalized}`);

  if (response.status !== 200) {
    throw new Error('API_ERROR');
  }

  const data = await response.json();

  // data[0] が null → 書籍が見つからない
  if (data[0] === null) {
    return null;
  }

  return data[0];
}
```

#### 使用例

```typescript
// MCP クライアントからの呼び出し
const result = await client.callTool('get_book_info', {
  isbn: '9784873117386'
});

// 結果
{
  summary: {
    isbn: '9784873117386',
    title: 'リーダブルコード',
    publisher: 'オライリー・ジャパン',
    ...
  },
  ...
}
```

---

### 2. `get_books_bulk` - 複数書籍情報一括取得

複数のISBNコードから書籍情報を一括で取得します。最大10,000件まで対応。

#### パラメータ

```typescript
{
  isbns: string[]  // ISBNコードの配列（最大10,000件）
}
```

**推奨**:
- 実運用では1,000件以下を推奨
- 大量取得（1,000件超）は特別なケースのみ

#### 戻り値

**成功時**: 書籍情報オブジェクトの配列
```typescript
Array<{
  summary: { ... }
  onix: { ... }
  hanmoto: { ... }
} | null>
```

- 配列の順序はリクエストの `isbns` の順序と一致
- 見つからないISBNは `null` として返却

**エラー時**: エラーオブジェクト
```typescript
{
  error: string
  code: string
}
```

#### 内部実装

**メソッド選択の自動化**:
- **1〜1,000件**: GET リクエスト
  - `GET https://api.openbd.jp/v1/get?isbn={isbn1},{isbn2},...`
- **1,001〜10,000件**: POST リクエスト
  - `POST https://api.openbd.jp/v1/get`
  - `Content-Type: application/x-www-form-urlencoded`
  - Body: `isbn={isbn1},{isbn2},...`

**ISBN正規化**:
リクエスト前にISBNを正規化:
1. ハイフン除去（`978-4-87311-738-6` → `9784873117386`）
2. 10桁ISBNは13桁に変換（`4873117386` → `9784873117386`）
3. 英大文字を小文字に変換（旧ISBN-10のチェックディジット `X`）

#### エラーハンドリング

**OpenBD API の特殊な仕様**:
- APIは**エラー時でも HTTP 200 を返す**
- エラー判定は**レスポンスボディ**で行う

**エラーコードとハンドリング**:

| エラーコード | 説明 | 判定方法 |
|------------|------|---------|
| `INVALID_ISBNS` | ISBNの配列が空、または不正な形式を含む | 入力バリデーション |
| `TOO_MANY_ISBNS` | 10,000件を超えるISBNが指定された | 配列長チェック |
| `API_ERROR` | OpenBD APIエラー（稀） | HTTP 500/503 |
| `NETWORK_ERROR` | ネットワークエラー | 接続失敗、タイムアウト |

**レスポンス処理**:
```typescript
// OpenBD APIレスポンスの判定
async function getBooksB bulk(isbns: string[]) {
  const response = await fetch(url);

  // HTTP 200でもエラーの可能性あり
  if (response.status !== 200) {
    throw new Error('API_ERROR');
  }

  const data = await response.json();

  // data は常に配列
  // 見つからないISBNは null
  return data.map((book, index) => {
    if (book === null) {
      console.warn(`ISBN not found: ${isbns[index]}`);
    }
    return book;
  });
}
```

#### 使用例

```typescript
// MCP クライアントからの呼び出し
const result = await client.callTool('get_books_bulk', {
  isbns: [
    '9784873117386',
    '9784873119038',
    '9784873119373'
  ]
});

// 結果
[
  { summary: { isbn: '9784873117386', ... }, ... },
  { summary: { isbn: '9784873119038', ... }, ... },
  null  // 見つからなかったISBN
]
```

#### パフォーマンス最適化

**推奨パターン**:
- **1〜100件**: そのまま取得
- **101〜1,000件**: そのまま取得（GET）
- **1,001〜10,000件**: POSTメソッド自動使用、タイムアウト延長推奨
- **10,001件以上**: 分割処理（1,000件ずつ並列リクエスト）

**タイムアウト推奨値**:
- 100件以下: 10秒
- 1,000件以下: 30秒
- 10,000件: 60秒以上

---

### 3. `get_coverage` - カバレッジ情報取得

OpenBDに収録されている全ISBNのリストを取得します。

#### パラメータ

なし

#### 戻り値

**成功時**: ISBN文字列の配列
```typescript
string[]  // 約163万件のISBN
```

**エラー時**: エラーオブジェクト
```typescript
{
  error: string
  code: string
}
```

#### 内部実装

- OpenBD API `/coverage` エンドポイントを呼び出し
- リクエスト: `GET https://api.openbd.jp/v1/coverage`
- レスポンスをそのまま返却

#### エラーハンドリング

| エラーコード | 説明 |
|------------|------|
| `API_ERROR` | OpenBD API エラー |
| `NETWORK_ERROR` | ネットワークエラー |
| `TIMEOUT` | タイムアウト（大容量データのため） |

#### 使用例

```typescript
// MCP クライアントからの呼び出し
const result = await client.callTool('get_coverage');

// 結果
[
  '9784000000000',
  '9784000000017',
  ...
  '9784999999999'
]
```

#### 注意事項

⚠️ **大容量データ**:
- レスポンスサイズ: 10MB以上
- 要素数: 約163万件
- 取得時間: ネットワーク速度に依存（数秒〜数十秒）

**推奨される利用方法**:
- 定期的なバッチ処理でローカルキャッシュを更新
- リアルタイム検索には使用しない
- 適切なタイムアウト設定（60秒以上推奨）

---

### 4. `get_schema` - スキーマ情報取得

OpenBD APIのレスポンスデータ構造（JSON Schema）を取得します。

#### パラメータ

なし

#### 戻り値

**成功時**: JSON Schema オブジェクト
```typescript
{
  $schema: string
  type: string
  properties: {
    summary: { ... }
    onix: { ... }
    hanmoto: { ... }
  }
}
```

**エラー時**: エラーオブジェクト
```typescript
{
  error: string
  code: string
}
```

#### 内部実装

- OpenBD API `/schema` エンドポイントを呼び出し
- リクエスト: `GET https://api.openbd.jp/v1/schema`
- レスポンスをそのまま返却

#### エラーハンドリング

| エラーコード | 説明 |
|------------|------|
| `API_ERROR` | OpenBD API エラー |
| `NETWORK_ERROR` | ネットワークエラー |

#### 使用例

```typescript
// MCP クライアントからの呼び出し
const result = await client.callTool('get_schema');

// 結果
{
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        isbn: { type: 'string' },
        title: { type: 'string' },
        ...
      }
    },
    ...
  }
}
```

#### 用途

- データ構造の理解
- レスポンスのバリデーション
- 型定義の自動生成（TypeScript、Go等）
- ドキュメント生成

---

## 共通仕様

### タイムアウト設定

| ツール | ISBNデータ数 | 推奨タイムアウト |
|-------|------------|----------------|
| `get_book_info` | 1件 | 10秒 |
| `get_books_bulk` | 1〜100件 | 10秒 |
| `get_books_bulk` | 101〜1,000件（GET） | 30秒 |
| `get_books_bulk` | 1,001〜10,000件（POST） | 60秒以上 |
| `get_coverage` | 163万件 | 60秒以上 |
| `get_schema` | - | 10秒 |

### リトライポリシー

ネットワークエラー、一時的なAPIエラーの場合:
- リトライ回数: 最大3回
- バックオフ: 指数バックオフ（1秒、2秒、4秒）
- リトライ対象: 5xx エラー、ネットワークエラー

### キャッシュ戦略

推奨されるキャッシュ戦略:
- **書籍情報**: 1日〜1週間（更新頻度による）
- **カバレッジ**: 1日（定期バッチで更新）
- **スキーマ**: 1ヶ月（変更頻度が低い）

### ロギング

すべてのツールで以下をログ出力:
- リクエストパラメータ
- レスポンスステータス
- エラー詳細
- 実行時間

---

## セキュリティ

### 入力検証

すべてのツールで入力パラメータを検証:
- **ISBN正規化**: ハイフン除去、10桁→13桁変換
- **ISBN形式チェック**: 正規表現 `/^97[89]\d{10}$/`
- **配列長チェック**: 最大10,000件
- **不正文字の除去**: スペース、ハイフン等

### レート制限

OpenBD APIには公式レート制限はありませんが、適切な利用:
- 不要なリクエストを避ける
- バッチ処理は適切な間隔で実行
- 一括取得機能を活用

---

## 将来の拡張

### 検討中の機能

#### 1. `search_books_local` - ローカル検索
- カバレッジデータをローカルに保持
- 著者名、書名での検索機能
- 全文検索エンジンとの統合

#### 2. キャッシュ管理ツール
- `refresh_cache`: キャッシュを手動で更新
- `clear_cache`: キャッシュをクリア
- `get_cache_status`: キャッシュの状態確認

#### 3. バッチ処理ツール
- `sync_coverage`: カバレッジデータを同期
- `bulk_sync_books`: 複数書籍を効率的に同期

---

## 次のステップ

- 使用例: [05-usage-examples.md](./05-usage-examples.md)
- 制限事項: [06-limitations.md](./06-limitations.md)
- API概要: [01-api-overview.md](./01-api-overview.md)
