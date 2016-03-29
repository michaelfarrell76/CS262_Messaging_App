//Global constants
var FADE_TIME = 150; // ms
var COLORS = [
  '#e21400', '#91580f', '#f8a700', '#f78b00',
  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
]; //the colors for the various usernames
var CHAT_INT = 1000; //interval to update chat
var USER_INT = 5000; //interval to update usernames
var DELETE_ERR_MESSAGE = "Are you sure you want to delete your account?\n\n This cannot be undone"
var ENTER = 13; //value of enter key


// Initialize tags
var $window = $(window);
var $inputMessage = $('.inputMessage'); // Input message input box
var $messages = $('.messages'); // Messages area
var $chatPage = $('.chat.page'); // The chatroom page
$inputMessage.focus();
$chatPage.show();

//Initialize global variables
var global_latest_message_id = 0; //the last message id receieved 
var global_user_count = 0 //the number of users
var global_groups_count = 0 //the number of groups
var currently_selected = null; //id currently interacting with

//********************START OF AREA THAT NEEDS TO BE CLEANED******************************
//change to binary 0 1
var type_selected = null; 

//idk
var chat_name = null;
var connected = false;
var change_user = false;
var username;
var lastTypingTime;

var useProto = (USE_PROTOBUFF === "True");

// Some Proto Code
var protojson = angular.module('protojson', []);
protojson.config(['$interpolateProvider', function($interpolateProvider) {
  $interpolateProvider.startSymbol('{[');
  $interpolateProvider.endSymbol(']}');
}]);
var ProtoBuf = dcodeIO.ProtoBuf;
var MsgClient, GrpCreateClient, GrpUsrs, UsrClient, UsrUsrs, PreMsgClient, PostMsgClient, Msg;


builder = ProtoBuf.loadProtoFile("/static/message.proto");
MsgClient = builder.build("MsgClient");
GrpCreateClient = builder.build("GrpCreateClient");
GrpUsrs = builder.build("GrpUsrs");
UsrClient = builder.build("UsrClient");
UsrUsrs = builder.build("UsrUsrs");
PreMsgClient = builder.build("PreMsgClient");
PostMsgClient  = builder.build("PostMsgClient");
Msg = builder.build("Msg");

//*********************END*****************************



//********************START******************************
//add function definition
//*********************END*****************************
function sendMessage () {
  //Only send a message if a chat instance is selected
  if (type_selected != null){
    var message = cleanInput($inputMessage.val());
    if (message){
      if (useProto){ //Using protocol buffers
        //********************START******************************
        //change to be more efficient
        var data = new MsgClient({
          message: message,
          other_uid: cleanInput(currently_selected),
          select_type:type_selected
        });

        //change to alert that we failed
        failure = function() {
          console.log("Message Failed to Send")
        }
        //get success and error to work
         $.ajax({
          type: "POST",
          beforeSend: function (request){request.setRequestHeader("Accept", "application/x-protobuf");},
          url: "send_message", 
          data: {protoString: data.toBase64()}, 
          success: function(data) {console.log("Message Sent")},
          error: failure
        })
         //*********************END*****************************

      }
      else{ //Using RESTFUL 
        //********************START******************************
        //change to be more efficient
        var data = {message: message, 
                    other_uid: cleanInput(currently_selected),
                    select_type: type_selected}
        //*********************END*****************************
        $.post("send_message", data)
      }

      //Clear the message input
      $inputMessage.val('');
    }
    updateChat();
  }
}

