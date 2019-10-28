import { decodeForumPath } from '../lib/forum-paths';
import { ForumPost } from './forum-post';
import { ForumTreeNode } from './forum-tree-node';
import { PostTreeNode } from './post-tree-node';
import { arweave } from '..';
import { getRefParent, isRefRoot } from '../schema/ref-to-tags';
import { AllTransactionInfo } from "./all-transaction-info";

/**
 * A client side cache of forums/posts/votes
 * 
 * This is lazily populated with the data the user browses to. 
 * So if they link directly into a subforum like Foo > Bar -> Whiz 
 * A request will be sent to retrieve only that data and place it 
 * in the cache. Similarly if they link directly to a thread on opening
 * the app, only that thread will be put into the cache.
 * 
 * 
 * This class **should not have any async methods of any type**
 * All methods should complete synchronously.  
 * 
 * Other systems & apis retrieve data asynchronously and 
 * fill/update the cache.
 * 
 * This is just to make the cache easy to reason about, ie it makes a 
 * synchronous data structure. 
 * 
 * Important: This will be added to Vue components as part of their 
 * reactive data properties. This means we must follow some simple 
 * rules due to how Vue 2.0 handles reactivity: 
 * 
 * 1) When adding keys to an object, you need to replace the object:
 * 
 *    NO: x.thing[newKey] = 'x'
 *    YES: x.thing = Object.assign({}. { [newKey]: 'x' }) 
 * 
 * 2) Do not set array values directly by index: 
 * 
 *    NO: myArray[3] = 'x' 
 *    YES: any other way (splice, push, shift, etc work fine)
 * 
 * 4) Use 'null' to signify 'no value' or optional values. 
 * 
 * 3) No use of ES Set or Map 
 * 
 * This doesn't matter for local variables inside methods, or 
 * private properties, only for the public properties and the object graph 
 * they expose for the views. (Currently this is only the 'forums' property and 
 * its descendants)
 * 
 * It's mostly taken care of in the *Node sibling classes
 * 
 * Vue 3.0 I believe will switch to a ES proxy method which doesnt have
 * these limitations.
 * 
 * This class is not specific to Vue, it has no dependencies on it, 
 * so it should be useable with another frontend framework.
 * 
 */

 export class ForumCache {
  
  /**
   * Forum tree. The root node has an empty segment and 
   * should never have any posts in it. Nodes down the
   * tree will have a list of PostTreeNode trees for each
   * thread in the cache.
   */
  public forums: ForumTreeNode = new ForumTreeNode([]);

  /**
   * Flat map of all PostTreeNodes for easier searching/querying. 
   * TODO: Should be a Record<string, PostTreeNode> or a Map for 
   * faster searching. 
   * 
   * The Nodes referenced here are same objects as stored in the ForumTree.
   */
  private posts: Record<string, PostTreeNode> = {}

  /**
   * All votes, just record their ids.
   */
  private votes: string[] = []
  

  public getCachedPostCount() {
    return Object.keys(this.posts).length;
  }
  
  public getCachedVotesCount() {
    return this.votes.length;
  }

  /**
   * Searches for a ForumTreeNode for a given path, 
   * 
   * Returns null if not found in cache.
   * 
   * @param segments an array of path segments returned by decodeForumPath()
   */
  public findForumNode(segments: string[]): ForumTreeNode | null {
    
    // Using this method to find the root node is probably a mistake, 
    // so throw an Error.
    if (segments.length === 0) {
      throw new Error('Cannot find with empty path');
    }

    let f: ForumTreeNode | undefined = this.forums;
    for (let i = 0; i < segments.length; i++) {
      f = f.children[segments[i]];
      if (!f) {
        // Not found. 
        break; 
      }
    }
    return f || null; 
  }

  /**
   * Finds a PostTreeNode by txId
   * 
   * We return null for Vues sake, though it does make 
   * for some ugly need for type annotation elsewhere. 
   * 
   * @param txId 
   */
  public findPostNode(txId: string): PostTreeNode | null {
    return this.posts[txId] || null;
  }

  public isVoteCounted(txId: string): boolean {
    return this.votes.indexOf(txId) !== -1;
  }

  public isFullTxPresent(txId: string): boolean {
    const pn = this.findPostNode(txId);
    return !!(pn && !pn.isPendingTx && pn.isContentFilled());
  } 

  public findPostsFrom(address: string) {
    return Object.values(this.posts).filter(x => x.post.from === address);
  }

  /**
   * Add a map of post metadata.
   * 
   * This will add replies/edits into the tree in the correct place. 
   * The content will be added in subsequent step with addPostsContent.
   * 
   * It may result in orphans
   * 
   * Orphans are edits or replies that do not have their referenced 
   * post in the cache OR in the map passed in. They are returned to 
   * the caller who can decide on a course of action.
   * 
   * Code can be a cleaned up a little more, only the try* methods
   * need to declared inside the function, to close over the posts
   * and orphans objects while recursing. 
   * 
   * TODO: Ensure malformed/corrupt data is try catched and discarded and doesnt
   * stop processing.  
   * 
   * TODO: Ensure validate against schema ( not here though.)
   * We do this a bit (for eg check edit owner is same as original owner), 
   * but it really needs to be refactored into a distinct step for clarity and ease of auditing, 
   * and made more comprehensive. 
   * 
   * 
   * @param posts 
   */
  public addPosts(posts: Record<string, AllTransactionInfo>): Record<string, AllTransactionInfo> {

    const orphans: Record<string, AllTransactionInfo> = {}

    // try* functions: set of mutually recursive functions that will either 
    // add the post in the correct place in the tree, or place it in the orphans 
    // list that is returned to the caller.
    
    // we need to do it this way because posts can be given to the cache in any
    // order, ie, we may process a reply to a post before we process the original
    // post. This will check both the posts already in the cache, and the 
    // posts passed in to find a parent. We could maybe just sort the posts 
    // before processing but im not sure that is any easier.  
    
    const tryFindParentForEdit = (parentId: string): PostTreeNode | undefined => {
      let existing = posts[parentId] && tryAdd(parentId);
      if (!existing) {
        existing = this.posts[parentId];
      }
      
      if (!existing) {
        // orphan :(
        orphans[parentId] = posts[parentId]
        return; 
      }

      return existing
    }

    const tryFindParentForReply = (parentId: string): PostTreeNode | undefined => {
      let parent = posts[parentId] && tryAdd(parentId);
      if (!parent) {
        parent = this.posts[parentId];
      }
      if (!parent) {
        // orphan :(
        orphans[parentId] = posts[parentId];
        return; 
      }
      return parent;
    }
    
    const tryAdd = (id: string): PostTreeNode | undefined | null => {
      
      let existing: PostTreeNode | null | undefined = this.findPostNode(id)
      
      if (existing) {
        return existing;
      }
      const tags = posts[id].tags;
      if (!tags) {
        throw new Error('No post tags provided!');
      }

      // Recurse to ensure our parent post is added
      // before we are.

      const isRoot = isRefRoot(tags);
      const refTo = !isRoot ? getRefParent(tags) : undefined;
      
      if (refTo && tags.txType === 'P') {
        existing = tryFindParentForReply(refTo);
        if (existing) {
          const forumPost = new ForumPost(
            id, 
            tags as any, 
            posts[id].ownerAddress, 
            posts[id].tx.get('data', { decode: true, string: true })
          )
          const newNode = existing.addReply(forumPost, { isPendingTx: posts[id].isPendingTx })
          this.posts[id] = newNode;
          return newNode;
        }
        orphans[id] = posts[id];
        return;
      }
      if (refTo && tags.txType === 'PE') {
        existing = tryFindParentForEdit(refTo)
        if (existing) {
          
          // Validation, 
          if (existing.post.from !== posts[id].ownerAddress) {
            console.warn(existing.post.from);
            console.warn(posts[id].ownerAddress);
            throw new Error('Edit is not from the owner'); 
          }
          
          const forumPost = new ForumPost(
            id, 
            tags as any, 
            posts[id].ownerAddress, 
            posts[id].tx.get('data', { decode: true, string: true })
          )
          
          const newNode = existing.addEdit(forumPost, { isPendingTx: posts[id].isPendingTx} );

          this.posts[id] = newNode;
          
          // since it was an edit, we return its parent in this case.
          return newNode.parent; 
        }

        // Nowhere to for it go, put it in orphans list :(
        orphans[id] = posts[id];
        return; 
      }
      
      return this.addTopLevelPost(id, posts[id])
      
    }

    Object.keys(posts).forEach(id => {
      try {
        tryAdd(id)
      } catch (e) {
        console.error(e);
        console.error('caught error adding post', posts[id]);
      }
    })

    console.info(`Added ${Object.keys(posts).length}, ${Object.keys(orphans).length} orphans, cache posts: ${this.posts.length}`)  
    if (Object.keys(orphans).length > 0) {
      console.debug('orphans', orphans); 
    }
    
    return orphans;
  }

  public addVotes(content: Record<string, AllTransactionInfo>) {
    console.info(`Got ${Object.keys(content).length} votes to add to cache`);
    
    const requiredAmt = 0.1;

    Object.keys(content).forEach(txId => {
      
      const info = content[txId];
      const tags = info.tags

      if (tags['txType'] !== 'V' && !tags['refToCount'] && !tags['voteType']) {
        // not a vote, ignore it
        console.warn(tags);
        console.warn(`Ignorning non-vote passed to addVotes`);
        return;
      }

      const from = info.ownerAddress;
      // Now just verify the amount, find the post, verify its not 
      // the owner and the user didnt vote before. 
      const txQty = new Number(arweave.ar.winstonToAr(info.tx.quantity));
      const txReward = new Number(arweave.ar.winstonToAr(info.tx.reward));
      const upVote = tags['voteType'] === '+'; 
      const voteFor = getRefParent(tags as any);
      
      // VALIDATE 
      const postNode = this.findPostNode(voteFor);
      
      if (!postNode) {
        console.warn('Vote for a post we dont have, ignoring');
        return;
      }
      
      // We can record that we HAVE this vote now, regardless of whether its valid or 
      // not, this will save us querying it again.
      this.votes.push(info.tx.id);

      if (upVote && txQty < requiredAmt) {
        console.warn('upVote doesnt have the required amount, ignoring');
        return;
      }
      if (!upVote && txReward < requiredAmt) {
        console.warn(`downVote doesnt have the required amount, ignoring`);
        return
      }
     
      
      if (postNode.post.from === from) {
        console.warn('Vote for post by its owner, ignoring');
        return; 
      }
      if (postNode.voters.indexOf(from) !== -1) {
        console.warn(`Vote from ${from} already counted, ignoring`);
        return; 
      }
      // OK we can count the vote.
      console.info('ADDING VOTE');
      if (upVote) {
        postNode.post.upVotes++;
        postNode.voters.push(from);
      } else {
        postNode.post.downVotes++;
        postNode.voters.push(from);
      }
      
    })
  }

  public confirmPendingItem(info: AllTransactionInfo) {
    if (info.tags['txType'] === 'P' || info.tags['txType'] === 'PE') {
      // find post node 
      const postNode = this.findPostNode(info.tx.id);
      if (!postNode) {
        console.warn(`Tried to confirm a pending TX that we dont have: ${info.tx.id}`);
        return; 
      }
      postNode.isPendingTx = false; 
    }
    if (info.tags['txType'] === 'V') {
      // We dont need to do anything, we dont store the pending status of votes.
    }
  }

  /**
   * Called when a TX that was accepted into the mempool and 
   * assumed to be mined soon, was not actually mined. opposite of 
   * confirmPendingItem. 
   * 
   * @param info 
   */
  public denyPendingItem(info: AllTransactionInfo) {
    // TODO. This *should* happen rarely, but it does happen. 
    // Its not particularaly important because on app reload 
    // the cache is lost anyway, 

    // If its vote, we can go in and decrement the counter, 
    // If its a post, we can go in and remove it. The caller 
    // can keep tracking of failed TXs to alert the user.  

    // We need to figure out (in PendingTxTracker) when exactly
    // to fail a Tx, since you can get 404s for quite a while
    // during propogation and then have the TX go through.
  }

  private addTopLevelPost(id: string, tx: AllTransactionInfo): PostTreeNode | undefined {
    try { 
    
      const segments = decodeForumPath(tx.tags['path0']);
      
      // Descend and create nodes as needed to get to the correct forum.
      let forumNode = this.forums;
      for (let i = 0; i < segments.length; i++) {
        forumNode = forumNode.getChildAlways(segments[i]);
      }
      const forumPost = new ForumPost(
        id, 
        tx.tags as any, 
        tx.ownerAddress, 
        tx.tx.get('data', { decode: true, string: true })
      )
      const newNode = new PostTreeNode(id, forumNode, forumPost, { isPendingTx: tx.isPendingTx });
      forumNode.posts[id] = newNode;
      this.posts[id] = newNode;
      return newNode;
    } catch (e) {
      // Some unexpected error, probably malformed data. 
      console.error(e);
      console.log(tx);
      console.error(`Unexpected error adding top level post${id} to cache, discarding item`);
      return;
    }
  }
  
}


