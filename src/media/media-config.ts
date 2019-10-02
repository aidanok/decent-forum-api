



export interface MediaHandler {
  /**
   *  Checks if this TX is something that can be handled.
   *  should return falsey value or a MediaConfig object.
   */
  getMediaConfig: (txId: string, tags: Record<string, string>) => false | undefined | null | MediaConfig  
}

export type ToHtml =
  (txId: string, tags: Record<string, string>)=>Promise<string>

export interface MediaConfig {

  /**
   * An optional link to the media on an external domain. 
   */
  url?: string,
  /**
   * A description of the Media.
   */
  description: string,
  /**
   * Whether to show the content by default
   */
  showContent: boolean,
  /**
   * Wheter to show a button to toggle the display of content
   */
  showContentToggle: boolean, 

  /**
   * An async function that returns a HTML string. 
   * *This HTML string should be sanitized and safe
   * to inject directly into the page*
   * 
   * (DOMPurify or similar can help with that)
   * 
   */
  toHtml: ToHtml
}



