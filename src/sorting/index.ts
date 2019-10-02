import { PostTreeNode } from '..';

// Hide posts that get a vote score worse than this.
const HIDE_THESEHOLD = -3;

// Parameters for scoring posts extra based on recency.
const BONUS_VOTES_PER_RECENT_HOUR = 500;
const MAX_RECENY = 6; 

// TODO: this is a pretty poor first pass at giving more recent posts
// higher ranking. Ideally we should be 
// a) using some context about the overall amount of votes and activity level in the thread/forum. 
// b) using a function with falloff instead of a linear one for the extra score.

export function scoreByVotesAndTime(upVotes: number, downVotes: number, time: Date) {
  // MAX extra votes you get for receny is votePerHour*maxReceny.
  // With these parameters, a post just made, gets an extra 50 up votes included in the
  // score.
  const age = (Date.now() - time.getTime()) / 1000 / 60 / 60;
  const bonusVotes = (Math.max(0, MAX_RECENY - age) * BONUS_VOTES_PER_RECENT_HOUR);
  //console.log(`AGE: ${age}, BONUS: ${bonusVotes}`)
  return upVotes - downVotes + bonusVotes;
}

export function sortPostNodes(a: PostTreeNode, b: PostTreeNode) {
  var scoreA = scoreByVotesAndTime(a.post.upVotes, a.post.downVotes, a.post.date);
  var scoreB = scoreByVotesAndTime(b.post.upVotes, b.post.downVotes, b.post.date);
  return scoreB - scoreA;
}

/**
 * Filter to check if a post should be hidden. 
 * TODO: Be a bit more relaxed for recent posts.
 * 
 * @param a 
 */
export function isPostHidden(upVotes: number, downVotes: number) {
  return (upVotes - downVotes) < HIDE_THESEHOLD; 
}
 

