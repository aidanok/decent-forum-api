import { arweave, queryTags, tagsArrayToObject, batchQueryTags } from '../lib/permaweb';
import { BlockWatcherSubscriber, WatchedBlock, SyncResult, SubscriberOptions } from './types';
import { backfillFromHash } from './backfill';
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
    minPollTime: 85,
    maxPollTime: 270,
    blocksToSync: 9,
    startupDelay: 120,
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
      console.log(`[BlockWatcher] Subscriber added ${this.idGen}`)
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
        const result = await backfillFromHash(top, this.options.blocksToSync, this.blocks);
        console.log(`[BlockWatcher] sycnFromHash ${top.substr(0, 6)} finished, synced: ${result.synced}`);
        
        this.blocks = result.list;
       
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
    console.log(`[BlockWatcher] Handling result of sync, we have ${Object.values(this.subscribers).length} subscribers`);
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


  private async fillTags() {
    // search whole list of blocks for txs that dont have their tags filled yet. 
    // gives us array of all blocks, with a string[] array of txids that have 
    // no tags info. 
    const txs = this.blocks.map(b => b.block.txs.filter(txId => !b.tags[txId]))

    // iterate that list and for the txs that have no tags, try 
    // retrieve, then fill in the tags info in the block list. 
    for (let blockIdx = 0; blockIdx < txs.length; blockIdx++) {
      
      const txList = txs[blockIdx];
      if (!txList.length) {
        continue; 
      }

      try { 
        const txTags = await batchQueryTags(txList, 1);
        for (let i = 0; i < txList.length; i++) {
          this.blocks[blockIdx].tags[txList[i]] = tagsArrayToObject(txTags[i]);
        }
      } catch (e) {
        console.warn(`Unable to retrieve tags, will try again sometime later`);
      }
      await randomDelayBetween(0.8, 2);
    }

  }

}







