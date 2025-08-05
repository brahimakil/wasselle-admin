module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Path');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiPath = req.headers['x-api-path'] || req.query.path;
    
    if (!apiPath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing API path. Use X-API-Path header or ?path= query parameter' 
      });
    }

    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    
    // Only log essential info
    console.log(`🔄 ${req.method} ${apiPath}`);

    // Prepare headers - copy from original request
    const headers = {};
    
    // Copy Content-Type if it exists
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }
    
    // Copy Authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // For non-FormData requests without Content-Type, default to JSON
    if (!req.headers['content-type'] && req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }

    // Handle body
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        // If it's FormData (multipart), pass as-is, otherwise stringify for JSON
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
          body = req.body;
        } else {
          body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return res.status(response.status).send(responseText);
    }

    return res.status(response.status).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message
    });
  }
} 