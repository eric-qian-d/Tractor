var socket = io();

var hand1; //spades
var hand2; //hearts
var hand3; //clubs
var hand4; //diamonds
var trump;

var selected = new Map;

var stringToCard = new Map;
// socket.on('message', function(data) {
//   console.log(data);
// });
function renderHandDealing(data) {
  console.log('rendering hand');
  hand1 = []; //spades
  hand2 = []; //hearts
  hand3 = []; //clubs
  hand4 = []; //diamonds
  trump = [];
  cards = data[0];
  console.log(hand1, hand2, hand3, hand4, trump);
  console.log(data[1], data[2]);
  for(var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var suit = card.suit;
    var value = card.value;
    if(suit == data[1] || value == data[2] || suit == 'T') {
      if(value == data[2]) {
        if(suit == data[1]) {
          card.power = 16;
        }
        else {
          card.power = 15;
        }
      }
      trump.push(card);   
    }
    else if(suit == 1){
      hand1.push(card);
    }
    else if(suit == 2){
      hand2.push(card);
    }
    else if(suit == 3){
      hand3.push(card);
    }
    else{
      hand4.push(card);
    }
    
  }
  trump.sort(function(a, b){return a.power - b.power});
  hand1.sort(function(a, b){return a.power - b.power});
  hand2.sort(function(a, b){return a.power - b.power});
  hand3.sort(function(a, b){return a.power - b.power});
  hand4.sort(function(a, b){return a.power - b.power});
  var spadesDiv = document.getElementById('spadesDiv');
  var heartsDiv = document.getElementById('heartsDiv');
  var clubsDiv = document.getElementById('clubsDiv');
  var diamondsDiv = document.getElementById('diamondsDiv');
  var trumpDiv = document.getElementById('trumpDiv');
  renderSuit(hand1, spadesDiv);
  renderSuit(hand2, heartsDiv);
  renderSuit(hand3, clubsDiv);
  renderSuit(hand4, diamondsDiv);
  renderSuit(trump, trumpDiv);

  console.log(hand1, hand2, hand3, hand4, trump);
};

function renderSuit(cards, div) {
	while (div.firstChild) {
		div.removeChild(div.firstChild);
	}
	for(var i = 0; i < cards.length; i++) {
		var newCard = document.createElement('img');
		newCard.setAttribute('style', 'width:80px; height:80px');
		//images from https://code.google.com/archive/p/vector-playing-cards/downloads
		newCard.setAttribute('src', '/static/images/cards/' + cards[i].value.toString() + '-' + cards[i].suit.toString() + '.png');
		newCard.setAttribute('id', cards[i].value.toString() + '-' + cards[i].suit.toString() + '-' + cards[i].deck.toString());
		newCard.addEventListener('click', function() {
			
			if (selected.get((this.id))) {
				selected.delete(stringToCard.get(this.id));
				this.style.border = '0px';
				console.log('changing to unbordered');
			}
			else {
				selected.set((this.id), true) ;
				this.style.border = '1px';
				this.style.borderColor = 'black';
				this.style.borderStyle = 'solid';
				console.log('changing to bordered');
			}
		});
		stringToCard.set(cards[i].value.toString() + '-' + cards[i].suit.toString() + '-' + cards[i].deck.toString(), cards[i]);
		div.append(newCard); 
	}
}

document.getElementById('createButton').addEventListener('click', function(){
  var IdDiv = document.getElementById('inputBox');
  var gameId = IdDiv.value;
  console.log('clicked create button');
  socket.emit('create game', gameId);
});

document.getElementById('joinButton').addEventListener('click', function(){
  var IdDiv = document.getElementById('inputBox');
  var gameId = IdDiv.value;
  console.log('clicked join button');
    socket.emit('join game', gameId);
});

document.getElementById('playButton').addEventListener('click', function() {
  console.log('clicked play button');
  console.log(selected);
  var toPlay = [];
  for(var card of selected.entries());
    console.log(card);
    toPlay.push(card[0]);
  console.log(toPlay);
  socket.emit('play', toPlay);
});

socket.on('played', function(data) {
	console.log('legal move!');
  selected = new Map;
  renderHandDealing(data);

})

socket.on('game created', function(data){
  console.log('game created success!');
  console.log(data);
});

socket.on('game joined', function(data){
  console.log('game joined success!');
  console.log(data);
});

socket.on('invalid id', function(data){
  console.log('invalid id!');
  console.log(data);
});

socket.on('already used id', function(data){
  console.log('id already in use!');
  console.log(data);
});

socket.on('game already joined', function(data){
  console.log('already in this game!');
  console.log(data);
});

socket.on('game initializing', function(data){
  console.log('game init!');
  hand1 = []; //spades
  hand2 = []; //hearts
  hand3 = []; //clubs
  hand4 = []; //diamonds
  trump = [];
  console.log(data);
});

socket.on('deal card', function(data) {
  // console.log('hand ', data[0]);
  var card = data[0];
  var suit = card.suit;
  var value = card.value;
  if(value == data[1] || suit == 'T') {
    trump.push(card);
    trump.sort();
  }
  else if(suit == 1){
    hand1.push(card);
  }
  else if(suit == 2){
    hand2.push(card);
  }
  else if(suit == 3){
    hand3.push(card);
  }
  else{
    hand4.push(card);
  }
  renderHandDealing(data);
});

socket.on('cards dealt', function(data) {
  console.log('all dealt!');
});

socket.on('time', function(time) {
  console.log('time', time);
});

socket.on('turn', function(turn) {
  console.log('it is player ', turn, ' turn');
});

socket.on('finalize hand', function(data) {
	console.log('finalizing hand!');
  
  renderHandDealing(data);
});

