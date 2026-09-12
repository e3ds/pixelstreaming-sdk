/**
 * demo-ui-controls.js — the demo's own buttons.
 *
 * ── Read this before copying anything from this file ───────────────────────
 *
 * None of this is required to run a stream. It exists to give you something to
 * click so you can watch each SDK call do something.
 *
 * What IS worth studying is the body of each button's handler - those one-line
 * calls are the entire public surface of the SDK, and they are listed together
 * in the README.
 *
 * The buttons are built in onDataChannelOpen (see sdk-callbacks.js), never
 * before: until the data channel is open, commands sent to the app have nowhere
 * to go, so offering a button earlier would only produce clicks that vanish.
 */

/**
 * Restart the stream: get a fresh token and start a new session.
 */
async function restartStream() {
    e3ds_controller.terminate();

    /* [E3DS-RESTART-TIDY] The THIRD way out of a session.
     *
     * removeDemoButtonsNeeding("session") is called from the Terminate button's
     * own click handler and from the session-ending callback. The note on the
     * Terminate button says "two ways out of a session, and only one of them was
     * tidying up" - it missed that restart is a third.
     *
     * terminate() tears down the STREAM; it knows nothing about this panel, so
     * calling it directly reaches neither cleanup. The data channel closing
     * cleared the "channel" controls, and the "session" ones - Volume,
     * Fullscreen, Screenshot - survived straight into the next session.
     *
     * Reported from a phone: mid-restart, with the page showing "WebRTC
     * connected, waiting for video", the panel still offered Volume, Fullscreen
     * and Screenshot for a stream that did not exist yet, while Terminate
     * removed them correctly. They are added back when the video arrives. */
    removeDemoButtonsNeeding("session");

    await startStream();
}


/**
 * Add one button to the demo's control panel.
 *
 * @param {string}   label    The button's visible text.
 * @param {Function} onClick  Runs when the button is clicked.
 */
/**
 * Add a labelled slider to the demo panel.
 *
 * Same panel and the same `needs` rule as addDemoButton, so a slider disappears
 * with its dependency exactly like a button does - see [E3DS-DEMO-NEEDS].
 *
 * @param {string}   label    Text shown to the left of the slider.
 * @param {object}   opts     { min, max, step, value }
 * @param {Function} onInput  Called with the numeric value as it moves.
 * @param {string}   needs    channel | session | always
 */
function addDemoSlider(label, opts, onInput, needs) {
    let buttonPanel = document.getElementById("demoButtonPanel");
    if (!buttonPanel) {
        /* addDemoButton builds the panel. Calling it for a slider would leave a
         * stray button, so the panel is created the same way here instead. */
        buttonPanel = document.createElement("div");
        buttonPanel.id = "demoButtonPanel";
        document.body.appendChild(buttonPanel);
        makePanelDraggable(buttonPanel);
    }

    const row = document.createElement("div");
    /* No demo-slider-row here: it was never styled and never selected, so it
       only suggested a hook that does not exist. The row borrows .demo-button
       deliberately, so a slider lines up with the buttons around it. */
    row.className = "demo-button";
    row.dataset.needs = needs || "channel";
    row.style.cssText = "display:flex;align-items:center;gap:.5rem;cursor:default;";

    /* The drag handler on the panel starts a drag on mousedown anywhere inside
     * it. Without this, grabbing the slider would drag the whole panel and the
     * value would never move. */
    row.addEventListener("mousedown", (e) => e.stopPropagation());

    const text = document.createElement("span");
    text.textContent = label;
    text.style.cssText = "white-space:nowrap;";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = opts.min;
    slider.max = opts.max;
    slider.step = opts.step;
    slider.value = opts.value;
    slider.style.cssText = "flex:1;min-width:6rem;cursor:pointer;";

    const readout = document.createElement("span");
    readout.style.cssText = "min-width:2.5rem;text-align:right;font-variant-numeric:tabular-nums;";
    const show = (v) => { readout.textContent = Math.round(v * 100) + "%"; };
    show(Number(opts.value));

    /* "input", not "change": change fires only when the drag ends, so the sound
     * would jump at the end instead of following the handle. */
    slider.addEventListener("input", () => {
        const v = Number(slider.value);
        show(v);
        onInput(v);
    });

    row.appendChild(text);
    row.appendChild(slider);
    row.appendChild(readout);
    buttonPanel.appendChild(row);
    return row;
}

