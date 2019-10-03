import { decodeForumPath } from '../lib/forum-paths';
import { CachedForumPost } from './cached-forum-post';
import { CachedForumVote } from './cached-forum-vote';
import { ForumTreeNode } from './forum-tree-node';
import { PostTreeNode } from './post-tree-node';
import { ForumPostTags } from '../schema';
import { TransactionContent } from './transaction-extra';
import { decodeReplyToChain } from '../schema/post-tags';
import { Tag } from 'arweave/web/lib/transaction';
import { arweave } from '..';
import { decodeTransactionTags } from './cache-utils'

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
 * so it should be useable without another frontend framework.
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
  private posts: PostTreeNode[] = []

  /**
   * All votes, just record their ids.
   */
  private votes: string[] = []
  

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
   * @param txId 
   */
  public findPostNode(txId: string): PostTreeNode | null {
    return this.posts.find(x => x.post.id === txId) || null;
  }

  public isVoteCounted(txId: string): boolean {
    return this.votes.indexOf(txId) !== -1;
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
   * TODO: The naming of 'isEditFor / isReplyTo' is unclear and they should
   * be top level instance methods.
   * 
   * TODO: Ensure malformed/corrupt data is try catched and discarded and doesnt
   * stop processing.
   * 
   * TODO: Ensure validate against schema (perhaps not here though.)
   * 
   * @param posts 
   */
  public addPostsMetadata(posts: Record<string, ForumPostTags>): Record<string, ForumPostTags> {

    const orphans: Record<string, ForumPostTags> = {}

    // Edits MUST reference the original post id
    const isEditOf = (node: PostTreeNode, id: string) => 
      node.post.id === id 
    ;
    
    // Replies can reference the id of any edit. 
    const isReplyTo = (node: PostTreeNode, id: string) =>
      node.id === id || !!(node.edits && node.edits.find(e => e.id === id))
    ;

    const getFromCache = (id: string): PostTreeNode | undefined =>
      this.posts.find(x => x.id === id)
    ;

    // try* functions: set of mutually recursive functions that will either 
    // add the post in the correct place, or place it in the orphans list.

    
    const tryFindParentForEdit = (parentId: string): PostTreeNode | undefined => {
      let existing = posts[parentId] && tryAdd(parentId);
      if (!existing) {
        existing = this.posts.find(node => isEditOf(node, parentId));
      }
      
      if (!existing) {
        // orphan :(
        orphans[parentId] = posts[parentId]; 
        return; 
      }
      return existing
    }

    const tryFindParentForReply = (parentId: string): PostTreeNode | undefined => {
      let parent = posts[parentId] && tryAdd(parentId);
      if (!parent) {
        parent = this.posts.find(node => isReplyTo(node, parentId));
      }
      if (!parent) {
        // orphan :(
        orphans[parentId] = posts[parentId];
        return; 
      }
      return parent;
    }
    
    const tryAdd = (id: string): PostTreeNode | undefined | null => {
      
      let existing = getFromCache(id)
      
      if (existing) {
        return existing;
      }
      console.log(`Trying to add to cache ${id}`);
      const tags = posts[id];
      if (!tags) {
        throw new Error('No post tags provided!');
      }

      // Recurse to ensure our parent post is added
      // before we are.
      const replyTo = tags.replyTo0 ? decodeReplyToChain(tags).slice(-1)[0] : tags.replyTo
      if (replyTo) {
        existing = tryFindParentForReply(replyTo);
        if (existing) {
          const newNode = existing.addReply(new CachedForumPost(id, tags))
          this.posts.push(newNode);
          return newNode;
        }
        orphans[id] = tags;
        return;
      }
      if (tags.editOf) {
        existing = tryFindParentForEdit(tags.editOf)
        if (existing) {
          // Note we return the parent here. edits never have children...
          // so after adding an edit we return its parent. 
          // we maybe should change this for consistency.
          const newNode = existing.addEdit(new CachedForumPost(id, tags));
          this.posts.push(newNode);
          return newNode.parent;
        }
        orphans[id] = tags;
        return; 
      }
      
      return this.addTopLevelPost(id, tags)
      
    }

    Object.keys(posts).forEach(id => {
      tryAdd(id)
    })

    console.info(`Added ${Object.keys(posts).length}, ${Object.keys(orphans).length} orphans, cache posts: ${this.posts.length}`)  
    if (Object.keys(orphans).length > 0) {
      console.debug('orphans', orphans); 
    }
    
    return orphans;
  }

  /**
   * Update the PostTreeNode with the content of the post. 
   * The Post & Tags MUST have been added previously using addPostsMetadata.
   * 
   * Currently this 'content' also includes some things we would
   * consider metadata, ('from'/'ownerAddress' & isTxPending ) But it should really just be the
   * tx data.
   * 
   * This method can be used to add a pending tx to the cache, or to confirm that 
   * a tx has been minded. Possibly should just use a dedicated method instead.
   * 
   * @param content 
   */
  public addPostsContent(content: Record<string, TransactionContent>) {
    let count = 0, problems = 0, total = 0;
    Object.keys(content).forEach(txId => {
      const txContent = content[txId];
      total++;
      
      // Just check this is really a post, skip otherwise.
     
      if (txContent) {
        const tags = decodeTransactionTags(txContent.tx);

        if (!tags['txType'] || tags['txType'] !== 'P') {
          console.warn(tags);
          console.warn(`Not a post type, skipping, txType`);
          problems++;
          return;
        }
      }
      
      
      const postNode = this.findPostNode(txId);
      if (postNode && !postNode.isContentFiled() && !postNode.isPendingTx) {
        
        if (!txContent) {
          // mark as problem.
          postNode.contentProblem = 'Failed to load (Unknown)';
          problems++;
        } else {
          postNode.post.content = txContent.tx.get('data', { decode: true, string: true });
          postNode.post.from = txContent.extra.ownerAddress;
          postNode.isPendingTx = txContent.extra.isPendingTx;
          count++;
        }
      }
    })
    console.log(`[Cache] Added ${count} post's content, with ${problems} missing. (${total})`);
  }

  public addVotesContent(content: Record<string, TransactionContent>) {
    console.log(`Got ${Object.keys(content).length} votes to add to cache`);
    const requiredAmt = 0.1;
    Object.keys(content).forEach(txId => {
      const txContent = content[txId];
      if (!txContent) {
        console.warn(`Got no data in votes content, skipping`);
        return;
      }
      const tags = decodeTransactionTags(txContent.tx);
      console.log(tags);
      console.log(`Checking vote`);
      if (tags['txType'] !== 'V' && !tags['voteFor'] && !tags['voteType']) {
        // not a vote, ignore it
        console.warn(tags);
        console.warn(`Ignorning non-vote passed to addVotesContent`);
        return;
      }

      const from = txContent.extra.ownerAddress;
      // Now just verify the amount, find the post, verify its not 
      // the owner and the user didnt vote before. 
      const txQty = new Number(arweave.ar.winstonToAr(txContent.tx.quantity));
      const txReward = new Number(arweave.ar.winstonToAr(txContent.tx.reward));
      const upVote = tags['voteType'] === '+'; 
      const voteFor = tags['voteFor']
      
      // VALIDATE  

      const postNode = this.findPostNode(voteFor);
      console.log(`Found for vote ${voteFor}? ${!!postNode}`);
      
      if (!postNode) {
        console.warn('Vote for a post we dont have, ignoring');
        return; 
      }
      
      if (upVote && txQty < requiredAmt) {
        console.warn('upVote doesnt have the required amount, ignoring');
        return;
      }
      if (!upVote && txReward < requiredAmt) {
        console.warn(`downVote doesnt have the required amount, ignoring`);
        return
      }
      if (!tags['voteFor']) {
        console.warn(`Vote doesnt have a validFor field: ${tags['voteFor']}`);
        return;
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

  public markPendingTxAsFailed(id: string) {
    // remove post, take it out of the tree.

    // pending txs that fail could present a problem 
    // if a subsequent Tx references them and that gets 
    // mined but the original failed. This needs to be 
    // taken care of elsewhere (dont allow actions that do this)
    // Given that: we should remove all descendents aswell, as
    // they are invalid.

    // TODO: XXX implement this.
  }

  private addTopLevelPost(id: string, tags: ForumPostTags): PostTreeNode | undefined {
    try { 
      const segments = decodeForumPath(tags.path0);
      
      // Descend and create nodes as needed to get to the correct forum.
      let forumNode = this.forums;
      for (let i = 0; i < segments.length; i++) {
        forumNode = forumNode.getChildAlways(segments[i]);
      }
      const newNode = new PostTreeNode(id, forumNode, new CachedForumPost(id, tags));
      forumNode.posts[id] = newNode;
      this.posts.push(newNode);
      return newNode;
    } catch (e) {
      // Some unexpected error, probably malformed data. 
      console.error(e);
      console.log(tags);
      console.error(`Unexpected error adding top level post${id} to cache, discarding item`);
      return;
    }
  }
  
}


