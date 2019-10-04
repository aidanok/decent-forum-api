

/**
 * 
 * This is more an example than 
 * a full interface, since the chain can be any 
 * amount of levels deep, might be a better way to type it. 
 *  
 * This is a general purpose structure for tags to encode a tree structure
 * that you are able to query at some point (a txid) and with a depth
 * limit. The 'count' field is imporant as it allows us to limit the 
 * depth we query the tree.
 * 
 * To query a tree from the root, say 3 levels deep, we query: 
 * 
 * refTo0='someId  AND ( refTocount=1 OR refToCount = 2 OR refToCount = 3 ) 
 * 
 * (The ORs are needed since we only have the equals operator, ideally it just be LT 4)
 * 
 * To query a subtree, for example at depth 3 to 4+N we just query: 
 * 
 * (refTo0='rootId' AND refTo1='parent1' AND refTo2='someid')  AND ( refTocount=4+1 OR ... refToCount=4+N ) 
 * 
 * The ANDs in the first part are to ensure we dont get data from a different subtree that 
 * also happen to have refTo2='someId'.  
 * 
 * We could get rid of the ANDs by encoding the chain as a single tag. as well as the individual refToN tags
 * so, instead of the first set of ANDs we query: 
 * 
 * (refChain="tx1,tx2,tx3") AND ( refToCount=4+1 OR refToCount=4+2 ... )
 * 
 * Its unlikley to be worth the extra storage, since it should be v. cheap for nodes to AND/OR operations anyway.
 * 
 * // Root post / object
 * {
 *  refTo0: '' // NONE
 *  ... 
 * } 
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
 *   // wasPE?: peId  app specific, info only. 
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
 *   ref1: 'reply1' <-- 
 *   ref2: 'reply2' <-- parent parent
 *   ref3: 'reply3' <-- parent 
 * }
 * // A vote on that edit
 * { 
 *   id: vid,
 *   txType: 'V' 
 *   ref0: 'txRootId' <-- thread root
 *   ref1: 'reply1' <-- parents parent
 *   ref2: 'reply2' <-- parent 
 *   ref3: 'reply3' <-- parent 
 *   // wasOnPe: peditId  // app spefic, informational only.
 * }
 * 
 * // A reply to that edit 
 * { 
 *   txType: 'P' 
 *   ref0: 'txRootId' <-- thread root
 *   ref1: 'reply1' <-- parents parent
 *   ref2: 'reply2' <-- parent 
 *   ref3: 'reply3' <-- parent 
 *   // wasOnPe: peditId // app specific, informationl only.
 * }
 * 
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