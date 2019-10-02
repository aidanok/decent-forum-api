
import { ArchivedHtmlPageHandler, ArchivedPdfHandler } from './arweave-extension-media'
import { MediaConfig, MediaHandler } from './media-config';

export const medias = [
  ArchivedHtmlPageHandler,
  ArchivedPdfHandler
]

export function findConfig(txId: string, txTags: Record<string, string>) {
  for (let i = 0; i < medias.length; i++) {
    const config = medias[i].getMediaConfig(txId, txTags);
    if (config) {
      return config; 
    }
  }
  return null;
}

export { MediaConfig, MediaHandler as MediaContentConfig }
