const https = require("https");
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"bad method"}) };
  let apiKey = "";
  try { apiKey = JSON.parse(event.body||"{}").apiKey||""; } catch(e) {}
  if (!apiKey) return { statusCode: 400, headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"no key"}) };
  console.log("KEY LENGTH:", apiKey.length, "KEY START:", apiKey.substring(0,8));
  return new Promise((resolve) => {
    const postData = JSON.stringify({expires_in:480});
    const req = https.request({hostname:"api.assemblyai.com",path:"/v2/realtime/token",method:"POST",headers:{"Authorization":apiKey,"Content-Type":"application/json","Content-Length":Buffer.byteLength(postData)}}, (res) => {
      let data="";
      res.on("data",c=>data+=c);
      res.on("end",()=>{
        console.log("AAI STATUS:", res.statusCode, "AAI RESPONSE:", data.substring(0,300));
        try { const p=JSON.parse(data); resolve({statusCode:res.statusCode,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},body:JSON.stringify({token:p.token||null,error:p.error||(res.statusCode!==200?"Status "+res.statusCode+": "+data.substring(0,150):null)})}); } catch(e) { resolve({statusCode:500,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},body:JSON.stringify({error:data.substring(0,200)})}); }
      });
    });
    req.on("error",e=>{console.log("REQ ERROR:",e.message);resolve({statusCode:500,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},body:JSON.stringify({error:e.message})});});
    req.write(postData);req.end();
  });
};