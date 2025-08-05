const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for localhost:3000
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Import your proxy function
const proxyHandler = require('./api/proxy.js').default;

// Handle all /api/proxy requests
app.all('/api/proxy', async (req, res) => {
  try {
    await proxyHandler(req, res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API proxy server running on http://localhost:${PORT}`);
  console.log('Your React app should use: REACT_APP_API_BASE_URL=http://localhost:3001/api');
});
