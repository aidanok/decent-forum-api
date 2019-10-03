import { VoteTags } from '../schema/vote-tags';
import { PendingTxTracker, arweave, PostTreeNode } from '..';
import { ForumVoteTags } from '../schema';
import { getAppVersion } from './schema-version';
import { generateDateTags } from '../schema/date-tags';
import { addStandardTags } from './schema-utils';

const VOTE_COST = '0.1';

export async function voteOnPost(wallet: any, post: PostTreeNode, upVote: boolean, txTracker: PendingTxTracker) {

  
  const dateTags = generateDateTags(new Date());

  const tags: Partial<ForumVoteTags> = Object.assign({}, {
    voteFor: post.id,
    voteType: upVote ? '+' as '+' : '-' as '-',
    txType: 'V' as 'V', // why? 
    DFV: getAppVersion()
  }, dateTags);

  // IMPORTANT 
  // Copy over relevant tags from post, path tags and replyTo tags. 
  // These are important to speed up querying.
  
  const postTags = post.post.tags;
  
  Object.keys(postTags).forEach(key => {
    if (key.startsWith('replyTo') || key.startsWith('path') || key.startsWith('segment')) {
      (tags as any)[key] = (postTags as any)[key];
    }
  })

  // Prepare and post TX 
  const target = (upVote && post.post.from) || undefined; 

  if (!target && upVote) {
    throw new Error('Cannot upvote this because we dont have the posters address!');
  }

  const [ anchor, tx ] = await Promise.all([
    arweave.api.get('/tx_anchor').then(x => x.data as string),
    upVote ? 
      arweave.createTransaction({ 
        data: upVote ? '+' : '-', 
        quantity: arweave.ar.arToWinston(VOTE_COST),
        target: target
      }, wallet)
    :  
    arweave.createTransaction({ 
      data: upVote ? '+' : '-', 
      reward: arweave.ar.arToWinston(VOTE_COST)
    }, wallet)
  ])

  Object.keys(tags).forEach(key => {
    tx.addTag(key, (tags as any)[key]);
  })
  
  addStandardTags(tags as any);
  // assign last_tx to anchor to we can queue multiple posts.
  //if (upVote) {
    ;(tx as any).last_tx = anchor; 
  //}

  await arweave.transactions.sign(tx, wallet);

  const resp = await arweave.transactions.post(tx);
  
  if (resp.status == 200) {
    txTracker && txTracker.addPendingVoteTx(tx, tags as ForumVoteTags);
    console.log(`Vote submitted as tx: ${tx.id}`);
    return tx.id;
  } else {
    throw new Error(`TX Post failed: ${resp.statusText} (${resp.status})`);
  }
}
