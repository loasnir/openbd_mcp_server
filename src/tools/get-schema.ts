/**
 * get_schema ツール
 *
 * OpenBD APIのレスポンスデータ構造（JSON Schema）を取得します。
 * docs/04-mcp-tools.md を参照
 */

import { openBDClient } from '../utils/openbd-client.js';
import type { OpenBDSchemaResponse } from '../types/openbd.js';

/**
 * get_schema ツールの入力パラメータ（なし）
 */
export type GetSchemaInput = Record<string, never>;

/**
 * get_schema ツールの出力
 */
export type GetSchemaOutput = OpenBDSchemaResponse;

/**
 * スキーマ情報を取得
 *
 * @returns JSON Schema
 * @throws {Error} APIエラー
 */
export async function getSchema(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: GetSchemaInput
): Promise<GetSchemaOutput> {
  // OpenBD APIを呼び出し
  const schema = await openBDClient.getSchema();

  return schema;
}
