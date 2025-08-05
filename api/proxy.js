export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Path');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the API path from custom header or query parameter
    const apiPath = req.headers['x-api-path'] || req.query.path;
    
    if (!apiPath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing API path. Use X-API-Path header or ?path= query parameter' 
      });
    }

    // Construct the target URL
    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    
    console.log('🔄 Proxying request:');
    console.log('  - Method:', req.method);
    console.log('  - Target URL:', targetUrl);
    console.log('  - Headers:', req.headers);

    // Prepare headers to forward
    const headers = {
      'Content-Type': 'application/json',
    };

    // Forward Authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('  - Auth header forwarded:', req.headers.authorization.substring(0, 20) + '...');
    }

    // Prepare body
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        console.log('  - Request body:', body);
      }
    }

    // Make the request to your API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    console.log('📡 Response from API:');
    console.log('  - Status:', response.status);

    // Get response text
    const responseText = await response.text();
    console.log('  - Response length:', responseText.length);

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('  - Parsed JSON successfully');
    } catch (e) {
      console.log('  - Not JSON, returning as text');
      return res.status(response.status).send(responseText);
    }

    // Return the response with the same status code
    return res.status(response.status).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message
    });
  }
} 