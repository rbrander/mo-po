// client.js

var touchX = null;
var touchY = null;

var playerPosition = 1;

/*

on page load, socket connection made,
- show greeting screen
    - welcome msg
    - host status
    - player queue status
    - current player stats (name, status, which side of the screen are they on)

on game start, by status changing to 'playing',
- start the game
- in the future, add a countdown to game start

on game end, player status changed to 'done', gameOver event fired,
- show gameover screen
    - provide button to play again (reloads current page, forces new socket)

*/


var Game = {
    player: undefined,
    players: [],
};
Game.update = function() {
    // TODO: move logic from onTouchMove to here, 
    // because onTouchMove should only be setting state/data

    // TODO: handle state (ie. lobby, gamestart, gameend)
};
Game.draw = function() {
    // TODO: add code that will display the status of the host (up/down)
    //       or if waiting for another player
    
    canvas.clearBackground();
    
    var ctx = canvas._ctx;
    
    // The state will either be waiting or playing;
    // game over state is handled separately (outside of canvas)
    var state = (Game.player && Game.player.status && Game.player.status.length > 0) ? Game.player.status : 'waiting';

    if (state === 'waiting') {
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'top';
        ctx.fillText('Waiting to start...', 20, 20);

        ctx.font = '20px Arial';
        ctx.fillText('You are player ' + playerPosition + ' of ' + Game.players.length, 20, 60);

        // TODO: add welcome msg

        // TODO: add animation

        // TODO: add host status

        // TODO: add estimated game start
    } 
    else if (state === 'playing') {
        // Display name at the top
        ctx.font = '70px Arial';
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'top';        
        ctx.fillText(Game.player.firstName, 20, 20);

        // draw the bar
        var centerY = ~~((Game.player.centerPos / 100) * canvas._canvas.height);
        var height = ~~((Game.player.paddleWidth / 100) * canvas._canvas.height);
        var y = ~~(centerY - (height / 2));
        var width = ~~(height * 0.2); //~~(canvas._canvas.width * 0.2);
        var x = ~~((canvas._canvas.width / 2) - (width / 2));
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, width, height);
    }
};
Game.setTouchPos = function(e) {
    var touch = e.targetTouches[0];
    Game.touchX = ~~touch.pageX;
    Game.touchY = ~~touch.pageY;
}
Game.onTouchStart = function(e) {
    e.preventDefault();
    
    Game.touching = true;
    Game.setTouchPos(e);
    Game.setYOffset();            
};
Game.setYOffset = function() {
    var centerPx = (Game.player.centerPos / 100) * canvas._canvas.height;
    Game.yOffset = Game.touchY - centerPx;
};
Game.onTouchMove = function(e) {
    Game.setTouchPos(e);
    
    // Calculate the next position
    var dy = Game.touchY - Game.yOffset;
    var yPct = ~~(dy * 100 / canvas._canvas.height);

    // Bounds checking
    var centerPos = Game.player.centerPos;
    var halfPaddleWidth = ~~(Game.player.paddleWidth / 2);
    if (yPct - halfPaddleWidth <= 0) {
        Game.player.centerPos = halfPaddleWidth;
        Game.setYOffset();
    } else if (yPct + halfPaddleWidth >= 100) {
        Game.player.centerPos = 100 - halfPaddleWidth;
    } else {
        Game.player.centerPos = yPct;
    }
    
    // Notify the server if there is a change
    if (centerPos != Game.player.centerPos) {
        Game.player.timeOffset = (new Date()).valueOf();
        socket.emit('player', Game.player);
    }
};
Game.onTouchEnd = function(e) {
    Game.touching = false;
};
Game.onTouchCancel = function(e) {
    Game.touching = false;
};

/* global io */
var socket = io('/player');
socket.on('connect', function() {
    // listen for server disconnect
    socket.on('disconnect', function() {
        // TODO: handle this gracefully
    });
    
    // This is fired only once after the player has connected to the server
    // as a way for the server acknowledge the player and provide initial
    // state for the player
    socket.on('player', function(playerData) {
        var firstTimeBeingSet = (Game.player === undefined);
        // Save a copy of the player data
        Game.player = playerData;

        if (firstTimeBeingSet) {
            // Setup the event handlers for touch
            canvas._canvas.addEventListener("touchcancel", Game.onTouchCancel, false);
            canvas._canvas.addEventListener("touchstart", Game.onTouchStart, false);
            canvas._canvas.addEventListener("touchmove", Game.onTouchMove, false);
            canvas._canvas.addEventListener("touchend", Game.onTouchEnd, false);

            // if there is a name in the query string, then update the player's data
            // get the firstname from the query string and send it to the server
            const paramStr = location.search.length > 0 ?
                location.search.substring(1) : '' // removes the ?
            const params = paramStr.split('&');
            const nameQuery = params.filter((str) => str.indexOf('name=') === 0);
            if (nameQuery.length > 0) {
                const values = nameQuery.pop().split('=');
                // values = ['name', firstName];
                if (values.length >= 2) {
                    Game.player.firstName = values[1];
                    // Notify the server of the updated values (firstName)
                    socket.emit('player', Game.player);
                }
            }
        }
    });

    socket.on('players', function(allPlayers) {
        Game.players = allPlayers;
        // NOTE: the server is in control of the player's status, so when
        //       there is a change to the status to all players, the local
        //       player instance must be updated
        allPlayers.forEach(function(player, idx, arr){
            if (player.socketId === Game.player.socketId) {
                // The only field the server can override is the status. All
                // other fields are managed by the player
                Game.player.status = player.status;
                playerPosition = (idx + 1);
            }
        })
    });

    socket.on('gameOver', function(data) {
        // data has 'score' and 'players', each are an Array(2)
        var isTiedGame = (data.score[0] === data.score[1]);
        var winningPlayer = data.players[(data.score[0] > data.score[1] ? 0 : 1)];
        var isWinner = (Game.player.socketId === winningPlayer);
        var winningMsg = (isTiedGame ? 'tied game' :  'You ' + (isWinner ? 'win!' : 'lose'));
        
        // fill in the winner
        document.getElementById('winner').innerText = winningMsg;

        // show the game over screen and hide the canvas
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('gameOver').style.display = 'block';
    })
});

/* global canvas */
canvas.create('gameCanvas');
canvas.cycle(Game.update, Game.draw);
