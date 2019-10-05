import Transaction from "arweave/web/lib/transaction";
/**
 * We decode the transaction into this structure to give it to the cache,
 * Includes some redundancy for compatability purposes.
 * The cache does not  do any async operations, so we need to do anything async
 * before giving it data (convert owner to ownerAddress)
 * Its also useful to just immediately decode the tags.
 *
 */
export interface AllTransactionInfo {
  /**
   * The decoded tags
   */
  tags: Record<string, string>;
  /**
   * The raw TX
   */
  tx: Transaction;
  /**
   * The from wallet address
   */
  ownerAddress: string;
  /**
   * Flag indicating whether this TX is pending in the mempool or it was the result of a query.
   */
  isPendingTx: boolean;
}
