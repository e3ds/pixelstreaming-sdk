# Eagle 3D Streaming — JavaScript SDK demo

Stream a cloud-rendered Unreal Engine application straight into your own web
page, and control it from JavaScript.

Unlike the iframe approach, the stream is rendered **directly in your page**, so
you have full programmatic control: start and stop sessions, send data to the
app, react to what it sends back, and change quality at runtime.

Plain HTML, CSS and JavaScript — no build step, no framework, no `npm install`.

---

## Table of contents

- [iframe or SDK — which do I want?](#iframe-or-sdk--which-do-i-want)
- [Quick start](#quick-start)
- [Security: your API key](#security-your-api-key)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Configuration reference](#configuration-reference)
- [Sending data to your app](#sending-data-to-your-app)
- [Callbacks reference](#callbacks-reference)
- [Session control](#session-control)
- [Common problems](#common-problems)
- [Support](#support)

---

## iframe or SDK — which do I want?

Eagle 3D Streaming offers two ways to embed a stream. Pick by how much control
you need.

| | **iframe embed** | **SDK (this demo)** |
| --- | --- | --- |
| Setup | Paste one `<iframe>` tag | Include the SDK, get a token, start a session |
| Control | Messages through the iframe boundary | Direct JavaScript calls |
| Session management | Handled for you | You start, restart and terminate |
| Needs an API key | No | **Yes** — see [Security](#security-your-api-key) |
| Best for | Dropping a stream into an existing page | Custom interfaces and deep integration |

If you only need a stream on a page, the iframe demo is simpler and has nothing
secret to protect. Choose the SDK when you need to drive the session yourself.

---

## Quick start

**1. Add your API key.** Open `scripts/sdk-config.js` and replace the placeholder:

```js
const STREAMING_API_KEY = "Your Streaming API Key";
```

**2. Point it at your app.** In the same file, set `application` to match your
dashboard exactly, capitalisation included:

```js
application: {
    domain: "connector_s10.eagle3dstreaming.com",
    userName: "demo",
    appName: "FeaturesPluginDemo_UE58",
    configurationName: "0",
    version: "latest"
}
```

**3. Open it.** Straight from disk works — `file:///…/sdk/index.html` — because
the token endpoint sends `Access-Control-Allow-Origin: *`, which accepts the
`null` origin a `file://` page has. That is the quickest way to see it run.

Serve it over `http://` once you are past the first look. Not because `file://`
is blocked, but because it only works for as long as that endpoint accepts any
origin — a server-side policy you neither control nor get told about — and
because `http://` is how your real integration will run.

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

**4. Open <http://localhost:8000>.** The stream starts automatically, and the
demo's buttons appear once it is live. Press **F12** to watch the session
progress in the console.

---

## Security: your API key

**Read this before putting the SDK on a public site.**

Anything in a web page can be read by anyone who visits it. An API key placed in
`sdk-config.js` is visible to every visitor through their browser's developer tools.

That is fine for local experiments and internal demos, which is why this demo is
written that way. It is **not** fine for a public site: your API key does not
expire, and it can be used to start sessions billed to your account.

### The safe pattern for production

Keep the key on your own server and send only the short-lived token to the page:

```
Browser                    Your server                Eagle 3D Streaming
   │                            │                            │
   │  "I'd like to stream"      │                            │
   ├───────────────────────────▶│                            │
   │                            │  API key + app details     │
   │                            ├───────────────────────────▶│
   │                            │                            │
   │                            │  short-lived token         │
   │                            │◀───────────────────────────┤
   │  just the token            │                            │
   │◀───────────────────────────┤                            │
   │                                                         │
   │  start session with token                               │
   ├────────────────────────────────────────────────────────▶│
```

To do this, change one thing: point `requestSessionToken()` in
`scripts/sdk-token.js` at your own endpoint instead of Eagle 3D Streaming's.
Nothing else in the demo changes.

The **token** is safe to send to the browser — it expires in about a minute and
covers a single session. The **API key** is not.

> **If you have ever committed a real API key to a public repository, treat it as
> compromised and issue a new one from the dashboard.**

---

## How it works

Starting a stream takes three steps:

1. **Get a token.** Your page (or better, your server) asks Eagle 3D Streaming
   for a short-lived session token — permission to run one session of one app.
2. **Start the session.** Hand that token to `e3ds_controller.main()`. The SDK
   finds a machine, launches your app, and renders the video into `#playerUI`.
3. **Talk to the app.** Once `onDataChannelOpen` fires, send data with
   `sendDataToUE()` and receive replies through `onResponseFromUnreal`.

```
   sdk-config.js ──▶ sdk-token.js ──▶ e3ds_controller.main(token)
                                              │
                                              ▼
                                    sdk-callbacks.js
                                    (onDataChannelOpen, …)
                                              │
                                              ▼
                                     your own page logic
```

---

## Project structure

```
sdk/
├── index.html                     The page itself
├── README.md                      This file
├── css/
│   └── style.css                  Styling for the demo's buttons
└── scripts/
    ├── sdk-config.js                  ← your API key and app details
    ├── sdk-token.js           Getting a token, starting the session
    ├── sdk-callbacks.js        Reacting to what the stream does
    ├── demo-ui-connection-setup.js        DEMO ONLY — the on-page settings panel
    ├── demo-ui-controls.js           DEMO ONLY — this demo's buttons
    └── dist/
        └── e3dsCore.min_ns.js     The SDK itself (generated — do not edit)
```

### Renamed in this release

Every file now says which side it belongs to — `sdk-` is the SDK, `demo-ui-` is
scaffolding that exists so you can try things without writing code. If you
copied this folder earlier, map the old names across:

| Before | Now |
| --- | --- |
| `config.js` | `sdk-config.js` |
| `session-token.js` | `sdk-token.js` |
| `stream-callbacks.js` | `sdk-callbacks.js` |
| `connection-setup.js` | `demo-ui-connection-setup.js` |
| `demo-controls.js` | `demo-ui-controls.js` |

**Nothing in your own copy breaks.** Your files keep the names you have, and the
SDK library itself is unchanged — only this demo folder was renamed. The one
thing to watch is the load order in your page, which is unchanged and still
matters: see the note below.

The settings this demo saves in your browser also survive, because the storage
key was deliberately left alone.

### What each file does

| File | Purpose | Copy into your project? |
| --- | --- | --- |
| **`index.html`** | Loads the SDK and the five scripts **in a required order** (see the comment in the file), and provides the `#playerUI` element the player renders into. | As a reference |
| **`css/style.css`** | Styles only the demo's own button panel. The player styles its own interface. | Optional |
| **`scripts/sdk-config.js`** | Your API key, which app to run, and token lifetime. **The only file you must edit.** | **Yes** |
| **`scripts/sdk-token.js`** | Requests a session token and starts the stream. Validates your configuration first so a missed setting names itself instead of failing obscurely. Replace its `fetch` with your own server endpoint for production. | **Yes** |
| **`scripts/sdk-callbacks.js`** | Every callback the SDK offers, each documented. This is where your own logic goes. | **Yes** |
| **`scripts/demo-ui-connection-setup.js`** | **Demo only.** An on-page panel for typing the API key, username and app name without editing a file. Not part of the SDK — see [Built only for the demo](#built-only-for-the-demo). | No |
| **`scripts/demo-ui-controls.js`** | **Demo only.** Builds the demo's buttons. Each one is a one-line example of an SDK call. | As a reference |
| **`scripts/dist/e3dsCore.min_ns.js`** | The SDK library. Generated and minified — never edit it by hand; your changes would be lost on the next build. | **Yes** (as-is) |

> **Script order in `index.html` is not arbitrary.** The SDK must load first
> because everything else refers to `e3ds_controller`, and `sdk-token.js`
> loads **last** so that your callbacks are registered before the stream starts.
> Reordering them can cause callbacks to be missed.

---

## Configuration reference

All in `scripts/sdk-config.js`.

| Setting | Meaning |
| --- | --- |
| `STREAMING_API_KEY` | Your key from the dashboard. See [Security](#security-your-api-key). |
| `clientUserName` | Identifies the viewer. Usually your own logged-in user's id. |
| `tokenExpiryMs` | How long the token stays valid, in milliseconds. `60000` (one minute) is a good default — it only has to last long enough to start the session. |
| `application.domain` | The connector your account was given. |
| `application.userName` | The account that owns the app. |
| `application.appName` | The app's name, exactly as in the dashboard. |
| `application.configurationName` | Which stored configuration to launch. `"0"` is the default. |
| `application.version` | A specific version, or `"latest"`. |
| `configurationToOverride` | Per-session overrides of the stored configuration. Applies to this session only; leave empty to use the dashboard's settings. |

---

## Sending data to your app

There are three ways to send something, for three different purposes.

### `sendDataToUE(data)` — your own data

The one you will use most. Sends whatever you like to your Unreal application;
the shape is entirely up to how your app was built.

```js
e3ds_controller.sendDataToUE({ Character: "Aurora" });
e3ds_controller.sendDataToUE({ Skin: "2" });
```

Your app receives this and does whatever you programmed it to do. **If nothing
happens, a mismatch between what you send and what the app listens for is the
first thing to check.**

### `sendCommandToUE(command)` — built-in platform commands

Commands the platform understands, rather than ones you implemented. Resolution
is the common one:

```js
e3ds_controller.sendCommandToUE({ Resolution: { Width: 1920, Height: 1080 } });
```

### `sendConsoleCommandToUE(command)` — Unreal console commands

Standard Unreal Engine console commands. Mostly useful while developing:

```js
e3ds_controller.sendConsoleCommandToUE("stat fps");
e3ds_controller.sendConsoleCommandToUE("stat pixelstreaming");
```

### Receiving replies

Whatever your app sends back arrives at `onResponseFromUnreal`:

```js
e3ds_controller.callbacks.onResponseFromUnreal = function (descriptor) {
    console.log("The app said:", descriptor);
};
```

---

## Callbacks reference

Assign these to `e3ds_controller.callbacks`. **All are optional** — assign only
the ones you need. Full examples are in `scripts/sdk-callbacks.js`.

### Starting up

| Callback | When it fires | Receives |
| --- | --- | --- |
| `onConfigAcquire` | Configuration received; stream not playing yet | — |
| `onReceivingAppAcquiringProgress` | The app is downloading onto the machine | `percent` (0–100) |
| `onReceivingAppPreparationProgress` | The downloaded app is being prepared | `percent` (0–100) |
| `onReceivingAppStartingProgress` | The app is launching | `percent` (0–100) |

> The download and preparation steps **only happen when needed**. A machine that
> already has your app skips them, so never assume they will run.

### Running

| Callback | When it fires | Receives |
| --- | --- | --- |
| `onDataChannelOpen` | **The stream is live** — build your interface here | — |
| `onDataChannelClose` | The connection closed | — |
| `onResponseFromUnreal` | Your app sent something back | `descriptor` |

### Ending

| Callback | When it fires | Receives |
| --- | --- | --- |
| `onSessionEnding` | **Any** reason the stream ends — use this one | `message` |
| `onStreamerDisconnected` | Only when the app itself crashed or stopped | — |
| `onSessionExpired` | The session's time limit was reached | — |

#### Handling the stream ending

`onSessionEnding` is the dependable one. It fires for essentially any
reason a session ends — crash, idle timeout, expired session or link, wrong
password — and gives you a short line of text for the visitor. Every value that
text can take, and what causes each, is listed in one place: <https://learn.eagle3dstreaming.com/wiki/session-end-messages>.

**Do** show the message, or replace it with your own screen entirely.
**Don't** write code that inspects the wording to work out what happened; treat
it as text for a person to read, because the wording can change.

`sdk-callbacks.js` ships a working version: it puts the message on screen in
a full-page overlay, so the demo shows something real instead of logging where
nobody is looking. **It is meant to be replaced.** The block to change is marked
`THIS IS THE PART YOU REPLACE` — edit it, or delete it and reveal a screen your
page already has:

```js
document.getElementById("myEndScreen").style.display = "flex";
document.getElementById("myEndMessage").innerText = message;
```

The sample builds its overlay in JavaScript rather than relying on markup in the
page, so copying that one function into your own project is enough to make it
work. It writes the message with `textContent`, never `innerHTML` — the text
comes from the platform and is meant to be read, not executed.

`onStreamerDisconnected` is optional and narrower: it fires **only** when the app
itself stopped running. It does not fire for most ways a session ends, and it can
arrive too late to be useful — so build anything essential on
`onSessionEnding` instead.

> The stream ending **cannot be cancelled** from your page. Design your "session
> over" screen around that.

### Not currently functional

`onError` and `onHtmlBind` exist in the SDK but do nothing today. They are
listed here so you do not spend time wiring them up. Use `onSessionEnding` in
place of `onError`, and `onDataChannelOpen` in place of `onHtmlBind`.

`preventErrorRedirect` used to be documented here too. It was never wired to
anything in the player, so returning a value from it changed nothing — the
stream ending cannot be cancelled from your page. It has been removed from this
list rather than left to be discovered.

---

## Session control

| Call | Effect |
| --- | --- |
| `e3ds_controller.main(tokenData)` | Start a session using a token. Returns `{ok:false, missing, message}` if the payload is incomplete |
| `e3ds_controller.terminate()` | End the session and release the machine |
| `e3ds_controller.setQualityPoint(n)` | Change streaming quality at runtime |
| `e3ds_controller.setResolution(w, h)` | Pin the stream to a fixed resolution |
| `e3ds_controller.useViewportResolution()` | Go back to following the window size |

### What `main()` expects, and what it gives back

`main(data)` needs **`token`** and **`socket_url`**. Anything else on the object
is carried along and used where it applies — `client`, for instance, identifies
the viewer. A field the token endpoint starts returning is available to the
player without any change here.

It **returns** rather than throws, so a setup mistake cannot take down the page
that called it:

```js
const result = e3ds_controller.main(tokenData);

if (result && result.ok === false) {
    // result.missing  -> ["token"]
    // result.message  -> a sentence naming what is missing
    showYourOwnError(result.message);
}
```

A missing field used to produce a session that connected to nothing and a page
that simply sat there — the mistake surfacing minutes later as "the stream does
not work". Now it says so immediately, in the return value and once in the
console. The console line names the **keys** it received, never the values:
`token` is a credential.

### Resolution

By default the stream **follows the size of the window**. To pin it:

```js
e3ds_controller.setResolution(1920, 1080);
e3ds_controller.useViewportResolution();   // back to following the window
```

**Use these rather than sending a `Resolution` command yourself.** A raw command
reaches Unreal and the picture does change &mdash; then a few seconds later the
viewport watcher sends the window size again and your change is gone. Pinning a
resolution means turning that watcher off as well, which is what
`setResolution` does and a raw command cannot.

It returns the same shape as `main()`, so a bad size is visible rather than
silently streamed:

```js
const r = e3ds_controller.setResolution(0, 1080);
// { ok: false, error: "invalid_resolution", message: "..." }
```

### Restarting

A token is good for one session only, so a restart means a fresh token. **End
the current session first** — `main()` initialises the player into `#playerUI`,
so calling it while a session is running builds a second player on top of the
first:

```js
async function restartStream() {
    // Fetch the token BEFORE ending the session: if this fails, the viewer
    // keeps the stream they already had.
    const tokenData = await requestSessionToken();
    if (!tokenData) return;

    e3ds_controller.terminate();
    e3ds_controller.main(tokenData);
}
```

---

## Common problems

| Symptom | Likely cause |
| --- | --- |
| An alert naming a setting | `sdk-config.js` still has a placeholder. The message names the field. |
| Nothing happens; console shows a failed token request | A CORS failure. `file://` works today, so suspect the API key or the endpoint before the origin — see [Quick start](#quick-start). |
| Console: token request replied `401` | The API key is wrong, or not yet active in your dashboard. |
| The stream never starts, no errors | `appName`, `userName` or `configurationName` do not match the dashboard exactly. They are case-sensitive. |
| `e3ds_controller is not defined` | Script order in `index.html` was changed. The SDK must load first. |
| A button does nothing | It was given the *result* of a function instead of the function. Use `() => doThing()`, not `doThing()`. |
| `sendDataToUE()` has no effect | Your app is listening for a different shape than you are sending. |
| Callbacks never fire | `sdk-token.js` was moved earlier in `index.html`. It must load **last**. |

---

## Support

- **Documentation** — <https://docs.eagle3dstreaming.com>
- **Runtime events and utility functions** —
  <https://docs.eagle3dstreaming.com/wiki/runtime-events-utility-functions>
- **Discord community** — <https://discord.gg/hMwR2Uxr33>

---

## License

Provided as a demonstration and example. See Eagle 3D Streaming's terms and
documentation for usage guidelines.
