// server.js
// learned from http://socket.io/get-started/chat/
var app = require('express')();
var http = require('http').Server(app);
var formBody = require('body/form');
var io = require('socket.io')(http);
var fs = require('fs');
var PORT = process.env.PORT || 80;
var USER_DATA = __dirname + '/userdata.txt';
var GAME_DATA = __dirname + '/gamedata.txt';
var leaderboard = [];

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
    return res.redirect('/client/client.html' + 
      '?firstName=' + encodeURIComponent(body.firstName) +
      '&lastName=' + encodeURIComponent(body.lastName));
  })
});


// Model
var Player = function() {
  this.centerPos = 50;  // 50% from 0 (width/height)
  this.paddleWidth = 25; // 25% of screen height is the paddle width
  this.status = 'waiting';
  // socketId, number, firstName are also included
  return this;
}

// globals
var currPlayerID = 1; // each socket connection increments this ID
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
    hostSocket = null;
    // TODO: notify players
  });

  // Called by the host when game is over (time runs out)
  hostSocket.on('gameOver', function(data) {
    // Notify the players the game is over
    data.players.forEach(function(socketId) {
      player.to(socketId).emit('gameOver', data);
    })

    var isTiedGame = (data.score[0] === data.score[1]);
    var winnerSocketId = (data.score[0] > data.score[1] ? 
      data.players[0] : data.players[1]);
    var winningPlayer = players.filter(function(player) {
        return player.socketId === winnerSocketId;
      }).pop();
    console.log('Game Over - ' + (isTiedGame ? 'tied game' : winningPlayer.firstName + ' wins'));

    // Save game data into a file
    var gameData = {
      score: data.score,
      players: players.filter(function(p) {
        return data.players.indexOf(p.socketId) > -1;
      }),
      finished: new Date().toLocaleString()
    };
    fs.appendFile(GAME_DATA, JSON.stringify(gameData) + '\n', function(err) {
      if (err) {
        console.error('Error writing game data: ' + err);
      } else {
        loadLeaderboard();
      }
    });

    // Wait for 5 seconds before clear the user's status so the game over screen
    // can still leverage the results
    setTimeout(function() {
      // Change the status of the playing players to 'done'
      players.forEach(function(player){
        if (player.status === 'playing') {
          player.status = 'done';
        }
      });
      updatePlayers();
      selectPlayingPlayers();
    }, 11000);
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
    // Update the data for the given player
    players.forEach(function (p) {
      if (p.socketId === playerData.socketId) {
        p.centerPos = playerData.centerPos;
        p.paddleWidth = playerData.paddleWidth;
        p.firstName = playerData.firstName;
        p.lastName = playerData.lastName;
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

var loadLeaderboard = function() {
  // Read all the gamedata to build a list of winners
  fs.readFile(GAME_DATA, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    // Breakup the data into lines, each line has a game record
    var lines = data
      .split('\n')
      .filter(function(line) {
        return line.length > 0;
      });
    // Build a list of winning scores
    var winners = [];
    lines.forEach(function(line, i) {
      var gameData = JSON.parse(line);

      var player1 = (gameData.players[0].firstName + ' ' +
        (gameData.players[0].lastName || '')).trim();
      var player2 = (gameData.players[1].firstName + ' ' +
        (gameData.players[1].lastName || '')).trim();

      var isTied = (gameData.score[0] === gameData.score[1]);
      // When the game is tied, both players are winners
      if (isTied) {
        winners.push({ name: player1, score: gameData.score[0] });
        winners.push({ name: player2, score: gameData.score[1] });
      } else {
        if (gameData.score[0] > gameData.score[1]) {
          winners.push({ name: player1, score: gameData.score[0] });
        } else {
          winners.push({ name: player2, score: gameData.score[1] });
        }
      }
    });

    // Sort the winners by score, take the top 10
    leaderboard = winners.sort(function(a, b) {
      return (a.score === b.score ? 0 : (a.score > b.score ? -1 : +1));
    }).filter(function(_, i){
      return i < 10; // Top 10 winners
    });
    console.log('leaderboard: ');
    leaderboard.forEach(function(person, i) {
      console.log((i + 1).toString() + ') ' + person.name + ' (' +person.score+ ')')
    });
  });
}


var init = function() {
  loadLeaderboard();

  // Start the web server
  http.listen(PORT, function() {
    console.log('listening on *:'+PORT);
  });
}

init();
