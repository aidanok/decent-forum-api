import Transaction from 'arweave/web/lib/transaction';
import { ForumCache, arweave } from '..';
import { ForumPostTags, ForumItemTags, ForumVoteTags } from '../schema';
import { AxiosResponse } from 'axios';
import { BlockWatcher } from '../block-watcher/block-watcher';
import { VoteTags } from '../schema/vote-tags';
import { AllTransactionInfo } from './all-transaction-info';
import { decodeTransactionTags } from './cache-utils';
import { SyncResult } from '../block-watcher/types';

// Poll some random time between 60 and 120 seconds.

const MIN_POLL_TIME = 60*1000;
const MAX_POLL_TIME = 120*1000;
const randomPollTime = () => Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME;

// This allows a min of 180 seconds for propogation, usually more,
// before we declare it failed.
const MAX_ERRORS = 3;

/**
 * Adds a tx to the cache in a pending state. 
 * 
 * Uses the BlockWatcher to confirm when its been mined and updates the
 * cache. 
 * 
 * Currently, this never fails a pending TX, propogation can take a long
 * time so pending TXs can return 404s for quite a while. Need to determine
 * how long we should wait before we mark it as failed. 
 * 
 */

export class PendingTxTracker {

  pending: Record<string, AllTransactionInfo & { countErrors: number }> = {};

  constructor(private cache: ForumCache, private blockWatcher: BlockWatcher) {
    this.blockWatcher.subscribe((syncResult) => this.onBlocksSynced(syncResult));
  }

  public async addPendingVoteTx(tx: Transaction, tags: ForumVoteTags) {
    
    const allInfo: AllTransactionInfo = {
      isPendingTx: true,
      ownerAddress: await arweave.wallets.ownerToAddress(tx.owner), 
      tx, 
      tags: decodeTransactionTags(tx)
    }
    this.cache.addVotes({[tx.id]: allInfo});
    this.pending[tx.id] = Object.assign({ countErrors: 0}, allInfo);
  }

  public async addPendingPostTx(tx: Transaction, tags: ForumPostTags) {
    
    
    const allInfo: AllTransactionInfo = {
      isPendingTx: true,
      ownerAddress: await arweave.wallets.ownerToAddress(tx.owner), 
      tx, 
      tags: decodeTransactionTags(tx)
    }

    this.cache.addPosts({ [tx.id]: allInfo });
    this.pending[tx.id] = Object.assign({ countErrors: 0}, allInfo);
    
    console.info(`[PendingTxTracker] Started tracking TX: ${tx.id}`);
  }


  // Called when blockwatcher gets some new blocks.
  private onBlocksSynced(syncResult: SyncResult) {
   
    for (let i = 0; i < syncResult.list.length; i++) {

      // Dont bother checking blocks if we are not tracking anything. 
      if (Object.keys(this.pending).length === 0) {
        break;
      
      }
      // Check if any txs we are tracking have been mined
      const txs = syncResult.list[i].block.txs;
      txs.forEach(tx => {
        if (this.pending[tx]) {
          this.confirmTx(tx);
        }
      })

    }
  }

  private async confirmTx(txId: string) {
    const info = this.pending[txId];
    console.info(`[PendingTXTracker] Pending TX: ${txId} CONFIRMED`);
    delete this.pending[txId];
    console.info(`[PendingTXTracker] Pending TX: ${txId} CONFIRMED and cache updated.`);
    this.cache.confirmPendingItem(info);
  }


}