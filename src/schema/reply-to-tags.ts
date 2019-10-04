

/**
 * Like path tags, this is more an example than 
 * a full interfac, since the chain can be any 
 * amount of levels deep.
 */
export interface ReplyToTags {
  /**
   * If set, always points to a root post of a thread. 
   * If not set, this item is always referencing a root post.
   */
  replyTo0?: string 

  /**
   * If set, always points to a first level reply in a thread.
   * If not set, this item is always referencing a first level reply in a thread.
   */
  replyTo1?: string

  // ETC. 

  /**
   * Must be set to 0 for a root post, 1 for the first level post, etc.
   * If set to 1, replyTo0 must be set, 
   * If set to 2, replyTo1 must be set, 
   * etc
   */
  replyDepth: number 

}