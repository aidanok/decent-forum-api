import { arweave } from '../lib/permaweb';
import { NetworkInfoInterface } from 'arweave/web/network';



// Poll some random time between 1 & 3 minutes.
const MIN_POLL_TIME = 60*1000*1;
const MAX_POLL_TIME = 60*1000*3;

const randomPollTime = () => 
  new Promise(res => setTimeout(res, Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME))

// We don't want to completely hammer the node with requests when we 
// need to backfill, so we use a (much) smaller random delay for that.
const randomSyncDelay = () => 
  new Promise(res => setTimeout(res, (Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME) / 120))


export const BLOCKS_TO_SYNC = 7;

// Partial typing of the raw block format from the /blocks endpoint.
interface RawBlock { 
  txs: string[]
  previous_block: string
  height: number
}

export interface WatchedBlock {
  hash: string
  block: RawBlock
}

export interface BlockWatcherSubscriber { 
  (blocks: WatchedBlock[], missed: boolean): void
}


/**
 * Watches for new blocks to inform subscribers.
 *  
 * Will detect if we missed blocks (or if there is a re-org) and 
 * inform subscribers. 
 * 
 */ 

let instanceCount = 0;

export class BlockWatcher {

  private idGen = 0;
  private subscribers: Record<number, BlockWatcherSubscriber> = {};
  private blocks: WatchedBlock[] = [];

  private instance = ++instanceCount; // debug helper

  constructor() {
    this.loop();
    console.log('[BlockWatcher] started')
  }

  public subscribe(handler: BlockWatcherSubscriber): number {
    var subs = Object.values(this.subscribers)
    
    if (Object.values(this.subscribers).findIndex(x => x == handler) !== -1) {
      throw new Error('This handler is already subscribed');
    } else {
      this.subscribers[++this.idGen] = handler;
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

  private async loop() {
    try {
    } catch (e) {
      console.error(e);
      console.error(`^^ [BlockWatcher] Unexpected error ^^`);
    }
    await this.sync();
    await randomPollTime();
    this.loop();
  }

  private async sync() {
    // Get the current top hash to start. 
    let hash: string | undefined = 
      await arweave.network.getInfo().then(x => x.current);
    
    console.log(`[BlockWatcher - ${this.instance}] Checking if we have ${hash!.substr(0, 5)} as top`);
    
    let i = 0;
    let synced = false; 
    let missed = false; 

    while (hash && (i < BLOCKS_TO_SYNC)) {
      if (i > 0) {
        await randomSyncDelay();
      }
      hash = await this.maybeUpdate(hash, i);
      if (!hash) {
        // Break here so i is the number of blocks synced.
        break; 
      }
      i++;
    }
    

    // If our list grew past 'full', and our last block doesnt link to the previous one, 
    // we missed some blocks.

    missed = 
        (this.blocks.length > BLOCKS_TO_SYNC) 
        &&  
        this.blocks[BLOCKS_TO_SYNC-1].block.previous_block !== this.blocks[BLOCKS_TO_SYNC].hash;
    
    // Trim the end of our list
    this.blocks = this.blocks.slice(0, BLOCKS_TO_SYNC);
  
    if (i > 0) {
      console.log(`[BlockWatcher] Synced ${i} blocks. ${missed ? ' ! - Some blocks were missed - !' : ''}`);
      this.blocks.forEach(x => {
        console.log(`[BlockWatcher] ${x.hash.substr(0, 5)} (${x.block.height}) => ${x.block.previous_block.substr(0, 5)}`);
      })
      synced = true;
      Object.values(this.subscribers).forEach(sub => {
        // dont let subscriber exceptions stop us.
        try {
          sub(this.blocks, missed);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  // Checks if the block at IDX in our list matches hash, if not 
  // retrieve that block, insert in our list at IDX and return
  // the previous_block hash.
  // If it does match, return undefined, indicating we are properly synced 
  // from IDX onwards in our list. 
  private async maybeUpdate(hash: string, idx: number): Promise<string | undefined> {
    if (hash !== (this.blocks[idx] && this.blocks[idx].hash)) {
      let block: RawBlock = await arweave.api.get(`/block/hash/${hash}`).then(x => x.data);
      if (!block.previous_block) {
        throw Error('Invalid raw block data');
      }
      this.blocks.splice(idx, 0, { hash, block })
      return block.previous_block;
    }
    return;
  }

}