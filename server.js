// server.js
// where your node app starts

// init project
const express = require('express')
const bodyParser = require('body-parser')
var httpRequest = require('request')
const app = express()
const fs= require('fs')
const log = require('./logger')
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'))
app.set('view engine', 'ejs')
// create application/json parser
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.render("index",{title:"auth",query:request.query,body:request.body})
})
//response.sendFile(__dirname + '/views/index.html');
app.get("/log", (request, response) => {
  response.sendFile(__dirname + '/public/alexa.log');
})
// Simple in-memory store
const dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
]

app.get("/dreams", (request, response) => {
  log.info("get",request.body, request.query);
  response.send(dreams)
})

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/dreams", (request, response) => {
  log.info("post",request.body, request.query);
  dreams.push(request.query.dream)
  response.sendStatus(200)
})

/// alexa logic
app.post("/webhook/alexa", (request, response) => {
  log.info("alexa webhook",request.body, request.query);
  
  let respMessage = "response came";
  let endSession = false;
  let requestType = request.body.request.type
  let text = "";
  let linkAccount = false;
  let accessToken = null;
  try{
    accessToken = request.body.session.user.accessToken;
  }catch(e){
    log.error("Exceptio",e);
  }
  // accessToken check
  try{
    text = request.body.request.intent.slots.text.value;
  }catch(e){
    log.error("error",e);
    text = requestType;
  }
  let respObj={};
  if(accessToken){
   // verify
  } else{
    linkAccount = true;
  }
  if(!linkAccount){
    respObj={
      version:"1.0",
      response:{
        outputSpeech:{
          type:"SSML",
          ssml:"<speak>"+ respMessage+" "+text+"</speak>"

        },
        shouldEndSession:endSession
      }
    };
  } else{
    let accountLinkingMessage ="It seems Like you have not linked alexa account with Niki. Please use the companion app to authenticate on Amazon to start using this skill "+new Date();
    respObj={
      version:"1.0",
      response:{
        outputSpeech:{
          type:"PlainText",
          text:accountLinkingMessage
        },
        card:{
        type:"LinkAccount"
        },
        shouldEndSession:endSession
      },
      sessionAttributes:{
      }
    };
  }
  log.info("respObj",respObj)
  response.status(200).json(respObj)
})

app.get("/auth", (request, response) => {
  log.info("alexa auth get",request.body, request.query);
  
  response.render("index",{title:"auth",query:request.query,body:request.body})
})
app.post("/auth", (request, response) => {
  auth(request,response);
  
})
app.post("/", (request, response) => {
  auth(request,response);
  
})
let sessionUri = "http://ec2-34-220-193-219.us-west-2.compute.amazonaws.com:5001";
function auth(request,response){
log.info("alexa auth post",request.body, request.query);
  var staticCode = "omg_shanky_always_rocks"+new Date();
  
  try{
    let queryParam = JSON.parse(request.body.query)
    let redirectURI = queryParam.redirect_uri+"?code="+staticCode+"&state="+queryParam.state;
    //redirectURI= "https://"+redirectURI;
    log.info("redirectURI ", redirectURI);
    if(request.body.newUserPost){
      sendRequest(sessionUri+"/register/registerCompletion",request.body,function(body){
        log.info("Complete registrationn and reditrect ");
        log.info("response from sessionUri",body);
        if(body.userId){
          redirectURI = queryParam.redirect_uri+"?code="+body.userId+"&state="+queryParam.state;
          log.info("redirectURI with userId as code", redirectURI);
          response.redirect(redirectURI);
        }
      })
    }
    else if(request.body.phoneNumber && request.body.otp){
      log.info("verify and reditrect ");
      // call otp verifier
      // then redirect
      sendRequest(sessionUri+"/register/otpVerification",request.body,function(body){
        log.info("response from sessionUri",body);
        if(body.userId){
          redirectURI = queryParam.redirect_uri+"?code="+body.userId+"&state="+queryParam.state;
          log.info("redirectURI with userId as code", redirectURI);
          response.redirect(redirectURI);
        }else if(body.token){
          response.render("index",{query:queryParam,phoneNumber:request.body.phoneNumber,otp:request.body.otp,newUser:true,token:body.token});
          //EMAIL NAME NEW USER CASE
        }else{
          response.render("ERROR",{query:queryParam,phoneNumber:request.body.phoneNumber});
          // ERROR
        }
        //getjwt
        //response.status(200).json({query:request.query,body:request.body,respBody:body});
      });
      //response.status(200).json({query:request.query,body:request.body});
    } else if (request.body.newUser){
      
    }else {
      log.info("start registration ");
      // call checkRegistration
      sendRequest(sessionUri+"/register/checkRegistration",request.body,function(body){
        log.info("response from sessionUri",body);
        response.render("index",{query:queryParam,phoneNumber:request.body.phoneNumber});
      });
      
    }
  }
  catch(e){
    log.error("error ", e)
    response.status(200).json({e:e})
  }
}
app.post("/access", (request, response) => {
  log.info("alexa_access_post",request.body, request.query);
  let access_token ="";
  if(request.body.code){
    access_token = request.body.code;
  }else{
    access_token = request.body.refresh_token;
  }
  let respObj = {
    "access_token":access_token,
    "token_type":"Bearer",
    "expires_in":1000*60*5,
    "refresh_token":access_token,
    "scopes":["full_access","access_offline"]
  }
  log.info("respObj",respObj)
  response.status(200).json(respObj)
  
  
})

/*app.get("/access", (request, response) => {
  log.info("alexa_access_get",request.body, request.query);
  let respObj = {
    "access_token":"mysupersecretaccesstoken"+new Date(),
    "token_type":"Bearer",
    "expires_in":3600,
    "refresh_token":"mysupersecretrefreshtoken"+new Date(),
    "scopes":["full_access","access_offline"]
  }
  response.status(200).json(respObj)
  
  
})*/
function sendRequest(url,body,cb){
  var request = require("request");

  var options = { method: 'POST',
    url: url,
    body: body,
    json: true };
  log.info("postOptions",options);
  request(options, function (error, response, body) {
    if (error) cb(error);
    cb(body);
  });

}
// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  log.info(`Your app is listening on port ${listener.address().port}`)
})
