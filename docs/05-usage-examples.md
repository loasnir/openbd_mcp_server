# OpenBD MCP Server 使用例

このドキュメントでは、OpenBD MCP Serverの各ツールの使用例とユースケースを紹介します。

## 基本的な使用例

### 1. 単一書籍の情報取得

特定のISBNから書籍情報を取得します。

#### MCP クライアントからの呼び出し

```typescript
const result = await mcpClient.callTool('get_book_info', {
  isbn: '9784873117386'
});

console.log(result.summary.title);  // "リーダブルコード"
console.log(result.summary.author); // "Dustin Boswell/Trevor Foucher 著、角征典 訳"
console.log(result.summary.cover);  // "https://cover.openbd.jp/9784873117386.jpg"
```

#### レスポンス例

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
  },
  "onix": { ... },
  "hanmoto": { ... }
}
```

---

### 2. 複数書籍の一括取得

複数のISBNから書籍情報を効率的に取得します。

#### MCP クライアントからの呼び出し

```typescript
const result = await mcpClient.callTool('get_books_bulk', {
  isbns: [
    '9784873117386', // リーダブルコード
    '9784873119038', // リファクタリング
    '9784873119373', // 実践TypeScript
    '9999999999999'  // 存在しないISBN
  ]
});

// 結果の処理
result.forEach((book, index) => {
  if (book) {
    console.log(`${index + 1}. ${book.summary.title}`);
  } else {
    console.log(`${index + 1}. (見つかりませんでした)`);
  }
});

// 出力:
// 1. リーダブルコード
// 2. リファクタリング
// 3. 実践TypeScript
// 4. (見つかりませんでした)
```

---

### 3. カバレッジ情報の取得

OpenBDに収録されている全ISBNを取得します。

#### MCP クライアントからの呼び出し

```typescript
const allIsbns = await mcpClient.callTool('get_coverage');

console.log(`総ISBN数: ${allIsbns.length}`);
// 総ISBN数: 1630000 (約163万件)

// 先頭10件を表示
console.log('先頭10件:', allIsbns.slice(0, 10));
```

---

### 4. スキーマ情報の取得

APIレスポンスの構造を確認します。

#### MCP クライアントからの呼び出し

```typescript
const schema = await mcpClient.callTool('get_schema');

console.log('スキーマバージョン:', schema.$schema);
console.log('summaryフィールド:', Object.keys(schema.properties.summary.properties));

// 出力:
// スキーマバージョン: http://json-schema.org/draft-04/schema#
// summaryフィールド: ['isbn', 'title', 'volume', 'series', 'publisher', 'pubdate', 'cover', 'author']
```

---

## 実践的なユースケース

### ユースケース1: 読書管理アプリ

ユーザーが読んだ本のISBNを入力すると、書籍情報と書影を表示します。

```typescript
async function addBookToLibrary(isbn: string) {
  try {
    const book = await mcpClient.callTool('get_book_info', { isbn });

    if (!book) {
      return { error: '書籍が見つかりませんでした' };
    }

    // データベースに保存
    await database.books.insert({
      isbn: book.summary.isbn,
      title: book.summary.title,
      author: book.summary.author,
      publisher: book.summary.publisher,
      coverUrl: book.summary.cover,
      publishedDate: book.summary.pubdate,
      addedAt: new Date()
    });

    return {
      success: true,
      book: book.summary
    };
  } catch (error) {
    return { error: 'エラーが発生しました' };
  }
}

// 使用例
const result = await addBookToLibrary('9784873117386');
console.log(result);
// { success: true, book: { isbn: '9784873117386', title: 'リーダブルコード', ... } }
```

---

### ユースケース2: 書籍推薦システム

関連書籍のISBNリストから詳細情報を取得し、おすすめとして表示します。

```typescript
async function getRecommendations(relatedIsbns: string[]) {
  const books = await mcpClient.callTool('get_books_bulk', {
    isbns: relatedIsbns
  });

  // nullを除外して、有効な書籍のみフィルタ
  const validBooks = books.filter(book => book !== null);

  // おすすめ表示用にフォーマット
  return validBooks.map(book => ({
    isbn: book.summary.isbn,
    title: book.summary.title,
    author: book.summary.author,
    cover: book.summary.cover,
    description: book.hanmoto?.maegakinado || book.onix?.CollateralDetail?.TextContent?.[0]?.Text || ''
  }));
}

