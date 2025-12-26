let preventErrorRedirect = true;//optional: prevent redirect on error 

e3ds_controller.callbacks.onError = function (errorMsg) {
    console.error("ob-onError", errorMsg);

}

e3ds_controller.callbacks.onDataChannelOpen = function () {
    console.log("ob-onDataChannelOpen");

}
e3ds_controller.callbacks.onDataChannelClose = function () {
    console.log("ob-onDataChannelClose");

}

e3ds_controller.callbacks.onConfigAcquire = function () {
    console.log("ob-onConfigAcquire");

}
e3ds_controller.callbacks.onSessionExpired = function () {
    self.location = "assets/pages/session-expired.htm";

}

e3ds_controller.callbacks.onResponseFromUnreal = function (descriptor) {
    console.log("ob-onResponseFromUnreal");
    console.log("UnrealResponse: " + descriptor);

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
