# Login example (Web SDK)

A very small login in front of an Eagle 3D Streaming stream started with the Web SDK. The
visitor signs in on your page; only a correct username and password starts the stream - and
your Streaming API key never reaches the browser.

```
cp login/config.example.json login/config.json     # then put your Streaming API key and app in it
node login/server.js                                # Node 18 or newer, no npm install needed
```
then open http://localhost:3000 and sign in as `demo` / `demo123`.

## How it works

```
 browser                                   login/server.js                     Eagle 3D Streaming
 ───────                                   ───────────────                     ──────────────────
 username + password ── POST /api/login ─▶ check users.json
                                           ├─ wrong → 401 { ok:false }   (Eagle is never called)
                                           └─ right ── POST token/create ──▶  with your API key
                                                       ◀── session token ───
 e3ds_controller.main(tokenData) ◀──────── { ok:true, tokenData, client }
```

| file | what it is |
|---|---|
| `server.js` | serves the page and the SDK file, answers `POST /api/login`, requests the session token |
| `users.json` | the users. Passwords are stored as salted scrypt hashes, never as text |
| `add-user.js` | `node login/add-user.js <username> <password>` adds or updates a user |
| `config.example.json` | copy to `config.json` (ignored by git): your **Streaming API key** and which app to start. The key can also come from the `E3DS_STREAMING_API_KEY` environment variable |
| `public/index.html`, `public/login.js` | the login form and the player (`#playerUI`) |

A user can be limited to their own app by adding an `application` object to their entry in
`users.json` (same fields as in `config.json`); otherwise everyone gets the app in `config.json`.

## Why this shape

The plain demo (`../index.html`) asks for the session token from the browser, which means the
Streaming API key is in the page - fine for trying things out, not for a public site. Here the
key stays on the server and the browser only ever receives a **session token**: single use, and
it expires within a minute, so there is nothing in the page worth stealing.
https://learn.eagle3dstreaming.com/wiki/api-keys-and-tokens

## Before you use it for real

- Serve it over **https** (behind nginx or another reverse proxy).
- Replace the example user: `node login/add-user.js <you> <a long password>` and remove `demo`.
- This example has no sessions or cookies: refreshing the page asks for the password again. In a
  real site, keep your existing login and give it an endpoint that does what `/api/login` does
  after a successful sign-in: request the token server-side, return only the token.

More: https://learn.eagle3dstreaming.com/wiki/login-in-front-of-a-stream
The same example for an iframe: `login-example` branch of
[E3DS-Iframe-Demo](https://github.com/e3ds/E3DS-Iframe-Demo).
