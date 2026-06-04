// use your streaming api key
const streamingApiKey = "U2FsdGVkX19LvBvAE3QKohlXMM1rC98lj5BT9TKPaJsv+/mH+OZgtHuEWPfNvZPEKaUAaq4IH4O2OyJzzgjFbY2dbht+lWtkgGLzZDJool18kdZ0bH63gjdxFmcUTNJjwYzcps/pk2RNUMaMxUG2DOky76W/wL+xBxIQEzaKNJY=";

	
const tokenExpiryDuration = 60000

var clientUserName = "Fakhrul"; // use your username
var streamingAppInfo = 
				{
					"core": 
											  {
												
												"domain": "connector.eagle3dstreaming.com",
												"userName": clientUserName,
												"appName": "FeaturesPluginDemo", // use your app name
												"configurationName": "sdk", //use your config name
												"version": "latest",
												
											  }
				  
					
				}

				
				
async function GenerateStreamingSessionToken(appName=null) {
	if(appName){
    streamingAppInfo.core.appName = appName
  }
	 // === Validate placeholder values ===
    if (!streamingApiKey || streamingApiKey === "Your Streaming API Key") {
      alert("❌ Invalid API Key!\n\nPlease replace 'Your Streaming API Key' with your real API key from the Eagle Pixel Streaming dashboard.");
      return null;
    }

    if (!clientUserName || clientUserName === "Your Username") {
      alert("❌ Invalid Username!\n\nPlease replace 'Your Username' with the actual username of the client who will join the stream.");
      return null;
    }
	
	
	// === Validate appName ===
    if (!streamingAppInfo.core.appName || streamingAppInfo.core.appName === "Your App Name") {
      alert("❌ Invalid App Name!\n\nPlease replace 'Your App Name' with the real app name you created.");
      return null;
    }

    // === Validate configurationName ===
    if (!streamingAppInfo.core.configurationName || streamingAppInfo.core.configurationName === "Your Configuration Name") {
      alert("❌ Invalid Configuration Name!\n\nPlease replace 'Your Configuration Name' with the real configuration name.");
      return null;
    }
	
	
  try {
    const response = await fetch("https://token.eagle3dstreaming.com/api/v2/token/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Auth " + streamingApiKey
      },
      body: JSON.stringify({ 
        object: streamingAppInfo,
        expiry: tokenExpiryDuration,
        client: clientUserName
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("response.error:", data.error);
      return null;
    }

    console.log("response.token:", data.token);
    return data

  } catch (err) {
    console.error("Token request failed:", err);
    return null;
  }
}

 
 (async () => {
 var data = await GenerateStreamingSessionToken();
  e3ds_controller.main(data);

})();