/* [E3DS-DEMO-CATEGORY] A button says which category it belongs to, and the
 * category appears if it does not already exist.
 *
 * WHY A PARAMETER RATHER THAN CALLING addDemoGroup FIRST. Grouping by call ORDER
 * means a button added later - when a stream connects, when an app is
 * identified, when a permission is granted - lands wherever the cursor happens
 * to be, which is under whichever heading was written last. Naming the category
 * on the button makes placement independent of when it is added, which is the
 * only way progressive controls can stay organised.
 *
 * Identical signature in the iframe demo and the SDK demo on purpose. Moving a
 * page between the two should be a change of transport, not a rewrite of the
 * interface code.
 */
const e3dsSdkCategories = new Map();

function e3dsSdkCategorySection(panel, category) {
    if (!category) return panel;
    /* [E3DS-PANEL-TIDY] A cached section that has been pruned is no longer in
       the document; returning it would append controls to nothing. */
    if (e3dsSdkCategories.has(category)) {
        const existing = e3dsSdkCategories.get(category);
        if (existing && existing.isConnected) return existing;
        e3dsSdkCategories.delete(category);
    }

    const heading = document.createElement("div");
    heading.className = "demo-group-label";
    heading.textContent = category;

    const section = document.createElement("div");
    section.className = "demo-category";

    panel.appendChild(heading);
    panel.appendChild(section);
    /* [E3DS-PANEL-TIDY] Kept on the section so an empty group can take its
       heading with it, without guessing from document order. */
    section._e3dsHeading = heading;
    e3dsSdkCategories.set(category, section);
    return section;
}

/**
 * @param {string}   label      what the button says
 * @param {function} onClick    what it does
 * @param {string}   [category] the group it belongs under; created if new
 * @param {string}   [needs]    "channel" (default) or "always" - see the rebuild note
 */
/* [E3DS-ARG-SLIP] One string, two meanings - so guess the one that was meant.
 *
 * The signature is (label, onClick, category, needs) and BOTH trailing
 * arguments are optional strings. Passing a single one therefore lands in
 * `category`, silently. That is not a hypothetical: it happened three separate
 * times in this file - Terminate stream, Screenshot and Connection settings all
 * wrote `"session"` or `"always"` meaning the dependency, and each one instead
 * invented a group heading named after a lifetime. The visible result was
 * SESSION appearing twice with controls under the wrong one, an empty ALWAYS
 * heading, and buttons that outlived the session they depended on because
 * `needs` had been left undefined.
 *
 * "channel", "session", "always" and "video" are never sensible group names, so
 * seeing one in the category slot with nothing after it is unambiguous. Shift
 * it, and say so - quietly correcting without a word would leave the next
 * reader believing the call site says what they meant. */
const E3DS_LIFETIMES = ["channel", "session", "always", "video"];

function e3dsFixArgSlip(where, label, category, needs) {
    if (needs === undefined && E3DS_LIFETIMES.indexOf(category) >= 0) {
        console.warn("[E3DS] " + where + '("' + label + '", ..., "' + category +
            '") - "' + category + '" is a dependency, not a group. Treating it as ' +
            'the dependency and leaving the control ungrouped. Pass (category, needs).');
        return { category: undefined, needs: category };
    }
    return { category: category, needs: needs };
}

