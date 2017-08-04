'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const url = "question-data.json";

app.post('/', (req, res) => {
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
  fetch(url)
  .then(function(data) {
    let question = data.question;
    let category = data.category;
    let source = data.source;

    let response = {
      question: question,
      category: category,
      source: source
    }

  })
  .catch(function(err) {
    console.log(err);
  })

  res.json(response);
});

const server = app.listen(8000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);});
