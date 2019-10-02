import { VoteTags } from '../schema/vote-tags';
import { PendingTxTracker, arweave } from '..';

export async function voteOnPost(wallet: any, txId: string, upVote: boolean, txTracker: PendingTxTracker) {
  const tags: VoteTags = {
    voteFor: txId,
    voteType: upVote ? '+' : '-'
  }

  const [ anchor, tx ] = await Promise.all([
    arweave.api.get('/tx_anchor').then(x => x.data as string),
    arweave.createTransaction({ data: tags.voteType, }, wallet)
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
