import { getAppVersion } from "./schema-version";

export function addStandardTags(tags: Record<string, string>) {
  tags['App-Name'] = 'decent-a-forum';
  tags['DFV'] = getAppVersion(); 
}