/**
 * get_books_bulk ツール
 *
 * 複数のISBNから書籍情報を一括取得します（最大10,000件）。
 * docs/04-mcp-tools.md を参照
 */

import { openBDClient } from '../utils/openbd-client.js';
import type { OpenBDResponse } from '../types/openbd.js';

/**
 * get_books_bulk ツールの入力パラメータ
 */
export interface GetBooksBulkInput {
  isbns: string[];
}

/**
 * get_books_bulk ツールの出力
 */
export type GetBooksBulkOutput = OpenBDResponse;

/**
 * 複数書籍情報を一括取得
 *
 * - 1〜1,000件: GETメソッド使用（推奨）
 * - 1,001〜10,000件: POSTメソッド自動使用
 *
 * @param input - ISBNの配列を含む入力パラメータ
 * @returns 書籍情報の配列（見つからないISBNはnull）
 * @throws {Error} APIエラーまたはISBN形式エラー、または10,000件を超える場合
 */
export async function getBooksBulk(
  input: GetBooksBulkInput
): Promise<GetBooksBulkOutput> {
  const { isbns } = input;

  // 最大件数チェック
  if (isbns.length > 10000) {
    throw new Error('最大10,000件までのISBNを指定できます');
  }

  // OpenBD APIを呼び出し（自動的にGET/POSTを選択）
  const books = await openBDClient.getBooks(isbns);

  return books;
}
