
/**
 *  Forum paths are in the form: Foo_Bar_Whiz 
 *  To allow the actual _ in a forum name, we need to handle escaping and unescaping. 
 *  We also disallow newlines, normalize whitespace and normalize unicode characthers.
 * 
 *  A forum path like: " Things > A_B > Subforum " will be encoded as: 
 * 
 *  Things/A\_B/Subforum
 * 
 */


/**
 * Splits a path on the '/' delimter respecting and un-escaping \/ sequences.
 * 
 * @param path 
 */
export function decodeForumPath(path: string): string[] {
  const result = path.match(/(\\.|[^\_])+/g)
  if (!result) {
    throw new Error('Invalid Forum Path');
  }
  return result.map(seg => seg.replace('\\_', '_'));
}

/**
 * Encodes an array of path segments to an escaped string.
 * Normalizes whitespaces & newline characthers.
 * 
 * @param segments 
 */
export function encodeForumPath(segments: string[]): string {
  return normalizeForumPathSegments(segments).join('_')
}

/**
 * Normalizes and escapes an array of path segments.
 * 
 * @param segments 
 */
export function normalizeForumPathSegments(segments: string[]): string[] {
  return segments.map(seg => 
      seg
        .trim() // Remove all leading and trailing whitespace
        .normalize() // Normalize Unicode 
        .replace(/\s+/g, ' ') // Normalize any whitespace (tabs, new lines, multiple spaces) to a single space
        .replace('_', '\\_') // Escape the path seperator '-'
      )
}