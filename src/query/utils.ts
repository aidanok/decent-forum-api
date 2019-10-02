import { DecodedTag } from '../lib/permaweb';
import { ForumItemTags } from '../schema';

// Fixs up data errors in older data / upgrades schema versions.
export function upgradeData(tags: DecodedTag[]) {

  // Fix broken data from early dev.
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].name.startsWith('pathSegement')) {
      tags[i].name = tags[i].name.replace('pathSegement', 'pathSegment');
    }
    if (tags[i].name === 'title') {
      tags[i].name = 'description'
    }
    if(tags[i].name === 'format' && tags[i].value === 'plaintext') {
      tags[i].value = 'Plaintext';
      tags.push({name: 'txType', value: 'P' });
    }
  }
  return tags;
}

export function tagsArrayToObject(tags: DecodedTag[]): ForumItemTags {
  const x = {} as any;
  for (let i = 0; i < tags.length; i++) {
    x[tags[i].name] = tags[i].value;
  }
  return x as ForumItemTags;
}

