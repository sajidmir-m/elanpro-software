import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { format, isValid, parse } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats ticket dates that arrive as DD-MM-YYYY, ISO, or Excel-like strings. */
export function formatTicketDate(
  value: string | Date | null | undefined,
  pattern = 'dd MMM yyyy',
): string {
  if (value == null || value === '') return '';

  if (value instanceof Date) {
    return isValid(value) ? format(value, pattern) : '';
  }

  const raw = String(value).trim();
  const datePart = raw.split(',')[0]?.trim() ?? raw;

  if (/^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
    const parsed = parse(datePart, 'dd-MM-yyyy', new Date());
    return isValid(parsed) ? format(parsed, pattern) : raw;
  }

  const parsed = new Date(raw);
  return isValid(parsed) ? format(parsed, pattern) : raw;
}
