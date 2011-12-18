/*global require __dirname process */

const http = require('http');
const url = require('url');
const fs = require('fs');

var io = require('socket.io'),
    server = null,
    clients = {},
    client_ct = 0,
    options = {};

// set the game options
(function () {
  fs.readFile(__dirname + "/settings.json", 'UTF-8', function (err, data) {
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
  fs.readFile(__dirname + "/" + file, function (err, data) {
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

  console.info(req.method, file);

  callFile(file, res);
});

server.listen(10194);

// socket.io, I choose you
io = io.listen(server);

io.sockets.on('connection', function (client) {

  if (client_ct > options.server.max_connections) {
    client.emit('error:server-full', "We're sorry but the server is full :(");
  } else {

    // first we send the client the server settings and verify details
    client.emit('settings', options, clients);

    client.on('newplayer', function (guid) {
      client.emit('connected', client.id);

      // add this new client
      clients[client.id] = true;
      client_ct += 1;

      // let everyone know there's a new player in town
      client.broadcast.emit('newplayer', client.id);
    });

    client.on('position', function (obj) {
      client.broadcast.emit('position', obj);
    });

    client.on('kill', function (guid) {
      client.broadcast.emit('kill', guid);
    });

    client.on('respawn', function (guid) {
      client.broadcast.emit('respawn', guid);
    });

    client.on('quit', function (guid) {
      client.broadcast.emit('quit', guid);
      delete clients[message.guid];
    });

    client.on('disconnect', function () {
      delete clients[client.id];

      // player disconnected D:
      client.broadcast.emit('quit', client.id);
      client_ct -= 1;
    });

  }

});
