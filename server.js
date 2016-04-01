// server.js
// learned from http://socket.io/get-started/chat/
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var PORT = process.env.PONG_PORT || 8080;

// ROUTES
// - root will be for client files
app.get('/', function(req, res) {
  res.redirect('/client/client.html');
});
app.get('/client/:file', function(req, res) {
  res.sendFile(__dirname + '/client/' + req.params.file);
});
// - server path will be for server files
app.get('/server', function(req, res) { 
  res.redirect('/server/server.html');
});
app.get('/server/:file', function(req, res) {
  res.sendFile(__dirname + '/server/' + req.params.file);
});

app.get('/assets/*', function(req, res) {
  res.sendFile(__dirname + req.url);
});
app.get('/shared/*', function(req, res) {
  res.sendFile(__dirname + req.url);
});
// app.get('/assets/*', function(req, res) { res.sendFile(__dirname + req.url); });



var Player = function() {
  this.centerPos = 50;  // 50% from 0 (width/height)
  this.paddleWidth = 25; // 25% of screen height is the paddle width
  return this;
}

var players = [];
var hostSocket = null;

// Pong: https://www.youtube.com/watch?v=BDlg6ghCZfQ

var hoster = io.of('/host');
hoster.on('connect', function(socket) {
  console.log('connected host: id = ' + socket.id);
  if (hostSocket != null && hostSocket.id !== socket.id) {
    console.error('ERROR: host socket is being used');
    return;
  }
  
  hostSocket = socket;
  updatePlayers();
  
  hostSocket.on('disconnect', function() {
    console.log('host disconnected');
    players = [];
    hostSocket = null;
    // TODO: notify players
  });
});

var updatePlayers = function() {
  if (hostSocket) {
    hostSocket.emit('players', players);
  }
}

var player = io.of('/player');
player.on('connect', function(playerSocket) {
  console.log('connected player: id = ' + playerSocket.id);
  if (players.length < 2) {
    // add the player
    var player = new Player();
    player.socketId = playerSocket.id;
    player.number = (players.length + 1);
    player.firstName = 'Player ' + player.number;
    player.lastName = '';
    player.email = 'pong@rangle.io';
    player.optIn = true;
    players.push(player);
    updatePlayers();
    
    // send the player's details to the player
    playerSocket.emit('player', player);
    
    playerSocket.on('player', function(playerData) {
      // Update the data for the given player
      players.forEach(function (p) {
        if (p.socketId === playerData.socketId) {
          p.centerPos = playerData.centerPos;
          p.paddleWidth = playerData.paddleWidth;
        }
      });
      // notify the host of player data change
      updatePlayers();
    });
    
    // remove the player when they disconnect
    playerSocket.on('disconnect', function() {
      console.log('player disconnected');
      players = players.filter(function(p) {
        return p.socketId !== playerSocket.id;
      })
      players.forEach(function(p, idx) {
        // Reassign player number
        p.number = idx + 1;
      });
      updatePlayers();
      // TOOD: notify the other player their number may have changed
    })
  } else {
    // notify the player there aren't any spots left, or put them into a queue
  }
});


// Start the web server
http.listen(PORT, function() {
  console.log('listening on *:'+PORT);
});

