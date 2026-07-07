import { generateWithFallback, extractJSON, validateLaptopRec } from '../utils.js';

export async function recommendLaptops(req, res) {
  try {
    const answers = req.body;
    const isGaming = ['gaming', 'streaming', 'content-creation', 'video-editing'].includes(answers.purpose || '');

    const brandConstraint = (() => {
      const brands = answers.laptopBrandPreference ?? [];
      const filtered = brands.filter(b => b !== 'no-preference');
      if (filtered.length === 0) return 'Any brand — pick the absolute best value for the budget.';
      return `ONLY recommend laptops from: ${filtered.map(b => b.toUpperCase()).join(', ')}. STRICTLY FORBIDDEN: Any brand not in this list.`;
    })();

    const displayHint = (() => {
      switch (answers.displayType) {
        case 'vibrant-oled': return 'MANDATORY: OLED display ONLY. FORBIDDEN: IPS, TN, VA panels.';
        case 'high-hertz': return 'MANDATORY: High refresh rate display (120Hz or above). FORBIDDEN: 60Hz displays.';
        case 'touchscreen': return 'MANDATORY: Touchscreen display. FORBIDDEN: Non-touch displays.';
        case 'standard-ips': return 'MANDATORY: Standard IPS or anti-glare LCD display. FORBIDDEN: OLED displays.';
        default: return 'Any display type is acceptable.';
      }
    })();

    const screenSizeHint = (() => {
      switch (answers.screenSize) {
        case 'compact': return 'MANDATORY: 13-inch or 14-inch screen ONLY. FORBIDDEN: 15-inch, 15.6-inch, 16-inch, or larger.';
        case 'large': return 'MANDATORY: 16-inch or larger screen ONLY. FORBIDDEN: 13-inch, 14-inch, 15-inch.';
        case 'standard':
        default: return 'MANDATORY: 15-inch, 15.6-inch, or 16-inch screen. FORBIDDEN: 13-inch, 14-inch and 17-inch+.';
      }
    })();

    const mobilityHint = (() => {
      switch (answers.mobility) {
        case 'on-the-go': return 'MANDATORY: Ultra-portable, under 1.6kg weight. MUST have long battery life (6+ hours). FORBIDDEN: Bulky gaming laptops over 2kg.';
        case 'stationary': return 'Weight and battery are NOT constraints. Prioritize raw performance over portability.';
        case 'balanced':
        default: return 'MANDATORY: Moderate weight between 1.5kg and 2.3kg.';
      }
    })();

    const buildHint = (() => {
      switch (answers.buildMaterial) {
        case 'premium-metal': return 'MANDATORY: Aluminum or Magnesium alloy body. FORBIDDEN: Primarily plastic-bodied laptops.';
        case 'budget-plastic': return 'Plastic body is acceptable.';
        default: return 'Any build material is acceptable.';
      }
    })();

    const storageHint = (() => {
      switch (answers.storageSize) {
        case 'massive': return 'MANDATORY: At least 2TB SSD storage. FORBIDDEN: Laptops with less than 2TB SSD.';
        case 'ample': return 'MANDATORY: At least 1TB SSD storage. FORBIDDEN: Laptops with 512GB or less SSD.';
        default: return 'At least 256GB SSD. 512GB preferred.';
      }
    })();

    const ramHint = (() => {
      const purpose = answers.purpose || 'general';
      if (['gaming', 'ml-ai', 'content-creation', 'streaming'].includes(purpose)) {
        return 'MANDATORY: At least 16GB RAM. FORBIDDEN: 8GB RAM laptops.';
      }
      return 'At least 8GB RAM.';
    })();

    const budgetMax = answers.budget || 100000;
    const budgetCeiling = Math.round(budgetMax * 1.05);

    const prompt = `You are an expert laptop recommender for the Indian market.
Generate exactly 3 laptop recommendations as a JSON array.
${answers._excludeModels ? `DO NOT recommend these models again: ${answers._excludeModels}` : ''}

Strict Requirements:
- Purpose: ${answers.purpose?.toUpperCase() || 'GENERAL'}
- Budget: Rs.${budgetMax} INR (Soft ceiling is Rs.${budgetCeiling})
- Display Type: ${displayHint}
- Screen Size: ${screenSizeHint}
- Portability & Weight: ${mobilityHint}
- Build Material: ${buildHint}
- Storage: ${storageHint}
- Brand Preference: ${brandConstraint}
- RAM: ${ramHint}

Return ONLY this JSON array (no conversational text):
[
  {
    "laptop": {
      "id": "laptop-1",
      "model": "ROG Zephyrus G14 2024",
      "brand": "ASUS",
      "searchQuery": "ASUS ROG Zephyrus G14 2024 Ryzen 9 RTX 4060 16GB",
      "cpu": "AMD Ryzen 9 8945HS",
      "gpu": "NVIDIA RTX 4060 8GB",
      "ram": "16GB LPDDR5X",
      "storage": "1TB PCIe 4.0 NVMe SSD",
      "display": "14-inch 2560x1600 165Hz IPS",
      "battery": "~8 hours",
      "weight": "1.65 kg",
      "performanceScore": 92,
      "price": 94990,
      "lowestPrice": 94990,
      "storePrices": [
        { "store": "Amazon", "price": 94990, "inStock": true },
        { "store": "Flipkart", "price": 94990, "inStock": true }
      ]
    },
    "matchScore": 94,
    "pros": ["Latest Ryzen 8000 CPU"],
    "cons": ["Gets warm under sustained load"]
    ${isGaming ? `, "fpsEstimates": [
      { "game": "Valorant", "fps": { "low": 300, "medium": 240, "high": 180, "ultra": 120 } }
    ]` : ''}
  }
]`;

    const text = await generateWithFallback(prompt);
    const jsonText = extractJSON(text);
    const rawRecs = JSON.parse(jsonText);

    const recommendations = rawRecs.filter(r => validateLaptopRec(r));
    res.json(recommendations);
  } catch (error) {
    console.error('Error in recommendLaptops controller:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recommendations' });
  }
}
