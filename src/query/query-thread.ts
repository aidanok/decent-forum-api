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

export interface AllTransactionInfo {
  tags: Record<string, string>
  tx: Transaction
  extra: TransactionExtra // deprecated, use props below
  ownerAddress: string 
  isPendingTx: boolean 
}

/**
 * Query a single thread, from a root post TX.
 * 
 * @param txId 
 * @param depth - max depth, set to -1 to get entire thread. unused atm.  
 * @param cache 
 */
export async function queryThreadFromRoot(txId: string, depth: number, cache: ForumCache): Promise<PostTreeNode> {
  
  depth = -1;
  console.log(`Querying thread ${txId} with depth: ${depth}`)
  // Go ahead and query the txIds for all posts and votes in this thread. 
  
  // We should ask the cache here before we do anything. 
  // We at least ask if it has the root.
  const rootNode = cache.findPostNode(txId);
  const hasRootTx = rootNode && rootNode.isContentFiled();

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
  
  return cache.findPostNode(txId)!;
}