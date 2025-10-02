# OpenBD MCP Server 制限事項と注意点

このドキュメントでは、OpenBD APIおよびMCP Serverの制限事項、注意点、推奨される利用方法をまとめます。

## API制限事項

### 1. 検索方法の制限

#### ISBN検索のみ対応

OpenBD API v1は**ISBNコードによる直接検索のみ**に対応しています。

**対応していない検索**:
- ❌ 著者名による検索
- ❌ 書名（タイトル）による検索
- ❌ 出版社名による検索
- ❌ キーワード検索
- ❌ ジャンル・カテゴリ検索
- ❌ 発行日範囲指定検索

**対応している検索**:
- ✅ ISBNコード（10桁または13桁）による直接検索
- ✅ 複数ISBNによる一括検索（最大1,000件）

#### 回避策

著者名や書名で検索したい場合:

**方法1: カバレッジデータを活用**
```typescript
// 1. 全ISBNを取得
const allIsbns = await mcpClient.callTool('get_coverage');

// 2. 全書籍情報を取得（バッチ処理）
// 3. ローカルデータベースに保存
// 4. ローカルで著者名・書名検索を実装
```

**方法2: 外部サービスと組み合わせ**
- 国立国会図書館サーチAPI
- Google Books API
- 楽天ブックスAPI

これらでISBNを取得後、OpenBD APIで詳細情報を取得

---

### 2. 一括取得の制限

#### GETは最大1,000件、POSTは最大10,000件

`/get` エンドポイントでは、HTTPメソッドによって最大取得件数が異なります。

**制限内容**:
- **GETメソッド**: 最大1,000件のISBN
- **POSTメソッド**: 最大10,000件のISBN
- MCP Serverは自動的にメソッドを選択

**推奨事項**:
- **1〜1,000件**: GETメソッド使用（推奨）
- **1,001〜10,000件**: POSTメソッド使用（自動選択）
- **実運用**: 1,000件以下を推奨（パフォーマンス考慮）

**対処方法**:

```typescript
// 10,000件を超える場合は分割処理
async function getBooksInBatches(isbns: string[], batchSize = 1000) {
  const results = [];

  for (let i = 0; i < isbns.length; i += batchSize) {
    const batch = isbns.slice(i, i + batchSize);
    // ツールが自動的にGET/POSTを選択
    const books = await mcpClient.callTool('get_books_bulk', {
      isbns: batch
    });
    results.push(...books);

    // API負荷軽減のため待機
    if (i + batchSize < isbns.length) {
      await sleep(1000); // 1秒待機
    }
  }

  return results;
}
```

**POSTメソッド使用時の注意**:
- タイムアウトを60秒以上に設定推奨
- 大量データのため処理時間が長くなる可能性
- 可能であれば1,000件以下に分割して処理

---

### 3. レート制限

#### 公式なレート制限なし（現時点）

OpenBD APIには明示的なレート制限は設定されていませんが、適切な利用が求められます。

**推奨事項**:
- 不要なリクエストを避ける
- 連続リクエスト時は適切な間隔を空ける（1秒程度）
- 大量リクエストはバッチ処理で実施
- キャッシュを活用して重複リクエストを削減

**避けるべき使い方**:
- ❌ 無限ループでのリクエスト
- ❌ 短時間での大量リクエスト（DoS攻撃とみなされる可能性）
- ❌ 不必要な頻繁なカバレッジ取得

---

## データに関する制限

### 1. データの網羅性

#### 版元ドットコム会員外の制限

OpenBDのデータは2つのソースから構成されています:

**版元ドットコム会員社（626社）**:
- ✅ 詳細書誌データ（onix）
- ✅ 独自データ（hanmoto）
  - 書評・レビュー
  - 在庫状況
  - まえがき・内容紹介
  - 版元からひとこと

**国立国会図書館データ**:
- ✅ 基本書誌データ（ISBN、タイトル、著者、出版社）
- ❌ 詳細情報なし
- ❌ 書評・レビューなし
- ❌ 在庫情報なし

#### 判定方法

```typescript
const book = await mcpClient.callTool('get_book_info', {
  isbn: '9784873117386'
});

if (book.hanmoto && book.hanmoto.datecreated) {
  console.log('版元ドットコム会員社の書籍（詳細情報あり）');
} else {
  console.log('国会図書館データのみ（基本情報のみ）');
}
```

---

### 2. データの正確性

#### データ保証なし

