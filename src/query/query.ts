
import { and, or, equals } from './arql'
import { getAppVersion } from '../lib/schema-version';
import { arweave, PostTreeNode } from '..';
import { batchQueryTags, DecodedTag, queryTags, batchQueryTx } from '../lib/permaweb';
import { ForumCache, TransactionContent } from '../cache/cache';
import { ForumItemTags, ForumPostTags } from '../schema';
import { upgradeData, tagsArrayToObject } from './utils';
import Transaction from 'arweave/web/lib/transaction';
import { encodeForumPath } from '../lib/forum-paths';


// Its *much much* faster to do this with ArQL and concurrent requests, 
// that GraphQL. And in fact you could only use GraphQL to get the IDs. 

// We can probably improve this by just grabbing the entire TX data instead
// of tags then TX data, but there may be situations where we decide we don't 
// want the entire TX data immediately. Also this method is a more direct mapping
// of how a graphql implementation would work.

export async function queryThread(txId: string, depth: number, cache: ForumCache): Promise<PostTreeNode> {
  
  const postMetadata: Record<string, ForumPostTags> = {};
  const postContents: Record<string, TransactionContent> = {};
  
  // NOTE: we start with a txId, no tags or data,
  // so we query for the tags & data of the current, 
  // and the txIds of the next level in each iteration.

  
  let current: string[] = [ txId ]
  let next: string[] = [];
  let tagsArrays: DecodedTag[][];
  let content: (Transaction | null)[];

  while(depth-- && current.length > 0) {
    
    const filter = and(
      equals('DFV', getAppVersion()),
      or(
        ...current.map(txId => equals('replyTo', txId)),
        ...current.map(txId => equals('editOf', txId))
      )
    );

    // Filter out posts we already have. We will
    // still query for their replies/edits.
    const curCount = current.length;
    current = current.filter(id => { 
      const found = cache.findPostNode(id);
      return !found || !found.isContentFiled();
    });
    console.info(`[Query] Skipping content and metadata retrieval for ${curCount - current.length}`);

    [ tagsArrays, content, next ] = await Promise.all([
      await batchQueryTags(current),
      await batchQueryTx(current),
      await arweave.arql(filter)
    ])
    
    collectPostMetadata(postMetadata, current, tagsArrays.map(upgradeData).map(tagsArrayToObject)); 
    
    // dont actually need to await to start the next iteration. but 
    // the async operation is just a call out to native crypto so meh
    // if we were doing network ops we should not await here but only
    // after all iterations are done.
    await collectPostContents(postContents, current, content);
    
    current = next;
  }

  // Finally, add everything to the cache.
  if (cache) {
    cache.addPostsMetadata(postMetadata);
    cache.addPostsContent(postContents);
  }
  return cache.findPostNode(txId)!;
}

export async function queryForumIntoCache(forum: string[], cache: ForumCache) {
  return queryAll(forum, cache);
}

// This will collect all votes and metatags of posts, but not the content of posts.

export async function queryAll(forum: string[], cache: ForumCache) {
  
  const APP_FILTER = forum.length ? 
    and(equals('DFV', getAppVersion()), equals('path0', encodeForumPath(forum)))
    :
    equals('DFV', getAppVersion())
  
  const results = await arweave.arql(APP_FILTER);
  
  console.info(`Got ${results.length} Tx Ids`);
  
  const posts: Record<string, ForumPostTags> = {};

  const tagsArrays = await batchQueryTags(results);
  const tags = tagsArrays.map(upgradeData).map(tagsArrayToObject);

  collectPostMetadata(posts, results, tags);

  // TODO, get votes full Tx data before adding. 
  
  cache.addPostsMetadata(posts);
  
  console.log('cache ', cache.forums.children.length);
}

/**
 * Collects post metadata into a object from two arrays.
 * 
 * @param posts 
 * @param ids 
 * @param tags
 */
function collectPostMetadata(posts: Record<string, ForumPostTags>, ids: string[], tags:ForumItemTags[]) {
  for (var x = 0; x < ids.length; x++) {
    const itemTags = tags[x];
    if (itemTags.txType === 'P') {
      posts[ids[x]] = itemTags;
    }
  }
}

/**
 * Collect post content into an object from two arrays.
 * Resolves the tx.owner => walletAddress 
 * 
 * @param contents 
 * @param ids 
 * @param content 
 */
async function collectPostContents(contents: Record<string, TransactionContent>, ids: string[], content: (Transaction|null)[] ) {
  const extras = await Promise.all(
    content.map(async x => { 
      if (x) {
        return { 
          ownerAddress: await arweave.wallets.ownerToAddress(x.owner),
          isPendingTx: false,
        }
      }
      return null;
    })
  );
  
  ids.forEach((txId, idx) => {
    if (content[idx]) {
      contents[txId] = { tx: content[idx]!, extra: extras[idx]! };
    } else {
      contents[txId] = null;
    }
  });
}




