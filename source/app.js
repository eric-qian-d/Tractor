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
	    		io.to(gameId).emit('game initializing', gameId);
	    		// io.to(gameId).emit('a', gameId);
	    		console.log('initializing game for ', gameId);
	    		waitingGames.delete(gameId);

	    		var hand1;
	    		var hand2;
	    		var hand3;
	    		var hand4;
	    		var bottom;
	    		[hand1, hand2, hand3, hand4, bottom] = initHands();
	    		var newLiveGame = {
	    			id : gameId,
	    			players : game.players, //Map of socket.id => number joined
	    			order : [1, 2, 3, 4, 1, 2, 3, 4],
	    			p1 : new Map([['id', game.playerOrder[0]],
	    				['hand', hand1], ['level', 2]]),
	    			p2 : new Map([['id', game.playerOrder[1]],
	    				['hand', hand2], ['level', 2]]),
	    			p3 : new Map([['id', game.playerOrder[2]],
	    				['hand', hand3], ['level', 2]]),
	    			p4 : new Map([['id', game.playerOrder[3]],
	    				['hand', hand4], ['level', 2]]),
	    			trumpNum : null,
	    			trumpSuit : null
	    		};
	    		liveGames[gameId] = newLiveGame;
	    		sendCards(newLiveGame);
	    		}
	    	}
    	}
    else {
    	io.to(socket.id).emit('invalid id', gameId);
    }
  });
 });

async function sendCards(game){
	for(var i = 0; i < 25; i++){
		io.to(game.p1.get('id')).emit('hand', game.p1.get('hand')[i]);
		io.to(game.p2.get('id')).emit('hand', game.p2.get('hand')[i]);
		await sleep(1);
	}
	io.to(game.id).emit('a', 'bug');
	console.log('finished dealing to ', game.id);
}

function shuffle (array) {
// from https://gomakethings.com/how-to-shuffle-an-array-with-vanilla-js/
	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;

};

function createCard(suit, value) {
	var obj = {};
	obj.suit = suit;
	obj.value = value;
	return obj;
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function initHands() {
	var cards = [];
	cards.push(createCard('trump', 'bigJoker'));
	cards.push(createCard('trump', 'bigJoker'));
	cards.push(createCard('trump', 'smallJoker'));
	cards.push(createCard('trump', 'smallJoker'));
	for(var suit = 1; suit < 5; suit++) {
		for(var value = 2; value < 15; value++){
			cards.push(createCard(suit, value));
			cards.push(createCard(suit, value));
		}
	}
	
	cards = shuffle(cards);
	// console.log(cards);
	// console.log(cards.length);
	var hand1 = cards.slice(0,25);
	var hand2 = cards.slice(25,50);
	var hand3 = cards.slice(50,75);
	var hand4 = cards.slice(75,100);
	var bottom = cards.slice(100,108);
	return [hand1, hand2, hand3, hand4, bottom];

}

// setInterval(function() {
//   io.sockets.emit('message', 'test!');
// }, 1000);
