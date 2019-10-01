import { ForumPostTags } from '../schema'
import { dateTagsToDate } from '../schema/date-tags'

export class CachedForumPost {
  
  /**
   * This is the client set date, so it cannot be 
   * trusted. We can however, throw away posts that 
   * set the Date much before or ahead of the block
   * mining time.
   */
  public readonly date: Date 

  constructor(
    public id: string,
    public tags: ForumPostTags,
    public upVotes: number = Math.round(Math.random() * 5),
    public downVotes: number = Math.round(Math.random() * 3),
    public content: string | null = null,
    public from: string | null = null
  ) {
    this.date = dateTagsToDate(tags)
  }
};
