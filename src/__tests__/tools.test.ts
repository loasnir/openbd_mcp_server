/**
 * MCPツールのテスト
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getBookInfo } from '../tools/get-book-info.js';
import { getBooksBulk } from '../tools/get-books-bulk.js';
import { getCoverage } from '../tools/get-coverage.js';
import { getSchema } from '../tools/get-schema.js';

// global.fetch のモック用
let fetchMock: typeof global.fetch;

describe('MCP Tools', () => {
  beforeEach(() => {
    fetchMock = global.fetch;
  });

  afterEach(() => {
    global.fetch = fetchMock;
  });

  describe('get_book_info', () => {
    test('単一の書籍情報を取得', async () => {
      const mockResponse = [
        {
          summary: {
            isbn: '9784873117386',
            title: 'リーダブルコード',
            author: 'Dustin Boswell',
            publisher: 'オライリー・ジャパン',
            pubdate: '20120623',
            cover: 'https://cover.openbd.jp/9784873117386.jpg',
            volume: '',
            series: '',
          },
        },
      ];

      global.fetch = async () => ({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getBookInfo({ isbn: '9784873117386' });
      expect(result).toEqual(mockResponse[0]);
    });

    test('見つからない場合はnullを返す', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => [null],
      } as Response);

      const result = await getBookInfo({ isbn: '9784000000000' });
      expect(result).toBeNull();
    });

    test('10桁ISBNを自動変換', async () => {
      const mockResponse = [
        {
          summary: {
            isbn: '9784873117386',
            title: 'リーダブルコード',
            author: 'Dustin Boswell',
            publisher: 'オライリー・ジャパン',
            pubdate: '20120623',
            cover: 'https://cover.openbd.jp/9784873117386.jpg',
            volume: '',
            series: '',
          },
        },
      ];

      global.fetch = async () => ({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getBookInfo({ isbn: '4873117386' });
      expect(result).toEqual(mockResponse[0]);
    });
  });

  describe('get_books_bulk', () => {
    test('複数の書籍情報を一括取得', async () => {
      const mockResponse = [
        {
          summary: {
            isbn: '9784873117386',
            title: 'リーダブルコード',
            author: 'Dustin Boswell',
            publisher: 'オライリー・ジャパン',
            pubdate: '20120623',
            cover: 'https://cover.openbd.jp/9784873117386.jpg',
            volume: '',
            series: '',
          },
        },
        null,
        {
          summary: {
            isbn: '9784873119373',
            title: '実践TypeScript',
            author: '吉井健文',
            publisher: 'オライリー・ジャパン',
            pubdate: '20210924',
            cover: 'https://cover.openbd.jp/9784873119373.jpg',
            volume: '',
            series: '',
          },
        },
      ];

      global.fetch = async () => ({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getBooksBulk({
        isbns: ['9784873117386', '9784000000000', '9784873119373'],
      });

      expect(result).toEqual(mockResponse);
      expect(result[1]).toBeNull();
    });

    test('10,000件を超える場合はエラー', async () => {
      const isbns = Array.from({ length: 10001 }, (_, i) => `978${i.toString().padStart(10, '0')}`);
      await expect(getBooksBulk({ isbns })).rejects.toThrow('最大10,000件まで');
    });
  });

  describe('get_coverage', () => {
    test('全ISBNリストを取得', async () => {
      const mockResponse = ['9784873117386', '9784873119038', '9784873119373'];

      global.fetch = async () => ({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getCoverage({});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('get_schema', () => {
    test('スキーマ情報を取得', async () => {
      const mockResponse = {
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
          summary: {
            type: 'object',
          },
        },
      };

      global.fetch = async () => ({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getSchema({});
      expect(result).toEqual(mockResponse);
    });
  });
});
