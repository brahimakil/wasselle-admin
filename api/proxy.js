// Replace your /api/proxy.js with this version that handles all edge cases

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Path');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight');
    return res.status(200).end();
  }

  console.log(`🔄 === PROXY REQUEST START ===`);
  console.log(`🔄 Method: ${req.method}`);
  console.log(`🔄 URL: ${req.url}`);
  console.log(`🔄 Headers: ${JSON.stringify(req.headers, null, 2)}`);

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
    console.log(`🔄 Target URL: ${targetUrl}`);

    // Prepare headers for the backend request
    const backendHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Wasselle-Admin-Proxy/1.0',
      'Accept': 'application/json, text/plain, */*'
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
      backendHeaders['Authorization'] = req.headers.authorization;
      console.log(`🔄 Auth: ${req.headers.authorization.substring(0, 20)}...`);
    }

    // Handle request body
    let requestBody;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        // Next.js might have already parsed the body
        if (typeof req.body === 'string') {
          requestBody = req.body;
        } else if (typeof req.body === 'object') {
          requestBody = JSON.stringify(req.body);
        }
        console.log(`🔄 Request body: ${requestBody?.substring(0, 200)}${requestBody?.length > 200 ? '...' : ''}`);
      } else {
        console.log('🔄 No request body');
      }
    }

    console.log(`🔄 Making request to backend...`);

    // Make request to your backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: backendHeaders,
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`🔄 Backend response status: ${backendResponse.status}`);
    console.log(`🔄 Backend response ok: ${backendResponse.ok}`);
    console.log(`🔄 Backend response headers:`, Object.fromEntries(backendResponse.headers.entries()));

    // Get response text
    const responseText = await backendResponse.text();
    console.log(`🔄 Backend response length: ${responseText.length}`);
    console.log(`🔄 Backend response (first 500 chars): ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);

    // Check if response is empty or just whitespace
    if (!responseText || responseText.trim() === '') {
      console.log('❌ Backend returned empty response');
      return res.status(502).json({
        success: false,
        message: 'Backend server returned empty response',
        debug: {
          targetUrl,
          backendStatus: backendResponse.status,
          backendHeaders: Object.fromEntries(backendResponse.headers.entries()),
          responseLength: responseText.length
        }
      });
    }

    // Check for common error patterns
    if (responseText.includes('404 Not Found') || responseText.includes('No input file specified')) {
      console.log('❌ Backend endpoint not found');
      return res.status(404).json({
        success: false,
        message: 'Backend endpoint not found',
        endpoint: apiPath,
        response: responseText.substring(0, 200)
      });
    }

    if (responseText.includes('PHP Parse error') || responseText.includes('Fatal error')) {
      console.log('❌ Backend PHP error');
      return res.status(500).json({
        success: false,
        message: 'Backend server error',
        error: responseText.substring(0, 300)
      });
    }

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`✅ Successfully parsed JSON response`);
      console.log(`✅ Response success: ${responseData.success}`);
    } catch (parseError) {
      console.log(`❌ Failed to parse JSON: ${parseError.message}`);
      console.log(`❌ Raw response: ${responseText}`);
      
      // Return the raw text with appropriate status
      return res.status(backendResponse.status).send(responseText);
    }

    console.log(`🔄 === PROXY REQUEST END ===`);

    // Return the JSON response with the same status code
    return res.status(backendResponse.status).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'Backend request timeout',
        error: 'Request took longer than 30 seconds'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message,
      type: error.name
    });
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}