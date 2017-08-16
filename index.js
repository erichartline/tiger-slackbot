'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const Bot = require('./Bot');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// require config with API keys
let config = require('./config');
// set API token from config.js
let token = config.api.token;

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

bot.respondTo('question', (message, channel) => {
  let question = pickRandomQuestion(questionData);
  bot.send(question, channel);
}, false);

bot.respondTo('daily', (message, channel) => {
  let subscribeMessage = {
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
                      "name": "answer",
                      "text": "Yes",
                      "type": "button",
                      "value": "yes"
                  },
                  {
                      "name": "answer",
                      "text": "No",
                      "type": "button",
                      "value": "no"
                  }
              ]
          }
      ]
  };
  bot.send(subscribeMessage, channel);
}, true);

const server = app.listen(8000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
