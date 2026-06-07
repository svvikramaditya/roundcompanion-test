// Netlify serverless function — AssemblyAI Live token proxy
// Uses Node's built-in https module (no npm packages needed, works on all Node versions)
const https = require("https");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let apiKey = "";
  try {
    const body = JSON.parse(event.body || "{}");
    apiKey = body.apiKey || "";
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!apiKey) {
    return { statusCode: 400, body: JSON.stringify({ error: "No API key provided" }) };
  }

  // Call AssemblyAI token endpoint server-side (no CORS issue here)
  return new Promise((resolve) => {
    const postData = JSON.stringify({ expires_in: 480 });
    const options = {
      hostname: "api.assemblyai.com",
      path: "/v2/realtime/token",
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ token: parsed.token || null, error: parsed.error || null }),
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: "AssemblyAI response parse error: " + e.message }),
          });
        }
      });
    });

    req.on("error", (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: "Request failed: " + e.message }) });
    });

    req.write(postData);
    req.end();
  });
};
