#!/usr/bin/env node

/**
 * OpenBD MCP Server
 *
 * OpenBD（書影検索サービス）にアクセスするためのMCPサーバー
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getBookInfo, type GetBookInfoInput } from './tools/get-book-info.js';
import { getBooksBulk, type GetBooksBulkInput } from './tools/get-books-bulk.js';
import { getCoverage, type GetCoverageInput } from './tools/get-coverage.js';
import { getSchema, type GetSchemaInput } from './tools/get-schema.js';

/**
 * MCPサーバーインスタンスを作成
 */
const server = new Server(
  {
    name: 'openbd-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * ツール一覧を提供
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_book_info',
        description:
          'ISBNコード（10桁または13桁）から書籍の詳細情報を取得します。ハイフンあり/なし両対応、10桁→13桁自動変換。',
        inputSchema: {
          type: 'object',
          properties: {
            isbn: {
              type: 'string',
              description: 'ISBNコード（例: 9784873117386 または 978-4-87311-738-6 または 4873117386）',
            },
          },
          required: ['isbn'],
        },
      },
      {
        name: 'get_books_bulk',
        description:
          '複数のISBNから書籍情報を一括で取得します（最大10,000件）。1〜1,000件はGETメソッド、1,001〜10,000件はPOSTメソッドを自動選択。',
        inputSchema: {
          type: 'object',
          properties: {
            isbns: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'ISBNコードの配列（最大10,000件）',
            },
          },
          required: ['isbns'],
        },
      },
      {
        name: 'get_coverage',
        description:
          'OpenBDに収録されている全ISBNのリスト（約163万件）を取得します。大容量レスポンスのため、タイムアウトは60秒以上推奨。',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_schema',
        description: 'OpenBD APIのレスポンスデータ構造（JSON Schema）を取得します。',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * ツール呼び出しを処理
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_book_info': {
        const input = args as unknown as GetBookInfoInput;
        const result = await getBookInfo(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'get_books_bulk': {
        const input = args as unknown as GetBooksBulkInput;
        const result = await getBooksBulk(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'get_coverage': {
        const input = args as GetCoverageInput;
        const result = await getCoverage(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'get_schema': {
        const input = args as GetSchemaInput;
        const result = await getSchema(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラーが発生しました';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

/**
 * サーバーを起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('OpenBD MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
