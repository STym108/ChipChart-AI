import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { recommendPC } from './controllers/pcController.js';
import { recommendLaptops } from './controllers/laptopController.js';
import { getLivePrice } from './controllers/priceController.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());

/*
=============================================================================
API ROUTES
=============================================================================
*/

// PC recommendation endpoint
app.post('/api/recommend/pc', recommendPC);

// Laptop recommendation endpoint
app.post('/api/recommend/laptops', recommendLaptops);

// Real-time e-commerce scraper endpoint
app.get('/api/price/live', getLivePrice);

/*
=============================================================================
STATIC FRONTEND SERVING (For Monolith Production Deploy)
=============================================================================
*/
// Serve static assets from the React dist folder (if it exists)
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback all other GET requests to index.html (supports React Router client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

/*
=============================================================================
SERVER LAUNCH
=============================================================================
*/
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 ChipChart AI Backend server running on:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`===================================================`);
});
