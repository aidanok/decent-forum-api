
export function getAppVersion(): string {
  const version = process.env.VUE_APP_VERSION_TAG_VALUE;
  if (typeof version !== 'string') {
    throw new Error('No version tag. Build setup problem.');
  }
  return version
}