function addDemoButton(label, onClick, category, needs) {
    ({ category, needs } = e3dsFixArgSlip("addDemoButton", label, category, needs));
    // Created once, then reused for every later button.
    let buttonPanel = document.getElementById("demoButtonPanel");
    if (!buttonPanel) {
        buttonPanel = document.createElement("div");
        buttonPanel.id = "demoButtonPanel";

        /* ON THE PAGE, NOT INSIDE THE PLAYER.
         *
         * This used to be appended into the SDK's own "controls" element, which
         * made the demo buttons part of the player's interface. Two things
         * followed, and both bit:
         *
         *   - if "controls" had not been built yet, addDemoButton gave up with a
         *     console warning and the button never appeared at all. Whether the
         *     demo had buttons depended on load order.
         *   - anything the player did to its own controls - rebuilding them,
         *     hiding them, restyling them - happened to this panel too.
         *
         * On <body> it is independent: it exists from the moment this script
         * runs, and nothing the player does to its interface reaches it.
         */
        document.body.appendChild(buttonPanel);
        makePanelDraggable(buttonPanel);
    }

    const button = document.createElement("button");
    button.className = "demo-button";
    button.textContent = label;

    /* [E3DS-DEMO-NEEDS] What this button depends on, so it can be removed when
     * that goes away. A button that cannot work is worse than one that is not
     * there: people press it, nothing happens, and they blame the SDK.
     *
     *   channel - talks to Unreal over the data channel. Dead the moment the
     *             channel closes: resolution, quality, the stat overlays,
     *             character and skin.
     *   session - needs a live session but not the channel. Terminate.
     *   always  - works with no session at all. Restart, which fetches a fresh
     *             token and starts a new one - the recovery path, so it is the
     *             one thing that must survive. */
    button.dataset.needs = needs || "channel";

    // NOTE, because this is the single easiest mistake to make here:
    // pass a FUNCTION, never the RESULT of calling one.
    //
    //   addDemoButton("HD", () => e3ds_controller.setQualityPoint(1));  correct
    //   addDemoButton("HD", e3ds_controller.setQualityPoint(1));        wrong
    //
    // The second form runs setQualityPoint immediately as the page builds the
    // button, and then assigns its return value (undefined) as the click
    // handler - so the effect happens once, at the wrong moment, and the button
    // does nothing forever after. This demo had exactly that bug.
    button.onclick = onClick;

    e3dsSdkCategorySection(buttonPanel, category).appendChild(button);

    /* RETURNED, so a caller can mark the button it just made.
     *
     * This returned nothing, and addConnectionSettingsButton() was written
     * around the assumption that it did:
     *
     *     const btn = addDemoButton("Connection settings", ...);
     *     if (btn) { btn.id = ...; btn.classList.add("demo-persistent"); }
     *
     * `btn` was undefined, so that block never ran, and two things followed
     * silently. The button never got .demo-persistent, so buildDemoControls()
     * swept it away the moment the data channel opened - the one control that
     * exists for when a stream will NOT start disappeared as soon as one did,
     * and nothing re-added it. And it never got its id, so the guard at the top
     * of addConnectionSettingsButton() could not see it had already been made,
     * which would duplicate it on a second call.
     *
     * Reported as "connection panel gone". */
    return button;
}

/**
 * Build the demo's control panel.
 *
 * Called from onDataChannelOpen. Each button demonstrates one SDK call - and
 * they arrive in two waves, because they become useful at two different
 * moments. See the comment at the top of the function body.
 */
