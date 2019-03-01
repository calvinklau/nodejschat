/*
 Calvin Lau
 10151228
 B01
 Assignment 2
  client.js
 */
$(function () {
    class Message {
        constructor(user, text) {
            this.user = user;
            this.text = text;
        }
    }

    window.onload = function() {
        document.getElementById('inputBar').focus();    // Auto focus chat input bar on load
    };

    let socket = io(),
        thisUser = null,
        form = document.querySelector('form');

    // FORM SUBMISSION
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        let input = document.getElementById('inputBar').value;

        if (input.indexOf('/nick ') === 0) {
            processNickname(input);
        } else if (input.indexOf('/nickcolor ') === 0) {
            processNickcolor(input);
        } else if (input === '') {
            return;
        } else {
                emitMessage(input)
        }
    });

    // SOCKET EVENTS
    socket.on('new user', function(user, connectedUsers, chatLog) {
        if (thisUser === null) {
            // Ignore if thisUser is already initialized
            newUser(user, connectedUsers, chatLog);
        }
    });

    socket.on('new connection', function(newUser) {
        if (thisUser !== null && newUser.username !== thisUser.username) {
            appendUser(newUser.username);
        }
    });

    socket.on('user disconnected', function(disconnectedUser) {
        let users = document.querySelectorAll('#users li');
        for (let li of users) {
            if (li.innerText === disconnectedUser.username) {
                li.parentNode.removeChild(li);
                break;
            }
        }
    });

    socket.on('new message', function(message) {
        displayMessage(formatMessage(message));
    });

    socket.on('nickname updated', function(res, nickname, updatedUser) {
        if (res === false) {
            if (updatedUser.username === thisUser.username) {
                // Notify user that nickname is not unique
                displayError('"' + nickname + '" is not a unique nickname.', '/nick uniquenickname');
                document.getElementById('inputBar').value = '/nick ' + nickname;
            }
        } else {
            updateNickname(nickname, updatedUser);
        }
    });

    socket.on('nickcolor updated', function(updatedUser, nickcolor) {
        updateNickcolor(updatedUser, nickcolor);
    });

    // HELPERS
    function newUser(user, connectedUsers, chatLog) {
        thisUser = user;
        handleCookie(user);

        let welcomeMessage = 'You are ' + user.username + '.',
            messages = $('#messages');
        document.getElementById('username').innerText = welcomeMessage;

        for (let user of connectedUsers) {
            // Populate connected users list
            appendUser(user.username);
        }

        for (let message of chatLog) {
            // Populate chat log with existing messages
            messages.append($('<li>').html(formatMessage(message)));
        }

        messages.append($('<li>').text(welcomeMessage));
        scrollBottom();
    }

    function handleCookie(user) {
        if (document.cookie.split(';').filter((item) =>
            item.trim().startsWith('colour=')).length) {
            // Load stored cookies
            thisUser.username = user.username;
            thisUser.colour = user.colour;
        } else {
            // Create new cookies
            document.cookie = 'colour=' + user.colour;
            document.cookie = 'username=' + user.username;
        }
    }

    function emitMessage(text) {
        socket.emit('chat message', new Message(thisUser, text));
        document.getElementById('inputBar').value = '';
    }

    function formatMessage(message) {
        let date = new Date(message.date),
            timestamp = date.getHours() + ':' + ((date.getMinutes() < 10 ? '0' : '') + date.getMinutes()),
            htmlString = timestamp + ' <span style="color: #' + message.user.colour + '">' + message.user.username + "</span>: " + message.text;

        if (message.user.username === thisUser.username) {
            htmlString = '<span class="bold">' + htmlString + '</span>';
        }

        return htmlString;
    }

    function processNickname(command) {
        let args = checkCommandLength(command);
        if (args === false) {
            displayError('Too many arguments.', '/nick uniquenickname');
            return false;
        }

        socket.emit('update nickname', thisUser, args[1]);
        document.getElementById('inputBar').value = '';
    }

    function processNickcolor(command) {
        let args = checkCommandLength(command),
            rgbRegex = /^[0-9a-f]{6}$/i;

        if (args === false) {
            displayError('Too many arguments.', '/nickcolor RRGGBB');
            return;
        }

        if (!rgbRegex.test(args[1])) {
            displayError('Invalid RGB colour format.', '/nickcolor RRGGBB');
            return;
        }

        socket.emit('update nickcolor', thisUser, args[1]);
        document.getElementById('inputBar').value = '';
    }

    function checkCommandLength(command) {
        let args = command.split(' ');
        if (args.length !== 2) {
            return false;
        }

        return args;
    }

    function displayMessage(messageHTML) {
        $('#messages').append($('<li>').html(messageHTML));
        scrollBottom();
    }

    function displayError(errorMsg, commandFormat) {
        let errorHTML = '<span class="error-message">Error: ' + errorMsg + ' Command format: <span class="italic">' + commandFormat + '</span></span>';
        $('#messages').append($('<li>').html(errorHTML));
        scrollBottom();
    }

    function appendUser(username) {
        let users = Array.from(document.getElementById('users').children);

        if (users.find(li => {
            return li.innerText === username;
        }) === undefined) {
            // Don't re-append username if this user is already connected (i.e., if user has multiple tabs open)
            $('#users').append($('<li>').text(username));
        }
    }

    function updateNickname(nickname, updatedUser) {
        if (updatedUser.username === thisUser.username) {
            // Change user's nickname
            document.getElementById('username').innerText = 'You are ' + nickname;
            thisUser.username = nickname;
            document.cookie = 'username=' + nickname;
            displayMessage('<span class="green">You are now ' + nickname + '</span>');
        }

        // Update user list in UI
        let users = document.getElementById('users').children;
        for (let user of users) {
            if (updatedUser.username === user.innerText) {
                user.innerText = nickname;
                break;
            }
        }
    }

    function updateNickcolor(updatedUser, nickcolor) {
        if (updatedUser.username === thisUser.username) {
            // Change user's nickcolor
            thisUser.colour = nickcolor;
            document.cookie = 'colour=' + nickcolor;
            displayMessage('<span style="color: #' + nickcolor + '">You have updated your color.</span>');
        }
    }

    function scrollBottom() {
        let messages = document.getElementById('messages-wrapper');
        messages.scrollTop = messages.scrollHeight;
    }
});
