import { livePriceCache } from './apiCache';
//in this module we are using backend to fetch the live prices of the products
export interface LivePriceResult {
  store: string;
  price: number | null;
  inStock: boolean;
  url: string;
  name?: string;
}
//api base url is the url of the backend server
//api is used to fetch the live prices of the products in real time. the response contains the price, inStock, url, name and store.
//this api is used to fetch the live prices of the products in real time.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

async function fetchLivePriceFromBackend(
  //this searchquery is used to search the product in the backend.
  //this brand is used to filter the product by brand.
  //this model is used to filter the product by model.
  //this aiPrice is the price of the product in the backend.
  //this productType is used to filter the product by product type.
  //all these parameters are sent in the form of URLSearchParams to the backend.
  //the responses are in the form of JSON objects. and are stored in the livePriceCache to avoid duplicate requests.
  searchQuery: string,//example of searchquery is "lenovo thinkpad x1 carbon gen 9" for laptop and "lenovo thinkpad x1 carbon gen 9 pc" for pc.
  brand = '',//example of brand is "lenovo".
  model = '',//example of model is "thinkpad x1 carbon gen 9".
  aiPrice = 0,//example of aiPrice is 80000.
  productType: 'laptop' | 'pc' = 'laptop'//example of productType is "laptop" or "pc".
): Promise<LivePriceResult | null> {
  try {
    const params = new URLSearchParams({
      //the initialization of this searchquery can be seen in the file PCBuilder.tsx and LaptopBuilder.tsx and this PCBuilder.tsx present in 
      searchQuery,
      brand,
      model,
      aiPrice: String(aiPrice),
      productType
    });

    console.log(`[Frontend API] Fetching live price: ${API_BASE_URL}/api/price/live?${params.toString()}`);

    const response = await fetch(`${API_BASE_URL}/api/price/live?${params.toString()}`);
    if (!response.ok) {
      console.warn(`[LivePrice API] Server returned error ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.useFallback || !data.price) {
      console.log(`[LivePrice API] No match found on server. Using AI fallback.`);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[LivePrice API] Proxy Error:", error);
    return null;
  }
}

// ── PUBLIC: Laptop ───────────────────────────
export async function fetchLiveAmazonPrice(
  searchQuery: string, brand = '', model = '', aiPrice = 0
): Promise<LivePriceResult | null> {
  const cacheKey = searchQuery;
  const cached = livePriceCache.get(cacheKey);
  if (cached) {
    if (!cached.inStock) return null;
    return cached;
  }

  const result = await fetchLivePriceFromBackend(searchQuery, brand, model, aiPrice, 'laptop');
  if (result) {
    livePriceCache.set(cacheKey, result);
    return result;
  }

  return null;
}

// ── PUBLIC: Prebuilt PC ──────────────────────
export async function fetchPrebuiltPCPrice(
  searchQuery: string, aiPrice = 0
): Promise<LivePriceResult | null> {
  const cacheKey = `pc_${searchQuery}`;
  const cached = livePriceCache.get(cacheKey);
  if (cached) {
    if (!cached.inStock) return null;
    return cached;
  }

  const result = await fetchLivePriceFromBackend(searchQuery, '', '', aiPrice, 'pc');
  if (result) {
    livePriceCache.set(cacheKey, result);
    return result;
  }

  return null;
}
