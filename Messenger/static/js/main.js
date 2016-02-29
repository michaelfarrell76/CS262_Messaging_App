
var FADE_TIME = 150; // ms
var TYPING_TIMER_LENGTH = 400; // ms
var global_latest_message_id = 0;
var COLORS = [
  '#e21400', '#91580f', '#f8a700', '#f78b00',
  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];

// Initialize variables
var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage'); // Input message input box
var $loginButton = $('.login_button'); // Input message input box
var $registerButton = $('.register_button'); // Input message input box

var $loginPage = $('.login.page'); // The login page
var $chatPage = $('.chat.page'); // The chatroom page

// Prompt for setting a username
var username;
var email = 'kyang01@college.harvard.edu'
var connected = false;
var typing = false;
var lastTypingTime;
var $currentInput = $usernameInput.focus();

username = 'Kevin'
$loginPage.fadeOut();
$chatPage.show();
$loginPage.off('click');
$currentInput = $inputMessage.focus();

function addParticipantsMessage (data) {
  var message = '';
  if (data.numUsers === 1) {
    message += "there's 1 participant";
  } else {
    message += "there are " + data.numUsers + " participants";
  }
  log(message);
}

// Sets the client's username
function setUsername () {
  username = cleanInput($usernameInput.val().trim());
  // If the username is valid
  if (username) {
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    $currentInput = $inputMessage.focus();
  }
}

// Sends a chat message
function sendMessage () {
  var message = $inputMessage.val();
  message = cleanInput(message);
  if (message) {
    $inputMessage.val('');
    $.post("send_message", {message:message, email:email})
  }
}

function updateChat() {
  data = {format:'json'}
  url = 'get_messages'
  success = function(messages) {
    var messages_len = messages.length
    newest_message_id = messages[0][0]
    if (newest_message_id > global_latest_message_id) {
      last_message_id = global_latest_message_id
      global_latest_message_id = newest_message_id
      messages_out = []
      for (var i = 0; i < messages_len; i++) { 
        message = messages[i]
        if (message[0] > last_message_id) {
          message_data = {}
          message_data.latest_id = message[0]
          message_data.username = message[1]
          message_data.message = message[2] 
          messages_out.push(message_data)
        }
        else {
          break
        }
      }

      messages_out.reverse()
      for (var j = 0; j < messages_out.length; j++) {
        addChatMessage(messages_out[j])
      }
    }
  }
  $.ajax({
  dataType: "json",
  url: url,
  data: data,
  success: success
});
}

// Log a message
function log (message, options) {
  var $el = $('<li>').addClass('log').text(message);
  addMessageElement($el, options);
}

// Adds the visual chat message to the message list
function addChatMessage (data, options) {
  // Don't fade the message in if there is an 'X was typing'
  var $typingMessages = getTypingMessages(data);
  options = options || {};
  if ($typingMessages.length !== 0) {
    options.fade = false;
    $typingMessages.remove();
  }

  var $usernameDiv = $('<span class="username"/>')
    .text(data.username)
    .css('color', getUsernameColor(data.username));
  var $messageBodyDiv = $('<span class="messageBody">')
    .text(data.message);

  var typingClass = data.typing ? 'typing' : '';
  var $messageDiv = $('<li class="message"/>')
    .data('username', data.username)
    .addClass(typingClass)
    .append($usernameDiv, $messageBodyDiv);

  addMessageElement($messageDiv, options);
}

// Adds the visual chat typing message
function addChatTyping (data) {
  data.typing = true;
  data.message = 'is typing';
  addChatMessage(data);
}

// Removes the visual chat typing message
function removeChatTyping (data) {
  getTypingMessages(data).fadeOut(function () {
    $(this).remove();
  });
}

// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
function addMessageElement (el, options) {
  var $el = $(el);

  // Setup default options
  if (!options) {
    options = {};
  }
  if (typeof options.fade === 'undefined') {
    options.fade = true;
  }
  if (typeof options.prepend === 'undefined') {
    options.prepend = false;
  }

  // Apply options
  if (options.fade) {
    $el.hide().fadeIn(FADE_TIME);
  }
  if (options.prepend) {
    $messages.prepend($el);
  } else {
    $messages.append($el);
  }
  $messages[0].scrollTop = $messages[0].scrollHeight;
}

// Prevents input from having injected markup
function cleanInput (input) {
  return $('<div/>').text(input).text();
}

// Updates the typing event
function updateTyping () {
  if (connected) {
    if (!typing) {
      typing = true;
      typing();
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(function () {
      var typingTimer = (new Date()).getTime();
      var timeDiff = typingTimer - lastTypingTime;
      if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
        typing = false;
      }
    }, TYPING_TIMER_LENGTH);
  }
}

// Gets the 'X is typing' messages of a user
function getTypingMessages (data) {
  return $('.typing.message').filter(function (i) {
    return $(this).data('username') === data.username;
  });
}

// Gets the color of a username through our hash function
function getUsernameColor (username) {
  // Compute hash code
  var hash = 7;
  for (var i = 0; i < username.length; i++) {
     hash = username.charCodeAt(i) + (hash << 5) - hash;
  }
  // Calculate color
  var index = Math.abs(hash % COLORS.length);
  return COLORS[index];
}

// Keyboard events

$window.keydown(function (event) {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    $currentInput.focus();
  }
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
    if (username) {
      sendMessage();
      typing = false;
    } else {
      setUsername();
    }
  }
});

window.setInterval(function(){
  updateChat();
}, 1000);

$inputMessage.keydown(function (e) {
  if (e.keyCode == 13)
  {
    sendMessage()
  }
});

// Click events
// Focus input when clicking anywhere on login page
$loginPage.click(function () {
  $currentInput.focus();
});

// Focus input when clicking on the message input's border
$inputMessage.click(function () {
  $inputMessage.focus();
});