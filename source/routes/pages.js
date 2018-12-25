var express = require('express');
var router = express.Router();

router.get('/', function(request, response) {
  response.sendFile('index.html', {root:'source/pages'});
});

router.get('/wait', function(request, response) {
  response.sendFile('wait.html', {root:'source/pages'});
});

router.get('/game', function(request, response) {
	response.sendFile('game.html', {root:'source/game'});
})

module.exports = router;