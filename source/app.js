// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);

var pages = require('./routes/pages.js');


app.use('/', pages);


app.set('port', 3000);
app.use('/static', express.static('public'));

// Routing


// Starts the server.
server.listen(3000, function() {
  console.log('Starting server on port 3000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
});

// setInterval(function() {
//   io.sockets.emit('message', 'test!');
// }, 1000);

var players = {};
var num_players = 0;
io.on('connection', function(socket) {
  socket.on('new player', function() {
  	num_players += 1;
    players[socket.id] = {
    	player_number : num_players
    };

  });
  socket.on('movement', function(data) {
    var player = players[socket.id] || {};
    if (data.left) {
      player.x -= 5;
    }
    if (data.up) {
      player.y -= 5;
    }
    if (data.right) {
      player.x += 5;
    }
    if (data.down) {
      player.y += 5;
    }
  });
});

setInterval(function() {
  io.sockets.emit('state', players);
}, 1000 / 60);
setInterval(function () {
	io.sockets.emit('num players', num_players);
}, 1000 / 60);
