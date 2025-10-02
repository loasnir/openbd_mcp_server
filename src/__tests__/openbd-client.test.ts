/**
 * OpenBD APIクライアントのテスト
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { OpenBDClient } from '../utils/openbd-client.js';

// global.fetch のモック用
let fetchMock: typeof global.fetch;

describe('OpenBDClient', () => {
  let client: OpenBDClient;

  beforeEach(() => {
    client = new OpenBDClient();
    // fetchをモック化
    fetchMock = global.fetch;
  });

  afterEach(() => {
    // fetchを元に戻す
    global.fetch = fetchMock;
  });

  describe('getBooks', () => {
    test('1,000件以下の場合はGETメソッドを使用', async () => {
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

      global.fetch = async (url: string | URL | Request) => {
        expect(url.toString()).toContain('/get?isbn=');
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      const result = await client.getBooks(['9784873117386']);
      expect(result).toEqual(mockResponse);
    });

    test('1,001件以上の場合はPOSTメソッドを使用', async () => {
      const isbns = Array.from({ length: 1001 }, (_, i) => `978${i.toString().padStart(10, '0')}`);
      const mockResponse = Array(1001).fill(null);

      global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
        expect(url.toString()).toContain('/get');
        expect(options?.method).toBe('POST');
        expect(options?.headers).toMatchObject({
          'Content-Type': 'application/x-www-form-urlencoded',
        });
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      const result = await client.getBooks(isbns);
      expect(result).toEqual(mockResponse);
    });

    test('10,000件を超える場合はエラー', async () => {
      const isbns = Array.from({ length: 10001 }, (_, i) => `978${i.toString().padStart(10, '0')}`);
      await expect(client.getBooks(isbns)).rejects.toThrow('最大10,000件まで');
    });

    test('見つからないISBNはnullを返す', async () => {
      const mockResponse = [null];

      global.fetch = async () => {
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      const result = await client.getBooks(['9784000000000']);
      expect(result).toEqual([null]);
    });
  });

  describe('getCoverage', () => {
    test('全ISBNリストを取得', async () => {
      const mockResponse = ['9784873117386', '9784873119038', '9784873119373'];

      global.fetch = async (url: string | URL | Request) => {
        expect(url.toString()).toContain('/coverage');
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      const result = await client.getCoverage();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSchema', () => {
    test('スキーマ情報を取得', async () => {
      const mockResponse = {
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
      };

      global.fetch = async (url: string | URL | Request) => {
        expect(url.toString()).toContain('/schema');
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      const result = await client.getSchema();
      expect(result).toEqual(mockResponse);
    });
  });
});
