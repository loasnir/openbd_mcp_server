/**
 * ISBN正規化ユーティリティのテスト
 */

import { describe, test, expect } from '@jest/globals';
import { normalizeIsbn, normalizeIsbns, isValidIsbn } from '../utils/isbn.js';

describe('normalizeIsbn', () => {
  test('13桁ISBN（ハイフンなし）はそのまま返す', () => {
    expect(normalizeIsbn('9784873117386')).toBe('9784873117386');
  });

  test('13桁ISBN（ハイフンあり）はハイフンを除去', () => {
    expect(normalizeIsbn('978-4-87311-738-6')).toBe('9784873117386');
  });

  test('13桁ISBN（スペース含む）はスペースを除去', () => {
    expect(normalizeIsbn('978 4 87311 738 6')).toBe('9784873117386');
  });

  test('10桁ISBNを13桁に変換（978プレフィックス追加）', () => {
    expect(normalizeIsbn('4873117386')).toBe('9784873117386');
  });

  test('10桁ISBN（ハイフンあり）を13桁に変換', () => {
    expect(normalizeIsbn('4-87311-738-6')).toBe('9784873117386');
  });

  test('979で始まる13桁ISBNも有効', () => {
    expect(normalizeIsbn('9791234567890')).toBe('9791234567890');
  });

  test('無効な形式の場合はエラーをスロー', () => {
    expect(() => normalizeIsbn('invalid')).toThrow('無効なISBN形式');
    expect(() => normalizeIsbn('123')).toThrow('無効なISBN形式');
    expect(() => normalizeIsbn('9999999999999')).toThrow('無効なISBN形式');
  });

  test('空文字列の場合はエラーをスロー', () => {
    expect(() => normalizeIsbn('')).toThrow('無効なISBN形式');
  });
});

describe('normalizeIsbns', () => {
  test('複数のISBNを一括で正規化', () => {
    const input = [
      '9784873117386',
      '978-4-87311-903-8',
      '4873119373',
    ];
    const expected = [
      '9784873117386',
      '9784873119038',
      '9784873119373',
    ];
    expect(normalizeIsbns(input)).toEqual(expected);
  });

  test('空配列の場合は空配列を返す', () => {
    expect(normalizeIsbns([])).toEqual([]);
  });

  test('いずれかが無効な場合はエラーをスロー', () => {
    const input = ['9784873117386', 'invalid'];
    expect(() => normalizeIsbns(input)).toThrow('無効なISBN形式');
  });
});

describe('isValidIsbn', () => {
  test('有効な13桁ISBNの場合はtrue', () => {
    expect(isValidIsbn('9784873117386')).toBe(true);
    expect(isValidIsbn('978-4-87311-738-6')).toBe(true);
  });

  test('有効な10桁ISBNの場合はtrue', () => {
    expect(isValidIsbn('4873117386')).toBe(true);
    expect(isValidIsbn('4-87311-738-6')).toBe(true);
  });

  test('無効な形式の場合はfalse', () => {
    expect(isValidIsbn('invalid')).toBe(false);
    expect(isValidIsbn('123')).toBe(false);
    expect(isValidIsbn('')).toBe(false);
  });
});
