
const streamingApiKey = "Your streaming api key";
	
const tokenExpiryDuration = 60000
var clientUserName = "username";
var streamingAppInfo = 
				{
					"core": 
											  {
												
												"domain": "connector.eagle3dstreaming.com",
												"userName": clientUserName,
												"appName": "Your app name",
												"configurationName": "Your config name",
												"version": "latest",
												
											  },
				  
					"configurationToOverride": 
											  {
												
												
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
	
    //return data.token;
    return data

  } catch (err) {
    console.error("Token request failed:", err);
    return null;
  }
}

 //window.e3ds_streaming_token =await GenerateStreamingSessionToken()
 
 (async () => {
 var data = await GenerateStreamingSessionToken();
 //start streaming process
  e3ds_controller.main(data);

})();
