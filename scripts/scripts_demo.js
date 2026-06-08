let preventErrorRedirect = true;//optional: prevent redirect on error 

e3ds_controller.callbacks.onError = function (errorMsg) {
    console.error("ob-onError", errorMsg);

}

e3ds_controller.callbacks.onDataChannelOpen = function () {
    console.log("Stream Connected");

    const img = document.getElementById("loadingImage");

    if (img) {
        img.remove();
    }

}
e3ds_controller.callbacks.onDataChannelClose = function () {
    console.log("ob-onDataChannelClose");

}

e3ds_controller.callbacks.onConfigAcquire = function () {
    console.log("ob-onConfigAcquire");

    // Create image element
    const img = document.createElement("img");

    img.src = "https://i.ibb.co.com/hxwXFHXS/Gemini-Generated-Image-gzrkshgzrkshgzrk.png";

    img.id = "loadingImage";
    img.style.position = "fixed";
    img.style.top = "0";
    img.style.left = "0";
    img.style.width = "100vw";
    img.style.height = "100vh";
    img.style.objectFit = "cover";
    img.style.zIndex = "99999";

    document.body.appendChild(img);

}



e3ds_controller.callbacks.onSessionExpired = function () {
    console.log("Session Expired");

    window.location.href = "assets/pages/my-session-expired.html";
}


e3ds_controller.callbacks.onReceivingAppAcquiringProgress = function (percent) {

    console.log("onReceivingAppAcquiringProgress: " + percent);



}


e3ds_controller.callbacks.onReceivingAppPreparationProgress = function (percent) {

    console.log("onReceivingAppPreparationProgress: " + percent);



}

e3ds_controller.callbacks.onReceivingAppStartingProgress = function (percent) {

    console.log("onReceivingAppStartingProgress: " + percent);



}

e3ds_controller.callbacks.onHtmlBind = function () {
    console.log("ob-onHtmlBind");


}

//call this function to terminate your stream
// e3ds_controller.terminate();


function setStreamQuality(value) {
    console.log("Setting stream quality point:", value);
    //use this function to control video quality
    e3ds_controller.setQualityPoint(value);
    //value from 1 to 51
}




//use this function to set volume
//e3ds_controller.setVolume(value); //value from 0 to 1


function captureStreamScreenshot() {
    console.log("Capturing screenshot");
    //use this function to capture screenshot
    e3ds_controller.captureScreenShot();
}



function toggleStreamFullscreen() {
    console.log("Toggling fullscreen mode");
    //use this function to toggle fullscreen
    e3ds_controller.toggleFullscreen();
}


function sendMessageToUnreal() {
    const descriptor = "This message is sent by frontend"
    console.log("Sending to Unreal:", descriptor);
    //use this function to send message to Unreal app
    e3ds_controller.sendToUnreal(descriptor);
}

// use this function to receives messages sent back from Unreal.
e3ds_controller.callbacks.onResponseFromUnreal = function (descriptor) {
    console.log("Message sent from Unreal:", descriptor);
};