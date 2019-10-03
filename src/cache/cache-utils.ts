import { DecodedTag } from "../lib/permaweb";
import { ForumItemTags } from "../schema";
import Transaction, { Tag } from 'arweave/web/lib/transaction';

// move to permaweb or arweave-js.. 

export function decodeTransactionTags(tx: Transaction) {
  const encodedTags: Tag[] = tx.get('tags') as any;;
  const tags: Record<string, string> = {};
  encodedTags.forEach(tag => {
    tags[tag.get('name', { decode: true, string: true })] = tag.get('value', { decode: true, string: true })
  })
  return tags;
}

