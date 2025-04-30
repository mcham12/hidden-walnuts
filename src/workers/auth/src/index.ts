interface Env {
  AUTH_STORE: KVNamespace;
  ENVIRONMENT: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: LoginRequest;
  try {
    body = await request.json() as LoginRequest;
    if (!body.username || !body.password) {
      throw new Error('Missing username or password');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Check credentials against environment variables
  if (body.username !== env.ADMIN_USERNAME || body.password !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const token = crypto.randomUUID();
  await env.AUTH_STORE.put(`token:${token}`, body.username, { expirationTtl: 3600 });
  
  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const token = authHeader.slice(7);
  const username = await env.AUTH_STORE.get(`token:${token}`);
  
  if (!username) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return new Response(JSON.stringify({ valid: true, username }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return addCorsHeaders(new Response(null, { status: 204 }));
    }
    
    const url = new URL(request.url);
    
    try {
      let response: Response;
      
      switch (url.pathname) {
        case '/login':
          if (request.method !== 'POST') {
            response = new Response('Method not allowed', { status: 405 });
            break;
          }
          response = await handleLogin(request, env);
          break;
          
        case '/verify':
          if (request.method !== 'GET') {
            response = new Response('Method not allowed', { status: 405 });
            break;
          }
          response = await handleVerify(request, env);
          break;
          
        default:
          response = new Response('Not found', { status: 404 });
      }
      
      return addCorsHeaders(response);
    } catch (error) {
      console.error('Error processing request:', error);
      return addCorsHeaders(new Response('Internal server error', { status: 500 }));
    }
  },
}; 