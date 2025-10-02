/**
 * get_coverage ツール
 *
 * OpenBDに収録されている全ISBNのリスト（約163万件）を取得します。
 * docs/04-mcp-tools.md を参照
 */

import { openBDClient } from '../utils/openbd-client.js';
import type { OpenBDCoverageResponse } from '../types/openbd.js';

/**
 * get_coverage ツールの入力パラメータ（なし）
 */
export type GetCoverageInput = Record<string, never>;

/**
 * get_coverage ツールの出力
 */
export type GetCoverageOutput = OpenBDCoverageResponse;

/**
 * カバレッジ情報を取得
 *
 * @returns 全ISBNの配列（約163万件）
 * @throws {Error} APIエラー
 */
export async function getCoverage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: GetCoverageInput
): Promise<GetCoverageOutput> {
  // OpenBD APIを呼び出し
  const coverage = await openBDClient.getCoverage();

  return coverage;
}
