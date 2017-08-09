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

bot.respondTo('ask me a question', (message, channel) => {
  let question = pickRandomQuestion(questionData);
  bot.send(question, channel);
}, false);

//const url = "question-data.json";



// app.post('/', (req, res) => {
  // let text = req.body.text;
  // conditional to check if command is correct
  // if(! /^\d+$/.test(q.text)) { // not a digit
  //   res.send('U R DOIN IT WRONG. Enter a status code like 200!');
  //   return;
  // }

  // if data is legit, send response
  // would make sense to set this as its own file once it grows larger
  // let data = {
  //   response_type: 'in_channel', // public to the channel
  //   text: '302: Found',
  //   attachments:[
  //     {
  //       image_url: 'https://http.cat/302.jpg'
  //     }
  // ]};

//   res.json(response);
// });
//
// fetch(url)
// .then(function(data) {
//   let question = data.question;
//   let category = data.category;
//   let source = data.source;
//
//   let response = {
//     question: question,
//     category: category,
//     source: source
//   }
//
// })
// .catch(function(err) {
//   console.log(err);
// })

const server = app.listen(8000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
