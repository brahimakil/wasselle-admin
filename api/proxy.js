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
    // Handle image requests
    if (req.query.path === 'uploads/image.php' && req.query.image) {
      const imagePath = req.query.image;
      const imageUrl = `http://161.97.179.72/wasselle/api/uploads/image.php?path=${imagePath}`;
      
      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      return res.status(200).send(Buffer.from(imageBuffer));
    }

    // Handle API requests
    const apiPath = req.headers['x-api-path'];
    
    if (!apiPath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing X-API-Path header' 
      });
    }

    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    
    console.log(`🔄 ${req.method} ${apiPath} -> ${targetUrl}`);

    const headers = {
      'Content-Type': 'application/json',
    };

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }

    console.log(`🔄 Request body:`, body);
    console.log(` Request headers:`, headers);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    console.log(`🔄 Backend response status:`, response.status);
    console.log(`🔄 Backend response ok:`, response.ok);

    const responseText = await response.text();
    console.log(`🔄 Backend response text:`, responseText);
    
    // If backend returns an error status, forward it properly
    if (!response.ok) {
      console.log(`🔄 Backend error, forwarding status ${response.status}`);
      return res.status(response.status).send(responseText);
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`🔄 Parsed JSON response:`, responseData);
    } catch (e) {
      console.log(` Non-JSON response, sending as-is`);
      return res.status(response.status).send(responseText);
    }

    return res.status(response.status).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    console.error('❌ Proxy error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message,
      stack: error.stack
    });
  }
}; 