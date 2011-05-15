/*global require process*/
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('./lib/socket.io'),
    sys = require(process.binding('natives').util ? 'util' : 'sys'),
    server = null,
    clients = {},
    client_ct = 0;

function send404(res) {
  res.writeHead(404);
  res.write('404');
  res.end();
}

function callFile(file, res) {
  fs.readFile("." + file, function (err, data) {
    if (err) {
      send404(res);
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data, 'utf8');
      res.end();
    }
  });
}

server = http.createServer(function (req, res) {
  var path = url.parse(req.url).pathname,
      file = (path === "/") ? "/index.html" : path;

  callFile(file, res);
});

server.listen(808);

// socket.io, I choose you
io = io.listen(server);
  
io.on('connection', function (client) {

  // send all current clients to app
  client.send({ method: "connect", clients: clients });

  // TODO set proper limit in external JSON file
  if (client_ct > 20) {
    client.send({ method: "server-full", message: "We're sorry but the server is full :(" });
  } else {

    // add this new client
    clients[client.sessionId] = true;
    client_ct++;

    // let everyone know there's a new player in town
    client.broadcast({ method: "player", clientId: client.sessionId });

    client.on('message', function (message) {
      message.clientId = client.sessionId;

      switch (message.method) {
      // initial connection, client sent us a guid, we send them back their client id
      case "connect":
        // send message back to client with the clientId
        client.send(message);
        break;

      case "position":
      case "kill":
      case "respawn":
        client.broadcast(message);
        break;

      case "quit":
        client.broadcast(message);
        delete clients[message.guid];
      }
    });


    client.on('disconnect', function () {
      delete clients[client.sessionId];

      // player disconnected D:
      client.broadcast({ method: "quit", clientId: client.sessionId });
      client_ct--;
    });

  }

});

console.log('Server started on: localhost:808');