function buildDemoControls() {
    /* START FROM EMPTY. This runs from onDataChannelOpen, which fires on every
     * connection - so it runs again after each restart or reconnect, not only
     * once at startup. Appending to whatever is already there gave a second
     * full set of buttons per restart, then a third.
     *
     * It was invisible until the panel moved out of the player's "controls"
     * element: the player rebuilds those on reconnect, which happened to wipe
     * the buttons first. The duplication was always here - it was being cleaned
     * up by accident.
     *
     * Building into a clean panel makes this safe to call as many times as the
     * stream reconnects, which is the only sane contract for something wired to
     * a connection event.
     */
    const existing = document.getElementById("demoButtonPanel");
    if (existing) {
        /* REMOVE THE BUTTONS, NOT EVERY CHILD.
         *
         * This used to be replaceChildren(), which also destroyed the drag
         * handle - and with it the pointer listeners bound to that element.
         * Re-creating the handle afterwards put the bar back on screen but
         * attached nothing to it, because makePanelDraggable() only runs once,
         * when the panel is first built. So the panel was draggable until the
         * first reconnect and then silently was not: the handle looked right
         * and did nothing.
         *
         * Removing only .demo-button gives the same protection against
         * duplicate buttons and leaves the handle, and its listeners, alone. */
        /* [E3DS-DEMO-PERSISTENT] ...and not the persistent ones either.
         *
         * Connection settings is added at page load rather than here, so
         * sweeping every .demo-button would delete it on the first data channel
         * and again on every reconnect. */
        existing.querySelectorAll(".demo-button:not(.demo-persistent)")
            .forEach(function (b) { b.remove(); });
        makePanelDraggable(existing);
    }


    /* ─────────────────────────────────────────────────────────────────────
     * BUTTONS APPEAR IN TWO STAGES, ON PURPOSE.
     *
     * A button that is visible but does nothing is worse than one that is not
     * there yet: people press it, nothing happens, and they conclude the SDK is
     * broken. So each button appears only once the thing it needs is actually
     * ready, and says so in the console as it arrives.
     *
     *   STAGE 1 - data channel open (now).  Anything that SENDS A MESSAGE to
     *             your Unreal app: character, skin, and the console overlays.
     *             The channel is the only thing these need.
     *
     *   STAGE 2 - video playing.  Session control and picture settings.
     *             Restarting or terminating a session that has not started
     *             does nothing; so does setting the quality or resolution of a
     *             picture that is not being rendered yet.
     *
     * Watch them appear in two groups the next time you load this page - that
     * staging is the point, not a side effect.
     * ───────────────────────────────────────────────────────────────────── */

    console.log("[E3DS] Data channel is open - adding the buttons that send " +
        "messages to your app (character, skin, console overlays).");

    /* ── Talking to your app - APP-SPECIFIC ────────────────────────────── */

    /* THESE FIVE ARE NOT GENERIC. sendDataToUE() delivers whatever you like and
     * the shape is entirely yours - { Character: … } and { Skin: … } are simply
     * what the sample app happens to listen for. Point the demo at an app that
     * listens for something else and these buttons do nothing, which looks like
     * a broken SDK rather than a mismatched message.
     *
     * So they are listed, not hard-coded: an app appears here only if it is
     * known to understand them. Add yours, or delete the list and show them
     * unconditionally while you are developing against your own app.
     *
     * Blocklist rather than allowlist would be the wrong way round - a new app
     * would inherit buttons it cannot answer, and the failure is silent. */
    const APPS_THAT_UNDERSTAND_CHARACTER_AND_SKIN = [
        "EpicPixelStreamingSample",
    ];

    if (APPS_THAT_UNDERSTAND_CHARACTER_AND_SKIN.indexOf(
            STREAMING_CONFIG.application.appName) !== -1) {
        addDemoButton("Character: Crunch", () => e3ds_controller.sendDataToUE({ Character: "Crunch" }), "App", "channel");
        addDemoButton("Character: Aurora", () => e3ds_controller.sendDataToUE({ Character: "Aurora" }), "App", "channel");

        addDemoButton("Skin 1", () => e3ds_controller.sendDataToUE({ Skin: "0" }), "App", "channel");
        addDemoButton("Skin 2", () => e3ds_controller.sendDataToUE({ Skin: "1" }), "App", "channel");
        addDemoButton("Skin 3", () => e3ds_controller.sendDataToUE({ Skin: "2" }), "App", "channel");
    } else {
        console.log("[E3DS] Skipping the character and skin buttons: they send " +
            "{Character} and {Skin}, which only the sample app listens for, and " +
            '"' + STREAMING_CONFIG.application.appName + '" is not in the list ' +
            "in demo-ui-controls.js. Nothing is wrong - add it there if your app " +
            "does handle them.");
    }

    /* ── Unreal console commands (useful while developing) ─────────────── */

    // These draw overlays on the video itself. They travel over the data
    // channel, so they are ready now - the overlay simply is not visible until
    // there are frames to draw it on.
    addDemoButton("Show FPS", () => e3ds_controller.sendConsoleCommandToUE("stat fps"), "Diagnostics", "channel");

    addDemoButton("Show streaming graphs", () => {
        e3ds_controller.sendConsoleCommandToUE("stat pixelstreaminggraphs");
        e3ds_controller.sendConsoleCommandToUE("stat pixelstreaming2graphs");
    }, "Diagnostics", "channel");

    /* Stage 2 arrives on its own, whenever the video does. */
    whenVideoIsPlaying(addVideoStageButtons);
}

/**
 * The buttons that only make sense once frames are arriving.
 */
