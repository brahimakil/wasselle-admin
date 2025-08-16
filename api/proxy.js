// Replace your /api/proxy.js with this version that handles images properly

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
  console.log(`🔄 Query: ${JSON.stringify(req.query)}`);

  try {
    // Handle image requests differently
    if (req.query.path && req.query.image) {
      console.log('🖼️ Handling image request');
      const imagePath = req.query.image;
      const imageUrl = `http://161.97.179.72/wasselle/api/uploads/image.php?path=${encodeURIComponent(imagePath)}`;
      
      console.log(`🖼️ Fetching image from: ${imageUrl}`);
      
      try {
        const imageResponse = await fetch(imageUrl);
        
        if (!imageResponse.ok) {
          console.log(`🖼️ Image fetch failed: ${imageResponse.status}`);
          return res.status(404).json({ error: 'Image not found' });
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        console.log(`🖼️ Image served successfully, type: ${contentType}, size: ${imageBuffer.byteLength}`);
        return res.status(200).send(Buffer.from(imageBuffer));
      } catch (imageError) {
        console.error('🖼️ Image proxy error:', imageError);
        return res.status(500).json({ error: 'Failed to fetch image' });
      }
    }

    // Handle API requests
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
        if (typeof req.body === 'string') {
          requestBody = req.body;
        } else if (typeof req.body === 'object') {
          requestBody = JSON.stringify(req.body);
        }
        console.log(`🔄 Request body: ${requestBody?.substring(0, 200)}${requestBody?.length > 200 ? '...' : ''}`);
      }
    }

    console.log(`🔄 Making request to backend...`);

    // Make request to backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: backendHeaders,
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`🔄 Backend response status: ${backendResponse.status}`);
    console.log(`🔄 Backend response ok: ${backendResponse.ok}`);

    // Get response text
    const responseText = await backendResponse.text();
    console.log(`🔄 Backend response length: ${responseText.length}`);
    console.log(`🔄 Backend response: "${responseText}"`);

    // If backend returned an error status (500, 404, etc), but has content
    if (!backendResponse.ok) {
      console.log(`❌ Backend returned error status: ${backendResponse.status}`);
      
      // Try to parse error response as JSON
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = {
          success: false,
          message: `Backend error: ${responseText || 'Unknown error'}`,
          status: backendResponse.status
        };
      }
      
      return res.status(backendResponse.status).json(errorData);
    }

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

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`✅ Successfully parsed JSON response`);
    } catch (parseError) {
      console.log(`❌ Failed to parse JSON: ${parseError.message}`);
      console.log(`❌ Raw response: ${responseText}`);
      
      return res.status(backendResponse.status).send(responseText);
    }

    console.log(`🔄 === PROXY REQUEST END ===`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'Backend request timeout'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};