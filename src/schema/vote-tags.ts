

export interface VoteTags {
  /**
   * The TXID that this vote is for. 
   *  (TBD should be for the first revision always or ? )
   */
  voteFor: string
  voteType: '+' | '-' 
}

