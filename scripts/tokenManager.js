
const streamingApiKey = "U2FsdGVkX1+95Fk76+iDeMmJiJc0TXEhyJWlSXBFJJuO9kUDP1z/YImgj+LLtdvy7plV6sRdNaHluVfgNlKox9Z0bSEGIc7v3XmOf64ksVY2XwfEDa1z+Ct/y3Ft7gxnFFjyZpDmqDU6BuxnzW3jAQ5i5obEPcBVpjK3IgMZ8ds=";
	
const tokenExpiryDuration = 60000
var clientUserName = "demo";
var streamingAppInfo = 
				{
					"core": 
											  {
												
												"domain": "connector.eagle3dstreaming.com",
												"userName": clientUserName,
												"appName": "E3DS_StarterApp",
												"configurationName": "default",
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

 
 (async () => {
 var data = await GenerateStreamingSessionToken();
 //start streaming process
  e3ds_controller.main(data);

})();
