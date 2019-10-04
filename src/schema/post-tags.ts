import { PostFormat } from './formats';

/**
 * 
 * Things we would like to support: 
 * 
 * Image post  
 * Video post
 * Audio post , 
 * BBCode / Markdown / Rich Text (HTML) Posts 
 * Polls 
 * 
 * Un-replyable posts. 
 * 
 * Sticky posts (by designated wallets only, needs ForumConfig to support it)
 * 
 * Locking format of replies.
 *  - This could be handled at the forum level, or first post in a thread, or both.
 *  - I can't see a good case for replies in thread being able to lock formats for subsequent replies 
 *    but it doesnt add much complexity to.
 * 
 * Locking would specify the format of replies must be an allowed type, set by the poster/forum.
 * 
 * Ideally we would like to be able to lock to a set of possible post types. 
 * 
 */

export interface PostTags {
  
  /**
   * The format of this post. 
   */
  format: PostFormat

  /**
   * The description, title or caption of this post.
   */
  description?: string

  /**
   * (Optional) reply to chain of the post this is replying to. 
   * Can point to any edit of the post.
   * 
   * Stored in a de-normalized format. Posts must copy ALL of the
   * replyToN of the post they are replying to, and add their own
   * at the end. 
   *  
   */

  //replyTo0?: string
  //replyTo1?: string
  // ... etc ... //

  replyTo?: string // deprecated. still being populated alongside the denormalized form. 
  

  /**
   * (Optional) TX of the post this is an edit of. Must be from the same wallet.
   * 
   * MUST Have the same replyTo chain as the post it is editing.
   */
  editOf?: string
}


export function decodeReplyToChain(tags: PostTags) {
  const numbers = Object.keys(tags)
    .filter(tname => tname.startsWith('replyTo') && tname.length > 7)
    .map(tname => new Number(tname.substr(7)))
    .sort();

  const sorted: string[] = numbers.map(no => (<any>tags)[`replyTo${no}`])
  return sorted; 
}

export function encodeReplyToChain(tags: PostTags, chain: string[]) {
  for (var i = 0; i < chain.length; i++) {
    (tags as any)[`replyTo${i}`] = chain[i];
  }
}


// TODO: use + comapre
export function verifyReplyToChain(tags: PostTags): boolean {
  const numbers = Object.keys(tags)
    .filter(tname => tname.startsWith('replyTo'))
    .map(tname => new Number(tname.substr(7)))
    .sort();
  for (var i = 0; i < numbers.length; i++) {
    if (i !== numbers[i] || typeof numbers[i] !== 'string' || (tags as any)[`replyTo${i}`].length < 4) {
      return false;
    }
  }
  return true;
}
