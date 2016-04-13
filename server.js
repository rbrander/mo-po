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
      if (err) {
        console.error('Error writing user data: ' + err);
      }
    });

    // Send the user to the game
    return res.redirect('/client/client.html?name=' + 
      encodeURIComponent(body.firstName));
  })
});


var Player = function() {
  this.centerPos = 50;  // 50% from 0 (width/height)
  this.paddleWidth = 25; // 25% of screen height is the paddle width
  this.status = 'waiting';
  // socketId, number, firstName are also included
  return this;
}

var currPlayerID = 1; // each socket connection incrments this id
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
  selectPlayingPlayers();
  
  hostSocket.on('disconnect', function() {
    console.log('host disconnected');
    // players = [];
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

    // TODO: change the status of the playing players to done
    players.forEach(function(player){
      if (player.status === 'playing') {
        player.status = 'done';
      }
    });
    updatePlayers();
  });
});

var player = io.of('/player');

player.on('connect', function(playerSocket) {
  console.log(' +++ /player onConnect; id = ' + playerSocket.id);

  // add the player
  var newPlayer = new Player();
  newPlayer.socketId = playerSocket.id;
  newPlayer.number = currPlayerID++;
  newPlayer.firstName = 'Player ' + newPlayer.number;
  players.push(newPlayer);

  // Update the client with their own details
  playerSocket.emit('player', newPlayer);

  // Update everyone with the new list
  updatePlayers();

  // Listen for changes from the client
  playerSocket.on('player', function(playerData) {
    console.log(' *** /player onPlayer; id = ' + playerData.socketId);
    console.log('     ' + JSON.stringify(playerData));
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

  // remove the player from the queue
  playerSocket.on('disconnect', function(reason) {
    console.log(' --- /player onDisconnect; id = ' + playerSocket.id);
    // Remove the player from the queue
    players = players.filter(function(player){
      return player.socketId !== playerSocket.id
    });
    // Update everyone with the new list
    updatePlayers();
  });

  selectPlayingPlayers();
});

var selectPlayingPlayers = function() {
  // Determine how many players are playing
  var numPlaying = players.filter(function(player) {
      return player.status === 'playing';
    }).length;

  // Check if there are enough players for a game, if so, start one
  if (numPlaying < 2 && players.length >= 2 && hostSocket !== null) {
    // Since there may be one player in 'playing' state due to a player
    // dropping out, we should append additional players as needed
    var waitingPlayers = players.filter(function(player) {
      return player.status === 'waiting';
    });
    // Iterate until we have 2 players in 'playing' status
    var numPlayersNeeded = 2 - numPlaying;
    for (var i = 0; i < numPlayersNeeded && i < waitingPlayers.length; i++) {
      waitingPlayers[i].status = 'playing';
    };
    updatePlayers();
  }
};

var updatePlayers = function() {
  if (hostSocket) {
    hostSocket.emit('players', players);
  }
  if (player) {
    player.emit('players', players);
  }
  console.log('  # players = ' + players.length);
};



// Start the web server
http.listen(PORT, function() {
  console.log('listening on *:'+PORT);
});

