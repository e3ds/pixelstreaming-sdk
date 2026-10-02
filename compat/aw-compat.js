/**
 * aw-compat.js - run code written for AW's Web SDK on Eagle 3D Streaming.
 *
 * Load it after the Eagle SDK:
 *     <script src="./scripts/dist/e3dsCore.min_ns.js"></script>
 *     <script src="./compat/aw-compat.js"></script>
 *
 * It provides the names AW's Web SDK (AW's npm package) documents -
 * ArcwareInit, emitUIInteraction, applicationResponseHandler, getApplicationResponse /
 * onApplicationResponse, videoInitializedHandler, websocketOnCloseHandler, disconnect,
 * setAudioEnabled, rootElement ... - and maps each onto e3ds_controller. Code that SENDS to
 * and RECEIVES from your Unreal app, and reacts to the stream starting and ending, keeps working
 * unchanged.
 *
 * WHAT YOU STILL CHANGE: how the session starts. AW starts from a shareId; Eagle starts from
 * a session token your server requests with your Streaming API key (never put that key in a page:
 * https://learn.eagle3dstreaming.com/wiki/api-keys-and-tokens). So pass the token instead:
 *
 *     // was: ArcwareInit({ shareId: "share-..." }, { initialSettings: {...} })
 *     const tokenData = await (await fetch("/my-server/e3ds-token")).json();
 *     const { PixelStreaming, Application } = ArcwareInit({ tokenData }, { initialSettings: {...} });
 *
 * Everything after that line is your AW code as it was.
 *
 * NOT AVAILABLE (handlers exist so your code does not break, but they never fire, and each logs a
 * one-time notice): queueHandler, sessionIdHandler, loveLetterHandler, whiteLabellingChangedHandler,
 * fileTransferHandler, the afkWarning* / afkTimedOut events, toggleMic, reconnect, send,
 * sendAnalyticsEvent. Close codes: websocketOnCloseHandler receives { code: 1000, reason } once per
 * session (session ending or time limit) - AW's numeric 4450-4666 codes have no equivalent.
 * errorHandler fires when the app crashes or stops unexpectedly (Eagle's onStreamerDisconnected).
 */
