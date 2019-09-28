import { PostTags } from './post-tags';
import { PathTags } from './path-tags';
import { DateTags } from './date-tags';
import { VersionTags } from './version-tags';
import { TxTypeTag } from './tx-type-tags';
import { VoteTags } from './vote-tags';

export type ForumVoteTags = VoteTags & PathTags & DateTags & VersionTags & TxTypeTag<'V'>

export type ForumPostTags = PostTags & PathTags & DateTags & VersionTags & TxTypeTag<'P'>

export type ForumItemTags = ForumPostTags | ForumVoteTags