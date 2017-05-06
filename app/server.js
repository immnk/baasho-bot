var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var constants = require('./modules/constants');
var fbMessenger = require('./modules/fbMessenger');
var mongoose = require('mongoose');
var config = require('./config');

global.__base = __dirname + '/';

var https = require("https");
var unirest = require('unirest');

var app = express();

app.set('port', (process.env.PORT || 8080));
// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Process application/json
app.use(bodyParser.json());
app.use(express.static('WebContent'));


// Connect to database
mongoose.connect(config.database.mlabs);


/*Router Declarations*/

var movies = require(__dirname + '/routes/movies')(); 
var theatre = require(__dirname + '/routes/theatre')(); 
var freshdesk = require(__dirname + '/routes/freshdesk')(); 
var game = require(__dirname + '/routes/games')(); 

// Index route
app.get('/', function(req, res) {
    res.sendFile(constants.HTML_DIR + 'index.html', { root: __dirname });
});

app.get('/privacy', function(req, res) {
    res.sendFile(constants.HTML_DIR + 'privacy-policy.html', { root: __dirname });
});


app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge']);
        return;
    }
    res.send('Error, wrong token');
});

/* Mapping the requests to routes (controllers) */


app.use('/movies', movies);
app.use('/theatre', theatre);
app.use('/freshdesk', freshdesk);

app.post('/webhook/', function(req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.optin) {
                    fbMessenger.receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    fbMessenger.receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    fbMessenger.receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    fbMessenger.receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    fbMessenger.receivedMessageRead(messagingEvent);
                } else if (messagingEvent.account_linking) {
                    fbMessenger.receivedAccountLink(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've 
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
});



// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
});



//Cron job
/**var cronJob = require('cron').CronJob;
var myJob = new cronJob('00 30 11 * * 1-5', function(){console.log('lloHe')});
myJob.start();*/

