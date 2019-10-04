import { ForumCache, encodeForumPath, arweave, ForumTreeNode } from '..';
import { and, equals, or } from './arql';
import { getAppVersion } from '../lib/schema-version';
import { fillCache } from './query-utils';

/**
 * Querys threads and votes in a given forum. 
 * 
 * TODO: support limiting by days, weeks, months. Will need a 2nd ARQL request in some cases.
 * TODO: support pre-fetching threads to a certain depth. Needs support in the cache for recording
 *        what depth we are currently at so we know if we need to query for more later.
 * 
 * TODO: support 'streaming' results, by not waiting until the entire set of batch gets
 *       are complete to return. Perhaps suited to being a seperate amethod. 
 * 
 * @param forum The forum path, as an array of segments, an empty array will query all forums.
 * @param cache Optional cache to use, a temporary cache will be used if none provided.
 */
export async function queryForum(forum: string[], cache = new ForumCache()): Promise<ForumTreeNode> {

  let depth = 0; // we only support querying the root posts atm.
  console.log(`[QueryForum] cache has ${cache.getCachedPostCount()} posts, and ${cache.getCachedVotesCount()} votes`)
  // Get posts, edits & votes for all the top posts.  
  let query = and(
    equals('DFV', getAppVersion()),
      or(
        equals('txType', 'P'), 
        equals('txType', 'V'),
        equals('txType', 'PE')
      )
  );
  
  // If no forum, we query all forums.
  if (forum.length) {
    query.and(equals('path0', encodeForumPath(forum)))
  }

  // Note we do want to include TXs with refToCount 0 . They are
  // the root posts in a thread.
  // We dont support a depth of more than 1 at the moment, this 
  // will always loop once.
  while (depth-- >= 0) {
    query.and(equals('refToCount', depth.toString()))
  }

  let results = await arweave.arql(query);
  
  /*console.info(`[QueryForum] Got ${results.length} Tx Ids querying for Forums`);
  let origLength = results.length; 
  // filter out txs we already have cached.
  results = results.filter(id => !cache.isFullTxPresent(id));
  console.info(`[QueryForum] Trimmed ${origLength = results.length} from checking cache`);
  */
 
  await fillCache(results, cache);
  if (forum.length === 0) {
    return cache.forums;
  }
  return cache.findForumNode(forum) || new ForumTreeNode(forum); 

 }