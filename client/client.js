// client.js

var touchX = null;
var touchY = null;

// TODO: add better game state
var gameOver = false;


var Game = {};
Game.update = function() {
    // TODO: move logic from onTouchMove to here, 
    // because onTouchMove should only be setting state/data
};
Game.draw = function() {
    // TODO: add code that will display the status of the host (up/down)
    //       or if waiting for another player
    
    canvas.clearBackground();
    
    var ctx = canvas._ctx;
    
    ctx.font = '70px Arial';
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'top';
    
    if (Game.player) {
        ctx.fillText('Player ' + Game.player.number, 20, 20);
        // draw the bar
        var centerY = ~~((Game.player.centerPos / 100) * canvas._canvas.height);
        var height = ~~((Game.player.paddleWidth / 100) * canvas._canvas.height);
        var y = ~~(centerY - (height / 2));
        var width = ~~(height * 0.2); //~~(canvas._canvas.width * 0.2);
        var x = ~~((canvas._canvas.width / 2) - (width / 2));
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, width, height);
    } else {
        // loading
        ctx.fillText('Loading...', 20, 20);
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
    console.log('connected to /player socket');
    
    // listen for disconnect, game over
    socket.on('disconnect', function() {
        
    });
    
    socket.on('player', function(playerData) {
        if (!Game.player) {
            canvas._canvas.addEventListener("touchcancel", Game.onTouchCancel, false);
            canvas._canvas.addEventListener("touchstart", Game.onTouchStart, false);
            canvas._canvas.addEventListener("touchmove", Game.onTouchMove, false);
            canvas._canvas.addEventListener("touchend", Game.onTouchEnd, false);
        }
        // if there was no player data before and there is a name in the query
        // string, then update the player's data
        var firstTimeBeingSet = (Game.player === undefined);
        Game.player = playerData;
        if (firstTimeBeingSet) {
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
                    socket.emit('player', Game.player);
                }
            }
        }
    });

    socket.on('gameOver', function(data) {
        // data has 'score' and 'players', each are an Array(2)
        var isTiedGame = (data.score[0] === data.score[1]);

        var winningPlayer = (data.score[0] > data.score[1] ? 1 : 2);
        var isWinner = (Game.player.number === winningPlayer);

        var winner = (data.score[0] > data.score[1] ? 
          data.players[0] : data.players[1]);
        var winningMsg = (isTiedGame ? 'tied game' : 
            'You ' + (isWinner ? 'win!' : 'lose'));
        console.log('Game Over - ' + winningMsg);
        
        // fill in the winner
        document.getElementById('winner').innerText = winningMsg;

        // show the game over screen and hide the canvas
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('gameOver').style.display = 'block';

        gameOver = true;
    })
});

/* global canvas */
canvas.create('gameCanvas');
canvas.cycle(Game.update, Game.draw);
