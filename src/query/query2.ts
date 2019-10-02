import { batchQueryTags, queryTags, tagsArrayToObject } from "../lib/permaweb";

export async function queryTxTags(txId: string, retries = 2) {
  const tags = tagsArrayToObject(await queryTags(txId, retries));
  return tags; 
}