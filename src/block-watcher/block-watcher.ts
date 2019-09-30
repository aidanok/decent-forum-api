import { arweave } from '../lib/permaweb';
import { NetworkInfoInterface } from 'arweave/web/network';


export type BlockWatcherSubscriber = (x: any)=>void;

// Poll some random time between 30 and 250 seconds.

const MIN_POLL_TIME = 30*1000;
const MAX_POLL_TIME = 250*1000;
const randomPollTime = () => Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME;

/**
 * Watches for new blocks to inform subscribers.
 * 
 * This is currently unfinished and not used anywhere.
 * 
 */ 
export class BlockWatcher {

  private idGen = 0;
  private subscribers: Record<number, BlockWatcherSubscriber> = {};
  private lastInfo: NetworkInfoInterface | undefined;

  constructor() {
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
    const info = await arweave.network.getInfo();
    if (!this.lastInfo) {
      this.lastInfo = info;
      await this.init()
    }
  }

  // Called once, when we get the initial network info.
  private async init() {

  }
}