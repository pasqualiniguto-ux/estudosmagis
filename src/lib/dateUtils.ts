/**
 * Utility functions for dates using Brasília timezone (America/Sao_Paulo).
 */

const BRASILIA_TZ = 'America/Sao_Paulo';

/** Returns current date/time adjusted to Brasília timezone */
export function nowBrasilia(): Date {
  const now = new Date();
  const brasiliaStr = now.toLocaleString('en-US', { timeZone: BRASILIA_TZ });
  return new Date(brasiliaStr);
}

/** Formats a Date as YYYY-MM-DD in Brasília timezone */
export function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns today's date string in Brasília timezone */
export function todayStr(): string {
  return toDateStr(nowBrasilia());
}
