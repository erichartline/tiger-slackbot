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

//JSON data async load and format
const fs = require('fs');
const dataFile = './question-data.json';
var questionData;

/* Read the file and send to the callback */
fs.readFile(dataFile, getQuestionFile)

// Write the callback function
function getQuestionFile(err, data) {
    if (err) throw err;
    questionData = JSON.parse(data);
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
/* end JSON data load and format */

const bot = new Bot({
  token: token,
  autoReconnect: true,
  autoMark: true
});

bot.respondTo('hello', (message, channel, user) => {
  bot.send(`Hello to you too, ${user.name}!`, channel)
}, true);

bot.respondTo('help', (message, channel) => {
  bot.send(`This is where you will eventually find help`, channel);
}, true);

bot.respondTo('ask me a question', (message, channel) => {
  let question = pickRandomQuestion(questionData);
  bot.send(question, channel);
}, false);

/* Create server and manage routes for get/post request handling */
const server = app.listen(PORT, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

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
    var reqBody = req.body;
    var responseURL = reqBody.response_url;
    if (reqBody.token != verToken) {
        res.status(403).end("Access forbidden")//case where token not received or not correct in message
    } else {
        var message = {
            "text": "Would you like to receive a random interview question every day?",
            "attachments": [
                {
                    "text": "Choose yes or no",
                    "fallback": "You are unable to make a selection",
                    "callback_id": "subscription",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "actions": [
                        {
                            "name": "yes",
                            "text": "Yes",
                            "type": "button",
                            "value": "yes"
                        },
                        {
                            "name": "no",
                            "text": "No",
                            "type": "button",
                            "value": "no"
                        }
                    ]
                }
            ]
        }
        sendMessageToSlackResponseURL(responseURL, message)
    }
});

// Route the endpoint for /daily slash command and send back the response
app.post('/tester', function(req, res) {
    res.status(200).end() // best practice to respond with empty 200 status code
    var reqBody = req.body;
    var responseURL = reqBody.response_url;
    if (reqBody.token != verToken) {
        res.status(403).end("Access forbidden")//case where token not received or not correct in message
    } else {
        var message = {
            "text": "Would you like to receive a random interview question every day?",
            "attachments": [
                {
                    "text": "Choose yes or no",
                    "fallback": "You are unable to make a selection",
                    "callback_id": "subscription",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "actions": [
                        {
                            "name": "yes",
                            "text": "Yes",
                            "type": "button",
                            "value": "yes"
                        },
                        {
                            "name": "no",
                            "text": "No",
                            "type": "button",
                            "value": "no"
                        }
                    ]
                }
            ]
        }
        sendMessageToSlackResponseURL(responseURL, message)
    }
});

// Route the endpoint for /subscribe slash command and send back the response
// app.post('/subscribe', function(req, res) {
//     res.status(200).end() // best practice to respond with empty 200 status code
//     var reqBody = req.body;
//     var responseURL = reqBody.response_url;
//     if (reqBody.token != verToken) {
//         res.status(403).end("Access forbidden")//case where token not received or not correct in message
//     } else {
//       request ({
//           url: 'https://slack.com/api/reminders.add', //URL to send to
//           qs: {token: token, text: 'reminder', time: 'every day'}, //Query string data
//           method: 'POST', //Specify REST method
//
//       }, function (error, response, body) {
//           if (error) {
//               console.log(error);
//           } else {
//               res.json(body);
//           }
//       });
//         sendMessageToSlackResponseURL(responseURL, message)
//     }
// });

// subscription method
app.post('/subscribe', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, respond with err message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        request({
            url: 'https://slack.com/api/reminders.add', //URL to send to
            qs: {token: token, text: 'reminder', time: 'every day'}, //Query string data
            method: 'POST', //Specify REST method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);
            }
        });
    }
});

app.post('/actions', (req, res) => {
    res.status(200).end() // best practice to respond with 200 status code
    let actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded JSON string in res payload object
    let message = {
        "text": actionJSONPayload.user.name + " clicked: " + actionJSONPayload.actions[0].name,
        "replace_original": true
    }
    sendMessageToSlackResponseURL(actionJSONPayload.response_url, message)
});
