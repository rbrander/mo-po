// canvas.js

var canvas = {
    FPS: 60,    // frames per second
    msPerFrame: function(){ return ~~(1000/canvas.FPS); },
    _canvas: undefined,
    _ctx: undefined,
    _cycleInterval: undefined,
};

canvas.clearBackground = function() {
    canvas._ctx.fillStyle = 'black';
    canvas._ctx.fillRect(0, 0, canvas._canvas.width, canvas._canvas.height);
};

canvas.create = function(id) {
    canvas._canvas = document.createElement('canvas');
    canvas._canvas.InnerText = 'Canvas is not supported';
    canvas._canvas.width = window.innerWidth;
    canvas._canvas.height = window.innerHeight;
    canvas._ctx = canvas._canvas.getContext('2d');
    if (id && id.length > 0) {
        canvas._canvas.id = id;
    }
    window.addEventListener('resize', function() {
        canvas._canvas.width = window.innerWidth;
        canvas._canvas.height = window.innerHeight;
    });
    document.body.appendChild(canvas._canvas);
}

canvas.cycle = function(fnUpdate, fnDraw) {
    if (canvas._cycleInterval) {
        clearInterval(canvas._cycleInterval);
        canvas._cycleInterval = undefined;
    }
    var hasUpdate = (fnUpdate && typeof(fnUpdate) === 'function');
    var hasDraw = (fnDraw && typeof(fnDraw) === 'function');
    var hasReqAniFrame = (window.requestAnimationFrame && 
        typeof(window.requestAnimationFrame) === 'function');

    // Build the game loop which will call update and draw
    var lastFrame = 0;
    canvas.fps = 0;
    var gameLoop = function(now) {
        // Calculate FPS
        canvas.fps = (1000 / (now - lastFrame)).toFixed(1);
        lastFrame = now;

        // Start next iteration
        if (hasReqAniFrame) {
            window.requestAnimationFrame(gameLoop);
        } else {
            setTimeout(gameLoop.bind(null, new Date().valueOf()), canvas.msPerFrame());
        }

        // Update and draw
        if (hasUpdate) {
            fnUpdate();
        }
        if (hasDraw) {
            fnDraw();
        }
    };
    gameLoop();
}