// 使用例
const recommendations = await getRecommendations([
  '9784873117386',
  '9784873119038',
  '9784873119373'
]);

recommendations.forEach(book => {
  console.log(`【${book.title}】`);
  console.log(`著者: ${book.author}`);
  console.log(`書影: ${book.cover}`);
  console.log('---');
});
```

---

### ユースケース3: 在庫管理システム

書店の在庫システムで、版元の在庫状況を確認します。

```typescript
async function checkStock(isbn: string) {
  const book = await mcpClient.callTool('get_book_info', { isbn });

  if (!book) {
    return { status: 'not_found' };
  }

  const stockStatus = book.hanmoto?.zaiko;
  const stockMessages = {
    1: '在庫あり',
    2: '重版未定',
    3: '品切れ',
    4: '絶版'
  };

  return {
    isbn: book.summary.isbn,
    title: book.summary.title,
    publisher: book.summary.publisher,
    stockStatus: stockStatus ? stockMessages[stockStatus] : '不明',
    lastUpdated: book.hanmoto?.datemodified
  };
}

// 使用例
const stockInfo = await checkStock('9784873117386');
console.log(stockInfo);
// {
//   isbn: '9784873117386',
//   title: 'リーダブルコード',
//   publisher: 'オライリー・ジャパン',
//   stockStatus: '在庫あり',
//   lastUpdated: '2023-10-15 09:30:00'
// }
```

---

### ユースケース4: ローカルデータベース同期

OpenBDのカバレッジデータと自社データベースを同期します。

```typescript
async function syncDatabase() {
  console.log('カバレッジデータを取得中...');
  const allIsbns = await mcpClient.callTool('get_coverage');

  console.log(`総ISBNデータ: ${allIsbns.length}件`);

  // ローカルDBに存在しないISBNを抽出
  const localIsbns = await database.books.getAllIsbns();
  const newIsbns = allIsbns.filter(isbn => !localIsbns.includes(isbn));

  console.log(`新規ISBN: ${newIsbns.length}件`);

  // 1,000件ずつバッチ処理（GET）、1,001件以上は自動的にPOSTが使用される
  const batchSize = 1000;
  for (let i = 0; i < newIsbns.length; i += batchSize) {
    const batch = newIsbns.slice(i, i + batchSize);

    console.log(`処理中: ${i + 1} - ${i + batch.length} / ${newIsbns.length}`);

    const books = await mcpClient.callTool('get_books_bulk', {
      isbns: batch
    });

    // データベースに保存
    for (const book of books) {
      if (book) {
        await database.books.upsert({
          isbn: book.summary.isbn,
          title: book.summary.title,
          author: book.summary.author,
          publisher: book.summary.publisher,
          coverUrl: book.summary.cover,
          publishedDate: book.summary.pubdate,
          onixData: JSON.stringify(book.onix),
          hanmotoData: JSON.stringify(book.hanmoto)
        });
      }
    }

    // APIへの負荷を考慮して待機
    await sleep(1000);
  }

  console.log('同期完了');
}

