import { PostTags } from './post-tags';
import { PathTags } from './path-tags';
import { DateTags } from './date-tags';
import { VersionTags } from './version-tags';
import { VoteTags } from './vote-tags';
import { ReferenceToTags } from './ref-to-tags';

export interface ForumVoteTags extends VoteTags, PathTags, ReferenceToTags, DateTags, VersionTags {
  txType: 'V'
}

export interface ForumPostTags extends PostTags, PathTags, ReferenceToTags, DateTags, VersionTags { 
  txType: 'P' | 'PE'
  wasToPe?: string; // if this is set on a post, it should be set on any edits too. 
}



export type ForumItemTags = ForumPostTags | ForumVoteTags