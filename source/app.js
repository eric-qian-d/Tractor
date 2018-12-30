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
server.listen(process.env.PORT || 3000, function() {
  console.log('Starting server on port 3000');
});

// Add the WebSocket handlers

var liveGames = new Map;
var waitingGames = new Map;
var individualMessages = new Map;
var players = new Map;
io.on('connection', function(socket) {
  socket.on('create game', function(gameId) {
  	console.log('creating game...');
  	if (liveGames.has(gameId) || waitingGames.has(gameId)) {
  		individualMessages.set(socket.id, ['already used id', gameId]);
  		// io.to(socket.id).emit('already used id', gameId);
  	}
  	else{
  		socket.join(gameId);
  		var game = {
  			players : new Map([[socket.id, 1]]),
  			playerOrder : [socket.id]
  		}
  		waitingGames.set(gameId, game);
  		players.set(socket.id, gameId);
  		individualMessages.set(socket.id, ['game created', gameId]);
  		// io.to(socket.id).emit('game created', gameId);
  		
  	}
  });
  socket.on('join game', function(gameId) {
  	console.log(waitingGames, liveGames);
  	if (liveGames.has(gameId)) {
  		individualMessages.set(socket.id, ['invalid id', gameId]);
    	// io.to(socket.id).emit('invalid id', gameId);
    }
    else if (waitingGames.has(gameId)) {
    	var game = waitingGames.get(gameId);
    	if (game.players.has(socket.id)) {
    		individualMessages.set(socket.id, ['game already joined', gameId]);
    		// io.to(socket.id).emit('game already joined', gameId);
    	} 
    	else{
    		individualMessages.set(socket.id, ['game joined', [gameId, game.players.size + 1]])
	    	socket.join(gameId);
	    	players.set(socket.id, gameId);
	    	game.players.set(socket.id, game.players.size + 1);
	    	game.playerOrder.push(socket.id);
	    	if (game.players.size == 4) {
	    		waitingGames.delete(gameId);
	    		var playerOrderMap = new Map;
	    		for(var i = 0; i < game.playerOrder.length; i++) {
	    			playerOrderMap.set(i + 1, game.playerOrder[i]);
	    		}	    		
	    		var newLiveGame = {
	    			state : 'dealing',
	    			currentCardToDeal : 0,
	    			currentPlayer : null,
	    			timeElapsed : 0,
	    			played : false, 

	    			id : gameId,
	    			numPlayers: 4, //to change
	    			numDecks: 2, //to change
	    			handSize : 25, //to change
	    			playerIdToNumber : game.players, //Map of socket.id => number joined
	    			playerNumberToId : playerOrderMap,
	    			order : [null],
	    			stringToCard : new Map(),
	    			players : new Map,
	    			
	    			bottom : null,
	    			trumpNum : null,
	    			trumpSuit : null,
	    			host : null,
	    			lastWinners : null,
	    			cardsPlayed : 0,
	    			roundStartingPlayerNum : 1,
	    			roundPlayersPlayed : 0,
	    			roundNumCards : null,
	    			roundSuit : null,
	    			roundPointsPlayed : 0,
	    			declaringPlayer : null,
	    			numDeclaredCards : 0,
	    			announceDeclare : false,
	    			pickedBottom : false,
	    			bottomPoints : 0
	    		};
	    		// console.log('after first init', newLiveGame);
	    		for(var i = 0; i < newLiveGame.numPlayers; i++) {
	    			newLiveGame.players.set(newLiveGame.playerNumberToId.get(i + 1), newPlayer(newLiveGame.playerNumberToId.get(i + 1), i + 1));
	    		}
	    		for(var i = 0; i < 2; i++) {
	    			for(var j = 0; j < newLiveGame.numPlayers; j++) {
	    				newLiveGame.order.push(j + 1);
	    			}
	    		}

	    		console.log(newLiveGame);

	    		liveGames.set(gameId,newLiveGame);

	    		newGame(gameId);
	    		}
	    	}
    	}
    else {
    	// io.to(socket.id).emit('invalid id', gameId);
    	individualMessages.set(socket.id, ['invalid id', gameId]);
    }
  });
  socket.on('declare', function(data) {
  	//insert logic for checking that declare is valid
  	var gameId = players.get(socket.id);
  	game = liveGames.get(gameId);
  	if(game.state == 'dealing' || game.state == 'declaring') {
  		game.declaringPlayer = socket.id;
	  	game.trumpSuit = data[0];
	  	game.trumpNum = game.players.get(socket.id).level;
	  	game.numDeclaredCards = data[1];
	  	game.announceDeclare = true;
  	}
  	
  });
  socket.on('return bottom', function(cards) { //cards = array of returned cards (str)
  	console.log('cards', cards);
  	var gameId = players.get(socket.id);
  	game = liveGames.get(gameId);

  	if (cards.length == game.bottom.length) {
  		var player = game.players.get(socket.id);
  		if(player.id == game.declaringPlayer) {
  			//check if these cards are indeed legal
  			var cardsArr = [];
	  		for(var i = 0; i < cards.length; i++) {
	  			card = game.stringToCard.get(cards[i]);
	  			cardsArr.push(card);
	  		}
  			var updatedHand = [];
  			var updatedBottom = [];
  			var hand = player.hand;
  			var bottom = game.bottom;
  			var candidates = hand.concat(bottom);
  			io.to(socket.id).emit('test', 'beginning hand consolidation');
  			for(var i = 0; i < candidates.length; i++) {
  				var toAdd = true;
  				for(var j = 0; j < cardsArr.length; j ++) {
  					// console.log(hand[i], cardsArr[j], hand[i] == cardsArr[j], hand[i] === cardsArr[j]);
  					if (candidates[i] == cardsArr[j]) {
  						toAdd = false;
  						break;
  					}
  				}
  				if(toAdd) {
  					// console.log(toAdd, hand[i]);
  					updatedHand.push(candidates[i]);
  				}
  				else {
  					game.bottomPoints += candidates[i].points;
  					updatedBottom.push(candidates[i]);
  				}
  			// console.log(player.num, player.hand);
  			}
  			player.hand = updatedHand;
  			game.bottom = updatedBottom;
  			io.to(socket.id).emit('test', [player.hand, player.hand.length])
  			// console.log(updatedHand.length);
  			updateHand(player, game);
  			game.pickedBottom = true;
  		}
  	}


  })

  socket.on('play', function(cards) {
  	console.log('in play fucntion');
  	var gameId = players.get(socket.id);
  	game = liveGames.get(gameId);
  	if (game){
  		var player = game.players.get(socket.id);
  		// console.log(game.playerIdToNumber.get(socket.id), game.roundStartingPlayerNum, game.roundPlayersPlayed);
	  	if(socket.id == game.currentPlayer){
	  		// console.log('correct player');
	  		var first = false;
	  		if(game.roundPlayersPlayed == 0) {
	  			game.roundNumCards = 0;//to fix for actually adjusting!
	  			game.cardsPlayed += game.roundNumCards;
	  			first = true;
	  		}
	  		
	  		var legal = true;
	  		//logic for legal play

	  		// console.log(game.roundSuit, game.roundNumCards);
	  		var cardsArr = []
	  		var inHand = true;
	  		var consistentSuit = true;
	  		for(var i = 0; i < cards.length; i++) {
	  			card = game.stringToCard.get(cards[i]);
	  			// console.log('strind and card', cards[i], card);
	  			// for(var j = 0; j < player.hand.length; j++) {
	  			// 	if(!(card in player.get('hand'))) {
		  		// 		inHand = false;
		  		// 	}
	  			// }
	  			
	  			if(card.playingSuit != game.roundSuit) {
	  				consistentSuit = false;
	  			}
	  			cardsArr.push(card)
	  		}
	  		// console.log(cardsArr);
	  		cardsArr.sort(function(a, b){return a.power - b.power});
	  		if(!inHand) { //check that player has these cards
	  			// io.to(player.id).emit('cards arent in hand', game.id);
	  			legal = false;
	  		}
	  		if(first && cardsArr.length > 1) {
	  			if(cardsArr.length == 2) {
	  				if(cardsArr[0].playingSuit != cardsArr[1].playingSuit) { //check that suit is legal
		  				// io.to(player.id).emit('invalid start', game.id);
		  				legal = false;
		  			}
	  				else if(cardsArr[0].power != cardsArr[1].power) { //checks for playing a pair
	  					// io.to(player.id).emit('invalid start', game.id);
	  					legal = false;
	  				}
	  			}
	  		}
	  		if(!first) {
	  			if(game.roundNumCards != cardsArr.length) { //check that same number of cards is being played
  					// io.to(player.id).emit('invalid hand', game.id);
  				}
	  			if(game.roundNumCards == 1) {
	  				if(game.roundSuit != cardsArr[0].playingSuit && player.split.get(game.roundSuit).length != 0) { //check for same suit
	  					// io.to(player.id).emit('invalid hand', game.id);
	  					legal = false;
	  				}
	  			}
	  			else{
	  				var hasPair = false;
						var hasTriple = false;
						var suitCards = player.split.get(game.roundSuit);
						var powerMap = new Map();
						// console.log('suitcards', suitCards);
						for(var i = 0; i < suitCards.length; i++) {
							// console.log(suitCards[i], powerMap, powerMap.has(suitCards[i]));
							if(suitCards[i].power == 15) {
								var trumpNumKey = suitCards[i].power.toString + '-' + suitCards[i].suit.toString;
								if(!(powerMap.has(trumpNumKey))) {
									powerMap.set(suitCards[i].power, 1)
								}
								else {
									if(powerMap.get(trumpNumKey) == 1) {
										hasPair = true;
										powerMap.set(trumpNumKey, 2);
									}
									else {
										hasTriple = true;
										powerMap.set(trumpNumKey, 3);
									}
								}
							}
							else {
								if(!(powerMap.has(suitCards[i].power))) {
									powerMap.set(suitCards[i].power, 1)
								}
								else {
									if(powerMap.get(suitCards[i].power) == 1) {
										hasPair = true;
										powerMap.set(suitCards[i].power, 2);
									}
									else {
										hasTriple = true;
										powerMap.set(suitCards[i].power, 3);
									}
								}
							}
							
						}


		  			if(game.roundNumCards == 2) {
		  				// console.log('checking pairs', cardsArr[0].power, cardsArr[1].power, hasPair, (cardsArr[0].power != cardsArr[1].power));
		  				if(player.split.get(game.roundSuit).length >= 2) { 
		  					if(game.roundSuit != cardsArr[0].playingSuit || game.roundSuit != cardsArr[1].playingSuit) {//check that you're exhausing your suit
		  						// io.to(player.id).emit('invalid hand', game.id);
		  						legal = false;
		  					}
		  					else{//check that you are playing pairs

		  						if(hasPair && (cardsArr[0].power != cardsArr[1].power)) {
		  							// io.to(player.id).emit('invalid hand', game.id);
		  							legal = false;
		  						}		
		  					}
		  					
		  				}
		  				else if(!(game.roundSuit == cardsArr[0].playingSuit || game.roundSuit == cardsArr[1].playingSuit) && player.split.get(game.roundSuit).length == 1) { //check that you're exhasuting your suit
		  				// io.to(player.id).emit('invalid hand', game.id);
		  					legal = false;
		  				}
		  			}
	  			}
	  		}
	  		if(legal) {
	  			// console.log('LEGAL');
	  			// game.roundPlayersPlayed ++;
	  			if(first) {
	  				if(cardsArr[0].playings == 'T') {
	  					game.roundSuit = 'T';
	  				}
	  				else{
	  					game.roundSuit = cardsArr[0].playingSuit;
	  				}
	  				
	  				game.roundNumCards = cardsArr.length;
	  				game.cardsPlayed += cardsArr.length;
	  			}
	  			updatedHand = []
	  			hand = player.hand;
	  			for(var i = 0; i < hand.length; i++) {
	  				toAdd = true;
	  				for(var j = 0; j < cardsArr.length; j ++) {
	  					// console.log(hand[i], cardsArr[j], hand[i] == cardsArr[j], hand[i] === cardsArr[j]);
	  					if (hand[i] == cardsArr[j]) {
	  						toAdd = false;
	  					}
	  				}
	  				if(toAdd) {
	  					// console.log(toAdd, hand[i]);
	  					updatedHand.push(hand[i]);
	  				}
	  			// console.log(player.num, player.hand);
	  			}
	  			player.hand = updatedHand;	
	  			// console.log(updatedHand.length);
	  			updateHand(player, game);
	  			// console.log(player.hand.length);
	  			game.played = true;
	  			player.lastPlayed = cards;
					// console.log(player.get('hand').length);

					
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
	// console.log(game);
	res = initHands(game.numPlayers, game.numDecks); //[hand1, hand2, hand3, hand4, bottom, stringToCard]
	// console.log(res);
	for(i = 0; i < game.numPlayers; i ++) {
		game.players.get(game.playerNumberToId.get(i + 1)).hand = res[i];
	}
	// console.log(res[4], res[5], res.length);
	game.bottom = res[res.length - 2];
	game.stringToCard = res[res.length - 1];
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
	obj.playingSuit = suit;
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

function initHands(numPlayers, numDecks) {
	numDecks = 3; //to change
	var stringToCard = new Map();
	var cards = [];
	for(var deck = 1; deck < numDecks; deck++) {
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

	//make variable
	var hand1 = cards.slice(0,25);
	var hand2 = cards.slice(25,50);
	var hand3 = cards.slice(50,75);
	var hand4 = cards.slice(75,100);
	var bottom = cards.slice(100,108);
	return [hand1, hand2, hand3, hand4, bottom, stringToCard];

}

function newPlayer(id, num) {
	// console.log('making new player');
	var obj = {};
	obj.id = id;
	obj.num = num;
	obj.level = 2;
	obj.lastPlayed = null;
	obj.hand = [];
	obj.split = new Map;
	obj.split.set(1, []);
	obj.split.set(2, []);
	obj.split.set(3, []);
	obj.split.set(4, []);
	obj.split.set('T', []);
	obj.points = 0;
	return obj;
}

function updateHand(player, game) {
	player.split.set('T', []);
	player.split.set(1, []);
	player.split.set(2, []);
	player.split.set(3, []);
	player.split.set(4, []);

	for(var i = 0; i < player.hand.length; i++) {
		io.to(player.id).emit('test', [i, player.hand[i]]);
		var card = player.hand[i];
	  var suit = card.suit;
	  var value = card.value;
	  // console.log(value, game.trumpSuit);
	  if(suit == game.trumpSuit || value == game.trumpNum || suit == 'T') {
	    if(value == game.trumpNum) {
        if(suit == game.trumpSuit) {
          card.power = 16;
        }
        else {
          card.power = 15;
        }
      }

      card.playingSuit = 'T'; //TENTATIVE
      player.split.get('T').push(card);   
	  }
	  else if(suit == 1){
	    player.split.get(1).push(card);
	  }
	  else if(suit == 2){
	    player.split.get(2).push(card);
	  }
	  else if(suit == 3){
	    player.split.get(3).push(card);
	  }
	  else{
	    player.split.get(4).push(card);
	  }
	}
}

setInterval(function() {
	console.log('the individual messages', individualMessages);
	for(var [playerId, data] of individualMessages) {
		io.to(playerId).emit(data[0], data[1]);
	}
	individualMessages = new Map();

	for(var [gameId, game] of waitingGames) {

	}

	for(var [gameId, game] of liveGames) {
		console.log(game.state, game.roundNumCards);
		if(game.state == 'dealing') {
			// game.state = 'declaring'; //to remove when not developing and testing
			if(game.announceDeclare) {
				io.to(game.id).emit('trump declared dealing', [game.trumpSuit, game.playerIdToNumber.get(game.declaringPlayer), game.numDeclaredCards]);
				game.announceDeclare = false;
			}


			for(var [playerId, player] of game.players) {
				// console.log(player.hand[0], game.currentCardToDeal);
				console.log('dealing card');
				io.to(playerId).emit('deal card', [player.hand[game.currentCardToDeal], game.players.get(playerId).level, game.numDeclaredCards]);
			}
			game.currentCardToDeal++;
			if(game.currentCardToDeal == 25) {
				game.state = 'declaring';
				game.timeElapsed = 0;
			}
		}
		else if(game.state == 'declaring') {
			//logic
			game.timeElapsed++;
			// game.timeElapsed = 10; //change when not testing
			if(game.timeElapsed == 10 || game.numDeclaredCards == game.numDecks) {
				if(!game.trumpSuit) {
					game.trumpSuit = 2;
					game.trumpNum = 2;
					game.currentPlayer = game.playerNumberToId.get(1);
					game.roundStartingPlayerNum = 1;
				}
				for(var [playerId, player] of game.players) {
						console.log('finalizing hand');
						io.to(playerId).emit('finalize hand', [player.hand, game.trumpSuit, game.trumpNum, game.numPlayers]);
						updateHand(player, game);
				}
				game.state = 'bottom'; 
				game.timeElapsed = 0;
				game.currentPlayer = game.declaringPlayer;
				game.roundStartingPlayerNum = game.playerIdToNumber.get(game.declaringPlayer);
				//logic for setting declarer to round starting player (use player number!)
			}
		}
		else if(game.state == 'bottom') {
			game.timeElapsed++;
			if(game.timeElapsed == 1) {
				var allCards = game.bottom.concat(game.players.get(game.declaringPlayer).hand);
				io.to(game.declaringPlayer).emit('bottom', [allCards, game.trumpSuit, game.trumpNum]);
				io.to(game.id).emit('choosing bottom', game.id);
			}
			if(game.pickedBottom) {
				game.state = 'playing';
				io.to(game.declaringPlayer).emit('finalize hand', [player.hand, game.trumpSuit, game.trumpNum, game.numPlayers]);
				io.to(game.id).emit('play beginning');
				game.timeElapsed = 0;
			}
			


		}

		else if(game.state == 'playing') {
			if(game.played) {
				console.log('in game.played');
				io.to(game.currentPlayer).emit('played', game.players.get(game.currentPlayer).lastPlayed);
				game.roundPlayersPlayed++;
				game.currentPlayer = game.playerNumberToId.get(game.order[game.roundPlayersPlayed + game.roundStartingPlayerNum]);
				game.timeElapsed = 0;
				game.played = false;
				console.log('emitted played');
			}
			else if(game.roundPlayersPlayed == game.numPlayers) {
				//logic for evaluating who wins
				console.log('in evaluating who wins');

				var big = null;
				var points = 0;
				if(game.roundNumCards == 1) {
					for(i = 0; i < game.numPlayers; i++) {
						var playerId = game.playerNumberToId.get(game.order[game.roundStartingPlayerNum + i]);
						var player = game.players.get(playerId);
						card = game.stringToCard.get(player.lastPlayed[0]);
						if(big == null) {
							big = [player, card];
						}
						else {
							if(((card.power > big[1].power) && (card.playingSuit == 'T' || card.playingSuit == big[1].playingSuit)) || (big[1].playingSuit != 'T' && card.playingSuit == 'T')) {
								big = [player, card];
							}
						}
						points += card.points;
					}
				}
				else if (game.roundNumCards == 2) {
					console.log('a pair was played!');
					for(i = 0; i < game.numPlayers; i++) {

						var playerId = game.playerNumberToId.get(game.order[game.roundStartingPlayerNum + i]);
						var player = game.players.get(playerId);
						card1 = game.stringToCard.get(player.lastPlayed[0]);
						card2 = game.stringToCard.get(player.lastPlayed[1]);
						if(big == null) {
							big = [player, card1];
						}
						else {
							var pair = false;
							if(card1.power == card2.power && card1.playingSuit == card2.playingSuit) {

								pair = true;
							}

							if(pair && (((card1.power > big[1].power) && (card1.playingSuit == 'T' || card1.playingSuit == big[1].playingSuit)) || (big[1].playingSuit != 'T' && card1.playingSuit == 'T'))) {
								big = [player, card1];
							}
						}
						console.log(player.num, card1, card2, card1.power == card2.power, card1.playingSuit == card2.playingSuit, big[1].power, big[1].playingSuit)
						points += card1.points;
						points += card2.points;
					}
				}
				big[0].points += points;
				game.roundStartingPlayerNum = big[0].num;
				game.roundPlayersPlayed = 0;
				game.currentPlayer = game.playerNumberToId.get(game.roundStartingPlayerNum);
				var pointsArr = [];
				for(var [playerId, player] of game.players) {
					pointsArr[player.num] = player.points.toString();
				}
				console.log(pointsArr);
				io.to(game.id).emit('round summary', pointsArr);
			}
			else {
				console.log('in the timing piece');

				if(game.timeElapsed == 0) {
					// console.log('emitting turn');
					io.to(game.id).emit('turn', game.order[game.roundStartingPlayerNum + game.roundPlayersPlayed]);
					// console.log('turn emitted');
				}
				else if(game.timeElapsed > 30) {
					console.log('over time!');
					//logic for random play
				}
				else {
					console.log('emitting time');
					io.to(game.id).emit('time', game.timeElapsed);
					console.log('time emitted');
				}
				game.timeElapsed++;
			}
		}
		console.log('game ', game.id, ' finished broadcasting');
	}
	console.log('done broadcasting this second');
  // io.sockets.emit('message', 'test!');
}, 1000);

// setInterval(function() {
// 	console.log('test');

// }, 1000);
