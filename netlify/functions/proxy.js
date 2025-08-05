export default async function handler(request) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Path'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const apiPath = request.headers.get('x-api-path');
    
    if (!apiPath) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing X-API-Path header' 
      }), { status: 400, headers });
    }

    const targetUrl = `http://161.97.179.72/wasselle/api/${apiPath}`;
    
    console.log(`🔄 ${request.method} ${apiPath}`);

    const requestHeaders = {};
    
    // Copy Authorization header
    const auth = request.headers.get('authorization');
    if (auth) {
      requestHeaders['Authorization'] = auth;
    }

    let body = undefined;
    
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      
      if (contentType && contentType.includes('multipart/form-data')) {
        // For FormData, Netlify V2 handles this automatically!
        const formData = await request.formData();
        
        // Convert FormData to Node.js compatible FormData for the fetch
        const newFormData = new FormData();
        for (const [key, value] of formData.entries()) {
          newFormData.append(key, value);
        }
        body = newFormData;
        // Don't set Content-Type, let fetch handle it
      } else {
        // For JSON requests
        requestHeaders['Content-Type'] = 'application/json';
        body = await request.text();
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: body,
    });

    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return new Response(responseText, { 
        status: response.status, 
        headers 
      });
    }

    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers
    });

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Proxy server error', 
      error: error.message
    }), { status: 500, headers });
  }
}

// This tells Netlify to use the V2 function format
export const config = {
  path: "/proxy"
}; 