var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('./lib/socket.io')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;
    
server = http.createServer(function (req, res) {
  var path = url.parse(req.url).pathname;
  switch (path) {
  case '/':
    callFile('/index.html', res);
    break;
  default:
    callFile(path, res);
  }

}),

callFile = function (file, res) {
  fs.readFile("." + file, function (err, data) {
    if (err) return send404(res);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data, 'utf8');
    res.end();
  });
},

send404 = function (res) {
  res.writeHead(404);
  res.write('404');
  res.end();
};

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