function addVideoStageButtons() {
    console.log("[E3DS] Video is playing - adding session control (restart, " +
        "terminate) and picture settings (quality, resolution). These were " +
        "held back because they do nothing before there is a stream.");

    /* ── Session control ───────────────────────────────────────────────── */

    /* [E3DS-VOLUME-ONE-PIPELINE] Volume goes through e3ds_controller.setVolume,
     * the SAME function an iframe reaches with { cmd: "setVolume" } and that
     * Unreal reaches over the data channel. One implementation, three callers -
     * so the SDK cannot drift from the behaviour the other two get, including
     * the unmute and its user-activation guard.
     *
     * "session" rather than "channel": this sets the volume of the local audio
     * element, so it keeps working when the data channel closes and only stops
     * meaning anything when the session itself is gone.
     *
     * Starts at 1 because that is where the player starts. The stream begins
     * MUTED - see the unmute guard - and moving this slider is a real user
     * gesture, which is exactly what lets setVolume unmute it. */
    addDemoSlider("Volume", { min: 0, max: 1, step: 0.01, value: 1 },
        (v) => e3ds_controller.setVolume(v), "session");

    /* Fullscreen. "session" for the same reason as Volume: it acts on the video
     * element, so it keeps working after the data channel closes and only stops
     * meaning anything when the session is gone.
     *
     * MUST BE A REAL CLICK. Browsers only grant fullscreen from a user gesture,
     * so this cannot be triggered on the SDK's behalf from a callback - which is
     * exactly why it belongs on a button rather than being done automatically
     * when video starts. */
    addDemoButton("Fullscreen", () => e3ds_controller.toggleFullscreen(), "Window", "session");

    /* Screenshot of the frame the viewer is watching.
     *
     * The earlier note here said this could not be added because
     * captureScreenShot read an id our source never assigns. That was wrong on
     * both counts: darkThemeItems.ejs and player_portable_merged.html do assign
     * `streamingVideo`, and the lookup now falls back to the first <video> on
     * the page, so it works here too.
     *
     * It returns the image as well as saving it, which is the part worth
     * copying: a real integration usually wants to upload the shot or show it
     * in its own UI, not drop a file in the viewer's Downloads folder.
     *
     * "session" rather than "channel": this reads the video element, so it
     * needs pixels on screen, not a data channel to the app. */
    addDemoButton("Screenshot", () => {
        const shot = e3ds_controller.captureScreenShot();
        if (!shot.ok) {
            /* Say why. A screenshot button that silently does nothing is the
             * hardest kind of bug to report. */
            alert("Screenshot failed: " + shot.error);
            return;
        }
        console.log("screenshot saved");
    /* [E3DS-PANEL-TIDY] "Window", to sit with Fullscreen - the grouping the
     * iframe demo already uses for these two. Both act on how the stream is
     * presented in this window rather than on the picture the encoder sends,
     * which is what "Picture" is for. */
    }, "Window", "session");


    addDemoButton("Restart", restartStream, "Session", "always");
    /* [E3DS-PANEL-TIDY] "Session", "session" - group then dependency.
     *
     * This read addDemoButton(label, fn, "session"), which puts "session" in the
     * CATEGORY position. Two things followed. A second group appeared whose name
     * differed from "Session" only in case, so the panel showed SESSION twice
     * and every uncategorised control below it rendered under the wrong one. And
     * `needs` was left undefined, so the one button that exists to end a session
     * was never removed when the session ended. */
    addDemoButton("Terminate stream", function () {
        e3ds_controller.terminate();

        /* Clean up after ourselves. onSessionEnding removes the
         * session-tagged buttons, but that callback is the PLATFORM telling us
         * a session ended - it does not fire for a terminate we asked for. So
         * ending it from this button closed the data channel (the channel
         * buttons went, correctly) and left Terminate sitting there with
         * nothing left to terminate. Two ways out of a session, and only one
         * of them was tidying up. */
        removeDemoButtonsNeeding("session");
    }, "Session", "session");

    /* ── Stream quality ────────────────────────────────────────────────── */

    /* [E3DS-QUALITY-PRESET] The four levels, not a number.
     *
     * This was one button calling setQualityPoint(1) - a raw QP. That is the
     * PixelStreaming1 scale, so against a PixelStreaming2 app it changed
     * nothing at all and the encoder sat where it was. Reported exactly that
     * way: "I press Quality: HD and QP stays at 35".
     *
     * A level is the portable unit. The same four the viewer's own menu offers,
     * resolved by the platform to whichever scale the running plugin uses. */
    addDemoButton("Quality: Low", () => e3ds_controller.setVideoDetailLevel("low"), "Picture", "channel");
    addDemoButton("Quality: Medium", () => e3ds_controller.setVideoDetailLevel("medium"), "Picture", "channel");
    addDemoButton("Quality: High", () => e3ds_controller.setVideoDetailLevel("high"), "Picture", "channel");
    addDemoButton("Quality: Ultra", () => e3ds_controller.setVideoDetailLevel("ultra"), "Picture", "channel");

    /* ── Resolution ────────────────────────────────────────────────────── */

    addDemoButton("1920 x 1080", () => e3ds_controller.setResolution(1920, 1080), "Picture", "channel");
    addDemoButton("800 x 600", () => e3ds_controller.setResolution(800, 600), "Picture", "channel");
    addDemoButton("Match window Resolution", () => e3ds_controller.useViewportResolution(), "Picture", "channel");
}

