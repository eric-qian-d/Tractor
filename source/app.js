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
	    			stringToCard : new Map(),

	    			p1 : new Map([['id', game.playerOrder[0]],
	    				['hand', null], ['level', 2], ['round', null],
	    				[1, []], [2, []], [3, []], [4, []], ['T', []]]),
	    			p2 : new Map([['id', game.playerOrder[1]],
	    				['hand', null], ['level', 2], ['round', null],
	    				[1, []], [2, []], [3, []], [4, []], ['T', []]]),
	    			p3 : new Map([['id', game.playerOrder[2]],
	    				['hand', null], ['level', 2], ['round', null],
	    				[1, []], [2, []], [3, []], [4, []], ['T', []]]),
	    			p4 : new Map([['id', game.playerOrder[3]],
	    				['hand', null], ['level', 2], ['round', null],
	    				[1, []], [2, []], [3, []], [4, []], ['T', []]]),
	    			bottom : null,
	    			trumpNum : null,
	    			trumpSuit : null,
	    			host : null,
	    			lastWinners : null,
	    			cardsPlayed : 0,
	    			roundStartingPlayer : 1,
	    			roundPlayersPlayed : 0,
	    			roundNumCards : null,
	    			roundSuit : null,
	    			roundPointsPlayed : 0
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
  	console.log(cards, cards[0]);
  	var gameId = players.get(socket.id);
  	game = liveGames.get(gameId);
  	if (game){
  		console.log(game.players.get(socket.id), game.roundStartingPlayer, game.roundPlayersPlayed);
	  	if(game.players.get(socket.id) == game.order[game.roundStartingPlayer + game.roundPlayersPlayed]){
	  		var first = false;
	  		if(game.roundPlayersPlayed == 0) {
	  			game.roundNumCards = 0;//to fix for actually adjusting!
	  			game.cardsPlayed += game.roundNumCards;
	  			first = true;
	  		}
	  		var player;
	  		var legal = true;
	  		if(game.players.get(socket.id) == 1){
	  			player = game.p1;
	  		}
	  		else if(game.players.get(socket.id) == 2){
	  			player = game.p2;
	  		}
	  		else if(game.players.get(socket.id) == 3){
	  			player = game.p3;
	  		}
	  		else{
	  			player = game.p4;
	  		}
	  		io.to(player.get('id')).emit('game created', game.id);
	  		io.to(socket).emit('game created', game.id);
	  		//logic for legal play
	  		console.log(game.roundSuit, game.roundNumCards);
	  		var cardsArr = []
	  		var inHand = true;
	  		var consistentSuit = true;
	  		for(var i = 0; i < cards.length; i++) {
	  			card = game.stringToCard.get(cards[i]);
	  			console.log('strind and card', cards[i], card);
	  			// for(var j = 0; j < player.hand.length; j++) {
	  			// 	if(!(card in player.get('hand'))) {
		  		// 		inHand = false;
		  		// 	}
	  			// }
	  			
	  			if(card.suit != game.roundSuit) {
	  				consistentSuit = false;
	  			}
	  			cardsArr.push(card)
	  		}
	  		console.log(cardsArr);
	  		cardsArr.sort(function(a, b){return a.power - b.power});
	  		if(!inHand) { //check that player has these cards
	  			io.to(player.get('id')).emit('cards arent in hand', game.id);
	  			legal = false;
	  		}
	  		console.log('1', legal);
	  		if(first && cardsArr.length > 1) {
	  			
	  			if(cardsArr.length == 2) {
	  				if(cardArr[0].suit != cardArr[1].suit) { //check that suit is legal
		  				io.to(player.get('id')).emit('invalid start', game.id);
		  				legal = false;
		  			}
	  				else if(cardArr[0].power != cardArr[1].power) { //checks for playin a pair
	  					io.to(player.get('id')).emit('invalid start', game.id);
	  					legal = false;
	  				}
	  			}
	  		}
	  		if(!first) {
	  			if(game.roundNumCards != cardsArr.length) {
  					io.to(player.get('id')).emit('invalid hand', game.id);
  				}
	  			if(game.roundNumCards == 1) {
	  				if(game.roundSuit != cardsArr[0].suit && player.get(game.roundSuit).length != 0) {
	  					io.to(player.get('id')).emit('invalid hand', game.id);
	  					legal = false;
	  				}
	  			}
	  			if(game.roundNumCards == 2) {
	  				if((game.roundSuit != cardsArr[0].suit || game.roundSuit != cardsArr[1].suit) && player.get(game.roundSuit).length >= 2) {
	  					io.to(player.get('id')).emit('invalid hand', game.id);
	  					legal = false;
	  				}
	  				else if(!(game.roundSuit == cardsArr[0].suit || game.roundSuit == cardsArr[1].suit) && player.get(game.roundSuit).length == 1) {
	  				io.to(player.get('id')).emit('invalid hand', game.id);
	  					legal = false;
	  				}

	  			}

	  		}
	  		//check that pair/tractor is legal
	  		if(legal) {
	  			console.log('LEGAL');
	  			game.roundPlayersPlayed ++;
	  			if(first) {
	  				game.roundSuit = cardsArr[0].suit;
	  				game.roundNumCards = cardsArr.length;
	  			}
	  			updatedHand = []
	  			hand = player.get('hand');
	  			for(var i = 0; i < hand.length; i++) {
	  				toAdd = true;
	  				for(var j = 0; j < cardsArr.length; j ++) {
	  					console.log(hand[i], cardsArr[j], hand[i] == cardsArr[j], hand[i] === cardsArr[j]);
	  					if (hand[i] == cardsArr[j]) {
	  						toAdd = false;
	  					}
	  				if(toAdd) {
	  					console.log(toAdd, hand[i]);
	  					updatedHand.push(hand[i]);
	  				}
	  				}
	  			player.set('hand', updatedHand);	
	  			}
	  			player.set(1, []);
	  			player.set(2, []);
	  			player.set(3, []);
	  			player.set(4, []);
	  			player.set('T', []);
	  			for(var i = 0; i < player.get('hand').length; i++) {
						var card = player.get('hand')[i];
					  var suit = card.suit;
					  var value = card.value;
					  if(value == game.trumpSuit || value == game.trumpNum || suit == 'T') {
					    if(value == game.trumpNum) {
				        if(suit == game.trumpSuit) {
				          card.power = 16;
				        }
				        else {
				          card.power = 15;
				        }
				      }
				      player.get('T').push(card);   
					  }
					  else if(suit == 1){
					    player.get(1).push(card);
					  }
					  else if(suit == 2){
					    player.get(2).push(card);
					  }
					  else if(suit == 3){
					    player.get(3).push(card);
					  }
					  else{
					    player.get(4).push(card);
					  }
					}
					player.get('T').sort(function(a, b){return a.power - b.power});
					player.get(1).sort(function(a, b){return a.power - b.power});
					player.get(2).sort(function(a, b){return a.power - b.power});
					player.get(3).sort(function(a, b){return a.power - b.power});
					player.get(4).sort(function(a, b){return a.power - b.power});
					console.log(player.get('hand').length);

					io.to(player.get('id')).emit('played', [player.get('hand'), game.trumpSuit, game.trumpNum]);
					console.log('emitted?', player.get('id'));
					}
				
	  		
	  	}
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
	[hand1, hand2, hand3, hand4, bottom, stringToCard] = initHands();
	game.p1.set('hand', hand1);
	game.p2.set('hand', hand2);
	game.p3.set('hand', hand3);
	game.p4.set('hand', hand4);
	game.bottom = bottom;
	game.stringToCard = stringToCard;
	console.log(game);
	for(var i = 0; i < 25; i++){
		io.to(game.p1.get('id')).emit('deal card', [game.p1.get('hand')[i], game.p1.get('level')]);
		io.to(game.p2.get('id')).emit('deal card', [game.p2.get('hand')[i], game.p2.get('level')]);
		// io.to(game.p3.get('id')).emit('hand', game.p3.get('hand')[i]);
		// io.to(game.p4.get('id')).emit('hand', game.p4.get('hand')[i]);
		await sleep(1);
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
	for(var i = 0; i < game.p1.get('hand').length; i++) {
		var card = game.p1.get('hand')[i];
	  var suit = card.suit;
	  var value = card.value;
	  if(value == game.trumpSuit || value == game.trumpNum || suit == 'T') {
	    if(value == game.trumpNum) {
        if(suit == game.trumpSuit) {
          card.power = 16;
        }
        else {
          card.power = 15;
        }
      }
      game.p1.get('T').push(card);   
	  }
	  else if(suit == 1){
	    game.p1.get(1).push(card);
	  }
	  else if(suit == 2){
	    game.p1.get(2).push(card);
	  }
	  else if(suit == 3){
	    game.p1.get(3).push(card);
	  }
	  else{
	    game.p1.get(4).push(card);
	  }
	}
	game.p1.get('T').sort(function(a, b){return a.power - b.power});
	game.p1.get(1).sort(function(a, b){return a.power - b.power});
	game.p1.get(2).sort(function(a, b){return a.power - b.power});
	game.p1.get(3).sort(function(a, b){return a.power - b.power});
	game.p1.get(4).sort(function(a, b){return a.power - b.power});

	for(var i = 0; i < 25; i++) {
		var card = game.p2.get('hand')[i];
	  var suit = card.suit;
	  var value = card.value;
	  if(value == game.trumpSuit || value == game.trumpNum || suit == 'T') {
	    if(value == game.trumpNum) {
        if(suit == game.trumpSuit) {
          card.power = 16;
        }
        else {
          card.power = 15;
        }
      }
      game.p2.get('T').push(card);   
	  }
	  else if(suit == 1){
	    game.p2.get(1).push(card);
	  }
	  else if(suit == 2){
	    game.p2.get(2).push(card);
	  }
	  else if(suit == 3){
	    game.p2.get(3).push(card);
	  }
	  else{
	    game.p2.get(4).push(card);
	  }
	}
	game.p2.get('T').sort(function(a, b){return a.power - b.power});
	game.p2.get(1).sort(function(a, b){return a.power - b.power});
	game.p2.get(2).sort(function(a, b){return a.power - b.power});
	game.p2.get(3).sort(function(a, b){return a.power - b.power});
	game.p2.get(4).sort(function(a, b){return a.power - b.power});

	// for(var i = 0; i < 25; i++) {
	// 	var card = game.p3.get('hand')[0];
	//   var suit = card.suit;
	//   var value = card.value;
	//   if(value == game.trumpSuit || value == game.trumpNum || suit == 'T') {
	//     if(value == game.trumpNum) {
 //        if(suit == game.trumpSuit) {
 //          card.power = 16;
 //        }
 //        else {
 //          card.power = 15;
 //        }
 //      }
 //      p3.get('T').push(card);   
	//   }
	//   else if(suit == 1){
	//     p3.get(1).push(card);
	//   }
	//   else if(suit == 2){
	//     p3.get(2).push(card);
	//   }
	//   else if(suit == 3){
	//     p3.get(3).push(card);
	//   }
	//   else{
	//     p3.get(4).push(card);
	//   }
	// }
	// p3.get('T').sort(function(a, b){return a.power - b.power});
	// p3.get(1).sort(function(a, b){return a.power - b.power});
	// p3.get(2).sort(function(a, b){return a.power - b.power});
	// p3.get(3).sort(function(a, b){return a.power - b.power});
	// p3.get(4).sort(function(a, b){return a.power - b.power});

	// for(var i = 0; i < 25; i++) {
	// 	var card = game.p4.get('hand')[0];
	//   var suit = card.suit;
	//   var value = card.value;
	//   if(value == game.trumpSuit || value == game.trumpNum || suit == 'T') {
	//     if(value == game.trumpNum) {
 //        if(suit == game.trumpSuit) {
 //          card.power = 16;
 //        }
 //        else {
 //          card.power = 15;
 //        }
 //      }
 //      p4.get('T').push(card);   
	//   }
	//   else if(suit == 1){
	//     p4.get(1).push(card);
	//   }
	//   else if(suit == 2){
	//     p4.get(2).push(card);
	//   }
	//   else if(suit == 3){
	//     p4.get(3).push(card);
	//   }
	//   else{
	//     p4.get(4).push(card);
	//   }
	// }
	// p4.get('T').sort(function(a, b){return a.power - b.power});
	// p4.get(1).sort(function(a, b){return a.power - b.power});
	// p4.get(2).sort(function(a, b){return a.power - b.power});
	// p4.get(3).sort(function(a, b){return a.power - b.power});
	// p4.get(4).sort(function(a, b){return a.power - b.power});


	//logic for getting the bottom cards
	// console.log()
	while(game.cardsPlayed <25) {
		var playersPlayed = 0;
		while(playersPlayed < 2) { //fix for actual number of players
			var t = 0;
			io.to(game.id).emit('turn', game.roundStartingPlayer + playersPlayed);
			while(t < 30) {
				await sleep(1000);
				io.to(game.id).emit('time', t);
				t++;
				// console.log(game.roundPlayersPlayed, playersPlayed);
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
	var stringToCard = new Map();
	var cards = [];
	for(var deck = 1; deck < 3; deck++) {
		for(var value = 2; value < 15; value++){
			for(var suit = 1; suit < 5; suit++){
				var newCard = createCard(suit, value, deck);
				cards.push(newCard);
				stringToCard.set(value.toString() + '-' + suit.toString() + '-' + deck.toString(), newCard);
			}
		}
		var newCard = createCard('T', 'bigJoker', deck);
		cards.push(newCard);
		stringToCard.set('bigJoker-T-' + deck.toString(), newCard);
		newCard = createCard('T', 'smallJoker', deck);
		cards.push(newCard);
		stringToCard.set('smallJoker-T-' + deck.toString(), newCard);
	}
	
	cards = shuffle(cards);
	console.log(cards);
	// console.log(cards.length);
	var hand1 = cards.slice(0,25);
	var hand2 = cards.slice(25,50);
	var hand3 = cards.slice(50,75);
	var hand4 = cards.slice(75,100);
	var bottom = cards.slice(100,108);
	return [hand1, hand2, hand3, hand4, bottom, stringToCard];

}

// setInterval(function() {
//   io.sockets.emit('message', 'test!');
// }, 1000);
