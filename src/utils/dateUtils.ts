/**
 * Date formatting utilities for CoreFlow Maintenance Cloud.
 * Mandate: ALL date fields and displays across the App and generated reports
 * MUST strictly use DD/MM/AAAA format (day/month/year).
 */

/**
 * Formats any date input (string, number, Date) to "DD/MM/AAAA".
 * Prevents timezone shifting for pure YYYY-MM-DD date strings.
 *
 * @param dateInput The date to format
 * @param fallback Fallback string if date is missing or invalid (default: '-')
 * @returns Formatted string in "DD/MM/AAAA"
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  fallback: string = '-'
): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return fallback;
  }

  // If already a Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return fallback;
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // If numeric timestamp
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const str = String(dateInput).trim();
  if (!str) return fallback;

  // Pattern 1: Pure YYYY-MM-DD or ISO timestamp starting with YYYY-MM-DD at 00:00:00
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day}/${month}/${year}`;
  }

  // Pattern 2: Already DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Pattern 3: ISO with non-zero time or general date string
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    return fallback;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a date with time as "DD/MM/AAAA HH:mm".
 *
 * @param dateInput The date to format
 * @param fallback Fallback string if date is missing or invalid (default: '-')
 * @returns Formatted string in "DD/MM/AAAA HH:mm"
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  fallback: string = '-'
): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return fallback;
  }

  const str = String(dateInput).trim();

  // If pure date (YYYY-MM-DD), format as DD/MM/AAAA without time
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return formatDate(str, fallback);
  }

  const d = dateInput instanceof Date ? dateInput : new Date(str);
  if (isNaN(d.getTime())) {
    return formatDate(dateInput, fallback);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Converts a DD/MM/AAAA string to standard ISO date format (YYYY-MM-DD).
 * Useful for inputs and API communication.
 */
export function parseDateToISO(dmy: string): string | null {
  if (!dmy) return null;
  const match = dmy.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Formats a date range as "DD/MM/AAAA a DD/MM/AAAA".
 */
export function formatDateRange(
  start?: string | null,
  end?: string | null,
  fallbackStart: string = 'Inicio',
  fallbackEnd: string = 'Hoy'
): string {
  const startStr = start ? formatDate(start) : fallbackStart;
  const endStr = end ? formatDate(end) : fallbackEnd;
  return `${startStr} a ${endStr}`;
}
