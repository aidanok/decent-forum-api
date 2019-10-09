import { RawBlock } from './types';
import { arweave } from '../lib/permaweb';

/**
 * Wait a random period of time between min and max seconds. 
 * 
 * @param minSeconds 
 * @param maxSeconds 
 */
export const randomDelayBetween = (minSeconds: number, maxSeconds: number) => {
  const ms = Math.random() * ((maxSeconds + minSeconds)*1000) + minSeconds*1000;
  console.log(`Random delay of ${ms/1000} seconds`);
  return new Promise(res => setTimeout(res,ms));
}

/**
 * Exponential backoff
 * 
 * @param startMs delay on first error (milliseconds)
 * @param maxMs maximum delay (milliseconds)
 * @param errors number of errors we have had so far, 0 will mean no delay, 1 will be startMs, etc.
 */
export const backOff = (startMs: number, maxMs: number, errors: number) => {
  const ms = Math.min(maxMs, errors * errors * startMs);
  console.warn(`Backoff, ${ms/1000} seconds, on error number: ${errors}`);
  return new Promise(res => setTimeout(res, ms));
}

/**
 * Get the raw block json from http endpoint 
 * @param hash 
 */
export const getRawBlock = (hash: string): Promise<RawBlock> =>
  arweave.api.get(`/block/hash/${hash}`).then(x => x.data);