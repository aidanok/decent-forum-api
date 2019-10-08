import { ForumCache, encodeForumPath, arweave, ForumTreeNode } from '..';
import { and, equals, or, ArqlOp, ArqlEquals } from './arql';
import { getAppVersion } from '../lib/schema-version';
import { fillCache } from './query-utils';

/**
 * Querys threads and votes in a given forum. 
 * 
 * TODO: support limiting by days, weeks, months. Will need a 2nd ARQL request in some cases.
 * 
 * TODO: support 'streaming' results, by not waiting until the entire set of batch gets
 *       are completed to return. Should be done in fillCache() anyway. 
 * 
 * @param forum The forum path, as an array of segments, an empty array will query all forums.
 * @param cache Optional cache to use, a temporary cache will be used if none provided.
 */
export async function queryForum(forum: string[], cache = new ForumCache(), forumDepth = 4, postDepth = 1): Promise<ForumTreeNode> {

  console.log(`[QueryForum] cache has ${cache.getCachedPostCount()} posts, and ${cache.getCachedVotesCount()} votes`)

  // This kinda tricky.. ignoring date limiting, which can be tagged onto the 
  // end of the whole query, lets look at some queries we would want to build depending
  // on the parameters given.  

  // we can start with just the simplest, the root posts, edits & votes in an exact forum path:

  /**
   *   and(
   *     path=forum <-- limits to things exactly in this forum. 
   *     or(
   *      and(type=P, refTo=0) <-- posts only that are root posts.
   *      and(type=PE, refTo=1) <-- edits only to root level posts.
   *      and(type=V, refTo=1) <-- votes only to root level posts. 
   *     )
   *   )
   */

  // Say we want to get the get the first level replies and their votes too, so we can score the threads better:

  /**
   *   and(
   *     path=forum <-- limits to things exactly in this forum. 
   *     or(
   *      and(type=P, refTo=0) <-- posts only that are root posts.
   *      and(type=PE, refTo=1) <-- edits only to root level posts.
   *      and(type=V, refTo=1) <-- votes only to root level posts.
   *      and(type=P, refTo=1) <-- 1st level posts 
   *      and(type=PE, refTo=2) <-- edits to 1st level posts (dont actually need these)
   *      and(type=V, refTo=2) <--  votes to 1st level posts
   *     )
   *   )
   */

  // So thats all fine. 

  // Lets try with subforums ! 

  // We have a forum already a few levels deep its path is : Foo > Bar> Zoom

  // We want to get data similar to the above, but also getting any forums which are
  // +2 levels deepers, heee we use pathSegments rather than just 'path' 

  /**
   * and(
   *   // Limit forum paths:
   *   pathSegment0=Foo
   *   pathSegment1=Bar
   *   pathSegment2=Zoom
   *   or(
   *     segCount=3    <--  Foo > Bar > Zoom  exactly
   *     segCount=4    <--  Foo > Bar > Zoom > [ANYTHING]
   *     segCount=5    <--  Foo > Bar > Zoom > [ANYTHING] > [ANYTHING] 
   *   )
   *   // Limit item types: 
   *   or (
   *     and(type=P, refTo=0) <-- posts only that are root posts.
   *     and(type=PE, refTo=1) <-- edits only to root level posts.
   *     and(type=V, refTo=1) <-- votes only to root level posts.
   *     and(type=P, refTo=1) <-- 1s level posts 
   *     and(type=PE, refTo=2) <-- edits to 1st level posts (dont actually need these)
   *     and(type=V, refTo=2) <--  votes to 1st level posts
   *   )
   * )
   * 
   */

  // So that works fine too. the limiting of item types is the exact same in the last 2 examples,
  // to retrieve the root & 1st level posts/edits/votes 
  // To increase the level of subforums, we are retrieving data for, we just at a few extra segCount=N to
  // to the forum limit section. 

  // There are a few ways to improve further, like only getting votes for 1st+ level posts but KISS for a first
  // pass.

  // To keep code simpler, we will not use the first format of path limiting, since the second format
  // is equivilent and just needs a single extra or to match only an exact path. 

  // Onto the code ! 

  // just a util to create range of integers [s...n] in an array. 
  const range = (s: number, n: number): number[] => [...Array(n).keys()].map(x => x + s);

  // Matches a forum path exactly, using and(segment0, segment1, ...)
  const forumPathMatch = forum.length === 0 ? null :
    and(
      ...forum.map((segment, idx) => equals(`pathSegment${idx}`, segment))
    )

  // Matches and sub-forums under this to a depth, using or(segCount=N, segcCount=N+1)
  const forumPathDepthLimit =
    or(
      ...range(forum.length, forum.length + forumDepth).map(i => equals('segCount', (i + 1).toString()))
    );

  // Matches item types we want to retrieve, post/edits/votes up to N depth.
  const itemTypesLimit =
    or(
      ...range(0, postDepth).map(i => and(equals('txType', 'P'), equals('refToCount', i.toString()))),
      ...range(0, postDepth).map(i => and(equals('txType', 'PE'), equals('refToCount', (i + 1).toString()))),
      ...range(0, postDepth).map(i => and(equals('txType', 'PV'), equals('refToCount', (i + 1).toString()))),
    )

  // Build main query with special case for empty forum [] ( all forums queury )
  const itemsQuery = forumPathMatch ?
    and(
      forumPathMatch,
      forumPathDepthLimit,
      itemTypesLimit
    )
    :
    and(
      forumPathDepthLimit,
      itemTypesLimit
    )
  ;

  const query = and(
    equals('DFV', getAppVersion()),
    itemsQuery
  );

  let results = await arweave.arql(query);

  await fillCache(results, cache);
  
  if (forum.length === 0) {
    // special case, all forums, return root forum node.
    return cache.forums;
  }

  // If we didnt find anything, return an empty ForumTreeNode with no posts or children. 
  return cache.findForumNode(forum) || new ForumTreeNode(forum);

}