
import { arweave } from './lib/permaweb';
import { postPost, buildPostTags, buildPostTagsForReply } from './post/post';
import { voteOnPost } from './post/vote';
import { ForumCache } from './cache/cache';
import { ForumTreeNode } from "./cache/forum-tree-node";
import { CachedForumVote } from "./cache/cached-forum-vote";
import { CachedForumPost } from "./cache/cached-forum-post";
import { decodeForumPath, encodeForumPath } from './lib/forum-paths';
import { PendingTxTracker } from './cache/pending-tx-tracker';
import { PostTreeNode } from './cache/post-tree-node';
import { queryForum } from './query/query-forum';
import { queryThreadFromRoot } from './query/query-thread';

// For quick test debugging
if (typeof window !== 'undefined') {
  (window as any).arweave = arweave;
}

export { 
  arweave, 
  postPost, 
  buildPostTags, 
  buildPostTagsForReply,
  voteOnPost,
  queryForum,
  queryThreadFromRoot,
  encodeForumPath,
  decodeForumPath, 
  ForumTreeNode,
  PostTreeNode,
  ForumCache,
  CachedForumPost, 
  CachedForumVote,
  PendingTxTracker,
}