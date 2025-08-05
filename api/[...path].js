export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get the path from the URL
    const { path } = req.query;
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    
    // Construct the target URL
    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    
    console.log('Proxying to:', targetUrl);
    console.log('Method:', req.method);
    console.log('Body:', req.body);

    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Get response text
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, return as text
      res.status(response.status).send(responseText);
      return;
    }

    // Return JSON response
    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Proxy error', 
      error: error.message 
    });
  }
} 