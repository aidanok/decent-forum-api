import { BlockWatcher, WatchedBlock } from '../block-watcher/block-watcher';
import { batchQueryTags, tagsArrayToObject } from '../lib/permaweb';


export type ContentTranslator = (txId: string, tags: Record<string, string>)=>any;

/**
 * Uses BlockWatcher to get informed of new blocks and checks
 * them for interesting content. 
 * 
 */
export class ContentWatcher {

  translators: ContentTranslator[] = [];

  // Map of blockhash -> txhash -> tx tags/content
  content: Record<string, Record<string, any>> = {}

  constructor(blocks: BlockWatcher) {
    blocks.subscribe(this.onBlocksSynced)
  }

  onBlocksSynced = (blocks: WatchedBlock[], missed: boolean) => {
    for (var i = 0; i < blocks.length; i++) {
      if (!this.content[blocks[i].hash]) {
        const store: Record<string, any> = {};
        this.content[blocks[i].hash] = store;
        this.checkNewBlock(blocks[i].block.txs, store)
        .catch(e => {
          console.error(e);
        });
      }
    }
  }

  async checkNewBlock(txs: string[], store: Record<string, any>) {
    const tagsArray = await batchQueryTags(txs);
    const data = await Promise.all(
      tagsArray.map((tags, idx) => this.checkTx(txs[idx], tagsArrayToObject(tags))
      )
    );
    // trim oldest content. 
  }

  async checkTx(txId: string, tags: Record<string, string>) {
    
  }
}