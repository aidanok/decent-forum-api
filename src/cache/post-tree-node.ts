import { CachedForumPost } from './cached-forum-post';

/**
 * Node in a PostTree
 * 
 * A post tree, is how we store a thread of posts/replies/edits
 * 
 * Edits MUST reference the initial post. They CANNOT reference an existing
 * edit. 
 * 
 * (This is simply because there is no advantage in edits referencing other edits, 
 *  and it confuses the ordering. Instead we store all edits of a post as a flat array, 
 *  ordered by the client set time ) 
 * 
 * Replies (and votes) can reference the ID of any edit.
 * and should probably SHOULD reference the ID of the that the 
 * client actually saw.
 * 
 */
export class PostTreeNode {
  
  post: CachedForumPost;
  replies: Record<string, PostTreeNode>;
  isEdit: boolean;
  parent: PostTreeNode | null = null;
  edits: PostTreeNode[] | null = null;
  contentProblem: string | null = null;
  
  constructor(post: CachedForumPost, parent?: PostTreeNode, isEdit?: boolean) {
    this.post = post;
    this.parent = parent || null;
    this.replies = {};
    this.isEdit = !!isEdit;
  }

  /**
   * Check if this post is the root of a thread.
   * Returns true if this the root post, or an edit.
   * 
   * *does* not check if its the latest edit.
   * 
   */
  isRootPost(): boolean {
    return !!this.parent || (this.isEdit && !!this.parent!.parent)
  }

  /**
   * Check if the content has been loaded for this post yet.
   */
  isContentFiled(): boolean {
    return !!this.post.content
  }
  
  /**
   * Add to the a replies and returns the new PostTreeNode. 
   * 
   * @param post 
   */
  addReply(post: CachedForumPost): PostTreeNode {
    const newNode = new PostTreeNode(post, this);
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
    const newNode = new PostTreeNode(post, this);
    this.edits.push(newNode);
    return newNode;
  }

}

