// Product edit pages are a single static-export shell (/products/_/edit/) that serve.json serves for every
// /products/:id/edit/ URL; ProductForm reads the real id from window.location. Next.js has no data files for real
// product ids, so a <Link> to an edit page prefetches /products/:id/edit/__next._tree.txt and fetches
// /products/:id/edit/index.txt on click: both 404, and the router then falls back to a full page load anyway.
// Navigate to edit pages with a full page load (a plain <a href> or window.location) instead. That gives the same
// result without the failed requests, and every edit page starts from a fresh document, so form state can't carry
// over from one product to another.
export function productEditHref(productId: string): string {
  return `/products/${productId}/edit/`;
}
