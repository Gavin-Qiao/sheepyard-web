import { parseISO } from 'date-fns';

/**
 * Parse an ISO date string from the API, ensuring it's treated as UTC.
 * The backend stores datetimes without timezone info but they are actually UTC.
 * This function appends 'Z' if missing to ensure parseISO treats it as UTC.
 */
export function parseUTCDate(dateString: string): Date {
    // If the string doesn't end with 'Z' and doesn't have a timezone offset, append 'Z'
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        return parseISO(dateString + 'Z');
    }
    return parseISO(dateString);
}