(function () {
    "use strict";

    var noticesGiven = {};
    function notice(name, text) {
        if (noticesGiven[name]) return;
        noticesGiven[name] = true;
        try { console.info("[aw-compat] " + name + ": " + text); } catch (e) { /* no console */ }
    }

    function controller() {
        if (typeof window.e3ds_controller === "undefined") {
            throw new Error("[aw-compat] load the Eagle SDK (e3dsCore.min_ns.js) before aw-compat.js");
        }
        return window.e3ds_controller;
    }

    /** AW's handler objects: `.add(fn)`, and some docs assign a function directly - both work. */
    function makeHandler(name, unsupportedText) {
        var fns = [];
        var h = function () { var args = arguments; fns.slice().forEach(function (fn) { try { fn.apply(null, args); } catch (e) { console.error(e); } }); };
        h.add = function (fn) { if (unsupportedText) notice(name, unsupportedText); if (typeof fn === "function") fns.push(fn); return h; };
        h.remove = function (fn) { fns = fns.filter(function (f) { return f !== fn; }); return h; };
        h.fire = h;
        h._fns = function () { return fns; };
        return h;
    }

    /* Eagle can hand Unreal's reply over as a string or an object; AW code expects a string. */
    function asString(descriptor) {
        if (typeof descriptor === "string") return descriptor;
        try { return JSON.stringify(descriptor); } catch (e) { return String(descriptor); }
    }

    function chainCallback(name, fn) {
        var c = controller().callbacks;
        var previous = c[name];
        c[name] = function () {
            if (typeof previous === "function") { try { previous.apply(null, arguments); } catch (e) { console.error(e); } }
            return fn.apply(null, arguments);
        };
    }

    var volumeBeforeMute = 1;

    /**
     * ArcwareInit(ids, configuration?) -> { Config, PixelStreaming, Application }
     * ids: { tokenData, client? } - see the note at the top. AW's { shareId, projectId } cannot
     * start an Eagle session on its own; passing only those throws with an explanation.
     */
    window.ArcwareInit = function ArcwareInit(ids, configuration) {
        var e3ds = controller();
        ids = ids || {};
        if (!ids.tokenData) {
            throw new Error("[aw-compat] ArcwareInit needs { tokenData } on Eagle 3D Streaming: request a session token on your server and pass it in. A shareId alone cannot start an Eagle session.");
        }

        var applicationResponseHandler = makeHandler("applicationResponseHandler");
        var videoInitializedHandler = makeHandler("videoInitializedHandler");
        var websocketOnCloseHandler = makeHandler("websocketOnCloseHandler");
        var errorHandler = makeHandler("errorHandler");
        var postInitSideEffectsHandler = makeHandler("postInitSideEffectsHandler");
        var streamingStateCallbacks = [];

        chainCallback("onResponseFromUnreal", function (descriptor) { applicationResponseHandler(asString(descriptor)); });
        chainCallback("onDataChannelOpen", function () {
            videoInitializedHandler();
            streamingStateCallbacks.forEach(function (cb) { try { cb(true); } catch (e) { console.error(e); } });
        });
        /* One close per session. Eagle can report the end more than one way - the
         * ending message, the time limit - and AW code expects one close. */
        var closed = false;
        function closeOnce(reason) {
            if (closed) return;
            closed = true;
            websocketOnCloseHandler({ code: 1000, reason: String(reason || ""), wasClean: true });
            streamingStateCallbacks.forEach(function (cb) { try { cb(false); } catch (e) { console.error(e); } });
        }
        chainCallback("onSessionEnding", function (message) { closeOnce(message); });
        /* The time limit is reported through onSessionExpired, not always through
         * onSessionEnding; without this an expiry never reached the close handler. */
        chainCallback("onSessionExpired", function () { closeOnce("The session reached its time limit."); });
        /* Eagle's onError does nothing today (see scripts/sdk-callbacks.js). The
         * nearest real signal is onStreamerDisconnected: it fires only when the app
         * crashed or stopped unexpectedly, which is what AW's errorHandler is for. */
        chainCallback("onStreamerDisconnected", function () {
            errorHandler({ message: "The application stopped unexpectedly.", source: "onStreamerDisconnected" });
        });

        var listeners = {};
        var PixelStreaming = {
            get rootElement() { return document.getElementById("playerUI"); },
            emitUIInteraction: function (descriptor) {
                var data = descriptor;
                if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { /* plain text stays text */ } }
                return e3ds.sendDataToUE(data);
            },
            /* AW's docs assign a function; their package uses .add - both reach the same list. */
            get applicationResponseHandler() { return applicationResponseHandler; },
            set applicationResponseHandler(fn) { if (typeof fn === "function") applicationResponseHandler.add(fn); },
            videoInitializedHandler: videoInitializedHandler,
            websocketOnCloseHandler: websocketOnCloseHandler,
            errorHandler: errorHandler,
            postInitSideEffectsHandler: postInitSideEffectsHandler,
            queueHandler: makeHandler("queueHandler", "Eagle does not report queue position to the Web SDK; this never fires."),
            sessionIdHandler: makeHandler("sessionIdHandler", "not available on Eagle; this never fires."),
            loveLetterHandler: makeHandler("loveLetterHandler", "AW-specific loading messages; use Eagle's onReceivingApp...Progress callbacks."),
            whiteLabellingChangedHandler: makeHandler("whiteLabellingChangedHandler", "not available on Eagle; this never fires."),
            fileTransferHandler: makeHandler("fileTransferHandler", "not available through this layer; this never fires."),
            onStreamingStateChange: function (cb) { if (typeof cb === "function") streamingStateCallbacks.push(cb); },
            addEventListener: function (type, fn) {
                if (/^afk/.test(type)) notice(type, "Eagle's idle warning is shown by the player itself; this event never fires.");
                (listeners[type] = listeners[type] || []).push(fn);
            },
            removeEventListener: function (type, fn) { listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; }); },
            setAudioEnabled: function (enabled) {
                if (enabled) e3ds.setVolume(volumeBeforeMute); else e3ds.setVolume(0);
            },
            toggleAudio: function (videoElement, enabled) { PixelStreaming.setAudioEnabled(enabled); },
            toggleMic: function () { notice("toggleMic", "use the microphone controls of the Eagle player; no equivalent call."); },
            disconnect: function () { e3ds.terminate(); },
            removePlayer: function () { e3ds.terminate(); },
            reconnect: function () { notice("reconnect", "an Eagle session cannot be rejoined; request a new token and call ArcwareInit again."); },
            send: function () { notice("send", "AW signalling messages have no Eagle equivalent."); },
            sendAnalyticsEvent: function () { notice("sendAnalyticsEvent", "not available on Eagle."); }
        };

        var Application = {
            get rootElement() { return PixelStreaming.rootElement; },
            /* deprecated in AW's package in favour of onApplicationResponse - both supported */
            getApplicationResponse: function (cb) { applicationResponseHandler.add(cb); },
            onApplicationResponse: function (cb) { applicationResponseHandler.add(cb); }
        };

        var Config = { initialSettings: (configuration && configuration.initialSettings) || {}, settings: (configuration && configuration.settings) || {} };

        e3ds.main(Object.assign({}, ids.tokenData, ids.client ? { client: ids.client } : {}));
        setTimeout(function () { postInitSideEffectsHandler(); }, 0);
        return { Config: Config, PixelStreaming: PixelStreaming, Application: Application };
    };

    /* AW's static helper: there is no remembered session to clear on Eagle. */
    window.ArcwarePixelStreaming = { clearSessionId: function () { /* nothing to clear */ } };
})();
