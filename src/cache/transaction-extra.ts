import Transaction from "arweave/web/lib/transaction";

/**
 * Since the cache doesn't do any async work, we
 * ask the client to add some extra things to the 
 * transaction before giving it to the cache. 
 * 
 * We ask it to resolve owner to an address, and 
 * any other async work that is needed.
 * 
 */


export interface TransactionExtra {
  ownerAddress: string
}