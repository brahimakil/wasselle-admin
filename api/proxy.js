// Create/replace this file at: /api/proxy.js (in your project root)

export default async function handler(req, res) {
  // Enable CORS first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Path');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS request');
    return res.status(200).end();
  }

  console.log(`🔄 Proxy received: ${req.method} ${req.url}`);
  console.log(`🔄 Headers:`, JSON.stringify(req.headers, null, 2));

  try {
    // Get the API path from headers
    const apiPath = req.headers['x-api-path'];
    
    if (!apiPath) {
      console.log('❌ Missing X-API-Path header');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing X-API-Path header' 
      });
    }

    // Build the target URL
    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    console.log(`🔄 Proxying to: ${targetUrl}`);

    // Prepare headers for the backend request
    const backendHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Wasselle-Admin-Proxy/1.0'
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
      backendHeaders['Authorization'] = req.headers.authorization;
      console.log(`🔄 Forwarding auth header: ${req.headers.authorization.substring(0, 20)}...`);
    }

    // Prepare request body
    let requestBody;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        // If body is already parsed by Next.js
        requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        console.log(`🔄 Request body: ${requestBody.substring(0, 200)}${requestBody.length > 200 ? '...' : ''}`);
      }
    }

    // Make request to your backend
    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: backendHeaders,
      body: requestBody
    });

    console.log(`🔄 Backend response status: ${backendResponse.status}`);
    console.log(`🔄 Backend response ok: ${backendResponse.ok}`);

    // Get response text
    const responseText = await backendResponse.text();
    console.log(`🔄 Backend response text (first 300 chars): ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);

    // Check if response is empty or just whitespace
    if (!responseText || responseText.trim() === '') {
      console.log('❌ Backend returned empty response');
      return res.status(500).json({
        success: false,
        message: 'Backend returned empty response',
        debug: {
          targetUrl,
          status: backendResponse.status,
          headers: Object.fromEntries(backendResponse.headers.entries())
        }
      });
    }

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`✅ Successfully parsed JSON response`);
    } catch (parseError) {
      console.log(`❌ Failed to parse JSON: ${parseError.message}`);
      // If it's not JSON, return as plain text
      return res.status(backendResponse.status).send(responseText);
    }

    // Return the JSON response
    return res.status(backendResponse.status).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}