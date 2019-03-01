/*
 Calvin Lau
 10151228
 B01
 Assignment 2
  server.js
 */
const express = require('express'),
    app = express(),
    http = require('http'),
    server = http.Server(app),
    io = require('socket.io')(server, {
        // Change default pingTimeout to avoid timeout issue with Chrome
        pingTimeout: 60000,
    });

let userCounter = 1,        // Used in creating unique initial nickname
    existingNicknames = [], // Stores all nicknames created while the server is running
    connectedUsers = [],    // Stores all currently connected users
    connectedSockets = [],  // Stores all currently connected sockets
    chatLog = [];           // Stores all messages sent while the server is running

class User {
	constructor(username) {
		this.username = username;
		this.colour = '5bc0de'; // Default user nickcolor
	}
}

class Message {
	constructor(user, text) {
		this.user = user;
		this.text = text;
        this.date = new Date();
	}
}

app.use(express.static(__dirname + '/public'));

io.on('connection', function(socket) {
	newConnection(socket);

    socket.on('disconnect', function() {
		userDisconnect(socket);
	});

	socket.on('chat message', function(msg) {
		newMessage(msg);
	});
	
	socket.on('update nickname', function(updateUser, nickname) {
		updateNickname(updateUser, nickname);
	});

	socket.on('update nickcolor', function(updateUser, nickcolor) {
        updateNickcolor(updateUser, nickcolor);
	});
});

server.listen(3000, function() {
	console.log('listening on *:3000');
});

// HELPERS
function newConnection(socket) {
    let newUser = null,
        socketCookie = socket.handshake.headers.cookie;
    if (socketCookie !== undefined) {
        if (socketCookie.indexOf('username=') === -1) {
            // If handshake cookie does not include username, create new user
            newUser = createUser();
        } else {
            newUser = new User('');
            let cookies = socketCookie.split('; ');
            for (let cookie of cookies) {
                if (cookie.startsWith('username=')) {
                    newUser.username = cookie.split('=')[1];
                }

                if (cookie.startsWith('colour=')) {
                    newUser.colour = cookie.split('=')[1];
                }
            }
        }
    } else {
        // If socket doesn't send a cookie
        console.log('CREATING A NEW USER');
        newUser = createUser();
    }

    if (connectedUsers.find(user => {
        return user.username === newUser.username;
    }) === undefined) {
        // If connected user isn't already connected
        connectedUsers.push(newUser);
        connectedSockets.push(socket);
        console.log('a user connected: ' + newUser.username);
    }

    io.emit('new user', newUser, connectedUsers, chatLog)
    io.emit('new connection', newUser);
}

function createUser() {
    let newUser = new User('User' + userCounter.toString());
    existingNicknames.push(newUser.username);
    userCounter++;

    return newUser;
}

function userDisconnect(socket) {
	for (let sock of connectedSockets) {
		if (sock === socket) {
			let userIndex = connectedSockets.indexOf(sock),
			    user = connectedUsers[userIndex];
			console.log('a user disconnected: ' + user.username);
            io.emit('user disconnected', user);

            // Remove user from connectedUsers & connectedSockets arrays
            connectedSockets.splice(userIndex, 1);
            connectedUsers.splice(userIndex, 1);
			break;
		}
	}
}

function newMessage(msg) {
    let newMsg = new Message(msg.user, msg.text);
    chatLog.push(newMsg);
    io.emit('new message', newMsg);
}

function updateNickname(updateUser, nickname) {
    for (let username of existingNicknames) {
        if (username === nickname) {
            // Notify client that nickname is not unique
            io.emit('nickname updated', false, nickname, updateUser);
            return;
        }
    }

    for (let user of connectedUsers) {
        if (user.username === updateUser.username) {
            io.emit('nickname updated', true, nickname, user);
            user.username = nickname;
            existingNicknames[existingNicknames.indexOf(updateUser.username)] = nickname;
            return;
        }
    }
}

function updateNickcolor(updateUser, nickcolor) {
    for (let user of connectedUsers) {
        if (user.username === updateUser.username) {
            user.colour = nickcolor;
            io.emit('nickcolor updated', updateUser, nickcolor);
            return;
        }
    }
}
