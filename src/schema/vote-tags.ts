

export interface VoteTags {
  /**
   * The TXID that this vote is for.
   * This can be the id of the original or any edit of the post.
   */
  voteFor: string
  voteType: string // should be + / -   TS fails type checking this somewhere..

}

