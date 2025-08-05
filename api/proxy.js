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
    
    console.log(`🔄 ${req.method} ${apiPath}`);

    const headers = {};
    
    // Copy Authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    let body = undefined;
    
    // Check if this is a FormData request
    const contentType = req.headers['content-type'];
    const isFormData = contentType && contentType.includes('multipart/form-data');
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isFormData) {
        // For FormData, we need to reconstruct it from Vercel's parsed body
        const FormData = require('form-data');
        const formData = new FormData();
        
        // Vercel parses multipart data into req.body (fields) and req.files (files)
        // Add text fields
        if (req.body) {
          Object.keys(req.body).forEach(key => {
            formData.append(key, req.body[key]);
          });
        }
        
        // Add file fields - Vercel might put files in req.files
        if (req.files) {
          Object.keys(req.files).forEach(key => {
            const file = req.files[key];
            formData.append(key, file.data, {
              filename: file.name,
              contentType: file.mimetype
            });
          });
        }
        
        body = formData;
        // Let form-data set the correct headers with boundary
        Object.assign(headers, formData.getHeaders());
      } else {
        // For JSON requests
        headers['Content-Type'] = 'application/json';
        if (req.body) {
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