/**
 * ISBN正規化ユーティリティ
 *
 * docs/04-mcp-tools.md および docs/05-usage-examples.md を参照
 */

/**
 * ISBNを正規化する
 *
 * 処理内容:
 * 1. ハイフン・スペース除去
 * 2. 10桁ISBNを13桁に変換（978プレフィックス追加）
 * 3. 13桁の数字（978または979で始まる）であることを検証
 *
 * @param isbn - 正規化するISBN（10桁または13桁、ハイフンあり/なし）
 * @returns 正規化された13桁ISBN
 * @throws {Error} 無効なISBN形式の場合
 *
 * @example
 * normalizeIsbn('978-4-87311-738-6') // => '9784873117386'
 * normalizeIsbn('9784873117386')     // => '9784873117386'
 * normalizeIsbn('4873117386')        // => '9784873117386'
 */
export function normalizeIsbn(isbn: string): string {
  // 1. ハイフン・スペース除去
  let cleaned = isbn.replace(/[-\s]/g, '');

  // 2. 英大文字を小文字に変換（旧ISBN-10のチェックディジット 'X' 対応）
  cleaned = cleaned.toLowerCase();

  // 3. 10桁の場合は13桁に変換
  if (cleaned.length === 10) {
    // 978プレフィックスを追加し、新しいチェックディジットを計算
    const isbn12 = '978' + cleaned.slice(0, 9);
    const checkDigit = calculateIsbn13CheckDigit(isbn12);
    cleaned = isbn12 + checkDigit;
  }

  // 4. 検証: 13桁の数字（978または979で始まる）
  if (!/^97[89]\d{10}$/.test(cleaned)) {
    throw new Error(`無効なISBN形式: ${isbn}`);
  }

  return cleaned;
}

/**
 * ISBN-13のチェックディジットを計算
 *
 * @param isbn12 - 最初の12桁（チェックディジット除く）
 * @returns チェックディジット（0-9の文字列）
 *
 * @example
 * calculateIsbn13CheckDigit('978487311738') // => '6'
 */
function calculateIsbn13CheckDigit(isbn12: string): string {
  // ISBN-13のチェックディジット計算:
  // 1. 奇数位置の桁を合計（1倍）
  // 2. 偶数位置の桁を合計して3倍
  // 3. 合計を10で割った余りを10から引く（10の場合は0）
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * 複数のISBNを一括で正規化する
 *
 * @param isbns - 正規化するISBNの配列
 * @returns 正規化されたISBNの配列
 * @throws {Error} いずれかのISBNが無効な形式の場合
 *
 * @example
 * normalizeIsbns(['978-4-87311-738-6', '4873117386'])
 * // => ['9784873117386', '9784873117386']
 */
export function normalizeIsbns(isbns: string[]): string[] {
  return isbns.map(isbn => normalizeIsbn(isbn));
}

/**
 * ISBNが有効な形式かチェック（正規化せず検証のみ）
 *
 * @param isbn - チェックするISBN
 * @returns 有効な場合true、無効な場合false
 *
 * @example
 * isValidIsbn('978-4-87311-738-6') // => true
 * isValidIsbn('invalid')           // => false
 */
export function isValidIsbn(isbn: string): boolean {
  try {
    normalizeIsbn(isbn);
    return true;
  } catch {
    return false;
  }
}
