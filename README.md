
## Decent-a-Forums API 

This is a typescript library that powers decent-a-forums. (https://github.com/aokisok/decent-forum) This library is not really intented to be published or used as a library yet, api interfaces will change. 

### Cache 

Provides a cache for clients and maintains a tree structure of forums, sub-forms, posts, edits, replies & a record of votes. It does this lazily, so if a user directly jumps to a deep subforum somewhere, it will just load that part of the tree into the cache, and as they navigate away, it will continue adding relevant data. 

When a client wants to query some data, it queries it into the cache, and then all views/callers can read 
it from there. For one-time queries, a temporary cache instance can be created just to parse the results into the tree stucture and then discarded. 

The cache enables a few features:

1. Client side prediction: if your TX is accepted it gets placed in the cache as if it was already mined.
2. Reduces need to query data that we already have
3. Serilization of data to the clients local storage to maintain across app reloads

Out of these, 1 is pretty much 100% done, 2 is partly in use but can be much improved, 3 is not done at all.

The code and some comments are at [src/cache/cache.ts](src/cache/cache.ts) 

### Data Schema 

The schema for the data format is located under [src/schema](src/schema) 

We encode data in tags and data specifically to allow querying with less requests and do something like range queries on dates. For example, we store the week number of the year, so can do a simple OR() of 3 values to query
data from the last three weeks. We also encode a numeric timestamp for future use. 

Another example of encoding data is replyTo (for post threading). The naive implementation just has one tag that points to it's parent post. To query a thread 5 levels deep you then need to then do 5 recursive/sequential queries, instead if you encode it along the lines of: `replyTo0, replyTo1, ... replyToN` & `replyDepth` you can construct a single query to get the first 3 levels of a thread, or the next 5 levels of some reply at some depth, etc. 

See [src/schema/ref-to-tags.ts](src/schema/ref-to-tags.ts) Which is what we use, its a general purpose purpose way
of encoding a tree and being able to query it at any point to N depth with one ArQL query.


At the moment the schema for posts only supports plaintext posts. Some more formats would be good.

### Client API

The api methods for clients to post and query data are in [src/post/](src/post/), [src/query/](src/query/) 


### Tailing Blocks for Realtime-ish updates

The block-watcher class polls the networkInfo api to detect new blocks and backfill a list of block hashs and 
set of Txs ids. Other services can subscribe and be notified of new blocks, and be notified when we think we have
missed blocks or there has been a re-org. This is mostly unsused at the moment, though one easy use case is to invalidate the cache. If there hasnt been any new blocks, and the client is not requesting any new data, there
is no need to make any network queries. 

It is being used for an un-used feature, ContentWatcher, which extracts archived content to potentially display in 
the UI to start discussions around.

It can enable a couple of other neat features too, pwa/desktop notifications of posts in threads you've posted in etc. 


### Other

Some single file utilities could be moved to seperate projects, or just copy pasted into a source tree:

[src/query/arql.ts](src/query/arql.ts) - functional composition of arql queries

[src/block-watcher/block-watcher.ts](src/block-watcher/block-watcher.ts) - tails the most recent N blocks and allows subscribers to be notified when new blocks coming in, or when we miss blocks/there is a re-org. This can be used to track pending TXs, or otherwise be notified of new content on the arweave blockchain. It tries to be polite about polling and not too aggressive when backfilling missed blocks or re-orgs. 

### Other Other

- TODO: The cache could really do with a good set of unit tests 
- TODO: Very strong validation of incoming data should be done at the boundry 
  of inserting data into the cache and malformed/malicious data discarded. 





