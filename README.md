# Mo-Po :: Mobile Pong

Mo-Po is a mobile pong game.  The idea is to have a desktop client, which hosts
the game, and two mobile devices connected to the site as players.  The players
will only see a paddle on their screen that they can move.  The host will
display the whole board with player paddles.  Communication of player positions
is done via web sockets.

## Setting up

The is a server that needs to be run for coordinating the web socket
communications and serving up the correct markup.  The server is run using node:
`node server.js`

This will start the server on port 8080 on localhost.  When running on Cloud9,
the 8080 port is forwarded to port 80 for my host mo-po-rbrander.c9users.io.

`server.html` and `player.html` are served up depending on the route.  Players
should connect to `/player` and the host should connect to `/`.

