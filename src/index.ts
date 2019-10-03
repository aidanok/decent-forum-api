
import { arweave } from './lib/permaweb';
import { postPost, buildPostTags } from './lib/post';
import { voteOnPost } from './lib/vote';

import { queryAll } from './query/query';
import { ForumCache } from './cache/cache';
import { ForumTreeNode } from "./cache/forum-tree-node";
import { CachedForumVote } from "./cache/cached-forum-vote";
import { CachedForumPost } from "./cache/cached-forum-post";
import { decodeForumPath, encodeForumPath } from './lib/forum-paths';
import { PendingTxTracker } from './cache/pending-tx-tracker';
import { PostTreeNode } from './cache/post-tree-node';

// For quick test debugging
if (typeof window !== 'undefined') {
  (window as any).arweave = arweave;
}

export { 
  arweave, 
  postPost, 
  buildPostTags, 
  voteOnPost,
  queryAll as queryPosts,
  encodeForumPath,
  decodeForumPath, 
  ForumTreeNode,
  PostTreeNode,
  ForumCache,
  CachedForumPost, 
  CachedForumVote,
  PendingTxTracker,
}