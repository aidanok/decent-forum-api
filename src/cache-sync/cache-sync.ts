import { BlockWatcher } from '../block-watcher/block-watcher';
import { SyncResult } from '../block-watcher/types';
import { ForumCache } from '../cache/cache';
import { getAppVersion } from '../lib/schema-version';
import { extractPathSegmentsFromTags } from '../schema/path-tags';
import { fillCache } from '../cache/fill-cache';


export class CacheSync {

  constructor(private cache: ForumCache, private watcher: BlockWatcher) {
    watcher.subscribe((x) => this.onBlocksSynced(x));
  }

  onBlocksSynced(syncResult: SyncResult) {
    // Just check all blocks, since occaisionally, tags may not have 
    // been retrieved for a tx but then retrieve in a later poll by 
    // block watcher. 

    // Very simple, we check if any of the TXs are from our app, 
    // if they are, we check if we the forum path they are
    // about is in our cache already, if so, we try and add them to 
    // to the cache. 
    console.log(`ON BLOCKS SYNCED`);
    const interesting: Record<string, Record<string, string>> = {};
     
    for (let i = 0; i < syncResult.list.length; i++) {
      const watchedBlock = syncResult.list[i];
      Object.keys(watchedBlock.tags).forEach(txId => {
        
        const txTags = watchedBlock.tags[txId];
        if (!txTags) {
          return; 
        }

        if (txTags['DFV'] === getAppVersion()) {
          console.log(txTags);
          console.log('TX TAGS');  
          if (txTags['txType'] !== 'P' && txTags['txType'] !== 'PE' && txTags['txType'] !== 'V') {
            // not a post, edit, or vote, so ignore
            return;
          }

          // see if its a forum we have in our cache. 
          const segments = extractPathSegmentsFromTags(txTags);
          const forumNode = this.cache.findForumNode(segments);
          if (forumNode) {
            interesting[txId] = txTags;
          } else {
            console.log(`[CacheSync] Ignoring item from path: ${segments.join(' > ')}`)
          }

        }
      })
    }
    
    this.onInteresting(interesting);
  }

  async onInteresting(txs: Record<string, Record<string, string>>) {
    if (Object.keys(txs).length) {
      console.log(`Got ${Object.keys(txs).length} intresting txs from sync, filling cache`);
      await fillCache(Object.keys(txs), this.cache);
    }
  }

}