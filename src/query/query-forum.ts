import { ForumCache, encodeForumPath, arweave } from '..';
import { and, equals, or } from './arql';
import { getAppVersion } from '../lib/schema-version';
import { fillCache } from './query-utils';

export async function queryForum(forum: string[], cache: ForumCache) {
  
  let depth = 1; // depth of threads to get, just the top post is enough.

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

  while (depth--) {
    query.and(equals('refToCount', depth.toString()))
  }

  let results = await arweave.arql(query);
  
  console.info(`Got ${results.length} Tx Ids querying for Forums`);
  
  // filter out txs we already have cached.
  results = results.filter(id => !cache.isFullTxPresent(id));
  console.info(`Trimmed to ${results.length} from checking cache`);

  await fillCache(results, cache);
  
  

 }