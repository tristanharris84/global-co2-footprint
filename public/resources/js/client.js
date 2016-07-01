(function(){
  var API_KEY = "AIzaSyCpzCgqQLwILgUh6slcw4E0MDIgfTuv0RE";
  //var FIREBASE_API_KEY = "AIzaSyC6CfBi46QebeBwAHDHyrs5TcXi";
  //var FIREBASE_API_KEY = "AIzaSyC6CfBi46QebeBwAHDHyrs5TcXi-lyQqJw";
  var FIREBASE_API_KEY = "AIzaSyC4Mvi_B9SECjW4_Flw2Co8encgqb6pL-U";
  /* old client id */
  //var CLIENT_ID = '515874574296-vppiu9sgr7sosumuuhdel2cc0vnmdnpd.apps.googleusercontent.com';

  //var G_CLIENT_ID = "520249361528-66tvp8i4d3f3sf3qt5sh1epvg8mgcd3q.apps.googleusercontent.com";
  //var G_CLIENT_SECRET = "P0S32NgD9GbTJAc3ZxACO02A";
  var G_CLIENT_ID = "520249361528-2ae6is3agn78lspjts9kp027k8p45m7d.apps.googleusercontent.com";
  var G_CLIENT_SECRET = "OoBeJhZIHzwFvQ8mVYsoUxHl";
  var G_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

  function clientGoogleAuth() {
    console.log("checkGoogleAuth> authorizing with client id: " + G_CLIENT_ID);
      gapi.auth.authorize({
          'client_id': G_CLIENT_ID,
          'scope': G_SCOPES.join(' '),
          'immediate': true
        }, handleGAPIAuthResult);
  }

  /**
   * Handle response from authorization server.
   *
   * @param {Object} authResult Authorization result.
   */
  function handleGAPIAuthResult(authResult) {
    console.log("handleGAPIAuthResult()");
    console.log(authResult);
    if (authResult) {
      loadCalendarApi();
    }


    /*var authorizeDiv = document.getElementById('authorize-div');
    if (authResult && !authResult.error) {
      // Hide auth UI, then load client library.
      authorizeDiv.style.display = 'none';
      loadCalendarApi();
    } else {
      // Show auth UI, allowing the user to initiate authorization by
      // clicking authorize button.
      authorizeDiv.style.display = 'inline';
    }*/

  }

  function processUserCalendarEvents(auth) {
    var calendar = gapi.client.calendar;

    $('.calculating').show();
    $('.summary').hide();

    console.log("CALENDAR LOADED");
    //console.log(calendar);
    console.log("processUserCalendarEvents");

    var today = (new Date()), startDate = (new Date()), endDate = (new Date());

    //ONE YEAR AGO
    startDate.setMonth(today.getMonth() - 3);
    endDate.setMonth(today.getMonth() + 1);

    //startDate.setMonth(today.getMonth() - 3);
    //endDate.setMonth(today.getMonth()+1);

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

  // tons to kilograms : 1 ton = 907.185 kg

  function recursiveGetEvents(calendar, request, pageToken, flightEvents) {
    request.pageToken = pageToken;

    var req = calendar.events.list(request);
    req.execute(function(/*err, */response)  {
      /*if (err) {
        console.log('The API returned an error: ');
        console.log(err);
        return;
      }*/

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

    // Call Google Calendar API to get events
    /*calendar.events.list(request, function(err, response) {
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
    }*/
  }

  function findFlightsInEvents(events) {
    var flights = new Array;

    $(".found-flights").show();
    $(".found-co2").hide();

    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      var start = event.start.dateTime || event.start.date;

      if (event.summary && event.summary.indexOf("Flight to ") > -1) {
        var origin_airport = event.location;
        var destination_airport = event.summary.split("Flight to ")[1];

        // event.organizer.email (check == unknownorganizer@calendar.google.com)
        console.log('Found flight from %s to %s on date: %s',
          origin_airport, destination_airport, start.toString());

        $(".found-flights").append("<div>Flight from " + origin_airport + " to " + destination_airport + " on " + start.toString() + "</div><br>");


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

  function computeCO2Footprint (origin, destination, successHandler) {
    var host = "http://impact.brighterplanet.com";
    var path = "flights.json";
    var endpoint = host + "/" + path;

    endpoint += "?" + "origin_airport=" + encodeURI(origin) + "&destination_airport=" + encodeURI(destination);

    jQuery.support.cors = true;
    console.log("jQuery.support is next: ");
    console.log(jQuery.support.cors);

    $.ajax({
      url: endpoint,
      type: "GET",
      dataType: "json",
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,
      success: function(data) {
        //console.log(data);
        //var responseData = JSON.parse(data);
        if (data.decisions && data.decisions.carbon) {
          successHandler(data.decisions.carbon);
        }

      },
      error: function(jqrXHR, textStatus, ex) {
        console.log(textStatus + ", " + ex + ", " + jqrXHR.responseText)
      }
    })

    /*$.getJSON(endpoint, function (response, result, code) {
      //console.log("got JSON...")
      //console.log(response);
      if (response ) {
      //&& result.status == 200
        if (response.decisions && response.decisions.carbon) {
            success(response.decisions.carbon);
        }
      } else {
        console.log("ERROR computeCO2Footprint for " + origin + " > " + destination + " : ");
        console.log("\t" + result);
        console.log("\t" + result.status);
      }
    });*/
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

    $(".loggedin").hide();
    $(".calculating").hide();
    $(".summary").show();
    $(".summaryTotalKgs").text("Total KGs: " + totalCarbonKgs.toString() + "(kg)");
    $(".summaryTotalTons").text("Total Tons: " + totalCarbonTons.toString() + "(tons)");
    $(".recommendedAmt").text("Recommended donation to offset carbon this year: $" + recommendedDonation.toString() );
    $(".donateNow").attr("href", "https://support.nature.org/site/Donation2?idb=1131261553&df_id=3901&3901.donation=form1&mfc_pref=T&Level=10043&PREFILL_AMOUNT=" + recommendedDonation.toString());
  }

  function processFlights(flights) {
    var waiting = flights.length;

    $(".found-flights").hide();
    $(".found-co2").show();
    console.log("About to process # of flights: " + flights.length);
    flights.forEach(function (flight) {
      computeCO2Footprint(flight.origin, flight.destination, function (carbon) {
        console.log("CO2 results for " + flight.origin + " > " + flight.destination + " : " +
          carbon.object.value.toString());

        $(".found-co2").append("<div>" + flight.origin + " to " + flight.destination + " = " + carbon.object.value.toString() + "(kgs)</div><br>");

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

  function onLoggedIn(user){
    console.log("onLoggedIn");

    //$('h1').text('Hi ' + user );

    $('.loggedin').show()
    $('.calculating').show();
    $('.loggedout').hide()
  }


  function onLoggedOut(user){
    $('h1').text('How much CO2 last year?')
    $('.loggedin').hide()
    $('.loggedout').show()
  }

  function loadCalendarApi() {
    console.log("loadCalendarApi()");
    // Load the Calendar client right off the bat
    gapi.client.load('calendar', 'v3', handleCalendarLoad);
  }

  function initCalendarAccess(token, idToken) {
    console.log("gapi is?");
    console.log(gapi);
    gapi.client.load('drive', 'v2', handleDriveLoad);
    gapi.client.setApiKey(token);
    window.setTimeout(checkGAPIAuth, 1);
    gapi.auth.authorize({
        'client_id': G_CLIENT_ID,
        'scope': G_SCOPES.join(' '),
        'immediate': true
      }, handleGAPIAuthResult);
  }

  /**
   * Load Google Calendar client library. List upcoming events
   * once client library is loaded.
   */
  function handleCalendarLoad(data) {
    console.log("handleCalendarLoad called!");
    console.log(data);
    //processUserCalendarEvents(data);
    processUserCalendarEvents(gapi.auth);
  }

  function loginToFirebase() {
    $('.calculating').show();
    $('.summary').show();
    $('.prompt').hide();


    var provider = new firebase.auth.GoogleAuthProvider();
    console.log("login clicked, provider is : " + provider);
    provider.addScope('https://www.googleapis.com/auth/plus.login');
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      var idToken = result.credential.idToken;
      // The signed-in user info.
      var user = result.user;
      var uid = user.uid;
      // ...
      console.log("!! SIGN IN with firebase callback success> ");
      console.log(result);
      // Call Gapi authorization here???

      gapi.auth.setToken(token); // try one of these, should work
      gapi.auth.setToken({
        access_token: token
      });

      // Load the user's calendar client-side, only after they login to FB
      gapi.client.load('calendar', 'v3', handleCalendarLoad);
    }).catch(function(error) {
      console.log("!! ERROR authenticating with Firebase popup");
      console.log(error);
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // [START_EXCLUDE]
      if (errorCode === 'auth/account-exists-with-different-credential') {
        alert('You have already signed up with a different auth provider for that email.');
        // If you are using multiple auth providers on your app you should handle linking
        // the user's accounts here.
      } else {
        console.error(error);
      }
      // [END_EXCLUDE]
    });
  }

  $('.calculating').hide();
  $('.summary').hide();


  //var ref = new Firebase('https://co2-calculator.firebaseio.com/');
  // See https://firebase.google.com/docs/web/setup#project_setup for how to
  // auto-generate this config

  /* START FIREBASE INITIALIZATION! */

  var config = {
    apiKey: "AIzaSyC4Mvi_B9SECjW4_Flw2Co8encgqb6pL-U",
    authDomain: "global-co2-calculator.firebaseapp.com",
    databaseURL: "https://global-co2-calculator.firebaseio.com",
    storageBucket: ""
  };

  console.log("client.js > about to firebase.initializeApp!");
  firebase.initializeApp(config);
  console.log("initialized FB app");

  console.log("client.js> what's firebase? ");
  console.log(firebase);

  var ref = firebase.database().ref();
  var auth = firebase.auth();

  var isNewUser = true;

  auth.onAuthStateChanged(function(user, err, complete) {
    if (user) {
      if (isNewUser) {
        // User signed in!
        var uid = user.uid;
        ref.child("users").child(user.uid).set({
          provider: user.provider,
          name: user.uid
        });
      }

      console.log("Firebase User Authenticated! what's the new 'user'? ");
      console.log(user);
      onLoggedIn();
    } else {
      // User logged out
    }
  });

  $('#login').click(function(){
    console.log("login clicked!");

    loginToFirebase();
  });


  $('#logout').click(function(){
    console.log("LOG OUT");
    firebase.auth().signOut().then(function() {
      // Sign-out successful.
    }, function(error) {
      // An error happened.
    });
    //ref.unauth();
    onLoggedOut();
  });

  $('#submit').click(function(){
    console.log( "User clicked to find out CO2" )
  });

})()
