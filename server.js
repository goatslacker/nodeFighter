/*global require process*/
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('./lib/socket.io'),
    sys = require(process.binding('natives').util ? 'util' : 'sys'),
    server = null,
    clients = {};
    
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
  client.send({ connected: true, clients: clients });

  // add this new client
  clients[client.sessionId] = true;

  // let everyone know there's a new player in town
  client.broadcast({ newPlayer: true, client: client.sessionId });

  client.on('message', function (message) {
    message.clientId = client.sessionId;

    // initial connection, client sent us a guid, we send them back their client id
    if (message.guid) {
      message.connected = true;

      // send message back to client
      client.send(message);
    }
  });

  client.on('disconnect', function () {
    delete clients[client.sessionId];

    // player disconnected D:
    client.broadcast({ delPlayer: true, client: client.sessionId });
  });
});

console.log('Server started on: localhost:808');