/**
 * Calls back once the stream is actually showing frames.
 *
 * There is no onVideoStarted callback in the SDK, so this watches the video
 * element directly. Two routes, because either can be the one that fires:
 * the 'playing' event if we attach before playback begins, and a poll for the
 * case where video was already running by the time we got here - which is
 * exactly what happens on a reconnect.
 *
 * Idempotent: buildDemoControls() runs again on every reconnect, so any watcher
 * from the previous connection is cancelled first. Without that, a page that
 * reconnects three times would add the second group three times.
 */
/* Prefixed, because a top-level `let` in a classic script is a GLOBAL binding.
 *
 * Not a window property - top-level let/const go into the global lexical scope
 * rather than onto window - but global all the same, and shared with every other
 * classic script the page loads. Two scripts both declaring `let videoWatchEl`
 * do not silently overwrite each other: that is a redeclaration SyntaxError, and
 * it stops the SECOND script parsing entirely.
 *
 * This folder is meant to be copied into someone else's page, so names this
 * generic are a real hazard: the symptom would be the demo panel never
 * appearing, with the error pointing at our file. */
let e3dsVideoWatchPoll = null;
let e3dsVideoWatchEl = null;
let e3dsVideoWatchFn = null;

function whenVideoIsPlaying(callback) {
    if (e3dsVideoWatchPoll) { clearInterval(e3dsVideoWatchPoll); e3dsVideoWatchPoll = null; }
    if (e3dsVideoWatchEl && e3dsVideoWatchFn) {
        e3dsVideoWatchEl.removeEventListener("playing", e3dsVideoWatchFn);
        e3dsVideoWatchEl = null; e3dsVideoWatchFn = null;
    }

    let fired = false;
    const done = () => {
        if (fired) return;
        fired = true;
        if (e3dsVideoWatchPoll) { clearInterval(e3dsVideoWatchPoll); e3dsVideoWatchPoll = null; }
        if (e3dsVideoWatchEl && e3dsVideoWatchFn) {
            e3dsVideoWatchEl.removeEventListener("playing", e3dsVideoWatchFn);
            /* Released here too, matching the cancel path above, which always
               did. Without it a detached <video> stayed referenced until the
               next call, and that next call then detached a listener that was
               already gone - two paths that should behave identically not
               doing so. */
            e3dsVideoWatchEl = null;
            e3dsVideoWatchFn = null;
        }
        callback();
    };

    const video = () => document.getElementById("streamingVideo")
        || document.querySelector("#playerUI video");

    const isPlaying = (v) => v && v.readyState >= 2 && !v.paused;

    const v = video();
    if (isPlaying(v)) { done(); return; }

    if (v) {
        e3dsVideoWatchEl = v;
        e3dsVideoWatchFn = done;
        v.addEventListener("playing", done);
    }

    /* The element may not exist yet, or may have started before we looked. */
    e3dsVideoWatchPoll = setInterval(() => {
        const cur = video();
        if (cur && cur !== e3dsVideoWatchEl) {
            if (e3dsVideoWatchEl && e3dsVideoWatchFn) e3dsVideoWatchEl.removeEventListener("playing", e3dsVideoWatchFn);
            e3dsVideoWatchEl = cur; e3dsVideoWatchFn = done;
            cur.addEventListener("playing", done);
        }
        if (isPlaying(cur)) done();
    }, 400);
}


/* ── [E3DS-DEMO-DRAG] Moving the panel ─────────────────────────────────────
 *
 * The panel is fixed to the top right, and there it covers whatever is in the
 * top right of the app. Rather than pick a corner that is wrong for a different
 * app, let it be moved.
 *
 * Pointer events, not mouse events: one code path covers mouse, touch and pen.
 * The panel is captured on pointerdown so a fast drag that leaves the handle
 * keeps moving instead of stopping dead.
 */

function addDragHandle(panel) {
    if (panel.querySelector("#demoDragHandle")) return;
    const handle = document.createElement("div");
    handle.id = "demoDragHandle";
    handle.title = "Drag to move this panel, tap to collapse it";
    handle.innerHTML = "<span></span><span></span><span></span>"
        + '<b id="demoPanelCaret" aria-hidden="true">&#9662;</b>';
    panel.prepend(handle);
    return handle;
}

