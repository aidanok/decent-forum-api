import { CachedForumPost } from '..';

/**
 * A quick and dirty sorting routine. 
 * 
 * Gives extra score to recent posts.
 * 
 * 
 * @param a 
 * @param b 
 */
export function sortPostsStandard(a: CachedForumPost, b: CachedForumPost) {
    
  // Age in hours
  const ageA = (Date.now() - a.date.getTime()) / 1000 / 60 / 60;
  const ageB = (Date.now() - b.date.getTime()) / 1000 / 60 / 60;
    
  // MAX extra votes you get for receny is votePerHour*maxReceny.
  // So a post just made, gets an extra ~50 votes with values of 5 and 10.
  const votePerHour = 5;
  const maxRecency = 10; 
  
  const votesA = (a.upVotes - a.downVotes) + Math.max(0, maxRecency - ageA) * votePerHour;
  const votesB = (a.upVotes - b.downVotes) + Math.max(0, maxRecency - ageB) * votePerHour;
  
  return votesA - votesB;
}

const HIDE_THESEHOLD = -2;

/**
 * Filter to check if a post should be hidden. 
 * TODO: Be a bit more relaxed for recent posts.
 * 
 * @param a 
 */
export function isPostHidden(a: CachedForumPost) {
  return (a.upVotes - a.downVotes) < HIDE_THESEHOLD; 
}
 

