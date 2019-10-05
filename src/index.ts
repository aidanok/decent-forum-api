
import { arweave } from './lib/permaweb';
import { postPost, buildPostTags, buildPostTagsForReply, buildPostTagsForEdit } from './post/post';
import { voteOnPost } from './post/vote';
import { ForumCache } from './cache/cache';
import { ForumTreeNode } from "./cache/forum-tree-node";
import { ForumPost } from "./cache/forum-post";
import { decodeForumPath, encodeForumPath } from './lib/forum-paths';
import { PendingTxTracker } from './cache/pending-tx-tracker';
import { PostTreeNode } from './cache/post-tree-node';
import { queryForum } from './query/query-forum';
import { queryThread } from './query/query-thread';

// For quick test debugging
if (typeof window !== 'undefined') {
  (window as any).arweave = arweave;
}

export { 
  arweave, 
  postPost, 
  buildPostTags, 
  buildPostTagsForReply,
  buildPostTagsForEdit,
  voteOnPost,
  queryForum,
  queryThread as queryThreadFromRoot,
  encodeForumPath,
  decodeForumPath, 
  ForumTreeNode,
  PostTreeNode,
  ForumCache,
  ForumPost,
  PendingTxTracker,
}