var FADE_TIME = 150; // ms
var TYPING_TIMER_LENGTH = 400; // ms
var global_latest_message_id = 0;
var global_user_count = 0
var global_groups_count = 0
var COLORS = [
  '#e21400', '#91580f', '#f8a700', '#f78b00',
  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];

// Initialize variables
var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username
var $messages = $('.messages'); // Messages area
var $messages_id = $('#messages_loc');
var $inputMessage = $('.inputMessage'); // Input message input box
var $registerButton = $('.register_button'); // Input message input box
var $userList = $('.list-users');
var $chatPage = $('.chat.page'); // The chatroom page

var $currentInput = $usernameInput.focus();

var delete_err_msg = "Are you sure you want to delete your account?\n\n This cannot be undone"
var chat_int = 1000;
var user_int = 5000;

// Prompt for setting a username
var username;
var lastTypingTime;
var currently_selected = null;
var type_selected = null;

var connected = false;
var typing = false;
var change_user = false;

$chatPage.show();
$currentInput = $inputMessage.focus();

// Sets the client's username
function setUsername () {
  username = cleanInput($usernameInput.val().trim());
  // If the username is valid
  if (username) {
    $chatPage.show();
    $currentInput = $inputMessage.focus();
  }

}

// Sends a chat message
function sendMessage () {
  if (type_selected != null){
    var message = cleanInput($inputMessage.val());
    if (message) {
      $inputMessage.val('');
      data = {message:message, 
              other_uid: cleanInput(currently_selected),
              select_type: type_selected}
      $.post("send_message", data)
    }
    updateChat();
    updateUsers();
    updateGroups();
  }
}

//Update the chat screen
function updateChat() {
  
  success = function(messages) {
    var messages_len = messages.length
    if(messages == ''){
      newest_message_id = 0
    }
    else{
      newest_message_id = messages[0][0]
    }
   
    if(change_user){
      $messages.empty();
      global_latest_message_id = 0;
    }
    if (newest_message_id > global_latest_message_id) {
      last_message_id = global_latest_message_id
      global_latest_message_id = newest_message_id
      messages_out = []

      for (var i = 0; i < messages_len; i++) { 
        message = messages[i]
        if ( message[0] > last_message_id) {
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
    if(change_user){
      change_user = false;
    }
  }
  if (currently_selected){
    data = {user_id: cleanInput(currently_selected),
            select_type: type_selected}

    $.ajax({
      type: "POST",
      dataType: "json",
      url: 'get_messages',
      data: data,
      success: success
    });
  }
}

function updateUsers(){
    success = function(users) {

      var num_users = users.length
      
      if (num_users > global_user_count) {
        console.log(global_user_count)
        global_user_count = num_users
        latest_user_id = users[0][0]
        users_out = []
        console.log(num_users)
        for (var i = 0; i < num_users; i++) { 
          console.log(latest_user_id)
          user = users[i]
          if (user[0] >= latest_user_id) {
            user_data = {}
            user_data.user_id = user[0]
            user_data.name = user[1]
            user_data.email = user[2] 
            user_data.group_id = user[3]
            users_out.push(user_data)
          }
          else {
            break
          }
        }
        console.log(users_out)
        users_out.reverse()
        $('.user_select').empty()
        for (var j = 0; j < users_out.length; j++) {
          var option = $('<option></option>').attr("value", users_out[j].user_id).text(users_out[j].name);
          $(".user_select").append(option)
        }
      $('.ui.dropdown').dropdown({allowAdditions: false});  
      }
    }

    data = {format:'json'}
    a = $.ajax({
      dataType: "json",
      url: "get_users",
      data: data,
      success: success
    });
}

function updateGroups(){
    success = function(groups) {
      var num_groups = groups.length
      
      if (num_groups > global_groups_count) {
        global_groups_count = num_groups
        latest_groups_id = groups[0][0]
        groups_out = []
        for (var i = 0; i < num_groups; i++) { 
          group = groups[i]
          if (group[0] >= latest_groups_id) {
            groups_data = {}
            groups_data.group_id = group[0]
            console.log(group[2])
            groups_data.group_name = group[1]
            groups_data.user_ids = group[2] 
            groups_out.push(groups_data)
          }
          else {
            break
          }
        }
        groups_out.reverse()
        $('.group_select').empty()
        for (var j = 0; j < groups_out.length; j++) {
          var option = $('<option></option>').attr("value", groups_out[j].group_id).text(groups_out[j].group_name);
          $(".group_select").append(option)
        }
      }
    }
    data = {format:'json'}

    a = $.ajax({
      dataType: "json",
      url: "get_groups",
      data: data,
      success: success,
      error: function(data){console.log(data)}
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

// run coder once as soon as everything is ready
$(document).ready(function(){
  updateUsers();
  updateGroups();
});

//How often we update the chat
window.setInterval(function(){
  updateChat();

}, chat_int);

//how often we update the users
window.setInterval(function(){
  updateUsers();
  updateGroups();
}, user_int);

//Logout of account
$("#logout").click(function () {
    location.href = "/logout";
});

//Delete account
$("#delete_account").click(function() {
  if (window.confirm(delete_err_msg)) {
    location.href = "/delete_account"; 
  }
});

//Update infor that new user is selected
$('#u_sel').change(function(){ 
  type_selected = 'user';
  currently_selected = $(this).val();
  change_user = true;
   $('#g_sel option').removeAttr("selected");
});

//Update infor that new group is selected
$('#g_sel').change(function(){ 
  type_selected = 'group';
  currently_selected = $(this).val();
  change_user = true;
   $('#u_sel option').removeAttr("selected");
});
    
//Send messsage on enter
$inputMessage.keydown(function (e) {
  if (e.keyCode == 13){
    sendMessage()
  }
});

$('.modalCreateButton').click(function (){
  var values = $("#group_select>option:selected").map(function() { return parseInt($(this).val()); });
  var name = cleanInput($("#group_name").val())
  values = cleanInput(values.get())
  $("#group_select>option:selected").removeAttr("selected");
  $('.ui.dropdown').dropdown('restore defaults'); 
  $('#group_name').val('')
  $.ajax({
    type: "POST",
    dataType: "json",
    url: 'create_group',
    data: {user_ids: values, group_name:name},
    success: function(data) {console.log('Success')}
   });
})

