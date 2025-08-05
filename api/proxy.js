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
    
    console.log(`🔄 ${req.method} ${apiPath}`);

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
}; 