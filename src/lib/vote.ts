import { VoteTags } from '../schema/vote-tags';
import { PendingTxTracker, arweave, PostTreeNode } from '..';

const VOTE_COST = '0.1';

export async function voteOnPost(wallet: any, post: PostTreeNode, upVote: boolean, txTracker: PendingTxTracker) {
  
  const tags: VoteTags = {
    voteFor: post.id,
    voteType: upVote ? '+' : '-'
  }

  const target = (upVote && post.post.from) || undefined; 

  if (!target && upVote) {
    throw new Error('Cannot upvote this because we dont have the posters address!');
  }

  const [ anchor, tx ] = await Promise.all([
    arweave.api.get('/tx_anchor').then(x => x.data as string),
    arweave.createTransaction({ 
      data: tags.voteType, 
      reward: !upVote ? arweave.ar.arToWinston(VOTE_COST) : undefined,
      quantity: upVote ? arweave.ar.arToWinston(VOTE_COST) : undefined,
      target: target
    }, wallet)
  ])

  Object.keys(tags).forEach(key => {
    tx.addTag(key, (tags as any)[key]);
  })
  
  // assign last_tx to anchor to we can queue multiple posts.
  ;(tx as any).last_tx = anchor; 
  
  await arweave.transactions.sign(tx, wallet);

  const resp = await arweave.transactions.post(tx);
  
  if (resp.status == 200) {
    txTracker && txTracker.addPendingVoteTx(tx, tags);
    console.log(`Vote submitted as tx: ${tx.id}`);
    return tx.id;
  } else {
    throw new Error(`TX Post failed: ${resp.statusText} (${resp.status})`);
  }
}