function makePanelDraggable(panel) {
    /* Idempotent: called when the panel is created and again on every rebuild.
     * addDragHandle returns undefined when the handle is already there, which
     * is the normal case on a rebuild - the listeners are still attached, so
     * there is nothing to redo. */
    const handle = addDragHandle(panel);
    if (!handle) return;

    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let dragging = false;
    /* Travelled far enough to be a drag rather than a tap. */
    let moved = false;
    /* Only a tap that STARTED on the handle collapses the panel. A tap on a
     * group heading is just a tap on dead space. */
    let fromHandle = false;

    /* [E3DS-DRAG-ANYWHERE] Anything that is not a control can start a drag.
     *
     * The handle used to be the only grab point - a thin bar on a panel that
     * fills most of a phone screen. Group headings, the gaps between buttons and
     * the panel's padding are all dead space, and any of them can move it now.
     *
     * A CONTROL NEVER STARTS A DRAG: pointerdown on a button or the volume
     * slider is left alone, so it still clicks and still slides. */
    const isControl = (t) =>
        !!(t && typeof t.closest === "function" && t.closest("button, input, select, textarea, a, label"));

    /* ONE set of listeners, on the panel only. The handle is inside the panel,
     * so its events bubble here - registering on both would run every handler
     * twice, and a double collapse toggle looks exactly like a dead button. */
    panel.addEventListener("pointerdown", (e) => {
        const onHandle = e.target === handle || (handle.contains && handle.contains(e.target));
        if (!onHandle && isControl(e.target)) return;

        fromHandle = onHandle;
        moved = false;

        const r = panel.getBoundingClientRect();

        /* Switch from the CSS right/top anchoring to explicit left/top the
         * moment a drag starts. Setting left while `right` is still applied
         * would stretch the panel between the two edges rather than move it. */
        panel.style.left = r.left + "px";
        panel.style.top = r.top + "px";
        panel.style.right = "auto";

        startX = e.clientX;
        startY = e.clientY;
        startLeft = r.left;
        startTop = r.top;
        dragging = true;

        handle.classList.add("dragging");
        try { panel.setPointerCapture(e.pointerId); } catch (err) { }
    });

    panel.addEventListener("pointermove", (e) => {
        if (!dragging) return;

        /* Past this distance it is a drag, not a tap. A few pixels of travel is
           normal for a finger that meant to tap. */
        if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) moved = true;
        if (!moved) return;

        const r = panel.getBoundingClientRect();

        /* Keep it on screen. Dragged fully off, it becomes unreachable with no
         * way back short of a reload. A 40px margin means some of it is always
         * grabbable. */
        const margin = 40;
        const maxLeft = window.innerWidth - margin;
        const maxTop = window.innerHeight - margin;

        let left = startLeft + (e.clientX - startX);
        let top = startTop + (e.clientY - startY);

        left = Math.max(margin - r.width, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));

        panel.style.left = left + "px";
        panel.style.top = top + "px";
        e.preventDefault();
    });

    const end = (e) => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove("dragging");
        try { panel.releasePointerCapture(e.pointerId); } catch (err) { }

        /* `dragging` is set on pointerdown, so it is always true here - travel
         * is what separates a tap from a drag, and `moved` records that. */
        if (moved || !fromHandle) return;

        panel.classList.toggle("collapsed");
        const caret = handle.querySelector("#demoPanelCaret");
        if (caret) {
            caret.innerHTML = panel.classList.contains("collapsed") ? "&#9656;" : "&#9662;";
        }
    };
    panel.addEventListener("pointerup", end);
    panel.addEventListener("pointercancel", end);

    /* [E3DS-DRAG-ANYWHERE] Swallow the click a drag would otherwise deliver.
     *
     * A drag that ends over a button would fire that button on release - so
     * repositioning the panel could terminate the session by accident. Capture
     * phase, so this runs before the button's own handler, and only when the
     * pointer actually travelled. */
    panel.addEventListener("click", (e) => {
        if (!moved) return;
        e.stopPropagation();
        e.preventDefault();
        moved = false;
    }, true);

    /* If the window shrinks below where the panel was left, pull it back into
     * view rather than leaving it stranded off the edge. */
    window.addEventListener("resize", () => {
        if (panel.style.left === "") return;
        const r = panel.getBoundingClientRect();
        const margin = 40;
        panel.style.left = Math.max(margin - r.width,
            Math.min(parseFloat(panel.style.left) || 0, window.innerWidth - margin)) + "px";
        panel.style.top = Math.max(0,
            Math.min(parseFloat(panel.style.top) || 0, window.innerHeight - margin)) + "px";
    });
}


