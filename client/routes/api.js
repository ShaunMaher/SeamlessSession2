"use strict"
var express = require('express');
var router = express.Router();

//TODO: make this dynamic based on the files available
// Require each of the API versions we will support
var apis = require('seamlesssession2');

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  console.log('Time: ', Date.now())
  next()
})

// define the home page route
router.get('/', function (req, res) {
  if (apis.apiDefination) {
    res.render('apireference', {title: 'APIs available on this server', apiDefination: apis.apiDefination});
  }
  else {
    res.render('index', {title: 'API home page'});
  }
})

if (apis.apiDefination) {
  for (let apiIndex in apis.apiDefination) {
    console.log(apiIndex);
    let apiDefination = apis.apiDefination[apiIndex];
    console.log(apiDefination);
    for (let methodIndex in apiDefination.methods) {
      let method = apiDefination.methods[methodIndex];
      let fullUri = '/' + apiDefination.version + '/' + method['uri'];
      console.log('Adding method: ' + fullUri);
      router.get(fullUri, function(req, res) {
        console.log('Running method (GET): ' + fullUri)
        method.action(req, res);
      });
    }
    for (let propertyIndex in apiDefination.properties) {
      let property = apiDefination.properties[propertyIndex];
      let fullUri = '/' + apiDefination.version + '/' + property['uri'];
      if (property.getter) {
        console.log('Adding property getter: ' + fullUri);
        router.get(fullUri, function(req, res) {
          console.log('Running property getter: ' + fullUri)
          property.getter(req, res);
        });
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

module.exports = router;