// 定期実行（1日1回）
setInterval(syncDatabase, 24 * 60 * 60 * 1000);
```

---

### ユースケース5: 書評サイト

書籍の詳細情報と書評を表示します。

```typescript
async function getBookWithReviews(isbn: string) {
  const book = await mcpClient.callTool('get_book_info', { isbn });

  if (!book) {
    return null;
  }

  // 書評情報を抽出
  const reviews = book.hanmoto?.reviews || [];

  return {
    // 基本情報
    isbn: book.summary.isbn,
    title: book.summary.title,
    author: book.summary.author,
    publisher: book.summary.publisher,
    publishedDate: book.summary.pubdate,
    cover: book.summary.cover,

    // 詳細情報
    description: book.hanmoto?.maegakinado || '',
    publisherComment: book.hanmoto?.hanmotokarahitokoto || '',

    // 書評
    reviews: reviews.map(review => ({
      date: review.date,
      reviewer: review.reviewer,
      source: review.source,
      link: review.link
    })),

    // 価格情報
    price: book.onix?.ProductSupply?.SupplyDetail?.Price?.[0]?.PriceAmount,

    // ページ数
    pages: book.onix?.DescriptiveDetail?.Extent?.find(
      e => e.ExtentType === '11'
    )?.ExtentValue
  };
}

// 使用例
const bookDetail = await getBookWithReviews('9784873117386');
console.log(bookDetail);
```

---

## エラーハンドリング

### 書籍が見つからない場合

```typescript
const book = await mcpClient.callTool('get_book_info', {
  isbn: '9999999999999'
});

if (book === null) {
  console.log('書籍が見つかりませんでした');
}
```

### APIエラーの処理

```typescript
try {
  const book = await mcpClient.callTool('get_book_info', {
    isbn: '9784873117386'
  });

  if (book === null) {
    console.log('書籍が見つかりませんでした');
  } else {
    console.log(book.summary.title);
  }
} catch (error) {
  if (error.code === 'API_ERROR') {
    console.error('OpenBD APIでエラーが発生しました');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('ネットワークエラーが発生しました');
  } else {
    console.error('不明なエラー:', error.message);
  }
}
```

### 一括取得時の部分的な失敗

```typescript
const books = await mcpClient.callTool('get_books_bulk', {
  isbns: ['9784873117386', '9999999999999', '9784873119038']
});

const successCount = books.filter(book => book !== null).length;
const failureCount = books.filter(book => book === null).length;

console.log(`成功: ${successCount}件, 失敗: ${failureCount}件`);
```

---

## パフォーマンス最適化

### バッチ処理の最適化

```typescript
// 悪い例: 1件ずつ取得
async function getBooksSlowly(isbns: string[]) {
  const results = [];
  for (const isbn of isbns) {
    const book = await mcpClient.callTool('get_book_info', { isbn });
    results.push(book);
  }
  return results;
}

// 良い例: 一括取得
async function getBooksFast(isbns: string[]) {
  return await mcpClient.callTool('get_books_bulk', { isbns });
}
```

### キャッシュの活用

```typescript
const cache = new Map();

async function getCachedBook(isbn: string) {
  // キャッシュチェック
  if (cache.has(isbn)) {
    const cached = cache.get(isbn);
    const age = Date.now() - cached.timestamp;

    // 1日以内ならキャッシュを返す
    if (age < 24 * 60 * 60 * 1000) {
      return cached.data;
    }
  }

  // キャッシュがない、または古い場合は取得
  const book = await mcpClient.callTool('get_book_info', { isbn });

  // キャッシュに保存
  cache.set(isbn, {
    data: book,
    timestamp: Date.now()
  });

  return book;
}
```

---

## 高度な使用例

### 大量データ取得（10,000件）

POSTメソッドを使用した大量データ取得の例です。

```typescript
async function getBulkBooks(isbns: string[]) {
  if (isbns.length > 10000) {
    throw new Error('最大10,000件まで取得可能です');
  }

  // 10,000件以下の場合、ツールが自動的にGET/POSTを選択
  const books = await mcpClient.callTool('get_books_bulk', {
    isbns: isbns
  });

  // 統計情報
  const found = books.filter(book => book !== null).length;
  const notFound = books.filter(book => book === null).length;

  console.log(`取得成功: ${found}件, 見つからず: ${notFound}件`);

  return books;
}

