
export function translateArweaveExtension(txId: string, tags: Record<string, string>) {
  if (tags["Content-Type"] == 'text/html' && tags["page:title"] && tags["page:url"]) {
    // yay.
  }
}