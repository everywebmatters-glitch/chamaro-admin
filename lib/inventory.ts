// Stock and catalogue summaries shared by the dashboard and the inventory page.
// Pure functions (type-only imports) so they can be unit-tested with `node --test`.
import type { ApiProduct } from "@/lib/api/products";

// Units at or below this count as "low stock".
export const LOW_STOCK_THRESHOLD = 15;

export const STOCK_FILTERS = ["In stock", "Low stock", "Out of stock", "Not tracked"] as const;
export type StockStatus = (typeof STOCK_FILTERS)[number];

type WithInventory = Pick<ApiProduct, "inventory">;

// Units that can still be sold (on hand minus reserved); null when stock isn't tracked for the product.
export function availableUnits(product: WithInventory): number | null {
  return product.inventory ? product.inventory.quantity - product.inventory.reservedQuantity : null;
}

export function stockStatus(product: WithInventory): StockStatus {
  const units = availableUnits(product);
  if (units === null) return "Not tracked";
  if (units <= 0) return "Out of stock";
  if (units <= LOW_STOCK_THRESHOLD) return "Low stock";
  return "In stock";
}

export interface CatalogSummary {
  total: number;
  active: number;
  draft: number;
  archived: number;
  // Stock figures count ACTIVE products only: a draft or archived product being out of stock needs no action.
  inStock: number;
  lowStock: number;
  outOfStock: number;
  notTracked: number;
  // Active products needing attention, lowest stock first.
  needsRestock: ApiProduct[];
  // Newest products first.
  recent: ApiProduct[];
}

export function summarizeCatalog(products: ApiProduct[], recentCount = 5): CatalogSummary {
  const active = products.filter((product) => product.status === "ACTIVE");
  const count = (status: StockStatus) => active.filter((product) => stockStatus(product) === status).length;
  const needsRestock = active
    .filter((product) => {
      const status = stockStatus(product);
      return status === "Low stock" || status === "Out of stock";
    })
    .sort((a, b) => (availableUnits(a) ?? 0) - (availableUnits(b) ?? 0) || a.name.localeCompare(b.name));

  return {
    total: products.length,
    active: active.length,
    draft: products.filter((product) => product.status === "DRAFT").length,
    archived: products.filter((product) => product.status === "ARCHIVED").length,
    inStock: count("In stock"),
    lowStock: count("Low stock"),
    outOfStock: count("Out of stock"),
    notTracked: count("Not tracked"),
    needsRestock,
    recent: [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, recentCount),
  };
}
