/**
 * server.js - a very small login in front of an Eagle 3D Streaming Web SDK stream.
 *
 *   node login/server.js            then open http://localhost:3000
 *
 * No npm packages: Node 18 or newer is all it needs.
 *
 * What it does
 * ------------
 *  1. Serves the login page in ./public, and the SDK file the page needs
 *     (../scripts/dist/e3dsCore.min_ns.js).
 *  2. POST /api/login  { username, password }
 *       - checks them against users.json (salted scrypt hashes - add users with
 *         add-user.js),
 *       - on success asks Eagle 3D Streaming for a SESSION TOKEN with your
 *         Streaming API key, and answers { ok: true, tokenData, client },
 *       - on failure answers 401 { ok: false } and never calls Eagle at all.
 *
 * Why this is the safe shape
 * --------------------------
 * The Streaming API key stays in config.json on this server - the browser never
 * sees it. The browser only ever receives a session token, which is single use
 * and expires within a minute, so there is nothing in the page worth stealing.
 * Compare the plain demo (../index.html), which calls the token endpoint from the
 * browser with the key in the page: fine for trying things out, not for a public
 * site. https://learn.eagle3dstreaming.com/wiki/api-keys-and-tokens
 *
 * Settings: config.json next to this file (copy config.example.json and fill in
 * streamingApiKey and application). config.json is ignored by git - keep it so.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const PUBLIC_DIR = path.join(DIR, 'public');
const SDK_FILE = path.join(DIR, '..', 'scripts', 'dist', 'e3dsCore.min_ns.js');
const configFile = fs.existsSync(path.join(DIR, 'config.json')) ? 'config.json' : 'config.example.json';
const config = JSON.parse(fs.readFileSync(path.join(DIR, configFile), 'utf8'));
const PORT = Number(process.env.PORT || config.port || 3000);
const TOKEN_ENDPOINT = config.tokenEndpoint || 'https://token.eagle3dstreaming.com/api/v2/token/create';
const API_KEY = process.env.E3DS_STREAMING_API_KEY || config.streamingApiKey;

function loadUsers() {
    return JSON.parse(fs.readFileSync(path.join(DIR, 'users.json'), 'utf8'));
}

/** True when the password matches the stored "salt:hash". Constant time. */
function passwordMatches(password, stored) {
    const [salt, hash] = String(stored || '').split(':');
    if (!salt || !hash) return false;
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

/* After 5 wrong attempts from one address, refuse it for 5 minutes. */
const failures = new Map();
const blocked = (ip) => { const f = failures.get(ip); return f && f.until > Date.now(); };
function recordFailure(ip) {
    const f = failures.get(ip) || { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= 5) { f.until = Date.now() + 5 * 60 * 1000; f.count = 0; }
    failures.set(ip, f);
}

/** Exchange the Streaming API key for a session token - same request as ../scripts/sdk-token.js. */
async function requestSessionToken(application) {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Auth ' + API_KEY },
        body: JSON.stringify({
            object: { core: application, configurationToOverride: config.configurationToOverride || {} },
            expiry: config.tokenExpiryMs || 60000,
            client: application.userName
        })
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
    if (!response.ok || !data || data.error) {
        throw new Error(`token endpoint answered ${response.status}: ${(data && (data.error || data.message)) || text.slice(0, 200)}`);
    }
    return data;
}

function sendJson(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; if (data.length > 10000) { reject(new Error('too large')); req.destroy(); } });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveFile(res, file) {
    fs.readFile(file, (err, content) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(content);
    });
}

const server = http.createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);

    if (req.method === 'POST' && urlPath === '/api/login') {
        const ip = req.socket.remoteAddress;
        if (blocked(ip)) return sendJson(res, 429, { ok: false, error: 'Too many attempts. Try again in a few minutes.' });
        let body;
        try { body = JSON.parse(await readBody(req)); } catch (e) { return sendJson(res, 400, { ok: false }); }
        const user = loadUsers()[String(body.username || '')];
        if (!user || !passwordMatches(body.password, user.passwordHash)) {
            recordFailure(ip);
            return sendJson(res, 401, { ok: false, error: 'Wrong username or password.' });
        }
        failures.delete(ip);
        // A user may be limited to their own app; otherwise the one in config.json.
        const application = { ...config.application, ...(user.application || {}) };
        try {
            const tokenData = await requestSessionToken(application);
            return sendJson(res, 200, { ok: true, tokenData, client: application.userName });
        } catch (e) {
            console.error('[login] ' + e.message); // the reason stays in the server log, not in the browser
            return sendJson(res, 502, { ok: false, error: 'Signed in, but the stream could not be started. Check the server log.' });
        }
    }

    if (req.method === 'GET' && urlPath === '/sdk/e3dsCore.min_ns.js') return serveFile(res, SDK_FILE);
    if (req.method === 'GET') {
        const file = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
        if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
        return serveFile(res, file);
    }
    res.writeHead(405); res.end();
});

if (!API_KEY || API_KEY === 'Your Streaming API Key') {
    console.warn('No Streaming API key set: logins will work, starting a stream will not. Fill in login/config.json (streamingApiKey) or set E3DS_STREAMING_API_KEY.');
}
server.listen(PORT, () => console.log(`Login example on http://localhost:${PORT}  (settings: ${configFile})`));