//********************START******************************
//add function definition
//*********************END*****************************
function updateChat() {
  success = function(messages) {
    //unpackage the messages if using Protocol buffers
    if (useProto){
      var msg = PostMsgClient.decode(messages);
      messages = msg.messages;
    }

    //********************START******************************
    //change to be more efficient
    var second_index = useProto ? 'message_id' : 0 ;
    //*********************END*****************************

    //determine the newest message id added
    var newest_message_id;
    if(messages == ''){
      newest_message_id = 0;
    }
    else{
      newest_message_id = messages[0][second_index];
    }
    //If we've chosen a new user, clear the messages currently there
    if(change_user){
      $messages.empty();
      global_latest_message_id = 0;
    }

    //If we see new messages were added, append on the new messages
    if (newest_message_id > global_latest_message_id) {
      var last_message_id = global_latest_message_id;
      global_latest_message_id = newest_message_id;
      messages_out = [];

      for (var i = 0; i < messages.length; i++) { 
        message = messages[i];
        //Only add if its a new message
        if ( message[second_index] > last_message_id) {
          message_data = {};
          if (useProto){
            message_data.latest_id = message['message_id'];
            message_data.username = message['name'];
            message_data.message = message['message'];
          }
          else{
            message_data.latest_id = message[0];
            message_data.username = message[1];
            message_data.message = message[2];
          }
          messages_out.push(message_data)
        }
        else {
          //We know there are no more new messages so we can exit the loop
          break
        }
      }
      
      //Append the messages
      messages_out.reverse();
      for (var i = 0; i < messages_out.length; i++) {
        addChatMessage(messages_out[i]);
      }
    }
    
    //Finished changing user so set back to false
    if(change_user){
      change_user = false;
    }
  }

  //Only get messages if a chat is selected
  if (currently_selected){
    if (useProto){
      //********************START******************************
      //change to be more efficient
      data = new PreMsgClient({
        user_id: cleanInput(currently_selected),
        select_type: type_selected
      });
      
      
      //get success and error to work
      $.ajax({
        type: "POST",
        url: "get_messages", 
        responseType: 'arraybuffer',
        data: {protoString: data.toBase64()}, 
        success: success,
        error: function(data){console.log('failure'); console.log('fed')}
      })
      //*********************END*****************************
    }
    else{
      data = {user_id: cleanInput(currently_selected),
              select_type: type_selected}

      //********************START******************************
      //get success and error to work
      $.ajax({
        type: "POST",
        url: 'get_messages',
        dataType: "json",
        data: data,
        success: success
      });
      //*********************END*****************************
    }
  }
}

//********************START******************************
//add function definition
//note function doesnt update if user drops out
//*********************END*****************************
function updateUsers(){
  success = function(users) {
    if (useProto){
      var Usrmsg = UsrUsrs.decode(users);
      users = Usrmsg.usrs;
    }

    //********************START******************************
    //change to be more efficient
    var second_index = useProto ? 'user_id' : 0 ;
    //*********************END*****************************

    //If we see that we have more users than the global count
    if (users.length > global_user_count) {
      global_user_count = users.length;
      latest_user_id = users[0][second_index];
      users_out = [];

      for (var i = 0; i < users.length; i++) { 
        user = users[i];
        //add if id is greater than the last one added
        if (user[second_index] >= latest_user_id) {
          user_data = {};
          if (useProto){
            user_data.user_id = user['user_id'];
            user_data.name = user['name'];
          }
          else{
            user_data.user_id = user[0];
            user_data.name = user[1];
          }          
          users_out.push(user_data);
        }
        else {
          //We've found users we've already added so we don't need to re-add them
          break;
        }
      }

      //Empty users and add new one
      users_out.reverse();
      $('.user_select').empty();
      $('.user_select_modal').empty();
      for (var i = 0; i < users_out.length; i++) {
        var option = $('<option></option>').attr("value", users_out[i].user_id).text(users_out[i].name);
        var option2 = $('<option></option>').attr("value", users_out[i].user_id).text(users_out[i].name);
        $(".user_select").append(option);
        $('.user_select_modal').append(option2);
      }
      $('.ui.dropdown').dropdown({allowAdditions: false});  
    }
  }

  //********************START******************************
  //get success and error to work
  if (useProto){
    $.ajax({
      url: "get_users",
      success: success,
      responseType: 'arraybuffer',
      error: function(data){console.log('fed')}
    });
  }
  else{
    $.ajax({
      dataType: "json",
      url: "get_users",
      data: {format:'json'},
      success: success
    });
  }
  //*********************END*****************************
}

