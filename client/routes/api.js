"use strict"
var express = require('express');
const WebSocket = require('ws');
var router = express.Router();

//TODO: make this dynamic based on the files available
// Require each of the API versions we will support
router.apis = []; //require('seamlesssession2');

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  console.log('Time: ', Date.now())
  next()
})

// define the home page route
router.get('/', (function (req, res) {
  //console.log(this.apis);
  if (this.apis[0].apiDefination) {
    res.render('apireference', {title: 'APIs available on this server', apis: this.apis});
  }
  else {
    res.render('index', {title: 'API home page'});
  }
}).bind(router));

//TODO: I'm trying to make the server and client code as identical as possible
// but this is the best way I've come up with so far for enabling only the API
// functions that are relevent to each mode of operation.  I'm sure there's a
// better solution.
router.addApi = function(object) {
  this.apis.push(object);
  this.updateLoadedApis();
}

router.listening = function(server) {
  console.log("listening!");

  // The following is to set up listening on a WebSocket for API calls.
  if (this.apis) {
    for (let apiIndex in this.apis) {
      let apiDefination = this.apis[apiIndex].apiDefination;
      console.log(apiDefination);
      let fullUri = '/api/' + apiDefination.name + '/' + apiDefination.version + '/';
      if ((apiDefination.wss) || (apiDefination.wss == null)) {
        console.log("Going to set up WebSocket.Server for " + fullUri);
        apiDefination.wss = new WebSocket.Server({
          server: server,
          path: fullUri
        });
        apiDefination.wss.on('connection', (function connection(ws) {
          console.log("wss.connection");
          apiDefination.wssEvents.connection[1].apply(apiDefination.wssEvents.connection[0], [ws]);

          ws.on('message', function incoming(message) {
            console.log("wss.message");
            if (apiDefination.wssEvents.message) {
              apiDefination.wssEvents.message[1].apply(apiDefination.wssEvents.message[0], [message, ws]);
            }
          });

          ws.on('error', function incoming(error) {
            console.log("wss.error");
            if (apiDefination.wssEvents.error) {
              apiDefination.wssEvents.error[1].apply(apiDefination.wssEvents.error[0], [message, ws]);
            }
          });
        }).bind(apiDefination);
      }
    }
  }
}

router.updateLoadedApis = function() {
  console.log(this.apis);
  if (this.apis) {
    for (let apiIndex in this.apis) {
      //console.log(apiIndex);
      let apiDefination = this.apis[apiIndex].apiDefination;
      //console.log(apiDefination);
      for (let methodIndex in apiDefination.methods) {
        let method = apiDefination.methods[methodIndex];
        let fullUri = '/' + apiDefination.name + '/' + apiDefination.version + '/' + method['uri'];
        console.log('Adding method: ' + fullUri);
        router.get(fullUri, function(req, res) {
          console.log('Running method (GET): ' + fullUri)
          method.action(req, res);
        });
        router.put(fullUri, function(req, res) {
          console.log('Running method (PUT): ' + fullUri)
          console.log(method.context);
          method.action(req, res);
        });
      }
      for (let propertyIndex in apiDefination.properties) {
        let property = apiDefination.properties[propertyIndex];
        let fullUri = '/' + apiDefination.name + '/' + apiDefination.version + '/' + property['uri'];
        if (property.getter) {
          console.log('Adding property getter: ' + fullUri);
          router.get(fullUri, (function(req, res) {
            console.log('Running property getter: ' + fullUri)
            property.getter.apply(this, [req, res]);
          }).bind(this));
        }
        if (property.setter) {
          console.log('Adding property setter: ' + fullUri);
          router.put(fullUri, function(req, res) {
            property.setter.apply(null, [req, res]);
          });
        }
      }
      //router.use(('/v' + apiIndex), apis[apiIndex]);
      //router.use(('/' + apiIndex), apis[apiIndex]);
    }
  }
}

module.exports = router;
module.exports.add = router.addApi;
