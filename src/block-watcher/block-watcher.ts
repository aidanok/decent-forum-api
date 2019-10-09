import { arweave, queryTags, tagsArrayToObject } from '../lib/permaweb';
import { BlockWatcherSubscriber, WatchedBlock, SyncResult, SubscriberOptions } from './types';
import { syncFromHash } from './backfill';
import { randomDelayBetween, backOff } from './utils';


export interface BlockWatcherOptions {
  minPollTime: number 
  maxPollTime: number 
  blocksToSync: number
  startupDelay: number
}

export class BlockWatcher {

  private idGen = 0;
  private subscribers: Record<number, BlockWatcherSubscriber> = {};
  private blocks: WatchedBlock[] = [];
  
  private lastResult?: SyncResult 
  private options: BlockWatcherOptions = {
    minPollTime: 0.75,
    maxPollTime: 2,
    blocksToSync: 7,
    startupDelay: 0.2,
  }

  constructor() {

    this.start();
  }

  public subscribe(handler: BlockWatcherSubscriber, opts?: SubscriberOptions): number {
    var subs = Object.values(this.subscribers)

    if (Object.values(this.subscribers).findIndex(x => x == handler) !== -1) {
      throw new Error('This handler is already subscribed');
    } else {
      this.subscribers[++this.idGen] = handler;
      // Call the subscriber immediately. 
      setTimeout(() => {
        if (this.lastResult) {
          handler(this.lastResult);
        }
      }, 0);

      return this.idGen;
    }
  }

  public unsubscribe(sub: number | BlockWatcherSubscriber) {
    const idx: number = typeof sub === 'number' ?
      sub
      :
      Object.values(this.subscribers).findIndex(x => x === sub)

    delete this.subscribers[idx];
  }

  private async start() {
    await new Promise(res => setTimeout(res, this.options.startupDelay*1000));
    console.log('[BlockWatcher] started')
    let errors = 0;
    
    while (true) {
      try {
        const top = await arweave.network.getInfo().then(x => x.current);
        const result = await syncFromHash(top, this.options.blocksToSync, this.blocks);
        console.log(`[BlockWatcher] sycnFromHash ${top.substr(0, 6)} finished, synced: ${result.synced}`);
        
        this.blocks = result.list;
        this.blocks.forEach(b => {
          console.log(`Block: ${b.hash.substr(0, 6)}\n--${b.block.txs.length} TXs: ${b.block.txs.map(x => x.substr(0,3)).join(',')}`)
        })

        await this.fillTags();
        this.lastResult = result;
        this.handleResult(result);

        // reset error counter.
        errors = 0;
        
        // wait for next poll.
        await randomDelayBetween(this.options.minPollTime, this.options.maxPollTime);

      } catch (e) {
        console.log(e);
        errors++;
        console.error(`BACKOFF ${errors}`);
        await backOff(1500, 60 * 1000 * 5, errors);
      }
    }
  }

  private async handleResult(result: SyncResult) {

    Object.values(this.subscribers).forEach(sub => {
      // dont let subscriber exceptions stop us.
      try {
        sub(result);
      }
      catch (e) {
        console.error(e);
        console.error('[BlockWatcher] caught error in subscriber handler.')
      }
    })
  }

  // Returns tags as object, or null if we couldn't 
  // get them after 2 retries.
  private getTagsMaybe(txId: string): Promise<Record<string, string> | null> {
    return queryTags(txId, 1)
      .then(tagsArrayToObject)
      .catch(e => {
        console.error(e);
        console.error(`Couldnt get tags for txId ${txId}`);
        return null;
      })
  }

  private async fillTags() {
    // search whole list of blocks for txs that dont have their tags fill yet. 
    // gives us array of all blocks, with a string[] array of txids that have 
    // no tags info. 
    const txs = this.blocks.map(b => b.block.txs.filter(txId => !b.tags[txId]))

    // iterate that list and for the txs that have no tags, try 
    // retrieve, then fill in the tags info in the block list. 
    for (let blockIdx = 0; blockIdx < txs.length; blockIdx++) {
      
      const txList = txs[blockIdx];

      if (txList.length) {
        // some txs dont have tags.
        const tags = await Promise.all(
          txList.map(tx => this.getTagsMaybe(tx))
        )
        // fill them into orginal block list.
        for (var i = 0; i < txList.length; i++) {
          const txId = txList[i];
          this.blocks[blockIdx].tags[txId] = tags[i];
        }
      }
    }
  }

}







