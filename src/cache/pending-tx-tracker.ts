import Transaction from 'arweave/web/lib/transaction';
import { ForumCache, arweave } from '..';
import { ForumPostTags } from '../schema';
import { TransactionExtra } from './transaction-extra';
import { AxiosResponse } from 'axios';

// Poll some random time between 60 and 120 seconds.

const MIN_POLL_TIME = 60*1000;
const MAX_POLL_TIME = 120*1000;
const randomPollTime = () => Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME;

// This allows a min of 180 seconds for propogation, usually more,
// before we declare it failed.
const MAX_ERRORS = 3;

/**
 * Tracks any pending TXs that are added to it, polls and 
 * keeps the cache updated. 
 * 
 * This is an accompanying class to the cache, but could be used on its own.
 * It will expose some data to the view layer, so needs to follow the same 
 * rules regarding vue reactivity as the cache.
 * 
 * This class, unlike the cache, is by it's nature asynchronous, polling and updating
 * its own state and informing the cache.
 * 
 * Handles nodes occasionally returning 404 just after the TX is mined succesfully
 * but before its been propogated. 
 * 
 * It would be nice to use BlockWatcher to do this, but it adds an edge case:
 * The client could be offline, and miss the block the TX was mined in. 
 * 
 * So we just poll for individual txs here for now.
 * 
 */

 type PendingTx = {
   countErrors: number,

   // Keep these around to give to cache later on confirm,
   // and to maybe put into a failed list for user feedback.
   tx: Transaction,
   tags: ForumPostTags,
   extra: TransactionExtra,
 }

export class PendingTxTracker {

  pending: Record<string, PendingTx> = {};

  constructor(private cache: ForumCache) {
    this.loop();
  }

  public async addPendingPostTx(tx: Transaction, tags: ForumPostTags) {
    const extra: TransactionExtra = {
      isPendingTx: true,
      ownerAddress: await arweave.wallets.ownerToAddress(tx.owner),
    }
    this.cache.addPostsMetadata({ [tx.id]: tags });
    this.cache.addPostsContent({[tx.id]: { tx, extra }});
    this.pending[tx.id] = {
      countErrors: 0,
      tx,
      tags,
      extra,
    }
  }

  async loop() {
    try {
      const pollTime = randomPollTime();
      console.info(`Polling in ${pollTime/1000} seconds`);
      await new Promise((res) => setTimeout(res, pollTime));
      await Promise.all(
        Object.keys(this.pending).map(txId => this.checkIndividual(txId))
      )
    } catch (e) {
      // Should not happen! we dont want to exit loop though, just log it.
      console.error(e);
      console.error('UNEXPECTED ERROR CAUGHT IN poll()');
    }
    this.loop();
  }

  async checkIndividual(txId: string) {
    // IMPORTANT: we should be careful about what we treat as errors.
    // Generally we are just looking to take care of propogation delays, 
    // so anything other than a 404 is not counted as an error. Though
    // we may want to add more response codes to this.
    
    // Get the axios response whether its success or failure.
    let response: AxiosResponse<any> | undefined = undefined;
    try {
      response = await arweave.api.get(`/tx/${txId}/status`);
    } catch (e) {
      response = e.response;
    }

    // Handle response if we got one. 
    if (response && response.status == 200) {
      this.confirmTx(txId);
    }
    if (response && response.status == 404) {
      // 404, probably propogation. 
      this.pending[txId].countErrors++;
      // TODO: XXX actually mark the TX as failed and remove from cache.
    }
  }

  confirmTx(txId: string) {
    const p = this.pending[txId];
    this.cache.addPostsContent({
      [txId]: {
        tx: p.tx,
        extra: Object.assign({}, p.extra, { isPendingTx: false }),
      }
    })
    delete this.pending[txId];
    console.info(`[TX Tracker] Pending TX: ${txId} CONFIRMED and cache updated.`);
  }
}