var socket = io();

socket.on('begin game', function(data) {
	console.log(data);
})
