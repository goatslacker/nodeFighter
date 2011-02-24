var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('../')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;
    
server = http.createServer(function(req, res){
}),

server.listen(8080);

// socket.io, I choose you
// simplest chat application evar
var io = io.listen(server);
  
io.on('connection', function (client) {
  client.send({ connected: true, clientId: client.sessionId });

  client.broadcast({ connected: true, clientId: client.sessionId });

  client.on('message', function (message) {
    message.clientId = client.sessionId;
    console.log(message);
    client.send(message);
    client.broadcast(message);
  });

  client.on('disconnect', function () {
    // log on server ??
    //client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});
