import Transaction, { Tag } from "arweave/web/lib/transaction";
import { arweave, ForumCache } from "..";
import { batchQueryTx } from '../lib/permaweb';
import { decodeTransactionTags } from './cache-utils';
import { AllTransactionInfo } from './all-transaction-info';

export async function fillCache(txIds: string[], cache: ForumCache) {

  // Setup some maps we will sort the results into. 
  const postContents: Record<string, AllTransactionInfo> = {};
  const voteContents: Record<string, AllTransactionInfo> = {};
  
  const origLen = txIds.length;
  // Filter out things we dont need to query for. 
  txIds = txIds.filter(id => !cache.isFullTxPresent(id));
  txIds = txIds.filter(id => !cache.isVoteCounted(id))

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
      const allInfo: AllTransactionInfo = {
        tags,
        tx: txInfo.tx,
        ownerAddress: await arweave.wallets.ownerToAddress(txInfo.tx.owner),
        isPendingTx: false
      }
      return allInfo;
    })
  );
  
  for (let i = 0; i < txsFull.length; i++) {
    if (txsFull[i].tags['txType'] === 'P') {
      postContents[txsFull[i].tx.id] = txsFull[i];
    }
    if (txsFull[i].tags['txType'] === 'PE') {
      postContents[txsFull[i].tx.id] = txsFull[i];
    }
    if (txsFull[i].tags['txType'] === 'V') {
      voteContents[txsFull[i].tx.id] = txsFull[i];
    }
  }
  cache.addPosts(postContents);
  cache.addVotes(voteContents);
}