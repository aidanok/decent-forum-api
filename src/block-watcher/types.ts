// Partial typing of the raw block format from the /blocks endpoint.
export interface RawBlock {
  txs: string[]
  previous_block: string
  height: number
  timestamp: number 
  block_size: number
}

export interface WatchedBlock {
  hash: string
  block: RawBlock
  tags: Record<string, null | Record<string, string>>
}

export interface BlockWatcherSubscriber {
  (sync: SyncResult): void
}

export interface SubscriberOptions {
  tags?: (tags: Record<string, string>) => boolean
}

export interface SyncResult {
  synced: number,
  list: WatchedBlock[],
  missed: boolean,
  reorg: boolean,
  discarded?: WatchedBlock[]
}
