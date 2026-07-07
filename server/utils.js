import { genAI, GEMINI_MODEL, GROQ_MODEL, groqApiKey, scraperApiKey } from './config.js';

// Call Groq API via fetch
export async function callGroq(prompt) {
  if (!groqApiKey) {
    throw new Error('VITE_GROQ_API_KEY is missing in server environment');
  }

  console.log(`[Groq API] Falling back to Groq (${GROQ_MODEL})...`);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert product recommender. Always respond with ONLY a valid JSON array. No markdown, no code blocks, no explanation — just the raw JSON array.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Groq returned empty response');
  }

  console.log(`[Groq API] Success with model: ${GROQ_MODEL}`);
  return text;
}

// Generate text with fallback mechanism: Gemini -> Groq
export async function generateWithFallback(prompt) {
  let geminiError = null;

  // --- ATTEMPT 1: Gemini ---
  {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          }
        });

        console.log(`[Gemini API] Request sent to model: ${GEMINI_MODEL}`);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log(`[Gemini API] Success with model: ${GEMINI_MODEL}`);
        return text;

      } catch (err) {
        geminiError = err;
        const errMsg = err.message || '';
        const is429 = errMsg.includes('429') || errMsg.includes('Too Many Requests');
        const isDailyLimit = errMsg.includes('Quota exceeded') || errMsg.includes('PerDay') || errMsg.includes('daily');

        if (is429 && isDailyLimit) {
          console.warn(`[Gemini API] ${GEMINI_MODEL} hit DAILY quota limit. Falling back to Groq.`);
          break;
        }

        if (is429) {
          retries++;
          if (retries >= maxRetries) {
            console.warn(`[Gemini API] Rate limited after ${retries} retries. Falling back to Groq.`);
            break;
          }
          const delays = [3000, 7000, 15000];
          const delay = delays[retries - 1] || 15000;
          console.warn(`[Gemini API] Rate limited. Waiting ${delay}ms before retry ${retries}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        console.warn(`[Gemini API] Failed with ${GEMINI_MODEL}:`, errMsg.substring(0, 120));
        break;
      }
    }
  }

  // --- ATTEMPT 2: Groq fallback ---
  try {
    return await callGroq(prompt);
  } catch (groqErr) {
    console.error('[Groq API] Fallback also failed:', groqErr.message?.substring(0, 200));
    throw new Error(
      `Both AI providers failed.\nGemini: ${geminiError?.message?.substring(0, 100)}\nGroq: ${groqErr.message?.substring(0, 100)}`
    );
  }
}

// Clean markdown json format block wrapper
export function extractJSON(text) {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    let jsonStr = codeBlockMatch[1].trim();
    return jsonStr.replace(/,\s*([\]}])/g, '$1');
  }

  const start = text.indexOf('[');
  if (start === -1) {
    throw new Error('No JSON array returned by the AI.');
  }

  let depth = 0;
  let end = -1;
  let inString = false;
  let isEscaping = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (isEscaping) {
      isEscaping = false;
      continue;
    }
    if (char === '\\') {
      isEscaping = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
  }

  if (end === -1) {
    end = text.lastIndexOf(']');
  }

  if (start === -1 || end === -1 || start >= end) {
    throw new Error('Invalid JSON array boundaries returned from AI.');
  }

  let jsonStr = text.slice(start, end + 1);
  return jsonStr.replace(/,\s*([\]}])/g, '$1');
}

// PC recommendation validator
export function validatePCBuild(build) {
  if (!build || typeof build !== 'object') return false;
  if (!build.components || typeof build.components !== 'object') return false;
  if (!build.totalPrice || typeof build.totalPrice !== 'number') return false;
  if (!build.type || !['performance', 'value', 'budget', 'prebuilt'].includes(build.type)) return false;
  const requiredComponents = ['cpu', 'gpu', 'ram', 'ssd', 'psu', 'case', 'motherboard', 'cooler'];
  for (const key of requiredComponents) {
    const c = build.components[key];
    if (!c || !c.brand || !c.name || typeof c.price !== 'number') return false;
  }
  build.performanceScore = Math.max(0, Math.min(100, build.performanceScore || 0));
  if (build.bottleneck) build.bottleneck.percentage = Math.max(0, Math.min(100, build.bottleneck.percentage || 0));
  return true;
}

// Laptop recommendation validator
export function validateLaptopRec(rec) {
  if (!rec || typeof rec !== 'object') return false;
  const l = rec.laptop;
  if (!l || !l.model || !l.brand || !l.cpu || typeof l.price !== 'number') return false;
  if (!l.id) l.id = `laptop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  rec.matchScore = Math.max(0, Math.min(100, rec.matchScore || 0));
  l.performanceScore = Math.max(0, Math.min(100, l.performanceScore || 0));
  if (!Array.isArray(l.storePrices)) l.storePrices = [];
  if (!l.lowestPrice) l.lowestPrice = l.price;
  if (!l.searchQuery) l.searchQuery = `${l.brand} ${l.model} ${l.cpu} laptop`;
  return true;
}

// Brand matcher
export function brandOk(title, brand, model = '') {
  if (!title) return false;
  const t = title.toLowerCase();
  if (brand && t.includes(brand.toLowerCase())) return true;
  if (model) {
    const words = model.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const matchCount = words.filter(w => t.includes(w)).length;
    if (words.length === 1 && matchCount === 1) return true;
    if (words.length > 1 && matchCount >= 2) return true;
  }
  return false;
}

export function extractKw(q, pats) {
  const lq = q.toLowerCase();
  for (const p of pats) {
    const m = lq.match(p);
    if (m) return m[1].replace(/\s+/g, ' ');
  }
  return null;
}

export function hasKw(t, kw) {
  const lt = t.toLowerCase();
  return lt.includes(kw) || lt.includes(kw.replace(/\s+/g, '')) || lt.includes(kw.replace(/(\d)([a-z])/g, '$1 $2'));
}

export const CPU_PAT = [/\b(i[3579])\b/, /\b(ryzen\s*[3579])\b/, /\b(ryzen\s*ai\s*[3579])\b/, /\b(ultra\s*[579])\b/, /\b(m[1234]\s*(?:pro|max|ultra)?)\b/];
export const GPU_PAT = [/\b(rtx\s*\d{4})\b/, /\b(gtx\s*\d{4})\b/, /\b(radeon\s*\w+)\b/, /\b(arc\s*\w+)\b/];

// Check hardware specs
export function specsOk(title, query, level) {
  if (!title || !query) return true;
  const t = title.toLowerCase();
  const gpu = extractKw(query, GPU_PAT);
  if (gpu && !hasKw(t, gpu)) return false;
  if (level === 'relaxed') return true;
  const cpu = extractKw(query, CPU_PAT);
  if (cpu && !hasKw(t, cpu)) return false;
  const ram = query.toLowerCase().match(/\b(\d+)\s*gb\b/);
  if (ram && !t.includes(ram[1] + 'gb') && !t.includes(ram[1] + ' gb')) return false;
  return true;
}

// Check if listing is unavailable/out-of-stock
export function isUnavailable(item) {
  const title = (item.name || '').toLowerCase();
  const avail = (item.availability || '').toLowerCase();

  const badPhrases = ['currently unavailable', 'out of stock', 'not available', 'temporarily out', 'no longer available'];
  for (const phrase of badPhrases) {
    if (title.includes(phrase) || avail.includes(phrase)) return true;
  }

  if (item.in_stock === false) return true;
  if (item.is_available === false) return true;
  if (!item.price && !item.price_raw) return true;
  if (item.price === 0 && !item.price_raw) return true;

  return false;
}

// Reject accessories, cases, bag listings
export function isActualLaptop(title) {
  const t = title.toLowerCase();
  const rejectPatterns = [
    'laptop bag', 'laptop stand', 'laptop sleeve', 'laptop skin',
    'laptop charger', 'laptop adapter', 'laptop battery', 'screen guard',
    'keyboard cover', 'cooling pad', 'laptop table', 'hard disk',
    'desktop', 'tower pc', 'assembled pc', 'mini pc',
    'only gpu', 'graphics card', 'processor only',
  ];
  for (const rp of rejectPatterns) {
    if (t.includes(rp)) return false;
  }
  const laptopSignals = ['laptop', 'notebook', 'ultrabook', 'chromebook',
    'victus', 'pavilion', 'inspiron', 'vostro', 'latitude',
    'thinkpad', 'ideapad', 'yoga', 'legion', 'vivobook', 'zenbook',
    'rog', 'tuf', 'predator', 'aspire', 'swift', 'nitro',
    'macbook', 'bravo', 'katana', 'pulse', 'thin', 'creator',
    'modern', 'prestige', 'raider', 'stealth', 'titan',
    'elitebook', 'probook', 'envy', 'spectre', 'omen',
    'gram', 'xps', 'alienware', 'g14', 'g15', 'g16',
  ];
  for (const sig of laptopSignals) {
    if (t.includes(sig)) return true;
  }
  return false;
}

// Check price sanity
export function priceSane(live, est) {
  if (!est || est <= 0) return true;
  return live >= est * 0.4 && live <= est * 1.6;
}

// Scrape logic
export async function scrape(query, brand, model, est, level, checkBrand, productType = 'laptop') {
  if (!scraperApiKey) {
    console.warn('[ScraperAPI] No API key configured.');
    return null;
  }
  const url = `https://api.scraperapi.com/structured/amazon/search?api_key=${scraperApiKey}&query=${encodeURIComponent(query)}&country=in`;
  try {
    console.log(`[ScraperAPI] Requesting (${level}) [${productType}]: ${query}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[ScraperAPI] HTTP error: ${res.status}`);
      return null;
    }
    const json = await res.json();
    const items = json.results;
    if (!Array.isArray(items) || !items.length) return null;

    for (const it of items) {
      const title = it.name || '';
      if (isUnavailable(it)) continue;
      if (productType === 'laptop' && !isActualLaptop(title)) continue;
      if (checkBrand && !brandOk(title, brand, model)) continue;
      if (!specsOk(title, query, level)) continue;

      const raw = it.price;
      const p = typeof raw === 'number' ? Math.round(raw)
        : (raw ? parseInt(String(raw).replace(/[^0-9]/g, ''), 10) : null);
      
      if (!p || p <= 0) continue;
      if (!priceSane(p, est)) continue;

      console.log(`[ScraperAPI] Match: "${title.substring(0, 50)}" -> ₹${p}`);
      return {
        store: 'Amazon',
        price: p,
        inStock: true,
        url: it.url || `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
        name: title
      };
    }
    return null;
  } catch (e) {
    console.warn('[ScraperAPI] Fetch Error:', e.message);
    return null;
  }
}
