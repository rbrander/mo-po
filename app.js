// app.js

var _canvas, _ctx;

var Game = {};

Game.clearBackground = function(_ctx) {
    _ctx.fillStyle = 'black';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
};


(function() {
    _canvas = document.createElement('canvas');
    _canvas.width = window.innerWidth;
    _canvas.height = window.innerHeight;
    document.body.appendChild(_canvas);
    _ctx = _canvas.getContext('2d');
    
    Game.clearBackground(_ctx);
    
    _ctx.fillStyle = 'white';
    _ctx.font = '18pt Arial';
    _ctx.textBaseline = 'top';
    _ctx.fillText('Hello', 150, 20);

    
    console.log('hello');
})()