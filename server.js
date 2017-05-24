
/*---------------------------------------------------------------------------------------------
 *  Authentication and Linking API for Roku Channels
 *
 *  Copyright (c) 2017 Marcelo Lv Cabral. All Rights Reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const uniqueRandom = require('unique-random')
const checkdigit = require('checkdigit')

const app = express()
const rand = uniqueRandom(1000, 9999);
const colCodes = 'codesRoku'
const colTokens = 'tokensRoku'
const expireSecs = 900 // default expiration: 15 minutes

app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs')

var db
var port = process.env.port || 3000;

// create a a DEBUG environment variable to see debug messages at stderr output
var debugId = 'auth-linking-api'
var debug = require('debug')(debugId)
var debugMode = (process.env.DEBUG === debugId || process.env.DEBUG === '*')

// TODO: update the connection string below to use your credentials and database location
MongoClient.connect('mongodb://<user>:<password>@<server>/<database>', (err, database) => {
    if (err) return console.error(err)
    db = database
    app.listen(port, function() { 
        console.log('Listening port ', port) 
        debug("Debug Mode On")
    })
    // create the collection with an expiration index for the generated codes
    db.listCollections({name: colCodes}).next(function(err, collinfo) {
        if (!collinfo) {
            db.collection(colCodes).createIndex({ createdAt: 1 }, { expireAfterSeconds: expireSecs })
        }
    })
})

// endpoint to generate the temporary 5 digit code for the device id provided
app.get('/generate', (req, res) => {
  if (req.query.token === null) return res.send('Error 400: Syntax error, missing token parameter\n')
  var code = checkdigit.mod10.apply(rand().toString())
  var gen = {deviceId: req.query.token, code: code, createdAt: new Date()}
  db.collection(colCodes).updateOne({deviceId: req.query.token},  {$set: gen}, {upsert: true}, function(err, feedback) {
    if (err) return console.error(err)
    if (feedback.result.n == 0) console.log('could not update db!', feedback)
    debug('saved to database: %o', gen)
    res.json({code: code, expiration: expireSecs})
  })
})

// endpoint to check the activation. returns the OAuth token associated to the provided device id.
app.get('/authenticate', (req, res) => {
  if (req.query.token === null) return res.send('Error 400: Syntax error, missing id parameter\n')
  db.collection(colTokens).find({deviceId: req.query.token, oauth:{$ne:null}}, {_id: 0, code: 0, deviceId: 0}).toArray((err, docs) => {
    if (err) return console.error(err)
    var auth = {linked: 'no', oauth_token: ''}
    if (docs.length != 0) auth = {linked: 'yes', oauth_token: docs[0].oauth}
    debug('authentication: %o', auth)
    res.json(auth)
  })
})

// endpoint to delete the link for the provided the device id
app.get('/disconnect', (req, res) => {
  if (req.query.token === null) return res.send('Error 400: Syntax error, missing id parameter\n')
  var code = checkdigit.mod10.apply(rand().toString())
  db.collection(colTokens).deleteOne({deviceId: req.query.token}, function(err, feedback) {
    if (err) return console.error(err)
    debug('deleted link: %s %o', req.query.token, feedback.result)
    if (feedback.result.n == 1 && feedback.result.ok == 1){
        res.json({success: "yes"})
    }
    else {
        res.json({success: "no"})
    }
  })
})

// webpage where the user can enter the validation code to link the device id with an OAuth token
app.get('/activate', (req, res) => {
    res.render('activate.ejs')
})

// webpage showing the result of the activation process
app.get('/done', (req, res) => {
  var error = req.query.error
  var message
  if (error === undefined) {
      message = 'Successful Activation'
  } 
  else if (error == '1') { 
      message = 'Missing token! Please try again.'
  }
  else if (error == '2') { 
      message = 'Invalid or expired code! Please try again.'
  }
  else if (error == '3') { 
      message = 'Error linking account! Please try again.'
  }
  else {
      message = 'Activation error! Please try again.'
  }
  res.render('done.ejs', {msg: message})
})

// endpoint to create the link between the device id and the OAuth token
app.all('/token', (req, res) => {
  if (req.body.code) {
    var deviceId
    db.collection(colCodes).findOne({code: req.body.code}, function(err, doc) {
      if (err) return console.error(err)
      debug('code check: %s %o', req.body.code, doc)  
      if (doc) {
        deviceId = doc.deviceId
        db.collection(colTokens).updateOne({deviceId: deviceId}, 
                                          {$set: {deviceId: deviceId, oauth: req.body.oauth}}, 
                                          {upsert: true}, function(err, feedback) {
          if (err) return console.error(err)
          debug('update result: %o', feedback.result)
          if (feedback.result.n != 0 && feedback.result.ok == 1) {
            res.redirect('/done')
          }
          else {
            res.redirect('/done?error=3')
          }
        })
      }
      else {
        res.redirect('/done?error=2')
      }
    })
  }
  else {
    res.redirect('/done?error=1')
  }
})

// webpage for debugging: shows the content of both collections
if (debugMode) {
  var params = {}
  app.get('/browse', (req, res) => {
      db.collection(colCodes).find().toArray((err, result) => {
        if (err) return console.error(err)
         params.codes = result
         db.collection(colTokens).find().toArray((err, result) => {
            if (err) return console.error(err)
            params.tokens = result
            res.render('browse.ejs', params)
         })
      })
  })
}

