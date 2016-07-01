var cool = require('cool-ascii-faces');
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
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

app.get('/cool', function(request, response) {
  response.send(cool());
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