/**
 * Remove the buttons that depend on something which has just gone away.
 *
 * Called from onDataChannelClose and onSessionEnding in
 * sdk-callbacks.js. Safe to call repeatedly and safe to call when the panel
 * does not exist yet.
 */
/* [E3DS-DEMO-PERSISTENT] The one control that exists before there is a stream.
 *
 * Every other button is built by buildDemoControls(), which runs from
 * onDataChannelOpen - so the whole panel appears only once a stream is already
 * working. That is right for buttons that talk to the app, and exactly wrong
 * for this one: connection settings are what you need when the stream will NOT
 * start, which is precisely when nothing has called buildDemoControls().
 *
 * Tagging it "always" was not enough on its own. `needs` decides when a button
 * is REMOVED; it says nothing about when the panel is first built.
 *
 * So it is added at page load, marked .demo-persistent, and the rebuild step
 * skips that class - otherwise the first data channel, and every reconnect
 * after it, would sweep it away with the rest.
 */
function addConnectionSettingsButton() {
    if (document.getElementById("e3dsConnSettingsBtn")) return;

    const btn = addDemoButton("Connection settings", () => {
        if (typeof e3dsOpenConnectionSetup !== "function") {
            alert("demo-ui-connection-setup.js is not loaded on this page.");
            return;
        }
        e3dsOpenConnectionSetup();
        /* [E3DS-PANEL-TIDY] "Session", "always" - group, then dependency. This
         * passed "always" alone, which lands in the CATEGORY position: it drew
         * a heading called ALWAYS and left the dependency defaulting, so the one
         * control meant to survive every teardown was grouped by its own
         * lifetime instead of by what it does. */
    }, "Session", "always");

    if (btn) {
        btn.id = "e3dsConnSettingsBtn";
        btn.classList.add("demo-persistent");
    }
}

/* Both paths covered: this file may be loaded with `defer` (document still
 * parsing) or injected later (already interactive), and the button has to exist
 * in either case. */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addConnectionSettingsButton);
} else {
    addConnectionSettingsButton();
}

function removeDemoButtonsNeeding(what) {
    const panel = document.getElementById("demoButtonPanel");
    if (!panel) return;

    /* [E3DS-PANEL-TIDY] ANY control, not only .demo-button.
     *
     * This selector was '.demo-button[data-needs=...]', and the volume slider is
     * not a .demo-button - it is a row. So it carried data-needs="session"
     * faithfully and was never once removed by it. Reported from a kicked
     * session: the stream was gone and the panel still offered Volume, with a
     * slider that moved and did nothing.
     *
     * Matching on the attribute instead of the class means anything that
     * declares a dependency is honoured, including row types added later - the
     * next one would otherwise repeat this silently. */
    const gone = panel.querySelectorAll('[data-needs="' + what + '"]');
    if (!gone.length) { e3dsPruneEmptyCategories(panel); return; }

    gone.forEach(function (b) { b.remove(); });
    console.log("[E3DS] Removed " + gone.length + " control(s) that needed the " +
        what + " - it is gone, so they would have done nothing.");

    e3dsPruneEmptyCategories(panel);
}

/* [E3DS-PANEL-TIDY] A heading with nothing under it is worse than no heading.
 *
 * Removing controls left their group headings behind, so a kicked session
 * showed "SESSION" with nothing in it - and, because two groups existed whose
 * names differed only in case, "SESSION" twice with the buttons under the wrong
 * one. A reader cannot tell an empty group from a broken panel.
 *
 * The heading is stored on the section rather than found by walking siblings,
 * so this cannot delete the wrong element when the panel is rearranged. */
function e3dsPruneEmptyCategories(panel) {
    const sections = panel.querySelectorAll(".demo-category");
    sections.forEach(function (section) {
        if (section.querySelector("[data-needs], .demo-button, .demo-row")) return;
        if (section.children.length > 0) return;
        const heading = section._e3dsHeading;
        if (heading && heading.remove) heading.remove();
        section.remove();
    });
}
