/**
 * Date utility helpers for standardizing date formatting across the application to dd/mm/yyyy.
 */

/**
 * Format any ISO date string (YYYY-MM-DD or ISO timestamp) or Date object into DD/MM/YYYY.
 * If invalid or empty, returns fallback or empty string.
 */
export function formatDateVN(dateInput: string | Date | null | undefined, fallback: string = ''): string {
  if (!dateInput) return fallback;

  try {
    // If it is already in YYYY-MM-DD format
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // Match standard YYYY-MM-DD
      const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        return `${day}/${month}/${year}`;
      }

      // If already in DD/MM/YYYY format, keep it
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : fallback;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : fallback;
  }
}

/**
 * Format date and time to DD/MM/YYYY HH:mm
 */
export function formatDateTimeVN(dateInput: string | Date | null | undefined, fallback: string = ''): string {
  if (!dateInput) return fallback;

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : fallback;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : fallback;
  }
}

/**
 * Tạo số phiếu bảo dưỡng theo công thức:
 * Chữ BD + 2 số của ngày tạo phiếu + 2 số của tháng tạo phiếu + 4 số của năm tạo phiếu + dấu - + Thứ tự phiếu của ngày tạo.
 * Ví dụ: Ngày tạo phiếu 02/10/2026 số phiếu thứ nhất sẽ là: BD02102026-01
 */
export function generateMaintenanceCode(
  creationDateInput: string | Date | null | undefined = new Date(), 
  existingCodesOrRecords: Array<{ maintenanceCode?: string; maintenanceDate?: string; createdAt?: string } | string> = []
): string {
  let dayStr = '';
  let monthStr = '';
  let yearStr = '';

  if (!creationDateInput) {
    const now = new Date();
    dayStr = String(now.getDate()).padStart(2, '0');
    monthStr = String(now.getMonth() + 1).padStart(2, '0');
    yearStr = String(now.getFullYear());
  } else if (typeof creationDateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(creationDateInput.trim())) {
    const parts = creationDateInput.trim().split('-');
    yearStr = parts[0];
    monthStr = parts[1].padStart(2, '0');
    dayStr = parts[2].padStart(2, '0');
  } else {
    const d = creationDateInput instanceof Date ? creationDateInput : new Date(creationDateInput);
    if (isNaN(d.getTime())) {
      const now = new Date();
      dayStr = String(now.getDate()).padStart(2, '0');
      monthStr = String(now.getMonth() + 1).padStart(2, '0');
      yearStr = String(now.getFullYear());
    } else {
      dayStr = String(d.getDate()).padStart(2, '0');
      monthStr = String(d.getMonth() + 1).padStart(2, '0');
      yearStr = String(d.getFullYear());
    }
  }

  const prefix = `BD${dayStr}${monthStr}${yearStr}-`;

  let maxSeq = 0;
  existingCodesOrRecords.forEach(item => {
    const code = typeof item === 'string' ? item : (item.maintenanceCode || '');
    if (code && code.startsWith(prefix)) {
      const seqStr = code.slice(prefix.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * Convert a Date object to YYYY-MM-DD (useful for HTML <input type="date"> value)
 */
export function toInputDateFormat(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert any date input (YYYY-MM-DD, ISO string, Date object) to DD/MM/YYYY
 */
export function toDMY(dateInput?: string | Date | null, fallback: string = ''): string {
  if (!dateInput) return fallback;
  return formatDateVN(dateInput, fallback);
}

/**
 * Convert DD/MM/YYYY to ISO format YYYY-MM-DD (safe for Firestore and date comparisons)
 */
export function dmyToISO(dmyStr?: string | null): string {
  if (!dmyStr) return '';
  const trimmed = dmyStr.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (m) {
    const [, day, month, year] = m;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Validate strictly that a string is a valid date formatted as dd/MM/yyyy
 */
export function isValidDMY(dmyStr?: string | null): boolean {
  if (!dmyStr || typeof dmyStr !== 'string') return false;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmyStr.trim());
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (year < 1970 || year > 2100) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

  return true;
}

/**
 * Formats user input as dd/MM/yyyy while typing, handling deletes cleanly
 */
export function formatDMYInput(val: string, prevVal: string = ''): string {
  if (!val) return '';
  const cleaned = val.replace(/[^\d/]/g, '').slice(0, 10);

  // If user is deleting, preserve the deleted string
  if (cleaned.length < prevVal.length) {
    return cleaned;
  }

  // If user manually entered slash at position 2 or 5, keep it
  if (cleaned.endsWith('/') && (cleaned.length === 3 || cleaned.length === 6)) {
    return cleaned;
  }

  // Auto-format numbers into dd/MM/yyyy
  const digits = cleaned.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Add 180 days to a DD/MM/YYYY or YYYY-MM-DD date and return in DD/MM/YYYY
 */
export function add180DaysDMY(dateStr: string): string {
  if (!dateStr) return '';
  try {
    let d: Date;
    if (isValidDMY(dateStr)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 180);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Default 5-year warranty date in DD/MM/YYYY
 */
export function defaultWarrantyDMY(refDateStr?: string): string {
  try {
    let d: Date;
    if (refDateStr && isValidDMY(refDateStr)) {
      const [day, month, year] = refDateStr.split('/').map(Number);
      d = new Date(year, month - 1, day);
    } else if (refDateStr && !isNaN(new Date(refDateStr).getTime())) {
      d = new Date(refDateStr);
    } else {
      d = new Date();
    }
    d.setFullYear(d.getFullYear() + 5);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}

