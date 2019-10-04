import { PostTags } from './post-tags';
import { PathTags } from './path-tags';
import { DateTags } from './date-tags';
import { VersionTags } from './version-tags';
import { VoteTags } from './vote-tags';
import { ReplyToTags } from './reply-to-tags';

export interface ForumVoteTags extends VoteTags, PathTags, ReplyToTags, DateTags, VersionTags {
  txType: 'V'
}

export interface ForumPostTags extends PostTags, PathTags, ReplyToTags, DateTags, VersionTags { 
  txType: 'P'
}

export type ForumItemTags = ForumPostTags | ForumVoteTags