/**
 * get_book_info ツール
 *
 * 単一のISBNから書籍情報を取得します。
 * docs/04-mcp-tools.md を参照
 */

import { openBDClient } from '../utils/openbd-client.js';
import type { OpenBDBook } from '../types/openbd.js';

/**
 * get_book_info ツールの入力パラメータ
 */
export interface GetBookInfoInput {
  isbn: string;
}

/**
 * get_book_info ツールの出力
 */
export type GetBookInfoOutput = OpenBDBook | null;

/**
 * 単一書籍情報を取得
 *
 * @param input - ISBNを含む入力パラメータ
 * @returns 書籍情報（見つからない場合はnull）
 * @throws {Error} APIエラーまたはISBN形式エラー
 */
export async function getBookInfo(
  input: GetBookInfoInput
): Promise<GetBookInfoOutput> {
  const { isbn } = input;

  // OpenBD APIを呼び出し（ISBN正規化は自動で行われる）
  const books = await openBDClient.getBooks([isbn]);

  // 最初の要素を返す（単一ISBNなので配列の最初の要素のみ）
  return books[0];
}
