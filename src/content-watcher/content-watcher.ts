import { BlockWatcher } from '../block-watcher/block-watcher';
import { batchQueryTags, tagsArrayToObject } from '../lib/permaweb';
import { findConfig, MediaConfig } from '../media';
import { SyncResult } from '../block-watcher/types';

export type ContentTranslator = (txId: string, tags: Record<string, string>)=>any;

type TxTags = Record<string, string>;
 
/**
 * Uses BlockWatcher to get informed of new blocks and checks
 * them for interesting content. 
 * 
 */

const MAX_INTERESTING = 50;

export class ContentWatcher {

  translators: ContentTranslator[] = [];

  // Map of blockhash -> txhash -> tx tags/content
  content: Record<string, Record<string, any>> = {}
  
  interesting: { txId: string, txTags: TxTags, mediaConfig: MediaConfig} [] = []

  constructor(blocks: BlockWatcher) {
    blocks.subscribe(this.onBlocksSynced)
  }

  onBlocksSynced = (syncResult: SyncResult) => {
    const blocks = syncResult.list;
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
    // Trim any blocks that the watcher doesnt have anymore.
    Object.keys(this.content).forEach(key => {
      if (!blocks.find(b => b.hash === key)) {
        delete this.content[key];
      }
    })
  }

  async checkNewBlock(txs: string[], store: Record<string, any>) {   
    const tagsArray = await batchQueryTags(txs);
    const data = await Promise.all(
      tagsArray.map((tags, idx) => this.checkTx(txs[idx], tagsArrayToObject(tags))
      )
    );
  }

  async checkTx(txId: string, txTags: Record<string, string>) {
    const mediaConfig = findConfig(txId, txTags);
    if (mediaConfig) {
      this.interesting.unshift({ txId, txTags, mediaConfig })
    }
    // Trim interesting.
    this.interesting = this.interesting.slice(0, MAX_INTERESTING);
  }
}