import { getAppVersion } from "./schema-version";

export function addStandardTags(tags: Record<string, string>) {
  tags['App-Name'] = 'decent-forum';
  tags['DFV'] = getAppVersion();
  tags['timestamp'] = new Date().getTime().toString();
}