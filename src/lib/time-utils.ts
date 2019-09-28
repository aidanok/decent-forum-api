
/**
 * Gets the ISO week number of the year (1-52) 
 * Taken from: https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
 * 
 * @param d  The date to get the week number of.
 */
export function getWeekNumber(d: Date) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  // Return array of year and week number
  return [d.getUTCFullYear(), weekNo];
}

/**
 * Gets Timezone offet in ISO standard format ( for example, Z or -01:30 or + 02:00 ) 
 */
export function getISOTimezoneOffset(d: Date) {
  
  const timezone_offset_min = d.getTimezoneOffset();
	let offset_hrs: number | string = parseInt(Math.abs(timezone_offset_min/60) as any);
	let offset_min: number | string = Math.abs( timezone_offset_min % 60);
  
  if (offset_hrs < 10)
    offset_hrs = '0' + offset_hrs;

  if(offset_min < 10)
	  offset_min = '0' + offset_min;

  let timezone_standard: string = 'Z'; 

  if(timezone_offset_min < 0)
    timezone_standard = '+' + offset_hrs + ':' + offset_min;
  if(timezone_offset_min > 0)
    timezone_standard = '-' + offset_hrs + ':' + offset_min;
  
  return timezone_standard;
}