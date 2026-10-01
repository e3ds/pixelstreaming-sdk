# Moving from Arcware to Eagle 3D Streaming

`arcware-compat.js` lets page code written for Arcware's Web SDK
(`@arcware-cloud/pixelstreaming-websdk`) run on Eagle 3D Streaming with one change: how the
session starts.

```html
<div id="playerUI"></div>
<script src="../scripts/dist/e3dsCore.min_ns.js"></script>
<script src="./arcware-compat.js"></script>
<script>
  // Your server requests the session token with your Streaming API key
  // (https://learn.eagle3dstreaming.com/wiki/api-keys-and-tokens) - see the login-example branch.
  fetch("/my-server/e3ds-token").then((r) => r.json()).then((tokenData) => {
    // was: ArcwareInit({ shareId: "share-..." }, {...})
    const { PixelStreaming, Application } = ArcwareInit({ tokenData }, {});

    // From here on, your Arcware code as it was:
    PixelStreaming.videoInitializedHandler.add(() => console.log("live"));
    Application.getApplicationResponse((response) => console.log("from Unreal", response));
    PixelStreaming.emitUIInteraction({ camera_view: 2 });
  });
</script>
```

| Arcware | On Eagle |
|---|---|
| `ArcwareInit(ids, config)` | starts the session - `ids` must be `{ tokenData, client? }` |
| `emitUIInteraction(data)` | `e3ds_controller.sendDataToUE` (a JSON string is parsed first) |
| `applicationResponseHandler` (assigned or `.add`), `getApplicationResponse`, `onApplicationResponse` | `onResponseFromUnreal`, always delivered as a string, as Arcware does |
| `videoInitializedHandler.add` | `onDataChannelOpen` |
| `websocketOnCloseHandler.add` | `onSessionEnding`, as `{ code: 1000, reason, wasClean: true }` |
| `onStreamingStateChange(cb)` | `true` at `onDataChannelOpen`, `false` at `onSessionEnding` |
| `setAudioEnabled(bool)`, `toggleAudio(video, bool)` | `setVolume(0)` / restore |
| `disconnect()`, `removePlayer()` | `terminate()` |
| `rootElement` | `#playerUI` |
| `ArcwarePixelStreaming.clearSessionId()` | no-op (nothing to clear) |

Kept so your code does not break, but they never fire (a one-time notice is logged):
`queueHandler`, `sessionIdHandler`, `loveLetterHandler`, `whiteLabellingChangedHandler`,
`fileTransferHandler`, `afkWarning*` / `afkTimedOut`, `toggleMic`, `reconnect`, `send`,
`sendAnalyticsEvent`. Arcware's numeric close codes (4450-4666) have no equivalent - the
`reason` text says why the session ended.

Your Unreal project needs no change: what `emitUIInteraction` sent reaches it the same way.
