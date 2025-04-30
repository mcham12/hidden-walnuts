/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import type { Env as BaseEnv } from './types';

// Extend Env type for optional INSTAGRAM_CLIENT_ID
interface Env extends BaseEnv {
	INSTAGRAM_CLIENT_ID?: string;
}

async function getJsonBody(request: Request) {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

// Helper to add CORS headers
async function addCorsHeaders(response: Response): Promise<Response> {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
	
	const newResponse = new Response(response.body, response);
	Object.entries(headers).forEach(([key, value]) => {
		newResponse.headers.set(key, value);
	});
	return newResponse;
}

// Helper to verify token by calling the auth Worker
async function verifyToken(request: Request): Promise<{ valid: boolean; username?: string }> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return { valid: false };
	}
	const token = authHeader.slice(7);
	// Call the auth Worker /verify endpoint
	try {
		const res = await fetch('https://auth-api.mattmcarroll.workers.dev/verify', {
			method: 'GET',
			headers: { 'Authorization': `Bearer ${token}` },
		});
		if (!res.ok) return { valid: false };
		const data: { valid?: boolean; username?: string } = await res.json();
		return { valid: !!data.valid, username: data.username };
	} catch {
		return { valid: false };
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Handle CORS preflight requests
			if (request.method === "OPTIONS") {
				return addCorsHeaders(new Response(null, { status: 204 }));
			}

			const url = new URL(request.url);
			const { pathname } = url;

			// --- Categories ---
			if (pathname === "/categories") {
				if (request.method === "GET") {
					const data = await env.CATEGORIES.get("categories");
					console.log("Fetched categories:", data);
					return addCorsHeaders(new Response(data || "[]", { headers: { "Content-Type": "application/json" } }));
				}
				if (request.method === "POST") {
					// Require valid token
					const verify = await verifyToken(request);
					if (!verify.valid) {
						return addCorsHeaders(new Response("Unauthorized", { status: 401 }));
					}
					const body = await getJsonBody(request);
					console.log("Saving categories:", body);
					if (!Array.isArray(body)) {
						return addCorsHeaders(new Response("Invalid categories format", { status: 400 }));
					}
					await env.CATEGORIES.put("categories", JSON.stringify(body));
					return addCorsHeaders(new Response("OK"));
				}
				return addCorsHeaders(new Response("Method Not Allowed", { status: 405 }));
			}

			// --- Tagline ---
			if (pathname === "/tagline") {
				if (request.method === "GET") {
					const data = await env.CATEGORIES.get("tagline");
					console.log("Fetched tagline:", data);
					return addCorsHeaders(new Response(data || "", { headers: { "Content-Type": "text/plain" } }));
				}
				if (request.method === "POST") {
					// Require valid token
					const verify = await verifyToken(request);
					if (!verify.valid) {
						return addCorsHeaders(new Response("Unauthorized", { status: 401 }));
					}
					const body = await getJsonBody(request) as { tagline?: string } | null;
					console.log("Saving tagline:", body);
					if (!body?.tagline) {
						return addCorsHeaders(new Response("Invalid tagline format", { status: 400 }));
					}
					await env.CATEGORIES.put("tagline", body.tagline);
					return addCorsHeaders(new Response("OK"));
				}
				return addCorsHeaders(new Response("Method Not Allowed", { status: 405 }));
			}

			// --- Announcement ---
			if (pathname === "/announcement") {
				if (request.method === "GET") {
					const data = await env.CATEGORIES.get("announcement");
					console.log("Fetched announcement:", data);
					return addCorsHeaders(new Response(data || "", { headers: { "Content-Type": "text/plain" } }));
				}
				if (request.method === "POST") {
					// Require valid token
					const verify = await verifyToken(request);
					if (!verify.valid) {
						return addCorsHeaders(new Response("Unauthorized", { status: 401 }));
					}
					const body = await getJsonBody(request) as { announcement?: string } | null;
					console.log("Saving announcement:", body);
					// Allow empty string announcements
					if (body === null || typeof body.announcement !== 'string') {
						return addCorsHeaders(new Response("Invalid announcement format", { status: 400 }));
					}
					await env.CATEGORIES.put("announcement", body.announcement);
					return addCorsHeaders(new Response("OK"));
				}
				return addCorsHeaders(new Response("Method Not Allowed", { status: 405 }));
			}

			// --- Image Upload ---
			if (pathname === "/upload-image" && request.method === "POST") {
				// Require valid token
				const verify = await verifyToken(request);
				if (!verify.valid) {
					return addCorsHeaders(new Response("Unauthorized", { status: 401 }));
				}
				const contentType = request.headers.get("content-type") || "";
				if (!contentType.startsWith("multipart/form-data")) {
					return addCorsHeaders(new Response("Expected multipart/form-data", { status: 400 }));
				}
				const formData = await request.formData();
				const file = formData.get("file");
				// Use a type check compatible with Workers
				if (!(file && typeof (file as any).stream === 'function')) {
					return addCorsHeaders(new Response("No file uploaded", { status: 400 }));
				}
				const key = formData.get("key") as string || (file as any).name;
				await env.IMAGES.put(key, (file as any).stream());
				const publicUrl = `/images/${encodeURIComponent(key)}`;
				return addCorsHeaders(new Response(JSON.stringify({ url: publicUrl }), { headers: { "Content-Type": "application/json" } }));
			}

			// --- Serve Images ---
			if (pathname.startsWith("/images/")) {
				const key = decodeURIComponent(pathname.replace("/images/", ""));
				const object = await env.IMAGES.get(key);
				if (!object) return addCorsHeaders(new Response("Not found", { status: 404 }));
				return addCorsHeaders(new Response(object.body, {
					headers: {
						"Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
						"Cache-Control": "public, max-age=31536000"
					}
				}));
			}

			// --- Instagram Auth URL ---
			if (pathname === "/instagram/auth") {
				if (request.method === "GET") {
					const redirectUri = url.searchParams.get('redirect_uri');
					if (!redirectUri) {
						return addCorsHeaders(new Response("Missing redirect_uri parameter", { status: 400 }));
					}
					// Generate Instagram OAuth URL
					if (!env.INSTAGRAM_CLIENT_ID) {
						return addCorsHeaders(new Response("Missing Instagram client ID", { status: 500 }));
					}
					const instagramAuthUrl = new URL('https://api.instagram.com/oauth/authorize');
					instagramAuthUrl.searchParams.set('client_id', env.INSTAGRAM_CLIENT_ID);
					instagramAuthUrl.searchParams.set('redirect_uri', redirectUri);
					instagramAuthUrl.searchParams.set('scope', 'user_profile,user_media');
					instagramAuthUrl.searchParams.set('response_type', 'code');
					return addCorsHeaders(new Response(JSON.stringify({ url: instagramAuthUrl.toString() }), {
						headers: { "Content-Type": "application/json" }
					}));
				}
				return addCorsHeaders(new Response("Method Not Allowed", { status: 405 }));
			}

			// --- Not Found ---
			return addCorsHeaders(new Response("Not found", { status: 404 }));
		} catch (error: unknown) {
			console.error("Worker error:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			return addCorsHeaders(new Response(JSON.stringify({ error: errorMessage }), { 
				status: 500,
				headers: { "Content-Type": "application/json" }
			}));
		}
	}
} satisfies ExportedHandler<Env>;
