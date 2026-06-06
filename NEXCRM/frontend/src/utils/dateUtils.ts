/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Safely parse a date value and return a valid Date object
 * @param dateValue - Date string, Date object, or null/undefined
 * @returns Valid Date object or null if invalid
 */
export function parseDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateValue);
      return null;
    }
    return date;
  } catch (error) {
    console.warn('Error parsing date:', dateValue, error);
    return null;
  }
}

/**
 * Format a date as a localized date string (MM/DD/YYYY or based on locale)
 * @param dateValue - Date string, Date object, or null/undefined
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string or fallback value
 */
export function formatDate(
  dateValue: string | Date | null | undefined,
  locale: string = 'en-US',
  fallback: string = '—'
): string {
  const date = parseDate(dateValue);
  if (!date) return fallback;
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date as a localized datetime string
 * @param dateValue - Date string, Date object, or null/undefined
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted datetime string or fallback value
 */
export function formatDateTime(
  dateValue: string | Date | null | undefined,
  locale: string = 'en-US',
  fallback: string = '—'
): string {
  const date = parseDate(dateValue);
  if (!date) return fallback;
  
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date for chart/tooltip display with short month name
 * @param dateValue - Date string, Date object, or null/undefined
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string or fallback value
 */
export function formatChartDate(
  dateValue: string | Date | null | undefined,
  locale: string = 'en-US',
  fallback: string = '—'
): string {
  const date = parseDate(dateValue);
  if (!date) return fallback;
  
  // Use explicit format to avoid "/" characters
  const month = date.toLocaleDateString(locale, { month: 'short' });
  const day = date.getDate();
  
  return `${month} ${day}`;
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @param dateValue - Date string, Date object, or null/undefined
 * @returns Relative time string or fallback value
 */
export function getRelativeTime(
  dateValue: string | Date | null | undefined,
  fallback: string = '—'
): string {
  const date = parseDate(dateValue);
  if (!date) return fallback;
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return formatDate(date);
  }
}

/**
 * Check if a date is valid
 * @param dateValue - Date string, Date object, or null/undefined
 * @returns true if date is valid, false otherwise
 */
export function isValidDate(dateValue: string | Date | null | undefined): boolean {
  return parseDate(dateValue) !== null;
}
