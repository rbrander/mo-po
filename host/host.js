// host.js

var Game = {
    hostConnected: false,
    players: [],
    sounds: [],
    score: [0, 0],
    blockSize: 10,  // in pixels
    ball: {
        x: 0,
        y: 0,
        xvel: 2,
        yvel: 2,
        vel: 2
    },
    running: false,
    ended: false,
    themePrimary:'#E33231', // red
    themeSecondary: '#422E51', // purple
    timeStart: null,
};


/* global io */
var socket = io('/host');
socket.on('connect', function() {
    console.log('connected to /host socket');
    Game.hostConnected = true;
    socket.on('players', function(data) {
        Game.players = data;
    });
});

Game.update = function() {
    if (!Game.ready() || Game.ended) {
        return;
    }
    if (!Game.running && !Game.ended) {
        if (Game.playSounds) {
            Game.sounds.coin.play();
        }
        Game.timeStart = new Date();
        // increase the speed every 10 seconds
        setInterval(Game.increaseSpeed, 10000);        
        Game.running = true;
    }

    // Check for end of game
    Game.ended = (new Date().valueOf() - Game.timeStart) > (2 * 60 * 1000);
    if (Game.ended) {
        Game.running = false;
    }
    
    // Update the ball location based on velocity
    Game.ball.x += Game.ball.xvel;
    Game.ball.y += Game.ball.yvel;

    // Bounds checking: Bottom wall hit
    if (Game.ball.y > canvas._canvas.height - (1.5 * Game.blockSize)) {
        Game.ball.y = canvas._canvas.height - (1.5 * Game.blockSize);
        Game.ball.yvel = -Game.ball.vel;
        if (Game.playSounds) {
            Game.sounds.ping.play();
        }
    }

    // Bounds checking, player 2
    var borderWidth = (2 * Game.blockSize);
    var yPct = (Game.ball.y / canvas._canvas.height * 100);
    if (Game.ball.x > canvas._canvas.width - (3.5 * Game.blockSize)) {
        var player2HalfPaddle = ~~(Game.players[1].paddleWidth / 2);
        var isWithinPlayer2Paddle = (
            (yPct > (Game.players[1].centerPos - player2HalfPaddle)) &&
            (yPct < (Game.players[1].centerPos + player2HalfPaddle))
        );
        if (isWithinPlayer2Paddle) {
            Game.ball.x = canvas._canvas.width - (3.5 * Game.blockSize);
            Game.ball.xvel = -Game.ball.vel;
            if (Game.playSounds) {
                Game.sounds.pong.play();
            }
        } else {
            Game.score[0]++;
            if (Game.playSounds) {
                Game.sounds.miss.play();
            }
            // Reset the ball
            Game.ball.x = ~~(canvas._canvas.width / 4);
            Game.ball.y = ~~(canvas._canvas.height / 2);
            Game.ball.xvel = Game.ball.vel;
            Game.ball.yvel = Game.ball.vel;
        }
    }

    // Bounds checking: Top wall hit
    if (Game.ball.y < (1.5 * Game.blockSize)) {
        Game.ball.y = (1.5 * Game.blockSize);
        Game.ball.yvel = Game.ball.vel;
        if (Game.playSounds) {
            Game.sounds.ping.play();
        }
    }

    // Bounds checking, player 1
    if (Game.ball.x < (3.5 * Game.blockSize)) {
        var player1HalfPaddle = ~~(Game.players[0].paddleWidth / 2);
        var isWithinPlayer1Paddle = (
            (yPct > (Game.players[0].centerPos - player1HalfPaddle)) &&
            (yPct < (Game.players[0].centerPos + player1HalfPaddle))
        );
        if (isWithinPlayer1Paddle) {
            Game.ball.x = 3.5 * Game.blockSize;
            Game.ball.xvel = Game.ball.vel;
            if (Game.playSounds) {
                Game.sounds.pong.play();
            }
        } else {
            Game.score[1]++;
            if (Game.playSounds) {
                Game.sounds.miss.play();
            }
            // Reset the ball
            Game.ball.x = ~~(canvas._canvas.width / 4) * 3;
            Game.ball.y = ~~(canvas._canvas.height / 2);
            Game.ball.xvel = -Game.ball.vel;
            Game.ball.yvel = -Game.ball.vel;
        }
    }
};
Game.ready = function() {
    return (Game.hostConnected && Game.players && Game.players.length == 2);
};
Game.draw = function() {
    var ctx = canvas._ctx;
    canvas.clearBackground();
    
    // draw the status until we have two players and a host connect to the server
    if (!Game.ready()) {
        // draw a background image
        ctx.drawImage(Game.imgStartScreen, 0, 0,
            canvas._canvas.width, canvas._canvas.height);

        // build a status message to display
        var hostMessage = 'Host connect' + (Game.hostConnected ? 'ed' : 'ing');
        var playerMsg = Game.players.length > 0 ?
            '1 player connected, and waiting for a second player...' :
            'waiting for players...';
        var statusMessage = hostMessage + ', ' + playerMsg;

        // draw the status message
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'top';
        ctx.fillText(statusMessage, 100, canvas._canvas.height - 70);
    } else if (Game.ended) {
        // draw game over screen
        ctx.font = '120px Arcade';
        ctx.fillStyle = Game.themePrimary;
        ctx.textBaseline = 'middle';
        ctx.fillText("Game Over", canvas._canvas.width / 2, canvas._canvas.height / 2);
    } else {
        // draw the background image
        ctx.drawImage(Game.imgBackground, 0, 0,
            canvas._canvas.width, canvas._canvas.height);
        // TODO: it would be cool to have an animation "Game on..." fade
        Game.drawBoard();
        Game.drawPlayers();
        Game.drawScore();
        Game.drawTimeRemaining();
        Game.drawBall();
    }
};
Game.drawBoard = function() {
    var ctx = canvas._ctx;
    var halfX = ~~(canvas._canvas.width / 2);
    
    // draw dashed middle line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = Game.blockSize;
    ctx.setLineDash([Game.blockSize * 3, Game.blockSize * 2]);
    ctx.beginPath();
    ctx.moveTo(halfX, 0);
    ctx.lineTo(halfX, canvas._canvas.height);
    ctx.stroke();
    
    // border on top and bottom
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas._canvas.width, Game.blockSize);
    ctx.fillRect(0, canvas._canvas.height-Game.blockSize, canvas._canvas.width, Game.blockSize);
};
Game.drawPlayers = function() {
    var ctx = canvas._ctx;
    
    // draw a paddle for each player
    var tableWidth = canvas._canvas.height - (Game.blockSize * 2);  // 2 * blocksize for border on top and bottom
    Game.players.forEach(function(player, idx) {
        var paddleHeight = (player.paddleWidth / 100) * tableWidth;
        var paddleCenter = (player.centerPos / 100) * tableWidth;
        var paddleTop = paddleCenter - (paddleHeight / 2);
        var xOffset = (idx % 2 == 0 ? (2 * Game.blockSize) : canvas._canvas.width - (3 * Game.blockSize)); 
        ctx.fillStyle = 'white';
        ctx.fillRect(xOffset, paddleTop, Game.blockSize, paddleHeight);
    });
};
Game.drawScore = function() {
    // Typically the old-skool version had a big pixelated number
    // in each table side
    var ctx = canvas._ctx;
    ctx.fillStyle = Game.themePrimary;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    Game.score.forEach(function(score, idx){
        var x = (idx == 0 ? canvas._canvas.width / 4 : (canvas._canvas.width / 4) * 3);
        // draw the score
        ctx.font = '120px Arcade';
        ctx.fillText(score.toString(), x, 100);
        // draw the name
        ctx.font = '60px Arcade';
        ctx.fillText(Game.players[idx].firstName, x, 60);
    });
};
Game.drawTimeRemaining = function() {
    // Don't draw the time until we have a start time and the game is running
    if (!Game.running || Game.timeStart === null) return;

    // draw the background box
    var ctx = canvas._ctx;
    var x = canvas._canvas.width / 2;
    var y = 35;
    ctx.fillStyle = Game.themeSecondary;
    ctx.fillRect(x - 75, y, 150, 60);

    ctx.fillStyle = 'white';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.font = '80px Arcade';

    // Calculate the time string using now and timeStart
    var secondsRunning = Math.floor((new Date().valueOf() - Game.timeStart) / 1000);
    var secondsFrom2Minutes = (2 * 60) - secondsRunning;
    var numMinutes = Math.floor(secondsFrom2Minutes / 60);
    var numSeconds = Math.floor(secondsFrom2Minutes % 60);
    var timeString = numMinutes.toString() + ':' + ('00' + numSeconds).slice(-2);

    // draw the text
    ctx.fillText(timeString, x, y);
};
Game.drawBall = function() {
    // draw a filled rect on ball position
    var halfWidth = ~~(Game.blockSize / 2);
    canvas._ctx.fillStyle = 'white';
    canvas._ctx.fillRect(
        Game.ball.x - halfWidth, Game.ball.y - halfWidth,
        Game.blockSize, Game.blockSize
    );
};
Game.increaseSpeed = function() {
    Game.ball.vel++;
};
Game.init = function() {
    // Set the initial ball position
    Game.ball.x = ~~(canvas._canvas.width / 4);
    Game.ball.y = ~~(canvas._canvas.height / 2);
    Game.ball.xvel = Game.ball.yvel = Game.ball.vel = 2;
    // Load the sounds
    Game.playSounds = true;
    try {
        Game.sounds = {
            ping: new Audio('/assets/ping.mp3'),
            pong: new Audio('/assets/pong.mp3'),
            miss: new Audio('/assets/splat.wav'),
            coin: new Audio('/assets/coin.wav')
        };
    } catch (err) {
        Game.playSounds = false;
    }
    // Load images
    Game.imgBackground = new Image(canvas._canvas.width, canvas._canvas.height);
    Game.imgBackground.src = '/assets/background.png';
    Game.imgStartScreen = new Image(canvas._canvas.width, canvas._canvas.height);
    Game.imgStartScreen.src = '/assets/start-screen.gif';
    window.addEventListener('keyup', function(e) {
        switch (e.which) {
            case 189: // '-' key DECR
                if (Game.ball.vel > 0) {
                    Game.ball.vel--;
                }
                break;
            case 187: // '=' key  INCR
                if (Game.ball.vel < 100) {
                    Game.ball.vel++;
                }
                break;
            case 80: // p for pause
                Game.ball.vel = 0;
                break;
            default:
                break;
        }
    });
    Game.timeStart = null;
};

/* global canvas */
canvas.create();
Game.init();
canvas.cycle(Game.update, Game.draw);