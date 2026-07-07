import { scrape, extractKw, GPU_PAT } from '../utils.js';

export async function getLivePrice(req, res) {
  try {
    const { searchQuery, brand, model, aiPrice, productType } = req.query;
    if (!searchQuery) {
      return res.status(400).json({ error: 'searchQuery query parameter is required' });
    }

    const estPrice = aiPrice ? parseInt(aiPrice, 10) : 0;
    const isPC = productType === 'pc';

    // Step 1: Strict Match (Brand + CPU + GPU + RAM)
    let r = await scrape(searchQuery, brand, model, estPrice, 'strict', true, isPC ? 'pc' : 'laptop');
    if (r) return res.json(r);

    // Step 2: Relaxed Match (Brand + GPU)
    await new Promise(ok => setTimeout(ok, 500));
    r = await scrape(searchQuery, brand, model, estPrice, 'relaxed', true, isPC ? 'pc' : 'laptop');
    if (r) return res.json(r);

    // Step 3: Simplified Match
    const gpu = extractKw(searchQuery, GPU_PAT);
    const simple = `${brand || ''} ${model || ''} laptop ${gpu || ''}`.trim();
    if (simple !== searchQuery && simple.length > 8) {
      r = await scrape(simple, brand, model, estPrice, 'relaxed', false, isPC ? 'pc' : 'laptop');
      if (r) return res.json(r);
    }

    res.json({ message: 'No live matches found', useFallback: true });
  } catch (error) {
    console.error('Error in getLivePrice controller:', error);
    res.status(500).json({ error: error.message || 'Scraper failed' });
  }
}
