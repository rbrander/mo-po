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

canvas.create = function() {
    canvas._canvas = document.createElement('canvas');
    canvas._canvas.width = window.innerWidth;
    canvas._canvas.height = window.innerHeight;
    canvas._ctx = canvas._canvas.getContext('2d');
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
    canvas._cycleInterval = setInterval(function() {
        if (hasUpdate) {
            fnUpdate();
        }
        if (hasDraw) {
            if (hasReqAniFrame) {
                window.requestAnimationFrame(fnDraw);
            } else {
                fnDraw();
            }
        }
    }, canvas.msPerFrame());
}