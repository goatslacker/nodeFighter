/*global require process*/
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('./lib/socket.io'),
    sys = require(process.binding('natives').util ? 'util' : 'sys'),
    server = null,
    clients = {},
    client_ct = 0,
    options = {};

// set the game options
(function () {
  fs.readFile("settings.json", 'UTF-8', function (err, data) {
    if (err) {
      throw "Server settings not found!";
    } else {
      options = JSON.parse(data);
    }
  });
}());

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

server.listen(5287);

// socket.io, I choose you
io = io.listen(server);
  
io.on('connection', function (client) {

  // TODO set proper limit in external JSON file
  if (client_ct > options.server.max_connections) {
    client.send({ method: "handshake", p: "server-full", message: "We're sorry but the server is full :(" });
  } else {

    // first we send the client the server settings and verify details
    client.send({ method: "handshake", p: "settings", settings: options, clients: clients });

    client.on('message', function (message) {
      message.clientId = client.sessionId;

      switch (message.method) {
      // initial connection, client sent us a guid, we send them back their client id
      case "connect":
        message.method = "handshake";
        message.p = "connect";

        // add this new client
        clients[client.sessionId] = true;
        client_ct++;

        // send message back to client with the clientId
        client.send(message);

        // let everyone know there's a new player in town
        client.broadcast({ method: "player", clientId: client.sessionId });
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
