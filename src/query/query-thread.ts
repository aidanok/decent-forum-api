import { ForumCache, PostTreeNode, arweave } from '..';
import { ForumPostTags, ForumVoteTags } from '../schema';
import { TransactionContent, TransactionExtra } from '../cache/transaction-extra';
import { DecodedTag, batchQueryTags, batchQueryTx, tagsArrayToObject } from '../lib/permaweb';
import Transaction from 'arweave/web/lib/transaction';
import { and, equals, or } from './arql';
import { getAppVersion } from '../lib/schema-version';
import { equal } from 'assert';
import { decodeTransactionTags } from '../cache/cache-utils';
import { fillCache } from './query-utils';


/**
 * Query a single thread, from a root post TX.
 * 
 * TODO: support querying from a reply TX downwards, pretty simple, just need to 
 * do one additional query to get the thread root and title etc.
 * 
 * TODO: support 'streaming' results, by not waiting until the entire batch get of 
 *       TXs return before returning. Probably suited to seperate method.
 * 
 * @param txId - the TxId of the root post. MUST be a root post, not a reply. 
 * @param cache - optional cache to use. 
 * @param depth - max depth, defaults to -1 which is the entire thread no matter how deep.
 */
export async function queryThread(txId: string, cache?: ForumCache, depth: number = -1): Promise<PostTreeNode> {
  
  // Construct a temporary cache so we can use it to build the thread tree structure. 
  if (!cache) cache = new ForumCache();

  console.log(`Querying thread ${txId} with depth: ${depth}`)
  // Go ahead and query the txIds for all posts and votes in this thread. 
  
  // We should ask the cache here before we do anything. 
  // We at least ask if it has the root.
  const rootNode = cache.findPostNode(txId);
  
  const query = and(
      equals('DFV', getAppVersion()),
      equals('refTo0', txId),
      or(
        equals('txType', 'P'), 
        equals('txType', 'V'),
        equals('txType', 'PE')
      )
    );
  
  const txIds = [txId, ...await arweave.arql(query)];
  
  await fillCache(txIds, cache);
  
  // if we are using a temp cache, it will be garbage collected, since no-one references it, its 'unreachable' 
  return cache.findPostNode(txId)!;
}