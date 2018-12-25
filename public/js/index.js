var socket = io();
// socket.on('message', function(data) {
//   console.log(data);
// });

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

socket.on('game starting', function(data){
  console.log('game starting!');
  console.log(data);
});

socket.on('hand', function(hand) {
  console.log('hand ', hand);
});