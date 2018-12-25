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

var liveGames = new Map;
var waitingGames = new Map;
io.on('connection', function(socket) {
  socket.on('create game', function(gameId) {
  	console.log('creating game...');
  	if (liveGames.has(gameId) || waitingGames.has(gameId)) {
  		io.to(socket.id).emit('already used id', gameId);
  		console.log('id already in use');
  	}
  	else{
  		socket.join(gameId);
  		var game = {
  			players : new Map([[socket.id, 1]]),
  			playerOrder : [socket.id]
  		}
  		waitingGames.set(gameId, game);
  		io.to(socket.id).emit('game created', gameId);
  		console.log('successfully created');
  	}
  });
  socket.on('join game', function(gameId) {
  	if (liveGames.has(gameId)) {
    	io.to(socket.id).emit('invalid id', gameId);
    }
    else if (waitingGames.has(gameId)) {
    	var game = waitingGames.get(gameId);
    	if (game.players.has(socket.id)) {
    		io.to(socket.id).emit('game already joined', gameId);
    	} 
    	else{
	    	socket.join(gameId);
	    	game.players.set(socket.id, game.players.size + 1);
	    	game.playerOrder.push(socket.id);
	    	io.to(socket.id).emit('game joined', gameId);
	    	console.log(game.players);
	    	if (game.players.size == 2) {
	    		io.to(gameId).emit('game starting', gameId);
	    		console.log('starting game');
	    		waitingGames.delete(gameId);
	    		var newLiveGame = {
	    			players : game.players,
	    			order : [1, 2, 3, 4, 1, 2, 3, 4],
	    			p1 : new Map([['id', game.playerOrder[0]],
	    				['hand', [1]], ['level', 2]]),
	    			p2 : new Map([['id', game.playerOrder[1]],
	    				['hand', [2]], ['level', 2]]),
	    			// p3 : new Map([['id', game.playerOrder[2]],
	    			// 	['hand', [3]], ['level', 2]]),
	    			// p4 : new Map([['id', game.playerOrder[3]],
	    			// 	['hand', [4]], ['level', 2]]),
	    			trumpNum : null,
	    			trumpSuit : null
	    		};
	    		liveGames[gameId] = newLiveGame;
	    		io.to(newLiveGame.p1.get('id')).emit('hand', newLiveGame.p1.get('hand'));
	    		io.to(newLiveGame.p2.get('id')).emit('hand', newLiveGame.p2.get('hand'));
	    		}
	    	}
    	}
    else {
    	io.to(socket.id).emit('invalid id', gameId);
    }
  });
  socket.on('')
 });

// setInterval(function() {
//   io.sockets.emit('message', 'test!');
// }, 1000);
