
**VERY ROUGH NOTES** , please consult /schema for up to date data schema 


# RELEVANT GOALS

- Needs to have Categories. Sub-categories are optional.
- Any user is able to see the history of an edited post (thanks to Arweave’s Permaweb features).
- There is no admin/moderators. Every user can participate in voting down bad posts or rewarding good content and anyone can create a category or subcategory.
- Like/thumb_up system. Users will be able to like/thumb_up others posts (not their own posts), when a vote happens, there’s a transaction submitted tipping 0.10 AR to the owner of that post if it’s a vote up and 0.10 AR sent to miners if it’s a vote down.
- Post replies in threads are ordered by date and by like/thumb_up. Similar to how Reddit works.
- If a post after counting all positive votes and negative votes have a total of negative votes the post should be shown as an inactive one (greyed out for example) and content should be hidden until the user clicks a button to show the content of that post/thread. If you have another approach to combat spam please let us know on Discord.


## Schema Design 


# Categories: 

```typescript
interface PathTags {
  forumPath: 'Foo/Bar/Whiz'
  forumPath0: 'Foo'
  forumPath1: 'Foo/Bar'
  forumPath2: 'Foor/Bar/Whiz'
}
```

This allows us to query at any level, for example: 

{ equals: 'forumPath0: 'Foo' }
{ equals: 'forumPath1: 'Foo/Bar' }
{ equals: 'forumPath:' 'Foo/Bar/Whiz }


Categories can be created by just creating a a post.
 
To have _ownership_ of a forum by a specific wallet/user, is not required.. ie, the firt person to post in a forum has no 
special priveleges. 

# Threading 

```typescript 
interface PostTags {
  inReplyTo: txId
}
```

Note: the post MUST have the same forum path(s) set. It should be treated as invalid and ignored otherwise.


# Date Time 

```typescript
interface PostTags {
  DateDD: 03
  DateYYYY: 2019
  DateHH: 12
  DateMM: 23
  // etc
}
```

This format allows us to query for recent posts only. 


# Thumbs up / Thumbs down. 

Seperate TX type 

```typescript
interface VoteTxData { 
  // No data needed, maybe comment or something.
}

interface VoteTags {
  voteFor: txId
  voteValue: -1 | +1
  // Date stuff 
  // Forum path stuff 
}
```

DateStuff / ForumPath stuff allows us to query for votes at the same time 
as querying for the posts themselves. 

IMPORTANT: The vote is IGNORED unless it has sent the required amount of AR to either poster or miner.


