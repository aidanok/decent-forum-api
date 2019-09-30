import { arweave } from '../lib/permaweb';
import { NetworkInfoInterface } from 'arweave/web/network';


export type BlockWatcherSubscriber = (x: any)=>void;

// Poll some random time between 1 & 3 minutes.
const MIN_POLL_TIME = 60*1000*1;
const MAX_POLL_TIME = 60*1000*3;

const randomPollTime = () => 
  new Promise(res => setTimeout(res, Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME))

// We don't want to hammer the node with requests when we 
// need to sync/backfill, so we use a smaller delay for that.
// Whatever the poll time parameters are in minutes,
// we use the same but in seconds.
const randomSyncTime = () => 
  new Promise(res => setTimeout(res, (Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME) / 60))


const BLOCKS_TO_SYNC = 2;

/**
 * Watches for new blocks to inform subscribers.
 * 
 * This is currently unfinished and not used anywhere.
 * 
 */ 

interface RawBlock {
  
  txs: string[],
  previous_block: string,
}

export class BlockWatcher {

  private idGen = 0;
  private subscribers: Record<number, BlockWatcherSubscriber> = {};
  private blocks: { hash: string, block: RawBlock }[] = []

  constructor() {
    this.loop();
  }

  public subscribe(handler: BlockWatcherSubscriber): number {
    if (Object.values(this.subscribers).findIndex(handler) === -1) {
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
      Object.values(this.subscribers).findIndex(sub)
  
    delete this.subscribers[idx];  
  }

  private async loop() {
    try {
      await this.sync();
    } catch (e) {
      console.error(e);
      console.error(`^^ [BlockWatcher] Unexpected error ^^`);
    }
    await randomPollTime();
    this.loop();
  }

  private async sync() {
    // Get the current top hash to start. 
    let hash: string | undefined = 
      await arweave.network.getInfo().then(x => x.current);
    
    console.log(`[BlockWatcher] Checking if we have ${hash} as top`);
    
    let i = 0;
    while (hash && (i < BLOCKS_TO_SYNC)) {
      if (i > 0) {
        await randomSyncTime();
      }
      hash = await this.maybeUpdate(hash, i);
      i++;
    }

    if (this.blocks.length > BLOCKS_TO_SYNC) {
      // We did get some extra blocks ! 
      // Check if we missed any. 
      if (this.blocks[BLOCKS_TO_SYNC-1].block.previous_block !== this.blocks[BLOCKS_TO_SYNC].hash) {
        console.log(this.blocks);
        console.log(`[BlockWatcher] We missed some blocks!`)
      }
      // Trim the end of our list
      this.blocks = this.blocks.slice(0, BLOCKS_TO_SYNC);
    }
  }

  // Checks if the block at IDX in our list matches hash, if not 
  // retrieve that block, insert int our list at IDX and return
  // the previous_block hash. 
  // If that hash matches our list returned undefined, indicating we 
  // are properly synced from IDX onwards in our list. 
  private async maybeUpdate(hash: string, idx: number): Promise<string | undefined> {
    if (hash !== (this.blocks[idx] && this.blocks[idx].hash)) {
      let block: RawBlock = await arweave.api.get(`/block/hash/${hash}`).then(x => x.data);
      if (!block.previous_block) {
        throw Error('Invalid raw block data');
      }
      this.blocks.splice(idx, 0, { hash, block })
      console.log(`[BlockWatcher] Added new block at ${idx}`, { hash, block });
      return block.previous_block;
    }
    return;
  }

}