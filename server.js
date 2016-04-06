// server.js
// learned from http://socket.io/get-started/chat/
var app = require('express')();
var http = require('http').Server(app);
var formBody = require('body/form');
var io = require('socket.io')(http);
var fs = require('fs');
var PORT = process.env.PONG_PORT || 8080;
var USER_DATA = __dirname + '/userdata.txt';

// ROUTES
// - root will be for client files
app.get('/', function(req, res) {
  res.redirect('/client/login.html');
});
app.get('/client/:file', function(req, res) {
  res.sendFile(__dirname + '/client/' + req.params.file);
});
// - host path will be for server files
app.get('/host', function(req, res) { 
  res.redirect('/host/host.html');
});
app.get('/host/:file', function(req, res) {
  res.sendFile(__dirname + '/host/' + req.params.file);
});

app.get('/assets/*', function(req, res) {
  res.sendFile(__dirname + req.url);
});
app.get('/shared/*', function(req, res) {
  res.sendFile(__dirname + req.url);
});

app.post('/client/login.html', function(req, res) {
  formBody(req, res, function (err, body) {
    if (err) {
      res.statusCode = 500
      return res.end('ERROR');
    }

    // body will contain all values from the form: 
    //    firstName, lastName, email, and optIn (if selected)
    // optIn will only be set (to 'on') when checkbox is selected
    // To ensure there is an 'off' value, it is assigned unless there is a value
    body.optIn = body.optIn || 'off';
    // Append on a datetime stamp of when the user logged in
    var created = new Date();
    body.created = created.valueOf();
    body.createdStr = created.toLocaleString();
    
    // Story user data
    fs.appendFile(USER_DATA, JSON.stringify(body) + '\n', function(err) {
      console.error('Error writing user data: ' + err);
    });

    // Send the user to the game
    return res.redirect('/client/client.html?name=' + 
      encodeURIComponent(body.firstName));
  })
});


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

  hostSocket.on('gameOver', function(data) {
    var isTiedGame = (data.score[0] === data.score[1]);
    var winner = (data.score[0] > data.score[1] ? 
      data.players[0] : data.players[1]);
    console.log('Game Over - ' + (isTiedGame ? 'tied game' : winner + ' wins'));
    // notify the players
    player.emit('gameOver', data);
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
          p.firstName = playerData.firstName;
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
    });
  } else {
    // notify the player there aren't any spots left, or put them into a queue
  }
});


// Start the web server
http.listen(PORT, function() {
  console.log('listening on *:'+PORT);
});

