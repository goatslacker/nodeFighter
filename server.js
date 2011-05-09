/*global require process*/
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('./lib/socket.io'),
    sys = require(process.binding('natives').util ? 'util' : 'sys'),
    server = null;
    
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
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});

console.log('Server started on: localhost:808');
