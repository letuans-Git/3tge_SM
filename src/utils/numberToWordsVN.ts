/**
 * Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán
 * Ví dụ: 15.000.000 -> "Mười lăm triệu đồng chẵn"
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTriple(triple: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(triple / 100);
  const tens = Math.floor((triple % 100) / 10);
  const units = triple % 10;

  if (hundreds === 0 && tens === 0 && units === 0) return '';

  let res = '';

  // Đọc hàng trăm
  if (hundreds > 0 || showZeroHundred) {
    res += `${DIGITS[hundreds]} trăm `;
  }

  // Đọc hàng chục
  if (tens > 1) {
    res += `${DIGITS[tens]} mươi `;
    if (units === 1) {
      res += 'mốt ';
    } else if (units === 5) {
      res += 'lăm ';
    } else if (units > 0) {
      res += `${DIGITS[units]} `;
    }
  } else if (tens === 1) {
    res += 'mười ';
    if (units === 5) {
      res += 'lăm ';
    } else if (units > 0) {
      res += `${DIGITS[units]} `;
    }
  } else if (tens === 0 && (hundreds > 0 || showZeroHundred) && units > 0) {
    res += `lẻ ${DIGITS[units]} `;
  } else if (tens === 0 && units > 0) {
    res += `${DIGITS[units]} `;
  }

  return res.trim();
}

export function numberToWordsVN(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Không đồng chẵn';
  }

  let n = Math.abs(Math.round(amount));
  if (n === 0) return 'Không đồng chẵn';

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const triples: number[] = [];

  while (n > 0) {
    triples.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  let words = '';
  for (let i = triples.length - 1; i >= 0; i--) {
    const triple = triples[i];
    if (triple > 0) {
      const showZeroHundred = i < triples.length - 1;
      const str = readTriple(triple, showZeroHundred);
      if (str) {
        words += `${str} ${scales[i]} `;
      }
    }
  }

  words = words.trim().replace(/\s+/g, ' ');
  if (!words) return 'Không đồng chẵn';

  // Viết hoa chữ cái đầu và thêm đuôi "đồng chẵn"
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} đồng chẵn.`;
}
