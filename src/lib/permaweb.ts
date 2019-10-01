
/**
 * Exports a shared arweave instance and any helper methods 
 * related directly to arweave.
 * 
 * This file is a incredibly messy at the moment.
 *  
 */

import Arweave from 'arweave/web';
import * as ArweaveUtils from 'arweave/web/lib/utils';
import Transaction from 'arweave/web/lib/transaction';

const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

const origArql = arweave.arql;

// Monkey patch arql to log timing & debug info to console.
arweave.arql = async function(query: object): Promise<string[]> {
  const t = new Date().getTime();
  const results = await origArql.call(this, query);
  console.info(`ArQl time: ${(new Date().getTime() - t)/1000} seconds, ${results.length} rows`, query);
  return results;
}

export interface DecodedTag {
  name: string
  value: string 
}

// Un-used at present.
export interface BatchContinuation<T> {
  remaining: string[]
  results: T[][]
}

export function tagsArrayToObject(tags: DecodedTag[]): Record<string, string> {
  var ret: Record<string, string> = {}
  tags.forEach((x) => ret[x.name] = x.value);
  return ret;
}

// export async function batchQueryTags(txIds: string[], continuations: true): Promise<BatchContinuation<DecodedTag>>;

// export async function batchQueryTags(txIds: string[], continuations: false): Promise<DecodedTag[][]>;

export async function batchQueryTags(txIds: string[]): Promise<DecodedTag[][]>  {
  const batchSize = 20;
  const maxRequestRetries = 4;
  const context = {
    remaining: txIds.slice(),
    results: [] as DecodedTag[][]
  }
  const tstart = new Date().getTime();
  while (context.remaining.length > 0) {
    const t0 = new Date().getTime();
    const batch = context.remaining.slice(0, batchSize).map(x => queryTags(x, maxRequestRetries))
    const batchResults = await Promise.all(batch);
    context.results = context.results.concat(batchResults);
    console.info(`[Tags Batch] ${batch.length} took ${(new Date().getTime() - t0) / 1000} seconds`);
    context.remaining = context.remaining.slice(batchSize);
    //if (continuations) {
    //  return context;
    //}
  }
  console.info(`[Tags Batch] Total of ${txIds.length} took ${(new Date().getTime() - tstart) / 1000} seconds`);
  return context.results;
}

export async function queryTags(txId: string, retries: number): Promise<DecodedTag[]> {
  let response = null as null | any[];
  let tryNumber = 1; 
  while (retries--) {
    try {
      const resp = await arweave.api.get(`/tx/${txId}/tags`);
      response = resp.data; 
    } catch (e) {
      console.error(e);
      console.log(`Error during batch get, try number: ${tryNumber}`);
      // backoff
      await new Promise(res => setTimeout(res, 150*tryNumber*tryNumber))
    }
    if (Array.isArray(response)) {
      return response.map(row => decodeTag(row));
    } else {
      console.error(`Received non-array in queryTags:`, response);
      throw new Error(`Received non-array in queryTags: ${response}`);
    }
  }
  throw new Error('Retries exhausted during batch get, giving up');
}

function decodeTag(x: any): DecodedTag {
  if (!x || typeof x['name'] !== 'string' || typeof x['value'] !== 'string') {
    throw new Error(`Error decoding tag from object: ${x}`);
  }
  return { 
    name: ArweaveUtils.b64UrlToString(x.name),
    value: ArweaveUtils.b64UrlToString(x.value)
  }
}

/**
 * When batch querying txs, we want to be a bit more tolerant of failures. 
 * TX propogation is one reason, and bigger data payloads means more chance
 * of failures. 
 * 
 * For this reason we also can return null for any individual tx in the batch 
 * if we failed to retreive it.
 * 
 * TODO: XXX this can be smarter, at the moment one failing TX will delay us
 * retrieving the next batch, when it could just be put back in the queue to
 * be tried with the next batch.  
 * 
 * 
 * @param txIds 
 */
export async function batchQueryTx(txIds: string[]): Promise<(Transaction | null)[]>  {
  const batchSize = 20;
  const maxRequestTrys = 4;
  const context = {
    remaining: txIds.slice(),
    results: [] as (Transaction | null)[]
  }
  const tstart = new Date().getTime();
  while (context.remaining.length > 0) {
    const t0 = new Date().getTime();
    const batch = context.remaining.slice(0, batchSize).map(x => queryTx(x, maxRequestTrys))
    const batchResults = await Promise.all(batch);
    context.results = context.results.concat(batchResults);
    console.info(`[TX Batch] ${batch.length} took ${(new Date().getTime() - t0) / 1000} seconds`);
    context.remaining = context.remaining.slice(batchSize);
    //if (continuations) {
    //  return context;
    //}
  }
  console.info(`[TX Batch] Total of ${txIds.length} took ${(new Date().getTime() - tstart) / 1000} seconds`);
  return context.results;
}

/**
 * batch query for a Tx 
 * We use a higher and faster backoff here as tx propagation can take a minute or two. 
 * We also have an option to softFail, and not throw but return null if we cant get the tx data 
 * 
 * @param txId 
 * @param maxRequestTrys 
 * @param softFail is this is set, we dont throw on eventual failure, but return null.
 */
export async function queryTx(txId: string, maxRequestTrys: number, softFail: boolean = false): Promise<Transaction | null> {
  let tryNumber = 0;
  while (tryNumber++ < maxRequestTrys) {
    try {
      return await arweave.transactions.get(txId);
    } catch (e) {
      console.error(e);
      console.log(`Error during batch get, try number: ${tryNumber}`);
      await new Promise(res => setTimeout(res, 800*tryNumber*tryNumber*tryNumber))
    }
  }
  if (softFail) {
    return null;
  }
  throw new Error('Retries exhausted during batch get, giving up');
}

export function isValidWalletAddr(str: string): boolean {  
  return str.length === 43
}

export { arweave };


