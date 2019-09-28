
import { and, or, equals } from '../lib/arql'
import { getAppVersion } from '../lib/schema-version';
import { arweave } from '..';
import { batchQueryTags, DecodedTag, queryTags, batchQueryTx } from '../lib/permaweb';
import { ForumCache } from '../cache/cache';
import { ForumItemTags, ForumPostTags } from '../schema';
import { upgradeData, tagsArrayToObject } from './utils';
import Transaction from 'arweave/web/lib/transaction';
import { stringToB64Url } from 'arweave/web/lib/utils';


export async function queryThread(txId: string, depth: number, cache: ForumCache) {
  
  const posts: Record<string, ForumPostTags> = {};
  
  // NOTE: we only have the txId, no tags, 
  // so we query for the tags of current, and the txIds 
  // of the next level in each iteration.

  // TODO: XXX Check cache for every txId we encounter, if we
  // already have it in the cache, we dont need to query the tags for that txId.
  // Same for content.

  let current: string[] = [ txId ]
  let next: string[] = []; 
  let tagsArrays: DecodedTag[][]; 
  let content: (Transaction | null)[];

  while(depth--) {
    
    const filter = and(
      equals('DFV', getAppVersion()),
      or(
        ...current.map(txId => equals('replyTo', txId)),
        ...current.map(txId => equals('editOf', txId))
      )
    );

    [tagsArrays, content, next] = await Promise.all([
      await batchQueryTags(current),
      await batchQueryTx(current),
      await arweave.arql(filter)
    ])
    
    resultsIntoPosts(posts, current, tagsArrays.map(upgradeData).map(tagsArrayToObject)); 
    
    // Convert content into map.
    const postContents: Record<string, Transaction | null> = {};
    current.forEach((txId, idx) => {
      postContents[txId] = content[idx];
    })
    
    if (cache) {
      cache.addPosts(posts);
      cache.addPostsContent(postContents);
    }

    current = next;  
  }

  // Get the last set of tags.
  tagsArrays = await batchQueryTags(current);
  resultsIntoPosts(posts, current, tagsArrays.map(upgradeData).map(tagsArrayToObject));

  if (cache) {
    cache.addPosts(posts);
  }
  console.log(cache)
  return posts;
}

export async function queryForumIntoCache(path: string[], cache: ForumCache) {
  return queryAll(cache);
}

/**
 * This querys ALL app data & tags. :S 
 * 
 * @param cache 
 */
export async function queryAll(cache: ForumCache) {
  
  const APP_FILTER = equals('DFV', getAppVersion());
  const results = await arweave.arql(APP_FILTER);
  
  
  console.info(`Got ${results.length} Tx Ids`);
  
  const posts: Record<string, ForumPostTags> = {};

  const tagsArrays = await batchQueryTags(results);
  const tags = tagsArrays.map(upgradeData).map(tagsArrayToObject);

  resultsIntoPosts(posts, results, tags);

  // TODO, get votes full Tx data before adding. 
  
  cache.addPosts(posts);
  
  console.log('cache ', cache.forums.children.length);
}

/**
 * Populates a map of posts from two arrays.
 * 
 * @param posts 
 * @param ids 
 * @param tags
 */
function resultsIntoPosts(posts: Record<string, ForumPostTags>, ids: string[], tags:ForumItemTags[]) {
  for (var x = 0; x < ids.length; x++) {
    const itemTags = tags[x];
    if (itemTags.txType === 'P') {
      posts[ids[x]] = itemTags;
    }
  }
}