OpenBDのデータは参考情報として提供されており、正確性や完全性は保証されていません。

**注意点**:
- 近刊情報は変更される可能性が高い
- 価格、発売日は変更される場合あり
- 在庫状況はリアルタイムではない
- データ欠損の可能性あり

**推奨対応**:
- 重要な情報は複数ソースで確認
- 定期的にデータを更新
- ユーザーに「参考情報」として提示
- 最新情報は出版社サイトを案内

---

### 3. データの更新頻度

#### 更新タイミングが不定期

**版元ドットコム会員社**:
- 出版社が任意のタイミングで更新
- 書籍により更新頻度が異なる
- `datemodified` フィールドで最終更新日を確認可能

**国会図書館データ**:
- 一定の周期で更新
- 新刊の反映には時間がかかる場合あり

#### 推奨キャッシュ戦略

近刊書籍（発売日が未来）と既刊書籍でキャッシュTTLを変えることを推奨します。

```typescript
// 近刊判定
function isUpcomingBook(pubdate: string): boolean {
  if (!pubdate || pubdate.length !== 8) {
    return false;
  }

  const bookDate = new Date(
    parseInt(pubdate.slice(0, 4)),
    parseInt(pubdate.slice(4, 6)) - 1,
    parseInt(pubdate.slice(6, 8))
  );

  return bookDate > new Date();
}

// キャッシュの有効期限設定
function getCacheTTL(book: any): number {
  const pubdate = book.summary.pubdate;

  if (isUpcomingBook(pubdate)) {
    // 近刊（発売日が未来）: 1日（情報が変わりやすい）
    return 24 * 60 * 60 * 1000;
  } else {
    // 既刊書: 1週間
    return 7 * 24 * 60 * 60 * 1000;
  }
}

// その他のキャッシュポリシー
const cachePolicy = {
  // カバレッジデータ: 1日
  coverage: 24 * 60 * 60 * 1000,

  // スキーマ: 1ヶ月
  schema: 30 * 24 * 60 * 60 * 1000
};

// 使用例
async function getCachedBook(isbn: string) {
  const cached = await cache.get(`book:${isbn}`);
  if (cached) {
    return cached;
  }

  const book = await mcpClient.callTool('get_book_info', { isbn });

  if (book) {
    const ttl = getCacheTTL(book);
    await cache.set(`book:${isbn}`, book, ttl);
  }

  return book;
}
```

**近刊書籍の特徴**:
- 発売日、価格、内容が変更される可能性が高い
- 短いTTL（1日）でキャッシュを更新
- ユーザーに「近刊情報は変更の可能性あり」と明示推奨

---

### 4. 書影画像の利用

#### CDN経由で配信

書影画像は `https://cover.openbd.jp/{ISBN}.jpg` の形式でCDN経由で配信されます。

**制限事項**:
- 画像が存在しない場合は404エラー
- 画像サイズは固定（変更不可）
- 直リンクは推奨されるが、過度な負荷は避ける

**推奨利用方法**:

```typescript
// 画像の存在確認
async function getCoverImageUrl(isbn: string): Promise<string | null> {
  const url = `https://cover.openbd.jp/${isbn}.jpg`;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return url;
    }
  } catch (error) {
    console.error('書影取得エラー:', error);
  }

  return null; // デフォルト画像を返すなど
}
```

**キャッシュ推奨**:
- ローカルストレージやCDNにキャッシュ
- 頻繁なアクセスは避ける

---

## サービス提供に関する注意点

### 1. API v1 提供終了の可能性

#### バージョン2への移行予定

2023年7月、OpenBDは「openBD API（バージョン1）」の提供終了を発表しました。

**重要事項**:
- ⚠️ **v1は将来的に終了予定**
- バージョン2が開発中
- 移行期間は最低60ヶ月（5年）保証
- 最新情報は公式サイトを確認

**対応方法**:
- 定期的に公式アナウンスを確認
- v2リリース時の移行計画を準備
- エラーハンドリングを適切に実装
- 代替データソースの検討

---

### 2. サービス停止のリスク

#### 一時的な停止の可能性

**停止の可能性**:
- メンテナンス
- サーバー障害
- DDoS攻撃などのセキュリティ対応

**対応策**:

```typescript
// リトライ機能の実装
async function getBookWithRetry(
  isbn: string,
  maxRetries = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await mcpClient.callTool('get_book_info', { isbn });
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // 指数バックオフ
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }
}
```

**推奨**:
- タイムアウト設定
- リトライ機能の実装
- ユーザーへのエラー通知
- フォールバック機能（代替データソース）

---

### 3. データ利用規約

#### 利用条件の遵守

**許可される用途**:
- ✅ 書籍の紹介・宣伝
- ✅ 書店・図書館システム
- ✅ 読書管理アプリ
- ✅ 書評サイト

**禁止事項**:
- ❌ データの改変
- ❌ 不正確な情報の表示
- ❌ 商業目的での大量再配布

**推奨事項**:
- 定期的なデータ更新
- 出典の明示（「OpenBD提供」など）
- 最新情報は公式サイトへの誘導

---

## 技術的な制限

### 1. レスポンスサイズ

#### カバレッジデータが大容量

`/coverage` エンドポイントのレスポンスは非常に大きいです。

**データサイズ**:
- 約163万件のISBN
- レスポンスサイズ: 10MB以上
- 取得時間: 数秒〜数十秒（ネットワーク速度による）

**対処方法**:

```typescript
// タイムアウトを長めに設定
const allIsbns = await mcpClient.callTool('get_coverage', {}, {
  timeout: 60000 // 60秒
});

