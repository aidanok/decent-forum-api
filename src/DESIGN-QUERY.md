

## Querying / Caching notes 


App home page want to display either 

- a list of forums & summarys, up to say 3 levels deep for sub-forums
  - summary would contain things like most recent post time, total posts etc
  - can sort in various ways, alphabetically is probably a bad idea since anyone can create a forum 
    so a most active score/best quality score can be calculated 

- a list of most active threads across all forums (ie, reddits /all )
  - sorted in a similar fashion 

If we want to doing sorting on upvotes/down votes we need to query all the votes

The GraphQL endpoint provides two useful features for this: count() and foreign Key querying. 

We can issue a graphql query to count the number of upvotes and downvotes (seperate query needed for each)
This may or may not be the best way to count votess... we shall see 

In any case, to get the most recent data, we issue an ArQL query based on the weeks flag. 

In fact... 
we can issue 3 queries: 

One to get posts, 
One to get upvotes 
One to get downdowns

This will only get us a list of txIds, to verify 

## Caching 

We should basically build a client side cache of all blocks/txs that we see to prevent repeated queries. 










