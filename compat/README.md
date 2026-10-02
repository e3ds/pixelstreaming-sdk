# Moving from AW to Eagle 3D Streaming

`aw-compat.js` lets page code written for AW's Web SDK
(AW's npm package) run on Eagle 3D Streaming with one change: how the
session starts.

```html
<div id="playerUI"></div>
<script src="../scripts/dist/e3dsCore.min_ns.js"></script>
<script src="./aw-compat.js"></script>
<script>
  // Your server requests the session token with your Streaming API key
  // (https://learn.eagle3dstreaming.com/wiki/api-keys-and-tokens) - see the login-example branch.
  fetch("/my-server/e3ds-token").then((r) => r.json()).then((tokenData) => {
    // was: ArcwareInit({ shareId: "share-..." }, {...})
    const { PixelStreaming, Application } = ArcwareInit({ tokenData }, {});

    // From here on, your AW code as it was:
    PixelStreaming.videoInitializedHandler.add(() => console.log("live"));
    Application.getApplicationResponse((response) => console.log("from Unreal", response));
    PixelStreaming.emitUIInteraction({ camera_view: 2 });
  });
</script>
```

| AW | On Eagle |
|---|---|
| `ArcwareInit(ids, config)` | starts the session - `ids` must be `{ tokenData, client? }` |
| `emitUIInteraction(data)` | `e3ds_controller.sendDataToUE` (a JSON string is parsed first) |
| `applicationResponseHandler` (assigned or `.add`), `getApplicationResponse`, `onApplicationResponse` | `onResponseFromUnreal`, always delivered as a string, as AW does |
| `videoInitializedHandler.add` | `onDataChannelOpen` |
| `websocketOnCloseHandler.add` | `onSessionEnding` or `onSessionExpired` (time limit), once per session, as `{ code: 1000, reason, wasClean: true }` |
| `errorHandler.add` | `onStreamerDisconnected` - the app crashed or stopped unexpectedly - as `{ message, source }` |
| `onStreamingStateChange(cb)` | `true` at `onDataChannelOpen`, `false` when the session ends (either way above) |
| `setAudioEnabled(bool)`, `toggleAudio(video, bool)` | `setVolume(0)` / restore |
| `disconnect()`, `removePlayer()` | `terminate()` |
| `rootElement` | `#playerUI` |
| `ArcwarePixelStreaming.clearSessionId()` | no-op (nothing to clear) |

Kept so your code does not break, but they never fire (a one-time notice is logged):
`queueHandler`, `sessionIdHandler`, `loveLetterHandler`, `whiteLabellingChangedHandler`,
`fileTransferHandler`, `afkWarning*` / `afkTimedOut`, `toggleMic`, `reconnect`, `send`,
`sendAnalyticsEvent`. AW's numeric close codes (4450-4666) have no equivalent - the
`reason` text says why the session ended.

Your Unreal project needs no change: what `emitUIInteraction` sent reaches it the same way.
