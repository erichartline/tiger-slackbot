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

const url = "question-data.json";

const server = app.listen(8000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);});
