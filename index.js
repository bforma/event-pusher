var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var EventPusher = require('./lib/event_pusher');
var eventPusher = new EventPusher(io, "http://localhost:3000");

io.on('connection', function(socket){
  eventPusher.connect(socket);
});

http.listen(8080, function(){
  console.log('Event pusher listening on *:8080');
});
