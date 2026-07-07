import { generateWithFallback, extractJSON, validatePCBuild } from '../utils.js';

export async function recommendPC(req, res) {
  try {
    const answers = req.body;
    const purpose = answers.purpose || 'general';
    const budget = answers.budget || 100000;
    const resolution = answers.targetResolution || '1080p';
    
    const cpuBrand = answers.cpuBrandPreference === 'intel'
      ? 'STRICTLY use Intel CPUs (Core i3/i5/i7/i9 series only)'
      : answers.cpuBrandPreference === 'amd'
        ? 'STRICTLY use AMD CPUs (Ryzen 3/5/7/9 series only)'
        : 'Choose the best CPU brand (Intel or AMD) for performance and value';

    const upgradability = answers.upgradabilityPriority === 'future-proof'
      ? 'Use a high-quality upgradeable platform: Z-series (Intel) or X570/B650E (AMD) motherboard, DDR5, PCIe 5.0'
      : answers.upgradabilityPriority === 'budget-tight'
        ? 'Maximise raw performance, do not overspend on the motherboard or extras'
        : 'Balanced mid-range motherboard (B760/B650) with some future headroom';

    const ram = answers.ramRequirement === '32gb-plus' ? '32 GB minimum RAM'
      : answers.ramRequirement === '8gb' ? '8 GB RAM'
        : '16 GB RAM';

    const formFactor = answers.pcFormFactor === 'compact' ? 'Mini-ITX form factor (small build)'
      : answers.pcFormFactor === 'full-tower' ? 'Full-Tower E-ATX (workstation-class)'
        : 'Mid-Tower ATX (standard, most common)';

    const style = answers.pcVisualStyle === 'rgb' ? 'RGB case with tempered glass panel'
      : answers.pcVisualStyle === 'white' ? 'White/clean aesthetic case'
        : 'Stealth/Minimal all-black case';

    const prompt = `You are an expert PC builder in India. Generate exactly 3 PC build recommendations as a JSON array. Do not include any text before or after the JSON array.

User Requirements:
- Purpose: ${purpose}
- Budget: ${budget} INR (total for ALL parts combined)
- Target Resolution: ${resolution} — choose GPU power accordingly (1080p = mid GPU, 1440p = high GPU, 4K = flagship GPU)
- CPU Brand: ${cpuBrand}
- Upgradability Priority: ${upgradability}
- RAM: ${ram}
- Case Form Factor: ${formFactor}
- Aesthetic: ${style}
${answers._excludeNames ? `- EXCLUDE these builds: ${answers._excludeNames}` : ''}

Rules:
- Builds must be: type 1 = performance, type 2 = value, type 3 = prebuilt
- component "name" field must NOT include the brand name
- component "sku" MUST be the precise Manufacturer Part Number (MPN) or global product code.
- All components must be real products currently available in India
- PRICING ACCURACY: Make an educated estimate of typical retail pricing in India context (Amazon/Flipkart). Overestimate rather than underestimate.
- ABSOLUTE BUDGET ENFORCEMENT: The "totalPrice" of the build MUST be LESS THAN OR EQUAL TO Rs.${budget}. If a build exceeds the budget by even ₹1, DO NOT include it. Choose cheaper components instead.
- GPU must be appropriate for ${resolution} gaming at the given budget
- Strictly obey the CPU brand constraint stated above
- CRITICAL JSON ESCAPING: Do NOT use raw double quotes (") inside any string values. For example, use '15-inch', NEVER '15"'. An unescaped quote will crash the JSON parser.

Return ONLY this JSON array structure:
[
  {
    "type": "performance",
    "name": "Build name",
    "components": {
      "cpu": { "id": "cpu-1", "sku": "AMD-R5-7600", "category": "CPU", "brand": "AMD", "name": "Ryzen 5 7600", "specs": { "cores": 6, "speed": "3.8GHz" }, "performanceScore": 80, "price": 20000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=AMD+Ryzen+5+7600" } },
      "gpu": { "id": "gpu-1", "sku": "NVIDIA-RTX4060", "category": "GPU", "brand": "Nvidia", "name": "RTX 4060", "specs": { "vram": "8GB" }, "performanceScore": 82, "price": 30000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=RTX+4060" } },
      "ram": { "id": "ram-1", "sku": "RAM-16GB", "category": "RAM", "brand": "Corsair", "name": "Vengeance 16GB DDR5", "specs": { "size": "16GB", "speed": "5200MHz" }, "performanceScore": 75, "price": 6000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=Corsair+Vengeance+16GB+DDR5" } },
      "ssd": { "id": "ssd-1", "sku": "SSD-1TB", "category": "SSD", "brand": "Samsung", "name": "970 Evo Plus 1TB", "specs": { "capacity": "1TB", "speed": "3500MB/s" }, "performanceScore": 85, "price": 7000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=Samsung+970+Evo+Plus+1TB" } },
      "psu": { "id": "psu-1", "sku": "PSU-650W", "category": "PSU", "brand": "EVGA", "name": "SuperNOVA 650W Gold", "specs": { "wattage": "650W", "rating": "80+ Gold" }, "performanceScore": 80, "price": 6000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=EVGA+650W+Gold" } },
      "case": { "id": "case-1", "sku": "CASE-MID", "category": "CASE", "brand": "NZXT", "name": "H510", "specs": { "formFactor": "Mid-Tower" }, "performanceScore": 78, "price": 7000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=NZXT+H510" } },
      "motherboard": { "id": "mobo-1", "sku": "MOBO-B650", "category": "MOBO", "brand": "MSI", "name": "B650 Tomahawk", "specs": { "socket": "AM5", "chipset": "B650" }, "performanceScore": 78, "price": 15000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=MSI+B650+Tomahawk" } },
      "cooler": { "id": "cooler-1", "sku": "COOLER-AIR", "category": "COOLER", "brand": "be quiet!", "name": "Pure Rock 2", "specs": { "type": "Air", "tdp": "150W" }, "performanceScore": 76, "price": 3000, "buyLinks": { "amazon": "https://www.amazon.in/s?k=be+quiet+Pure+Rock+2" } }
    },
    "totalPrice": 94000,
    "performanceScore": 82,
    "compatibility": { "isCompatible": true, "checks": [{ "name": "CPU-Motherboard Socket", "passed": true, "message": "AM5 compatible" }] },
    "bottleneck": { "percentage": 5, "bottleneckComponent": "Balanced", "explanation": "Well-balanced build" },
    "fpsEstimates": [
      { "game": "GTA V", "fps": { "low": 160, "medium": 130, "high": 100, "ultra": 70 } },
      { "game": "Red Dead Redemption 2", "fps": { "low": 90, "medium": 70, "high": 50, "ultra": 35 } },
      { "game": "Valorant", "fps": { "low": 300, "medium": 250, "high": 200, "ultra": 150 } },
      { "game": "Fortnite", "fps": { "low": 180, "medium": 140, "high": 100, "ultra": 70 } },
      { "game": "Cyberpunk 2077", "fps": { "low": 80, "medium": 60, "high": 45, "ultra": 30 } },
      { "game": "Elden Ring", "fps": { "low": 100, "medium": 80, "high": 60, "ultra": 45 } }
    ],
    "alternatives": {}
  }
]

Replace the example above with 3 real builds matching user requirements.
Return ONLY the JSON array.`;

    const text = await generateWithFallback(prompt);
    const jsonText = extractJSON(text);
    const rawBuilds = JSON.parse(jsonText);
    const budgetCeiling = Math.round(budget * 1.15);

    const builds = rawBuilds.filter(b => {
      if (!validatePCBuild(b)) return false;
      return b.totalPrice <= budgetCeiling;
    });

    res.json(builds);
  } catch (error) {
    console.error('Error in recommendPC controller:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recommendations' });
  }
}
