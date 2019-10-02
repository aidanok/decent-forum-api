import { MediaHandler } from './media-config';
import { arweave } from '../lib/permaweb';


export const ArchivedPdfHandler: MediaHandler = {
  getMediaConfig(txId: string, tags: Record<string, string>) {
    if (tags['Content-Type'] === 'application/pdf' && tags['file:url']) {
      return {
        url: `https://arweave.net/${txId}`,
        description: tags['file:url'],
        showContent: true,
        showContentToggle: true, 
        toHtml: async(txId: string, tags: Record<string, string>) => {
          return `
            <iframe 
              style="border: 1px solid #ccc; height: 600px; width: 100%;" 
              src="https://arweave.net/${txId}"
              allowfullscreen
              frameborder="0"
              allowfullscreen="allowfullscreen"
              mozallowfullscreen="mozallowfullscreen" 
              msallowfullscreen="msallowfullscreen" 
              oallowfullscreen="oallowfullscreen" 
              webkitallowfullscreen="webkitallowfullscreen"
              allow="fullscreen"
            >
            </iframe>
          `;

        }
      }
    }
  }
}

/**
 * ArWeave extension archived page config.
 */
export const ArchivedHtmlPageHandler: MediaHandler = {

  getMediaConfig(txId: string, tags: Record<string, string>) {
    if ((tags["Content-Type"] == 'text/html' && tags["page:title"] && tags["page:url"])) {
      return {
        url: `https://arweave.net/${txId}`,
        description: tags["page:title"],
        showContent: true,
        showContentToggle: true,
        toHtml: async (txId: string, tags: Record<string, string>) => {

          /** TODO Configure DOMPurify or similar to get Reader mode like output */
          return `
            <iframe 
              style="border: 1px solid #ccc; height: 600px; width: 100%;" 
              src="https://arweave.net/${txId}"
              allowfullscreen
              frameborder="0"
              allowfullscreen="allowfullscreen"
              mozallowfullscreen="mozallowfullscreen" 
              msallowfullscreen="msallowfullscreen" 
              oallowfullscreen="oallowfullscreen" 
              webkitallowfullscreen="webkitallowfullscreen"
              allow="fullscreen"
            >
            </iframe>
          `;

          /*const str = await arweave.api.get(`/tx/${txId}/data.html`).then(x => x.data);
          if (typeof str !== 'string') {
            console.error(str);
            throw new Error('Unable to retrieve HTML');
          }
          return str;*/
        }
      }
    }
  }

}