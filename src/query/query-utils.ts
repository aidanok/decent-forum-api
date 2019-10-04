import { TransactionContent, TransactionExtra } from "../cache/transaction-extra";
import Transaction, { Tag } from "arweave/web/lib/transaction";
import { arweave, ForumCache } from "..";
import { ForumPostTags } from '../schema';
import { batchQueryTx } from '../lib/permaweb';
import { decodeTransactionTags } from '../cache/cache-utils';

/**
 * We decode the transaction into this structure to give it to the cache, 
 * Includes some redundancy for compatability purposes. 
 * The cache does not  do any async operations, so we need to do anything async 
 * before giving it data (convert owner to ownerAddress)
 * Its also useful to just immediately decode the tags.
 * 
 */
export interface AllTransactionInfo {
  
  /**
   * The decoded tags
   */
  tags: Record<string, string>
  
  /**
   * The raw TX
   */
  tx: Transaction
  
  /**
   * For compat, ignore.
   */
  extra: TransactionExtra 
  
  /**
   * The from wallet address 
   */
  ownerAddress: string
  
  /**
   * Flag indicating whether this TX is pending in the mempool or it was the result of a query.
   */ 
  isPendingTx: boolean 
}


export async function fillCache(txIds: string[], cache: ForumCache) {

  // Setup some maps we will sort the results into. 
  const postMetadata: Record<string, ForumPostTags> = {};
  const postContents: Record<string, TransactionContent> = {};
  const voteContents: Record<string, TransactionContent> = {};
  
  const origLen = txIds.length;
  // Filter out things we dont need to query for. 
  txIds = txIds.filter(id => 
    !(cache.isFullTxPresent(id) || cache.isVoteCounted(id))
  );

  console.info(`[FillCache] Skipping retrieving ${origLen - txIds.length} that are in the cache`)

  // Get all tx data and ignore any nulls.  
  const maybeTxs = await batchQueryTx(txIds);

  // ignore txs we couldnt retrieve..
  const txs: { id: string, tx: Transaction}[] = [];
  for (let i = 0; i < txIds.length; i++) {
    if (maybeTxs[i]) {
      txs.push({ id: txIds[i], tx: maybeTxs[i]! })
    }
  }

  // Convert to ANOTHER wierd tx thing. 
  const txsFull = await Promise.all(
    txs.map(async txInfo => {
      const tags = decodeTransactionTags(txInfo.tx);
      const extra: TransactionExtra = {
        ownerAddress: await arweave.wallets.ownerToAddress(txInfo.tx.owner),
        isPendingTx: false,
        txType: tags['txType']
      }
      const allInfo: AllTransactionInfo = {        
        extra,
        tags,
        tx: txInfo.tx,
        ownerAddress: extra.ownerAddress,
        isPendingTx: false
      }
      return allInfo;
    })
  );
  
  for (let i = 0; i < txsFull.length; i++) {
    if (txsFull[i].tags['txType'] === 'P') {
      postMetadata[txsFull[i].tx.id] = txsFull[i].tags as any;
      postContents[txsFull[i].tx.id] = txsFull[i];
    }
    if (txsFull[i].tags['txType'] === 'PE') {
      postMetadata[txsFull[i].tx.id] = txsFull[i].tags as any;
      postContents[txsFull[i].tx.id] = txsFull[i];
    }
    if (txsFull[i].tags['txType'] === 'V') {
      voteContents[txsFull[i].tx.id] = txsFull[i];
    }
  }
  cache.addPostsMetadata(postMetadata);
  cache.addPostsContent(postContents);
  cache.addVotesContent(voteContents);
}