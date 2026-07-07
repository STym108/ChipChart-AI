import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { recommendPC } from './controllers/pcController.js';
import { recommendLaptops } from './controllers/laptopController.js';
import { getLivePrice } from './controllers/priceController.js';

const app = express();

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
SERVER LAUNCH
=============================================================================
*/
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 ChipChart AI Backend server running on:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`===================================================`);
});