// メモリ使用量に注意
console.log(`メモリ使用量: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
```

**推奨**:
- バックグラウンド処理で取得
- ストリーミング処理（可能であれば）
- 定期バッチ処理（リアルタイム取得を避ける）

---

### 2. データ形式の複雑性

#### ONIX規格の理解が必要

`onix` セクションはJPRO-ONIX規格に準拠しており、構造が複雑です。

**対処方法**:
- スキーマを参照: `https://api.openbd.jp/v1/schema`
- 主に `summary` セクションを利用
- 必要に応じて `onix` の特定フィールドのみ抽出

```typescript
// summaryで十分な場合が多い
const book = await mcpClient.callTool('get_book_info', { isbn });
const basicInfo = book.summary; // 簡潔な情報

// 詳細が必要な場合のみonixを参照
const pageCount = book.onix?.DescriptiveDetail?.Extent?.find(
  e => e.ExtentType === '11'
)?.ExtentValue;
```

---

## ベストプラクティス

### 1. エラーハンドリング

すべてのAPIリクエストに適切なエラーハンドリングを実装:

```typescript
try {
  const book = await mcpClient.callTool('get_book_info', { isbn });

  if (book === null) {
    // ISBNが見つからない場合の処理
    return { error: '書籍が見つかりませんでした' };
  }

  return book;
} catch (error) {
  // ネットワークエラー、APIエラーの処理
  console.error('エラー:', error);
  return { error: 'システムエラーが発生しました' };
}
```

---

### 2. キャッシュの活用

重複リクエストを避け、パフォーマンスを向上:

```typescript
// Redis, Memcached, ローカルキャッシュなど
const cachedBook = await cache.get(`book:${isbn}`);
if (cachedBook) {
  return cachedBook;
}

const book = await mcpClient.callTool('get_book_info', { isbn });
await cache.set(`book:${isbn}`, book, { ttl: 86400 }); // 1日

return book;
```

---

### 3. バッチ処理

大量データ処理時は適切な分割とレート制限:

```typescript
const batchSize = 100;
const delayBetweenBatches = 1000; // 1秒

for (let i = 0; i < isbns.length; i += batchSize) {
  const batch = isbns.slice(i, i + batchSize);
  await processBatch(batch);

  if (i + batchSize < isbns.length) {
    await sleep(delayBetweenBatches);
  }
}
```

---

## まとめ

OpenBD APIは強力で無料のサービスですが、以下の点に注意して利用しましょう:

1. **ISBN検索のみ対応** - 著者名・書名検索は別途実装が必要
2. **データの正確性は保証されない** - 参考情報として扱う
3. **v1は将来終了予定** - v2への移行を見据える
4. **適切な利用** - レート制限、キャッシュ、エラーハンドリング
5. **利用規約の遵守** - データ改変禁止、適切な用途

これらを理解した上で、OpenBD MCP Serverを効果的に活用してください。

---

## 関連ドキュメント

- API概要: [01-api-overview.md](./01-api-overview.md)
- エンドポイント: [02-endpoints.md](./02-endpoints.md)
- データ構造: [03-data-structure.md](./03-data-structure.md)
- MCPツール仕様: [04-mcp-tools.md](./04-mcp-tools.md)
- 使用例: [05-usage-examples.md](./05-usage-examples.md)