// 使用例: 5,000件のISBNを一括取得
const largeIsbnList = [...]; // 5,000件のISBN配列
const result = await getBulkBooks(largeIsbnList);
```

**注意**:
- 1,000件以下: GETメソッド使用（推奨）
- 1,001〜10,000件: POSTメソッド自動使用
- タイムアウトを60秒以上に設定推奨

---

### 近刊書籍の判定とキャッシュ戦略

発売日が未来の書籍（近刊）を判定し、適切なキャッシュTTLを設定します。

```typescript
function isUpcomingBook(pubdate: string): boolean {
  // pubdate形式: "YYYYMMDD"
  if (!pubdate || pubdate.length !== 8) {
    return false;
  }

  const bookDate = new Date(
    parseInt(pubdate.slice(0, 4)), // 年
    parseInt(pubdate.slice(4, 6)) - 1, // 月（0-indexed）
    parseInt(pubdate.slice(6, 8)) // 日
  );

  return bookDate > new Date();
}

function getCacheTTL(book: any): number {
  const pubdate = book.summary.pubdate;

  if (isUpcomingBook(pubdate)) {
    // 近刊: 1日（情報が変わりやすい）
    return 24 * 60 * 60 * 1000;
  } else {
    // 既刊: 1週間
    return 7 * 24 * 60 * 60 * 1000;
  }
}

// 使用例
async function getCachedBookWithDynamicTTL(isbn: string) {
  const cached = await cache.get(`book:${isbn}`);
  if (cached) {
    return cached;
  }

  const book = await mcpClient.callTool('get_book_info', { isbn });

  if (book) {
    const ttl = getCacheTTL(book);
    await cache.set(`book:${isbn}`, book, ttl);

    if (isUpcomingBook(book.summary.pubdate)) {
      console.log(`近刊書籍: ${book.summary.title} (${book.summary.pubdate})`);
    }
  }

  return book;
}
```

---

### ISBN正規化の実装例

10桁ISBNを13桁に変換し、ハイフンを除去する正規化処理の例です。

```typescript
function normalizeIsbn(isbn: string): string {
  // 1. ハイフン・スペース除去
  let cleaned = isbn.replace(/[-\s]/g, '');

  // 2. 英大文字を小文字に変換（旧ISBN-10のチェックディジット 'X'）
  cleaned = cleaned.toLowerCase();

  // 3. 10桁の場合は13桁に変換
  if (cleaned.length === 10) {
    // 978プレフィックスを追加
    // チェックディジット（最後の1文字）を除いた9桁を使用
    cleaned = '978' + cleaned.slice(0, 9);

    // 注: チェックディジットは再計算不要（OpenBD側で対応）
  }

  // 4. 検証: 13桁の数字（978または979で始まる）
  if (!/^97[89]\d{10}$/.test(cleaned)) {
    throw new Error(`無効なISBN形式: ${isbn}`);
  }

  return cleaned;
}

// 使用例
async function getBookWithNormalizedIsbn(isbn: string) {
  try {
    const normalized = normalizeIsbn(isbn);
    console.log(`正規化: ${isbn} → ${normalized}`);

    const book = await mcpClient.callTool('get_book_info', {
      isbn: normalized
    });

    return book;
  } catch (error) {
    console.error('ISBN正規化エラー:', error.message);
    return null;
  }
}

// テスト
await getBookWithNormalizedIsbn('978-4-87311-738-6'); // ハイフンあり
await getBookWithNormalizedIsbn('9784873117386');      // ハイフンなし
await getBookWithNormalizedIsbn('4873117386');         // 10桁ISBN
```

**正規化ルール**:
1. ハイフン・スペース除去: `978-4-87311-738-6` → `9784873117386`
2. 10桁→13桁変換: `4873117386` → `9784873117386` (978プレフィックス追加)
3. 検証: `^97[89]\d{10}$` パターンにマッチ

---

## 次のステップ

- 制限事項: [06-limitations.md](./06-limitations.md)
- MCPツール仕様: [04-mcp-tools.md](./04-mcp-tools.md)
- データ構造: [03-data-structure.md](./03-data-structure.md)
