import { getWeekNumber, getISOTimezoneOffset } from '../lib/time-utils';

/**
 * DateTags allow us to query temporaly 
 * However they can't be trusted. (they are set by client)
 * Either: 
 *  - Check against block time and discard any TX thats outside a window. (allowing for broken client clocks)
 *  - Dont use them for any kind of ordering or sorting, only for querying.
 * 
 * They MUST use UTC time. 
 * We record the clients Timezone. 
 * We omit seconds and milliseconds. 
 * We can pass these back into Date.parse() 
 * 
 */
export interface DateTags {
  /** Day, 1-31 */
  DD: string
  /** Month, 0-12 */
  MM: string
  /** 4 Digit Year */
  YYYY: string
  /** Hours */
  HH: string
  /** Minutes */
  mm: string
  /** Week of Year 1-52 */
  WW: string
  /** Day of week, 0-6, (Sun-Sat) just for fun! */
  WD: string
  /** Timezone in ISO format, suitable for passing back into Date.parse() */
  TZ: string
}


/**
 * Creates a DateTags object from a give time 
 * 
 * @param date Date to get tags for
 */
export function generateDateTags(date: Date): DateTags {
  const tags: DateTags = {
    DD: date.getUTCDate().toString(),
    MM: date.getUTCMonth().toString(),
    YYYY: date.getUTCFullYear().toString(),
    HH: date.getUTCHours().toString(),
    mm: date.getUTCMinutes().toString(),
    WW: getWeekNumber(date)[1].toString(),
    WD: date.getUTCDay().toString(),
    TZ: getISOTimezoneOffset(date).toString()
  }
  return tags;
}

/**
 * Creates a javascript date object from DateTags 
 * 
 * @param tags 
 */
export function dateTagsToDate(tags: DateTags): Date {
  return new Date(
    Date.parse(`${tags.YYYY}-${pad(parseInt(tags.MM)+1)}-${pad(tags.DD)}T${tags.HH}:${tags.mm}:00${tags.TZ}`)
  );
}

function pad(s: string | number) {
  return `0${s}`.slice(-2)
}


