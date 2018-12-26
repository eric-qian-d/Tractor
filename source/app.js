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
var players = new Map;
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
  		players.set(socket.id, gameId);
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
	    	players.set(socket.id, gameId);
	    	game.players.set(socket.id, game.players.size + 1);
	    	game.playerOrder.push(socket.id);
	    	io.to(socket.id).emit('game joined', gameId);
	    	console.log(game.players);
	    	if (game.players.size == 2) {
	    		io.to(gameId).emit('game initializing', gameId);
	    		// io.to(gameId).emit('a', gameId);
	    		console.log('initializing game for ', gameId);
	    		waitingGames.delete(gameId);	    		
	    		var newLiveGame = {
	    			id : gameId,
	    			players : game.players, //Map of socket.id => number joined
	    			order : [null, 1, 2, 3, 4, 1, 2, 3, 4],
	    			p1 : new Map([['id', game.playerOrder[0]],
	    				['hand', null], ['level', 2]]),
	    			p2 : new Map([['id', game.playerOrder[1]],
	    				['hand', null], ['level', 2]]),
	    			p3 : new Map([['id', game.playerOrder[2]],
	    				['hand', null], ['level', 2]]),
	    			p4 : new Map([['id', game.playerOrder[3]],
	    				['hand', null], ['level', 2]]),
	    			bottom : null,
	    			trumpNum : null,
	    			trumpSuit : null,
	    			host : null,
	    			lastWinners : null,
	    			cardsPlayed : 0,
	    			roundStartingPlayer : 1,
	    			roundPlayersPlayed : 0,
	    			roundNumCards : null,
	    			roundSuit : null
	    		};
	    		liveGames.set(gameId,newLiveGame);

	    		newGame(gameId);
	    		}
	    	}
    	}
    else {
    	io.to(socket.id).emit('invalid id', gameId);
    }
  });
  socket.on('play', function(cards) {
  	var gameId = players.get(socket.id);
  	game = liveGames.get(gameId);
  	if (game){
  		console.log(game.players.get(socket.id), game.roundStartingPlayer, game.roundPlayersPlayed);
	  	if(game.players.get(socket.id) == game.order[game.roundStartingPlayer + game.roundPlayersPlayed]){
	  		if(game.roundPlayersPlayed == 0) {
	  			game.roundNumCards = 0;//to fix for actually adjusting!
	  			game.cardsPlayed += game.roundNumCards;
	  		}
	  		game.roundPlayersPlayed ++;
	  	}
	  //logic for legal play
  	}
  });
 });
// async function runGame(gameId)

async function newGame(gameId){
	game = liveGames.get(gameId);
	var hand1;
	var hand2;
	var hand3;
	var hand4;
	var bottom;
	[hand1, hand2, hand3, hand4, bottom] = initHands();
	game.p1.set('hand', hand1);
	game.p2.set('hand', hand2);
	game.p3.set('hand', hand3);
	game.p4.set('hand', hand4);
	game.bottom = bottom;
	console.log(game);
	for(var i = 0; i < 25; i++){
		io.to(game.p1.get('id')).emit('deal card', [game.p1.get('hand')[i], game.p1.get('level')]);
		io.to(game.p2.get('id')).emit('deal card', [game.p2.get('hand')[i], game.p2.get('level')]);
		// io.to(game.p3.get('id')).emit('hand', game.p3.get('hand')[i]);
		// io.to(game.p4.get('id')).emit('hand', game.p4.get('hand')[i]);
		await sleep(100);
	}
	io.to(game.id).emit('cards dealt', game.id);
	console.log('finished dealing to ', game.id);
	//logic for declaring and countdown


	if(!liveGames.get(game.id).trumpNum){
		liveGames.get(game.id).trumpNum = 2;
		liveGames.get(game.id).trumpSuit = 2;
	}
	
	io.to(game.p1.get('id')).emit('finalize hand', [game.p1.get('hand'), game.trumpSuit, game.trumpNum]);
	io.to(game.p2.get('id')).emit('finalize hand', [game.p2.get('hand'), game.trumpSuit, game.trumpNum]);
	// io.to(game.p3.get('id')).emit('hand', game.p3.get('hand')[i]);
	// io.to(game.p4.get('id')).emit('hand', game.p4.get('hand')[i]);
	
	//logic for getting the bottom cards
	// console.log()
	while(game.cardsPlayed <25) {
		var playersPlayed = 0;
		while(playersPlayed < 2) {
			var t = 0;
			io.to(game.id).emit('turn', game.roundStartingPlayer + playersPlayed);
			while(t < 30) {
				await sleep(1000);
				io.to(game.id).emit('time', t);
				t++;
				console.log(game.roundPlayersPlayed, playersPlayed);
				if(game.roundPlayersPlayed > playersPlayed) {
					break;
				}
			}
			if(t == 30) {
				//logic for random card played
				console.log('ran out of time!');
			}
			playersPlayed++;
		}
		game.roundPlayersPlayed = 0;
	}
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

function createCard(suit, value, deck) {
	var obj = {};
	obj.suit = suit;
	obj.value = value;
	obj.deck = deck
	obj.power = value;
	if(value == 'bigJoker'){
		obj.power = 18;
	}
	if(value == 'smallJoker') {
		obj.power = 17;
	}
	if(value == 5) {
		obj.points = 5;
	}
	else if(value == 10 || value == 13) {
		obj.points = 10;
	}
	else {
		obj.points = 0;
	}
	return obj;
}

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve, ms);
  });
}

function initHands() {
	var cards = [];
	for(var deck = 1; deck < 3; deck++) {
		for(var value = 2; value < 15; value++){
			for(var suit = 1; suit < 5; suit++){
				cards.push(createCard(suit, value, deck));
			}
		}
		cards.push(createCard('T', 'bigJoker', deck));
		cards.push(createCard('T', 'smallJoker', deck));
	}
	
	cards = shuffle(cards);
	console.log(cards);
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
