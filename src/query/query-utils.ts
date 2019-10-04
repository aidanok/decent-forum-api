import { TransactionContent, TransactionExtra } from "../cache/transaction-extra";
import Transaction, { Tag } from "arweave/web/lib/transaction";
import { arweave, ForumCache } from "..";
import { ForumPostTags } from '../schema';
import { batchQueryTx } from '../lib/permaweb';
import { decodeTransactionTags } from '../cache/cache-utils';
import { AllTransactionInfo } from './query-thread';


export async function fillCache(txIds: string[], cache: ForumCache) {

  // Setup some maps we will sort the results into. 
  const postMetadata: Record<string, ForumPostTags> = {};
  const postContents: Record<string, TransactionContent> = {};
  const voteContents: Record<string, TransactionContent> = {};
  
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