'use strict';

const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const Bot = require('./bot');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// set API credentials from .env
let token = process.env['SLACK_TEAM_TOKEN'];
let clientId = process.env['CLIENT_ID'];
let clientSecret = process.env['CLIENT_SECRET'];
let verToken = process.env['VERIFICATION_TOKEN'];

//instantiate Redis client from env variable
let client = require('redis').createClient(process.env['REDIS_URL']);

//JSON data async load and format
const fs = require('fs');
const dataFile = './question-data.json';
const techData = './tech-questions.json';
const generalData = './general-questions.json';

/* Create server and manage routes for get/post request handling */
const server = app.listen(PORT, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

let questionData;
let techQuestions;
let generalQuestions;

/* Read the file and send to the callback */
fs.readFile(dataFile, getQuestionFile);
fs.readFile(techData, techCallback);
fs.readFile(generalData, generalCallback);

// Write the callback function
function getQuestionFile(err, data) {
    if (err) throw err;
    questionData = JSON.parse(data);
};

function techCallback(err, data) {
    if (err) throw err;
    techQuestions = JSON.parse(data);
};

function generalCallback(err, data) {
    if (err) throw err;
    generalQuestions = JSON.parse(data);
};

function pickRandomQuestion(questionData) {
    let result;
    let count = 0;
    for (let prop in questionData.questions) {
        if (Math.random() < 1/++count) {
           result = questionData.questions[prop].question;
        }
    };
    return result;
};

function pickTechQuestion(techQuestions) {
  let result;
  let count = 0;
  for (let prop in techQuestions.questions) {
      if (Math.random() < 1/++count) {
         result = techQuestions.questions[prop].question;
      }
  };
  return result;
};

function pickGeneralQuestion(generalQuestions) {
  let result;
  let count = 0;
  for (let prop in generalQuestions.questions) {
      if (Math.random() < 1/++count) {
         result = generalQuestions.questions[prop].question;
      }
  };
  return result;
};
/* end JSON data load and format */

const bot = new Bot({
  token: token,
  autoReconnect: true,
  autoMark: true
});

//connect to Redis client
client.on('error', (err) => {
    console.log('Error: ' + err);
});

client.on('connect', () => {
    console.log('Connected to Redis data store.');
});

//bot responses
bot.respondTo('ask me a question', (message, channel) => {
  let question = pickRandomQuestion(questionData);
  bot.send(question, channel);
}, false);

bot.respondTo('ask me a technical question', (message, channel) => {
  let question = pickTechQuestion(techQuestions);
  bot.send(question, channel);
}, false);

bot.respondTo('ask me a general question', (message, channel) => {
  let question = pickGeneralQuestion(generalQuestions);
  bot.send(question, channel);
}, false);

//helper function for delivering responses to command response URLs
function sendMessageToSlackResponseURL(responseURL, JSONmessage){
    let postOptions = {
        uri: responseURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: JSONmessage
    };
    request(postOptions, (error, response, body) => {
        if (error){
            console.log(error);
        }
    });
}

//helper function for delivering message to designated channel


// TODO -> update this route once hosted on server
app.get('/', function(req, res) {
    res.send('Heroku is working! Path Hit: ' + req.url);
});

// route for GET request to a /oauth endpoint. This endpoint handles the logic of the Slack oAuth process with the app behind the scenes.
app.get('/oauth', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, respond with err message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        // call successful, call Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code received in req as query parameters
        request({
            url: 'https://slack.com/api/oauth.access', //URL to send to
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify REST method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);
            }
        });
    }
});

// Route the endpoint for /daily slash command and send back the response
app.post('/dailyquestions', function(req, res) {
    res.status(200).end() // best practice to respond with empty 200 status code
    let reqBody = req.body;
    let responseURL = reqBody.response_url;
    if (reqBody.token != verToken) {
        res.status(403).end("Access forbidden")//case where token not received or not correct in message
    } else {
        let message = {
            "text": "Would you like to receive an interview question every day?",
            "attachments": [
                {
                    "text": "Choose yes, no or delete",
                    "fallback": "You are unable to make a selection",
                    "callback_id": "subscription",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "actions": [
                        {
                            "name": "yes",
                            "text": "Yes",
                            "type": "button",
                            "value": "yes",
                            "style": "primary"
                        },
                        {
                            "name": "no",
                            "text": "No",
                            "type": "button",
                            "value": "no"
                        },
                        {
                            "name": "delete",
                            "text": "Delete",
                            "type": "button",
                            "style": "danger",
                            "value": "delete",
                            "confirm": {
                                "title": "Are you sure?",
                                "text": "This will delete your subscription.",
                                "ok_text": "Yes",
                                "dismiss_text": "What was I thinking?!"
                            }
                        }
                    ]
                }
            ]
        }
        sendMessageToSlackResponseURL(responseURL, message)
    }
});

