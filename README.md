# OpenBD MCP Server

OpenBD（オープンビーディー）の書籍データベースにアクセスするためのMCP（Model Context Protocol）サーバーです。日本の書籍の書誌情報と書影を、AI Agentが効率的に取得できるようにします。

## インストール

### NPMから直接実行（推奨）

```bash
npx openbd-mcp-server
```

### Dockerコンテナとして実行

```bash
# イメージのビルド
docker build -t openbd-mcp-server .

# コンテナの実行
docker run -i openbd-mcp-server
```

### ソースからビルド

```bash
# リポジトリのクローン
git clone https://github.com/your-username/openbd-mcp-server.git
cd openbd-mcp-server

# 依存関係のインストールとビルド
npm install

# サーバーの起動
npm start
```

## 使い方

### Claude Desktop での設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加:

```json
{
  "mcpServers": {
    "openbd": {
      "command": "npx",
      "args": ["openbd-mcp-server"]
    }
  }
}
```

### Docker を使用する場合

```json
{
  "mcpServers": {
    "openbd": {
      "command": "docker",
      "args": ["run", "-i", "openbd-mcp-server"]
    }
  }
}
```

## 概要

OpenBD MCP Serverは、[OpenBD API](https://openbd.jp)を通じて約163万件の日本の書籍データにアクセスできるMCPサーバーです。ISBNコードから書籍の詳細情報、書影、在庫状況などを取得できます。

### 主な特徴

- **高速**: 1件あたり1ミリ秒以下のレスポンス
- **大量取得対応**: 最大10,000件のISBNを一括取得可能
- **トークン効率重視**: AI Agentによる利用を前提とした最小限のレスポンス
- **シンプルなAPI**: 必要最小限のパラメータのみ提供

## 提供ツール

### 1. `get_book_info` - 単一書籍情報取得

ISBNコード（10桁または13桁）から書籍の詳細情報を取得します。

```typescript
{
  isbn: "9784873117386"  // ハイフンあり/なし両対応、10桁→13桁自動変換
}
```

### 2. `get_books_bulk` - 複数書籍情報一括取得

複数のISBNから書籍情報を一括で取得します（最大10,000件）。

```typescript
{
  isbns: ["9784873117386", "9784873119038", ...]  // 最大10,000件
}
```

- 1〜1,000件: GETメソッド使用（推奨）
- 1,001〜10,000件: POSTメソッド自動使用

### 3. `get_coverage` - カバレッジ情報取得

OpenBDに収録されている全ISBNのリスト（約163万件）を取得します。

### 4. `get_schema` - スキーマ情報取得

OpenBD APIのレスポンスデータ構造（JSON Schema）を取得します。

## データソース

### 版元ドットコム会員社（626社）
- 詳細書誌データ（JPRO-ONIX準拠）
- 独自データ（書評、在庫状況、まえがき等）

### 国立国会図書館データ
- 基本書誌情報（ISBN、タイトル、著者、出版社）
- CC-BYライセンス

## レスポンスデータ構造

```json
{
  "summary": {
    "isbn": "9784873117386",
    "title": "リーダブルコード",
    "author": "Dustin Boswell/Trevor Foucher 著、角征典 訳",
    "publisher": "オライリー・ジャパン",
    "pubdate": "20120623",
    "cover": "https://cover.openbd.jp/9784873117386.jpg"
  },
  "onix": { ... },      // JPRO-ONIX準拠データ
  "hanmoto": { ... }    // 版元ドットコム独自データ
}
```

## 主な機能

### ISBN正規化

10桁ISBNの13桁への自動変換、ハイフン除去など、柔軟なISBN入力に対応します。

```typescript
"978-4-87311-738-6" → "9784873117386"  // ハイフン除去
"4873117386"        → "9784873117386"  // 10桁→13桁変換
```

### エラーハンドリング

OpenBD APIの特殊な仕様（エラー時もHTTP 200を返す）に対応し、レスポンスボディでエラーを判定します。

```json
// ISBNが見つからない場合
[null]

// 複数ISBNで一部が見つからない場合
[
  { "summary": {...}, ... },  // 見つかった
  null,                       // 見つからない
  { "summary": {...}, ... }   // 見つかった
]
```

## ドキュメント

詳細な仕様とユースケースは [docs](./docs) ディレクトリを参照してください。

- [01-api-overview.md](./docs/01-api-overview.md) - OpenBD API 概要
- [02-endpoints.md](./docs/02-endpoints.md) - API エンドポイント詳細
- [03-data-structure.md](./docs/03-data-structure.md) - レスポンスデータ構造
- [04-mcp-tools.md](./docs/04-mcp-tools.md) - MCP ツール仕様
- [05-usage-examples.md](./docs/05-usage-examples.md) - 使用例とユースケース
- [06-limitations.md](./docs/06-limitations.md) - 制限事項と注意点

## OpenBD 利用規約

OpenBD APIを利用する際は、以下の条件を遵守してください。

### 許可される用途
- ✅ 書籍の紹介・宣伝
- ✅ 書店・図書館システム
- ✅ 読書管理アプリ
- ✅ 書評サイト

### 禁止事項
- ❌ データの改変
- ❌ 不正確な情報の表示
- ❌ 商業目的での大量再配布

### 推奨事項
- 定期的なデータ更新
- 出典の明示（「OpenBD提供」など）
- 最新情報は公式サイトへの誘導

詳細は [OpenBD公式サイト](https://openbd.jp) を参照してください。

## ライセンス

### 本MCP Server
MIT License

### OpenBD データ
- 版元ドットコムデータ: 各社の提供条件に準拠
- 国立国会図書館データ: CC-BY（クリエイティブ・コモンズ表示）

## 関連リンク

- **OpenBD公式サイト**: https://openbd.jp
- **OpenBD API仕様**: https://openbd.jp/spec/
- **版元ドットコム**: https://www.hanmoto.com/
- **国立国会図書館**: https://www.ndl.go.jp/

## 注意事項

### API v1 提供終了の可能性

OpenBD API v1は将来的に提供終了が予定されています（最低60ヶ月＝5年間は保証）。バージョン2の開発が進行中のため、定期的に公式アナウンスを確認してください。

### データの正確性

OpenBDのデータは参考情報として提供されており、正確性や完全性は保証されていません。特に近刊情報は変更される可能性が高いため、キャッシュTTLを短く設定することを推奨します。

## サポート

本MCP Serverに関する問い合わせは、GitHubのIssuesをご利用ください。

OpenBD APIに関する問い合わせは、[OpenBD公式サイト](https://openbd.jp)のお問い合わせフォームをご利用ください。
