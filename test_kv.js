const fs = require('fs');
const https = require('https');

// Read config to extract credentials and IDs if possible, or we will need to use curl
// Since we don't have the user's Global API key in the shell, we will use the local dev server's SQLite database to seed the preview KV instead
// Actually, earlier we saw local dev server has no KV data either.

console.log("We need the user to either manually populate the preview KV namespace or provide an API token with KV read/write access to sync them.");
