/**
 * OpenBD APIクライアント
 *
 * docs/02-endpoints.md を参照
 */

import type {
  OpenBDResponse,
  OpenBDCoverageResponse,
  OpenBDSchemaResponse,
} from '../types/openbd.js';
import { normalizeIsbns } from './isbn.js';

/**
 * OpenBD API ベースURL
 */
const OPENBD_API_BASE_URL = 'https://api.openbd.jp/v1';

/**
 * OpenBD APIクライアント
 */
export class OpenBDClient {
  private baseUrl: string;

  constructor(baseUrl: string = OPENBD_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 書籍情報を取得する
   *
   * @param isbns - ISBN配列（最大10,000件、自動的にGET/POSTを選択）
   * @returns OpenBD書籍データ配列（見つからない場合はnull）
   * @throws {Error} APIエラーまたはネットワークエラー
   */
  async getBooks(isbns: string[]): Promise<OpenBDResponse> {
    // ISBN正規化
    const normalizedIsbns = normalizeIsbns(isbns);

    // 10,000件を超える場合はエラー
    if (normalizedIsbns.length > 10000) {
      throw new Error('最大10,000件までのISBNを指定できます');
    }

    // 1,000件以下: GET、1,001件以上: POST
    if (normalizedIsbns.length <= 1000) {
      return this.getBooksGET(normalizedIsbns);
    } else {
      return this.getBooksPOST(normalizedIsbns);
    }
  }

  /**
   * GETメソッドで書籍情報を取得（最大1,000件）
   */
  private async getBooksGET(isbns: string[]): Promise<OpenBDResponse> {
    const url = `${this.baseUrl}/get?isbn=${isbns.join(',')}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // OpenBD APIは常にHTTP 200を返すため、response.okチェックは不要
    // レスポンスボディで[null]が返る場合がエラー
    const data = await response.json() as OpenBDResponse;

    return data;
  }

  /**
   * POSTメソッドで書籍情報を取得（最大10,000件）
   */
  private async getBooksPOST(isbns: string[]): Promise<OpenBDResponse> {
    const url = `${this.baseUrl}/get`;

    // Content-Type: application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('isbn', isbns.join(','));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const data = await response.json() as OpenBDResponse;

    return data;
  }

  /**
   * カバレッジ情報を取得（全ISBN一覧、約163万件）
   *
   * @returns 全ISBNの配列
   * @throws {Error} APIエラーまたはネットワークエラー
   */
  async getCoverage(): Promise<OpenBDCoverageResponse> {
    const url = `${this.baseUrl}/coverage`;

    // タイムアウト60秒に設定（大容量レスポンス対応）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      const data = await response.json() as OpenBDCoverageResponse;

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * スキーマ情報を取得
   *
   * @returns JSON Schema
   * @throws {Error} APIエラーまたはネットワークエラー
   */
  async getSchema(): Promise<OpenBDSchemaResponse> {
    const url = `${this.baseUrl}/schema`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json() as OpenBDSchemaResponse;

    return data;
  }
}

/**
 * デフォルトのOpenBDクライアントインスタンス
 */
export const openBDClient = new OpenBDClient();
