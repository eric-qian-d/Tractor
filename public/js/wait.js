var socket = io();
socket.on('message', function(data) {
  console.log(data);
});

var num_players = 0;

socket.on('num players', function(data) {
	num_players = data;
	updateNumPlayers();
});

// socket.on('new game', function() {
// 	window.location.href = '/game';
// })

function updateNumPlayers(){
	figure = document.getElementById('numJoinedDiv');
	figure.innerHTML = num_players;
}

updateNumPlayers()