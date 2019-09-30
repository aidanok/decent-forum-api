import { and, equals } from './arql';
import { arweave } from '../lib/permaweb';
import Ar from 'arweave/web/ar';


//{"op":"and","expr1":{"op":"equals","expr1":"App-Name","expr2":"arweave-id"},"expr2":{"op":"equals","expr1":"from","expr2":"uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M"}}

export type ArweaveIdInfo = { handle: null | string }

const cache: Record<string, ArweaveIdInfo | Promise<ArweaveIdInfo>> = {};
const MAX_HANDLE_LEN = 24; 

// This is quick hack to make sure if we query for the same 
// id many times at once, by placing a promise in the cache immediatly.

// TODO: XXX make something better, since loading a ton of different ids at once will 
// cause some requests to fail due to browser limits. 
// This should really be moved into the query/cache layer and be done as part 
// of retrieve the thread.

export async function queryArweaveId(address: string): Promise<ArweaveIdInfo> {
  if (!cache[address]) {
    const p = queryArweaveIdInternal(address);
    cache[address] = p;
  }
  return cache[address];
}

export async function queryArweaveIdInternal(address: string): Promise<ArweaveIdInfo> {
  if (cache[address]) {
    return cache[address];
  }
  try { 
    const results = await arweave.arql(
      and(equals("App-Name", "arweave-id"), equals('from', address), equals('Type', 'name'))
    )
    if (!results[0]) {
      return {
        handle: null,
      }
    }
    const tx = await arweave.transactions.get(results[0]);
    const handle: string | null = tx.get('data', { decode: true, string: true });
    cache[address] = {
      handle: handle.substr(0, MAX_HANDLE_LEN)
    }
    return cache[address];
  }
  catch (e) {
    return {
      handle: null,
    }
  }
}