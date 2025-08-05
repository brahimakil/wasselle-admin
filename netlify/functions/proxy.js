exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Path'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Handle image requests
    if (event.queryStringParameters && event.queryStringParameters.path === 'uploads/image.php') {
      const imagePath = event.queryStringParameters.image;
      const imageUrl = `http://161.97.179.72/wasselle/api/uploads/image.php?path=${imagePath}`;
      
      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        },
        body: Buffer.from(imageBuffer).toString('base64'),
        isBase64Encoded: true
      };
    }

    // Handle API requests (existing code)
    const apiPath = event.headers['x-api-path'];
    
    if (!apiPath) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Missing X-API-Path header' 
        })
      };
    }

    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    
    console.log(`🔄 ${event.httpMethod} ${apiPath}`);

    const requestHeaders = {
      'Content-Type': 'application/json',
    };

    if (event.headers.authorization) {
      requestHeaders['Authorization'] = event.headers.authorization;
    }

    let body = undefined;
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
      body = event.body;
    }

    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: requestHeaders,
      body: body,
    });

    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return {
        statusCode: response.status,
        headers,
        body: responseText
      };
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Proxy server error', 
        error: error.message
      })
    };
  }
}; 