import { decodeForumPath } from '../lib/forum-paths';
import { CachedForumPost } from './cached-forum-post';
import { CachedForumVote } from './cached-forum-vote';
import { ForumTreeNode } from './forum-tree-node';
import { PostTreeNode } from './post-tree-node';
import { ForumPostTags } from '../schema';
import Transaction from 'arweave/web/lib/transaction';

/**
 * A client side cache of forums/posts/votes
 * 
 * This is lazily populated with the data the user browses to. 
 * So if they link directly into a subforum like Foo > Bar -> Whiz 
 * A request will be sent to retrieve only that data and place it 
 * in the cache. 
 * 
 * This class *should not have any async methods of any type*
 * All methods should complete synchronously.  
 * 
 * Other query methods retrieve data asynchronously and fill/update the cache.
 * 
 * This is just to make the cache easy to reason about, ie it makes a 
 * synchronous data structure. 
 * 
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
 *    YES: some other way (splice, push, shift, etc work fine)
 * 
 * 4) Use 'null' to signify 'no value' or optional values. 
 * 
 * 3) No use of ES Set or Map 
 * 
 * This doesn't matter for local variables inside methods, etc,
 * only for the publicly properties and the object graph they expose
 * for the views.
 * 
 * It's mostly taken care of in the *Node sibling classes
 * 
 * Vue 3.0 I believe will switch to a ES proxy method which doesnt have
 * these limitations.
 * 
 * This class is not specific to Vue, it has no dependencies on it, 
 * so it should be useable without another frontend framework easily enough.
 * 
 */

export class ForumCache {
  
  /**
   * All votes
   */
  public votes: CachedForumVote[] = []
  
  /**
   * Forum tree. The root node has an empty segment and 
   * should never have any posts in it. Nodes down the
   * tree will have a list of PostTreeNode trees for each
   * thread in the cache.
   */
  public forums: ForumTreeNode = new ForumTreeNode([]);

  /**
   * Flat map of all PostTreeNodes for easier searching/querying. 
   * Should probably be a Record<string, PostTreeNode> for 
   * quicker searching. The Nodes referenced here are same objects
   * as stored in the ForumTree.
   */
  public posts: PostTreeNode[] = []

  /**
   * Searches for a ForumTreeNode for a given path, 
   * 
   * Returns null if not found in cache.
   * 
   * @param segments an array of path segments returned by decodeForumPath()
   */
  findForumNode(segments: string[]): ForumTreeNode | null {
    
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
  findPostNode(txId: string): PostTreeNode | undefined {
    return this.posts.find(x => x.post.id === txId);
  }

  /**
   * Add a map of posts. 
   * 
   * This will add replies/edits into the tree in the correct place. 
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
   * The naming of 'isEditFor / isReplyTo' is unclear..
   * 
   * 
   * 
   * @param posts 
   */
  addPosts(posts: Record<string, ForumPostTags>) {

    const orphans: Record<string, ForumPostTags> = {}

    // Edits MUST reference the original post id
    const isEditOf = (node: PostTreeNode, id: string) => 
      node.post.id === id 
    ;
    
    // Replies can reference the id of ANY edit. 
    const isReplyTo = (node: PostTreeNode, id: string) =>
      node.post.id === id || !!(node.edits && node.edits.find(e => e.post.id === id))
    ;

    const getFromCache = (id: string): PostTreeNode | undefined =>
      this.posts.find(x => x.post.id === id)
    ;

    // try* functions, set of mutually recursive functions that will either 
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
      if (parent) {
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
      
      const tags = posts[id];

      // Recurse to ensure our parent post is added
      // before we are.
      if (tags.replyTo) {
        console.log(`${id} is replyTo ${tags.replyTo}`)
        existing = tryFindParentForReply(tags.replyTo);
        if (existing) {
          const newNode = existing.addReply(new CachedForumPost(id, tags))
          this.posts.push(newNode);
          return newNode;
        }
        orphans[id] = tags;
        return;
      }
      if (tags.editOf) {
        console.log(`${id} is editOf ${tags.editOf}`)
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
      console.log('orphans', orphans);
      
    }
  }

  addPostsContent(content: Record<string, Transaction|null>) {
    let count = 0, problems = 0, total = 0;
    Object.keys(content).forEach(txId => {
      total++;
      const postNode = this.findPostNode(txId);
      if (postNode && !postNode.isContentFiled()) {
        const tx = content[txId];
        if (!tx) {
          // mark as problem.
          postNode.contentProblem = 'Failed to load (Unknown)';
          problems++;
        } else {
          postNode.post.content = tx.get('data', { decode: true, string: true })
          count++;
        }
      }
    })
    console.log(`[Cache] Added ${count} post's content, with ${problems} missing. (${total})`);
  }

  private addTopLevelPost(id: string, tags: ForumPostTags): PostTreeNode | undefined {
    try { 
      const segments = decodeForumPath(tags.path0);
      
      // Descend and create nodes as needed to get to the correct forum.
      let forumNode = this.forums;
      for (let i = 0; i < segments.length; i++) {
        forumNode = forumNode.getChildAlways(segments[i]);
      }
      const newNode = new PostTreeNode(new CachedForumPost(id, tags));
      forumNode.posts.push(newNode);
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


