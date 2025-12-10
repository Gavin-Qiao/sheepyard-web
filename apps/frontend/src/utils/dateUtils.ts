import { parseISO } from 'date-fns';

/**
 * Parse an ISO date string from the API, ensuring it's treated as UTC.
 * 
 * The backend's schemas.py now sends datetimes with 'Z' suffix, so this
 * function acts as a safety net for legacy data or external sources.
 * 
 * ALWAYS use this function instead of new Date() for API datetime strings.
 * See: .agent/workflows/timezone-handling.md
 */
export function parseUTCDate(dateString: string): Date {
    // If the string doesn't end with 'Z' and doesn't have a timezone offset, append 'Z'
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        return parseISO(dateString + 'Z');
    }
    return parseISO(dateString);
}
