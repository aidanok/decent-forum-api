import Transaction from "arweave/web/lib/transaction";

/**
 * Some extra informaton about the transaction the cache needs.
 * 
 * This is includes anything that needs to be calculated async, 
 * such as the owner -> address, and anything only the user of 
 * the cache knows, such as whether the TX is pending or mined.
 * 
 */
export interface TransactionExtra {
  ownerAddress: string
  isPendingTx: boolean
}