import { ForumPostTags } from '../schema'
import { dateTagsToDate } from '../schema/date-tags'

/**
 * The actual post data. Held in a PostTreeNode 
 * 
 */
export class ForumPost {
  
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
    public from: string,
    public content: string,
    public upVotes = 0,
    public downVotes = 0,
  ) {
    this.date = dateTagsToDate(tags)
  }
  
};
