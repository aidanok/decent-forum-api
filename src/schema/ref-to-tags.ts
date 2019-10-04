

/**
 * Like path tags, this is more an example than 
 * a full interface, since the chain can be any 
 * amount of levels deep.
 * 
 * This is used for posts and votes, any items related to a thread.  
 * 
 * In the case of a reply, edit, or vote, 
 * The last refTo in the chain, will be the parent. 
 * 
 * Edits will have an isEdit flag set, votes or replies can 
 * reference Edits as their parents, and its equivilent to 
 * referencing the edits 'parent' 
 * 
 * // Root post 
 * {
 *  refTo0: '' // NONE
 *  ... 
 * } 
 * 
 * 
 * 
 * // An edit of the root post. 
 * {
 *  txType: 'PE'
 *  refTo0: 'txRootId' <-- thread root & parent 
 * }
 * 
 * // A vote on the root post, edit or not. 
 * {
 *   txType: 'V'
 *   ref0: 'txRootId' <-- thread root
 *   // wasPE?: peId  dont really need it. info only. 
 * },
 * 
 * // A reply to the root post. 
 * { 
 *   txType: 'P',
 *   ref0: 'txRootId' <-- thread root & parent  
 * }
 * 
 * // A reply to the reply
 * {
 *   txType: 'P',
 *   ref0: 'txRootId'  <-- thread root 
 *   ref1: 'replyId'  <-- parent 
 * }
 * 
 * // Another reply deeper 
 * {
 *   id: reply3
 *   txType: 'P'
 *   ref0: 'txRootId' <-- thread root
 *   ref1: 'reply1' <-- parents parent
 *   ref2: 'reply2' <-- parent 
 * }
 * 
 * // An edit of that deeper reply 
 * {
 *   id: 'peditId'
 *   txType: 'PE'
 *   ref0: 'txRootId' <-- thread root
 *   ref1: 'reply1' <-- parents parent
 *   ref2: 'reply2' <-- parent 
 *   ref3: 'reply3' <-- parent 
 * }
 * // A vote on that 
 * { 
 *   id: vid,
 *   txType: 'V' 
 *   ref0: 'txRootId' <-- thread root
 *   ref1: 'reply1' <-- parents parent
 *   ref2: 'reply2' <-- parent 
 *   ref3: 'reply3' <-- parent 
 *   // wasOnPe: peditId 
 * }
 * 
 * // A reply to that edit 
 * { 
 *   txType: 'P' 
 *   ref0: 'txRootId' <-- thread root
 *   ref1: 'reply1' <-- parents parent
 *   ref2: 'reply2' <-- parent 
 *   ref3: 'reply3' <-- parent 
 *   // wasOnPe: peditId // info only.
 * }
 * 
 * 
 */
export interface ReferenceToTags {

  /**
   * If not set, this is a root item (post only)
   * If set, always points to a root item
   */
  refTo0?: string 

  /**
   * If set, always points to a 1st level item.
   * If not set, this item is always a 1st level item.
   */
  refTo1?: string

  /**
   * If set, always points to a 2st level item.
   * If not set, this item is always a 2nd level item.
   */
  refTo2?: string

  // ETC. 

  /**
   * Must be set to 0 for a root post 
   * Must be set to 1 for a 2nd level post, 
   * etc.
   */
  refToCount: string 

}

export function getRefParent(tags: ReferenceToTags) {
  const count = parseInt(tags.refToCount);
  if (!tags.refTo0) {
    throw new Error('Cannot get parent. Root Ref');
  }
  const parent = (tags as any)[`refTo${count-1}`];
  if (!parent) {
    throw new Error('Could not get parent, malformed data');
  }
  return parent;
}

export function copyRefTagsAppend(source: ReferenceToTags, to: any, append: string) {
  const count = parseInt(source.refToCount);
  for (var i = 0; i < count; i++) {
    to[`refTo${i}`] = (source as any)[`refTo${i}`];
  }
  to[`refTo${count}`] = append;
  to.refToCount = count + 1;
}