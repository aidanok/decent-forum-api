import { getAppVersion } from "./schema-version";
import { ForumItemTags } from '../schema';

export function addStandardTags(tags: Record<string, string> | ForumItemTags) {
  tags['App-Name'] = 'decent-a-forum';
  tags['DFV'] = getAppVersion(); 
}