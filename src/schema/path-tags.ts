
// TODO: Theres probably a nicer way to type this
// The levels can be arbitrarily deep, so this is more an example 
// than a fully typed interface.


/**
 * We store the path in a de-normalized format to make querying easier
 * Along with the date tags this means we can quickly build a view of the
 * most active forums/votes for time period and section of the forum.
 * 
 * I'm not sure all these de-normalized forms are really needed, the full 
 * path only and segments would probably do the job.
 * 
 */
export interface PathTags {
  
  /** 
   * The full path of the forum 
   * Categories are seperated by a '/' characther. 
  `*/
  path0: string 
  
  /**
   * The path with the (1st) last segment removed
   */
  path1?: string 

  /**
   * The path with the 2nd last segment removed
   */
  path2?: string


  // We also store the invidiual path segments. 

  /**
   * The first segment of the forum path
   */
  pathSegment0: string 
  
  /**
   * The second segment of the forum path
   */
  pathSegment1?: string
  
  /**
   * The third segment of the forum path
   */ 
  pathSegment2?: string
  

}