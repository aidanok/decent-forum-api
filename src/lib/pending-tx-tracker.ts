import Transaction from 'arweave/web/lib/transaction';


const MIN_POLL_TIME = 30*1000;
const MAX_POLL_TIME = 120*1000;
const randomPollTime = () => Math.random() * (MAX_POLL_TIME - MIN_POLL_TIME) + MIN_POLL_TIME;

/**
 * Tracks any pending TXs that are added to it. 
 * 
 * Handles nodes occasionally returning 404 just after the TX is mined succesfully
 * but before its been propogated.
 * 
 */
export class PendingTxTracker {

  pending = [] as Transaction[]; 

  constructor() {
    this.loop();
  }

  async loop() {
    try {
      const pollTime = randomPollTime();
      console.info(`Polling in ${pollTime/1000} seconds`);
      await new Promise((res) => setTimeout(res, pollTime));
      await this.checkPending();
    } catch (e) {
      // Should not happen! we dont want to exit loop though, just log it.
      console.error(e);
      console.error('UNEXPECTED ERROR CAUGHT IN poll()');
    }
    this.loop();
  }

  async checkPending() {

  }
}