//********************START******************************
//add function definition
//note function doesnt update if user drops out
//*********************END*****************************
function updateGroups(){
  success = function(groups) {
    if (useProto){
      var Groupmsg = GrpUsrs.decode(groups);
      groups = Groupmsg.grpClient;
    }
    //********************START******************************
    //change to be more efficient
    var second_index = useProto ? 'group_id' : 0 ;
    //*********************END*****************************
    //If we see that we have more users than the global count
    if (groups.length > global_groups_count) {
      
      global_groups_count = groups.length
      latest_groups_id = groups[0][second_index]
      groups_out = []

      for (var i = 0; i < groups.length; i++) { 
        group = groups[i]
        //add if id is greater than the last one added
        if (group[second_index] >= latest_groups_id) {
          groups_data = {}
          if (useProto){
            groups_data.group_id = group['group_id']
            groups_data.group_name = group['group_name']
          }
          else{
            groups_data.group_id = group[0]
            groups_data.group_name = group[1]
          }
          groups_out.push(groups_data)
        }
        else {
          //We've found users we've already added so we don't need to re-add them
          break
        }
      }
      //Empty groups and add new one
      groups_out.reverse()
      $('.group_select').empty()
      for (var i = 0; i < groups_out.length; i++) {
        var option = $('<option></option>').attr("value", groups_out[i].group_id).text(groups_out[i].group_name);
        $(".group_select").append(option)
      }
    }
  } 

  //********************START******************************
  //get success and error to work
  if (useProto){
    $.ajax({
      url: "get_groups",
      success: success,
      responseType: 'arraybuffer',
      error: function(data){console.log('fed')}
    });
  }
  else{
    $.ajax({
      dataType: "json",
      url: "get_groups",
      data: {format:'json'},
      success: success
    });
  }
  //*********************END*****************************
}

//********************START******************************
//add function definition
// Adds the visual chat message to the message list
//*********************END*****************************
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


//********************START******************************
//add function definition
// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
//*********************END*****************************
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

//Send the message when the user hits enter and a chat box is selected
$window.keydown(function (event) {
  // When the client hits ENTER on their keyboard
  if (event.which === ENTER && type_selected != null){
    sendMessage();
  } 
});

//Function that calls all updates that are needed in once call 
function updateAll(){
  updateUsers();
  updateGroups();
  $('#g_sel').select2();
  $('#u_sel').select2();
}

//Logout of account
$("#logout").click(function () {location.href = "/logout";});

//Delete account
$("#delete_account").click(function() {
  if (window.confirm(DELETE_ERR_MESSAGE)) {
    location.href = "/delete_account"; 
  }
});

//Button that allows the user to switch between RESTFUL and ProtoBuffs
$("#transfer").click(function() {
  location.href = "/transfer"; 
});

//Function that updates the information and notifies that we selected a new chat
function updateInfo(id, type_sel, other_id){
  //find out who you are currently chatting and display the name
  var chat_name = $(id + ' option:selected').text();
  $('.center').replaceWith("<div class='center'>" + chat_name  + "</div>");
  $(other_id + ' option').removeAttr("selected");

  //update globals
  type_selected = type_sel
  currently_selected = $(id).val();
  change_user = true;
}
//Update info when a new user is selected
$('#u_sel').change(function(){ 
  updateInfo('#u_sel', 'user', '#g_sel');
});

//Update infor that new group is selected
$('#g_sel').change(function(){ 
  updateInfo('#g_sel', 'group', '#u_sel')
});

//********************START******************************
$('.modalCreateButton').click(function (){
  var values = $("#group_select>option:selected").map(function() { return parseInt($(this).val()); });
  var name = cleanInput($("#group_name").val())
  values = cleanInput(values.get())
  $("#group_select>option:selected").removeAttr("selected");
  $('.ui.dropdown').dropdown('restore defaults'); 
  $('#group_name').val('')
  data = {user_ids: values, group_name:name}
  if (!useProto){
      $.ajax({
        type: "POST",
        dataType: "json",
        url: 'create_group',
        data: data,
        success: function(data) {console.log('Success')}
       });

      }else{
        console.log("using proto")
        data_client = new GrpCreateClient(data);
    
        success = function() {
          console.log("successful return")
        }
         $.ajax({
          type: "POST",
          beforeSend: function (request){request.setRequestHeader("Accept", "application/x-protobuf");},
          url: "create_group", 
          data: {protoString: data_client.toBase64()}, 
          success: function(data) {console.log('Success')},
          error: function(data){console.log('failure'); console.log(data_client)}
        })
      }
})
//*********************END*****************************

//When the document is ready, update 
$(document).ready(updateAll());

//How often we update the chat
window.setInterval(updateChat, CHAT_INT);

//how often we update the users/groups
window.setInterval(updateAll, USER_INT);

