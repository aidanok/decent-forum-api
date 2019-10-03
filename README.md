

# Decent-a-Forums API 

This is a typescript library that powers decent-a-forums. (https://github.com/aokisok/decent-forum) This library is not really intented to be published or used as a library yet, api interfaces will change. 

Briefly: 

It provides a cache for clients of posts and votes, that builds and maintains a tree structure of forums, posts, edits & replies. It does this lazily, so if a user directly links to a deep subforum somewhere, it will just load that part into the cache, and if they navigate away to somewhere else, it will continue adding relevant data to the cache. There is more detailed description and the code in [src/cache/cache.ts](src/cache/cache.ts) 

The schema for the data stored on the Arweave blockchain is located under [src/schema](src/schema) 

We structure much of the tags and data to allow faster querying and something like range queries on dates. See the schema files for more information. 

The actual api methods to fill the cache are in [src/lib/post.ts](src/lib/post.ts), [(src/query/query.ts)](src/query/query.ts) & [(src/lib/vote.ts)](src/lib/vote.ts). *This code is not the cleanest!* it works fine and is quite performant, but it can be improved in performance and organization. The API it provides at the moment is very limited.  

There are a couple of single file utilities which could be moved to seperate projects: 

[src/query/arql.ts](src/query/arql.ts) - functional composition of arql queries

[(src/block-watcher/block-watcher.ts)](src/block-watcher/block-watcher.ts) - tails the most recent N blocks and allows subscribers to be notified when new blocks coming in, or when we miss blocks/there is a re-org. This can be used to track pending TXs, or otherwise be notified of new content on the arweave blockchain. It tries to be polite about polling the nodes not too fast and when it needs to backfill missed blocks. 







