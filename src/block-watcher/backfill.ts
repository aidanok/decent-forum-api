import { WatchedBlock, SyncResult } from './types';

import { getRawBlock } from './utils'

/**
 * Syncs from a starting hash up to N blocks, 
 * detecting re-orgs or missed blocks. 
 * 
 * @param startHash 
 * @param max 
 * @param existing 
 */
export async function backfillFromHash(startHash: string, max: number, existing: WatchedBlock[]): Promise<SyncResult> {
  
  if (existing[0] && (startHash === existing[0].hash)) {
    return { synced: 0, list: existing, missed: false, reorg: false };
  }

  const incoming: WatchedBlock[] = [];
  let curHash = startHash;
  let n = 0;
  
  while (n++ < max) {
    let next = await getRawBlock(curHash);
    incoming.push({ hash: curHash, block: next, tags: {} });

    let index = existing.findIndex(ex => next.previous_block === ex.hash)
    if (index === 0) {
      // normal.   
      return { synced: n, list: (incoming.concat(existing)).slice(0, max), missed: false, reorg: false };
    }
    if (index > 0) {
      const discarded = existing.slice(0, index);
      existing.splice(0, index);
      return { synced: n, list: (incoming.concat(existing)).slice(0, max), missed: false, reorg: true, discarded };
    }
    
    // still not synced, loop again. 
    curHash = next.previous_block;
  }

  // Finished the loop, n === max
  return { synced: n-1, list: incoming, missed: true, reorg: false }

}
