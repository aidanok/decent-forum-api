import { ForumPostTags } from '../schema/';
import { VoteTags } from '../schema/vote-tags';
import { arweave, PostTreeNode } from '..';
import { PendingTxTracker } from '../cache/pending-tx-tracker';
import { normalizeForumPathSegments, encodeForumPath } from './forum-paths';
import { PathTags } from '../schema/path-tags';
import { getAppVersion } from './schema-version';
import { PostTags, decodeReplyToChain, encodeReplyToChain } from '../schema/post-tags';
import { generateDateTags } from '../schema/date-tags';

export function buildPostTagsForReply(replyingTo: PostTreeNode, options?: Partial<PostTags>, fakeDate?: Date) { 
  
  const postTags: PostTags = {} as any;
  
  // deprecated
  postTags.replyTo = replyingTo.post.tags.replyTo;
  
  // Copy and append to the replyTo chain.
  const replyToChain = decodeReplyToChain(replyingTo.post.tags);
  encodeReplyToChain(postTags, replyToChain.concat(replyingTo.id));
  
  // Copy path segments as-is
  Object.keys(replyingTo.post.tags).forEach(key => {
    if (key.startsWith('path') || key.startsWith('segment')) {
      (postTags as any)[key] = (replyingTo.post.tags as any)[key];
    }
  })

  

  const dateTags = generateDateTags(fakeDate || new Date());

  return Object.assign(
      postTags, 
      options, 
      dateTags,
      { DFV: getAppVersion(), txType: 'P' as 'P' },
      { isReply: '1' }
    );
}

/**
 * Build the complete tags for a post.
 * 
 * @param pathSegement 
 * @param options 
 * @param fakeDate alternate Date to use, for testing purposes.
 */
export function buildPostTags(pathSegement: string[], options: PostTags, fakeDate?: Date): ForumPostTags {
  
  const segments = normalizeForumPathSegments(pathSegement);
  
  const pathTags: PathTags = {} as any;

  for (var i = 0; i < segments.length; i++) {
    (pathTags as any)[`segment${i}`] = segments[i];
    (pathTags as any)[`path${i}`] = encodeForumPath(segments.slice(0, segments.length-i))
  }

  // Get date tags
  const dateTags = generateDateTags(fakeDate || new Date());

  return Object.assign(pathTags, options, dateTags, { DFV: getAppVersion(), txType: 'P' as 'P' });
}

/**
 * Post a new post or reply to an existing post. 
 * 
 * @param wallet 
 * @param postTags 
 * @param postData 
 * @param txTracker 
 * @param fakeDate Use a different Date instead of now(), just for testing purposes
 */
export async function postPost(wallet: any, postData: string | Buffer, tags: ForumPostTags, txTracker?: PendingTxTracker): Promise<string> {
  
  console.info(tags);
  console.info('^^ Posting with Tags ^^')
  console.info(postData)
  console.info('^^ Posting with Data ^^')

  const [ anchor, tx ] = await Promise.all([
    arweave.api.get('/tx_anchor').then(x => x.data as string),
    arweave.createTransaction({ data: postData, }, wallet)
  ])
  
  Object.keys(tags).forEach(key => {
    tx.addTag(key, (tags as any)[key]);
  })

  // assign last_tx to anchor to we can queue multiple posts.
  ;(tx as any).last_tx = anchor; 

  await arweave.transactions.sign(tx, wallet);

  const resp = await arweave.transactions.post(tx);
  
  if (resp.status == 200) {
    txTracker && txTracker.addPendingPostTx(tx, tags);
    console.log(`Post submitted as tx: ${tx.id}`);
    return tx.id;
  } else {
    throw new Error(`Post failed: ${resp.statusText} (${resp.status})`);
  }
}

export async function voteOnPost(wallet: any, vote: VoteTags) {

}