//helper functions for management of user subscription responses with Redis client


//handle response from /dailyquestions slash command input
app.post('/actions', (req, res) => {
    res.status(200).end() // best practice to respond with 200 status code
    let actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded JSON string in res payload object

    //respond to first question to confirm subscription and create user key
    if (actionJSONPayload.actions[0].name == 'yes') {
        let message = {
            "text": "Great! What time is good for you?",
            "attachments": [
                {
                    "text": "Pick an option",
                    "fallback": "You weren't able to make a selection",
                    "callback_id": "subscription2",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "actions": [
                        {
                            "name": "morning",
                            "text": "Morning",
                            "type": "button",
                            "value": "1"
                        },
                        {
                            "name": "afternoon",
                            "text": "Afternoon",
                            "type": "button",
                            "value": "2"
                        },
                        {
                            "name": "evening",
                            "text": "Evening",
                            "type": "button",
                            "value": "3"
                        },
                        {
                            "name": "cancel",
                            "text": "Cancel",
                            "type": "button",
                            "style": "danger",
                            "value": "4"
                        }
                    ]
                }
            ]
        }
        client.hmset(actionJSONPayload.user.name, ["subscribe", actionJSONPayload.actions[0].name], (err) => {
            if (err) {
                sendMessageToSlackResponseURL(actionJSONPayload.response_url,'Uh oh, looks like I could not store that properly:' + err);
            } else {
                client.get(actionJSONPayload.user.name, (err, reply) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log("user said" + reply);
                    sendMessageToSlackResponseURL(actionJSONPayload.response_url, message);
                })
            }
        })
    }
    //respond to first question "no" response
    if (actionJSONPayload.actions[0].name == 'no' || actionJSONPayload.actions[0].name == 'cancel') {
        let message = {
            "text": "No problem, " + actionJSONPayload.user.name + "! Let me know if you change your mind.",
            "replace_original": true 
        }
        sendMessageToSlackResponseURL(actionJSONPayload.response_url, message);
    }
    //delete users subscription based on "delete" response
    if (actionJSONPayload.actions[0].name == 'delete') {
        let message = {
            "text": "Alright, " + actionJSONPayload.user.name + ", it's done. Please keep me in mind for future openings!",
            "replace_original": true 
        }
        client.del(actionJSONPayload.user.name, (err) => {
            if (err) {
                sendMessageToSlackResponseURL(actionJSONPayload.response_url,'Uh oh, looks like I could not handle that request:' + err);
            } else {
                console.log("user subscription deleted");
                sendMessageToSlackResponseURL(actionJSONPayload.response_url, message);
            }
        })
    }
});

//handle response for help requests
app.post('/tiger-help', function(req, res) {
    res.status(200).end() // best practice to respond with empty 200 status code
    var reqBody = req.body;
    var responseURL = reqBody.response_url;
    if (reqBody.token != verToken){
        res.status(403).end("Access forbidden")//case where token not received or not correct in message
    } else{
        var helpMenu = {
            "text": "What would you like help with?",
            "response_type": "in_channel",
            "attachments": [
                {
                    "text": "Choose a topic",
                    "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "callback_id": "help_command",
                    "actions": [
                        {
                            "name": "help_list",
                            "text": "Pick a help topic...",
                            "type": "select",
                            "options": [
                                {
                                    "text": "About",
                                    "value": "about"
                                },
                                {
                                    "text": "Subscribing to Daily Questions",
                                    "value": "subscribe"
                                },
                                {
                                    "text": "Unsubscribing from daily questions",
                                    "value": "unsubscribe"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
       sendMessageToSlackResponseURL(responseURL, helpMenu);
    }
});
