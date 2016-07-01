var fs = require('fs');
var request = require('request');
var express = require('express');
var http = require('http');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var request = require('request');

var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('flight-co2', function (req, res) {

    var origin = req.query.origin;
    var destination = req.query.destination;
    var host = "http://impact.brighterplanet.com";
    var path = "flights.json";
    var endpoint = host + "/" + path;
    var options = {};

    console.log("computeCO2Footprint() called");

    endpoint += "?" + "origin_airport=" + encodeURI(origin) + "&destination_airport=" + encodeURI(destination);

    request('endpoint', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // from within the callback, write data to response, essentially returning it.
        res.send(body);
      }
    })

    /*request(endpoint, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);

        if (result.decisions && result.decisions.carbon) {
            success(result.decisions.carbon);
        }
      } else {
        console.log("ERROR computeCO2Footprint for " + origin + " > " + destination + " : ");
        console.log("\t" + body);
        console.log("\t" + response.statusCode);
      }
    })*/
  }
}

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

// *** This is where we started before *****

// Load client secrets from a local file.
/*fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  console.log("readFile clientSecret...");
  authorize(JSON.parse(content), listEvents);
});*/

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function computeCO2Footprint (origin, destination, success) {
  var host = "http://impact.brighterplanet.com";
  var path = "flights.json";
  var endpoint = host + "/" + path;
  var options = {};

  console.log("computeCO2Footprint() called");

  endpoint += "?" + "origin_airport=" + encodeURI(origin) + "&destination_airport=" + encodeURI(destination);

  request(endpoint, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = JSON.parse(body);

      if (result.decisions && result.decisions.carbon) {
          success(result.decisions.carbon);
      }
    } else {
      console.log("ERROR computeCO2Footprint for " + origin + " > " + destination + " : ");
      console.log("\t" + body);
      console.log("\t" + response.statusCode);
    }
  })
}

function findFlightsInEvents(events) {
  var flights = new Array;

  console.log("findFlightsInEvents() called");

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var start = event.start.dateTime || event.start.date;

    if (event.summary && event.summary.indexOf("Flight to ") > -1) {
      var origin_airport = event.location;
      var destination_airport = event.summary.split("Flight to ")[1];

      // event.organizer.email (check == unknownorganizer@calendar.google.com)
      console.log('Found flight from %s to %s on date: %s',
        origin_airport, destination_airport, start.toString());

      flights.push({
        origin: origin_airport,
        destination: destination_airport,
        date: start,
        name: event.summary,
        footprint: null
      });
    }
  }

  return flights;
}

function calculateTotalCO2(flights) {
  console.log("CALCULATING TOTAL CO2 FOOTPRINT...");

  var TONS_PER_KILOGRAM = 0.00110231;
  var DONATION_PER_TON = 15;

  var totalCarbonKgs = 0.0;
  flights.forEach(function (flight) {
    totalCarbonKgs += flight.footprint;
  });

  var totalCarbonTons = totalCarbonKgs * TONS_PER_KILOGRAM;
  var recommendedDonation = totalCarbonTons * DONATION_PER_TON;

  console.log("Total kilograms of carbon emitted: " + totalCarbonKgs.toString() + "(kg)");
  console.log("Total tons of carbon emitted: " + totalCarbonTons.toString() + "(tons)");
  console.log("Recommended donation to offset carbon this year: $" + recommendedDonation.toString());
}

function processFlights(flights) {
  var waiting = flights.length;

  //console.log("About to process # of flights: " + flights.length);
  flights.forEach(function (flight) {
    computeCO2Footprint(flight.origin, flight.destination, function (carbon) {
      console.log("CO2 results for " + flight.origin + " > " + flight.destination + " : " +
        carbon.object.value.toString());

      flight.footprint = carbon.object.value;
      finish();
    })
  });

  function finish() {
    waiting--;
    //console.log("waiting on # more flights: " + waiting);
    if (waiting <= 0) {
      calculateTotalCO2(flights);
    }
  }
}

// tons to kilograms : 1 ton = 907.185 kg

function recursiveGetEvents(calendar, request, pageToken, flightEvents) {
  request.pageToken = pageToken;

  // Call Google Calendar API to get events
  calendar.events.list(request, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }

    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
      return;
    } else {
      flightEvents = flightEvents.concat(findFlightsInEvents(events));
    }

    if (response.nextPageToken == null) {
      console.log("Next page is null, finish!")
      finish(flightEvents);
      return;
    }
    else {
      recursiveGetEvents(calendar, request, response.nextPageToken, flightEvents);
    }
  });

  function finish(flights) {
    console.log("FINISH! Total # of flights found: " + flights.length);
    processFlights(flights);
  }
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function listEvents(auth) {
  var calendar = google.calendar('v3');
  var today = (new Date()), startDate = (new Date()), endDate = (new Date());
  //ONE YEAR AGO
  startDate.setMonth(today.getMonth() - 12);
  endDate.setMonth(today.getMonth() + 1);

  //THREE MONTHS AGO
  //startDate.setMonth(today.getMonth() - 3);
  //endDate.setMonth(today.getMonth() + 1);

  var request = {
    auth: auth,
    alwaysIncludeEmail: true,
    calendarId: 'primary',
    pageToken: null,
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    maxResults: 500,
    singleEvents: true,
    orderBy: 'startTime'
  };

  var flightEvents = new Array;

  recursiveGetEvents(calendar, request, null, flightEvents);
}
