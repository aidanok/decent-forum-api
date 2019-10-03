import { CachedForumPost } from './cached-forum-post';
import { ForumTreeNode } from './forum-tree-node';

/**
 * Node in a PostTree
 * 
 * A post tree, is how we store a thread of posts/replies/edits
 * 
 * Edits MUST reference the initial post. They MUST NOT reference an existing
 * edit. 
 * 
 * ( There is not much advantage in edits referencing other edits, 
 *   and it confuses the ordering/is non-deterministic. Instead we store all edits of a 
 *   post as a flat array, ordered by the client set time ) 
 * 
 * Replies (and votes) SHOULD reference the ID of the that the client actually saw.
 * 
 */

export interface PostTreeNodeCreateOptions {
  parent?: PostTreeNode, 
  isEdit?: boolean, 
  isPendingTx?: boolean 
}

export class PostTreeNode {
  
  /** The Tx Id */
  id: string 
  forum: ForumTreeNode

  post: CachedForumPost;
  replies: Record<string, PostTreeNode>;
  isEdit: boolean;
  edits: PostTreeNode[] = [];
  isPendingTx: boolean;
  parent: PostTreeNode | null = null;
  contentProblem: string | null = null;
  voters: string[] = []
  
  // TODO: store a reference to ForumTreeNode instead of path.
  constructor(id: string, forum: ForumTreeNode, post: CachedForumPost, opts: PostTreeNodeCreateOptions = {}) {
    this.id = id;
    this.forum = forum
    this.post = post;
    this.parent = opts.parent || null;
    this.replies = {};
    this.isEdit = !!opts.isEdit;
    this.isPendingTx = !!opts.isPendingTx;
  }

  /**
   * Check if this post is the root of a thread.
   * Returns true if this the root post, or an edit 
   * of the root post.
   * 
   */
  isRootPost(): boolean {
    return !this.parent || (this.isEdit && !this.parent.parent)
  }

  /**
   * Check if the content has been loaded for this post yet.
   */
  isContentFiled(): boolean {
    return !!this.post.content
  }
  
  /**
   * Gets a specific edit of this post. 
   * 0 will return the original post. 
   * 
   * @param edit 
   */
  public getEdit(edit: number): PostTreeNode {
    if (edit) {
      return this.edits[Math.min(edit, this.edits.length-1)];
    }
    return this;
  }

  /**
   * Get the number of edits. We count the original post in this,
   * so the index is compatible with getEdit();
   */
  public editCount(): number {
    return this.edits.length;
  }

  /**
   * Gets the latest edit.
   */
  public latestEdit(): PostTreeNode {
    return this.getEdit(this.editCount());
  }

  /**
   * Return the original post if this is an edit.
   * Otherwise just returns itself.
   */
  public getOriginalNode(): PostTreeNode {
    return this.isEdit ? this.parent! : this;
  }

  /**
   * Get total votes for all edits of this post only. 
   * 
   */
  public getAggregatedVotes(): { upVotes: number, downVotes: number} {
    let upVotes = this.post.upVotes, downVotes = this.post.downVotes;
    this.edits.forEach(e => upVotes += e.post.upVotes);
    this.edits.forEach(e => downVotes += e.post.downVotes);
    return { upVotes, downVotes }
  }

  /**
   * Gets the forum path.
   */
  public getForumPath(): string[] {
    return this.forum.segments; 
  }

  /**
   * Add to the a replies and returns the new PostTreeNode. 
   * 
   * @param post 
   */
  addReply(post: CachedForumPost): PostTreeNode {
    const newNode = new PostTreeNode(post.id, this.forum, post, { parent: this });
    this.replies = Object.assign({}, this.replies, { [post.id]: newNode });
    return newNode;
  }

  /**
   * Add to the edit list and returns the new PostTreeNode .
   * 
   * @param post 
   */
  addEdit(post: CachedForumPost): PostTreeNode {
    if (this.isEdit) {
      throw new Error('Edits should not reference other edits.');
    }
    if (!this.edits) {
      this.edits = [];
    }
    const newNode = new PostTreeNode(post.id, this.forum, post, { parent: this });
    this.edits.push(newNode);
    return newNode;
  }

}

