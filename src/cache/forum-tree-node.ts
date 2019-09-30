import { PostTreeNode } from "./post-tree-node";

/**
 * Node in a ForumTree
 */
export class ForumTreeNode {

  posts: PostTreeNode[] = [];
  children: Record<string, ForumTreeNode> = {};
  segments: string[];
  parent: ForumTreeNode | null;
  
  constructor(segments: string[], parent?: ForumTreeNode) {
    this.segments = segments;
    this.parent = parent || null;
  }

  isRootNode(): boolean {
    return this.segments.length === 0; // or parent = undefined
  }

  /**
   * Gets or adds a child forum node.
   * If child node already exists, will just return it,
   * otherwise it will create add a new node to and return that.
   *
   * @param segment The path segment of this child node to add or get
   */
  getChildAlways(segment: string): ForumTreeNode {
    if (!segment || typeof segment !== 'string') {
      throw new Error(`Invalid path segment "${segment}"`);
    }
    if (this.children[segment]) {
      return this.children[segment];
    }
    else {
      return this.addChildIfNotExist(segment);
    }
  }
  
  /**
   * Gets a child forum only if it exists or null otherwise.
   *
   * @param segment
   */
  getChild(segment: string): ForumTreeNode | null {
    return this.children[segment] || null;
  }
  
  /**
   * Adds a child if its doesn't exist.
   * Generally use getChildAlways() instead of this.
   *
   * @param segment
   */
  addChildIfNotExist(segment: string): ForumTreeNode {
    const newNode = new ForumTreeNode(this.segments.concat(segment), this);
    this.children = Object.assign({}, this.children, { [segment]: newNode });
    return newNode;
  }

}
