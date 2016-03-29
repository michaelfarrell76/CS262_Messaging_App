/*!
 * This is the main javascript file for the chat application
 * It contains support for the itmes on the main index page which
 * mainly just communicates with the server and constantly refreshes 
 * the users, groups and messages to reflect the current information. 
 *
 * The code is broken mainly into two parts, one for sending information using REST
 * and the other is sending information using Googles Protocol buffers 
 */

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

//used to differentiate the type of chat
var USER = 0; 
var GROUP = 1;

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
var type_selected = null; //either USER or GROUP to reflect the type of chat
var change_user = false; //when true, indicates that we need to load in fresh messages
var message_load_error = false; //indicate we haven't alerted yet about failing to load messages
var usr_grp_load_error = false; //indicate we haven't alerted yet about failing to load users/groups

//Defining the current protocol we'll be using
var useProto = (USE_PROTOBUFF === "True"); 

var MsgClient, Msg, PostMsgClient, UsrGrp, UsrGrpClient;
if(useProto){
  //Setting up Protocol Buffers
  var protojson = angular.module('protojson', []);
  protojson.config(['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('{[');
    $interpolateProvider.endSymbol(']}');
  }]);
  var ProtoBuf = dcodeIO.ProtoBuf;

  //Location of proto file
  var builder = ProtoBuf.loadProtoFile("/static/message.proto");

  //Build message objects
  MsgClient = builder.build("MsgClient");
  Msg = builder.build("Msg");
  PostMsgClient  = builder.build("PostMsgClient");
  UsrGrp = builder.build("UsrGrp");
  UsrGrpClient = builder.build("UsrGrpClient");
}

/*!
 * This function takes in the message from the chat box and 
 * sends the message to the FLASK server using either RESTFUL or protocol buffers 
 * The result of the function is logged to the console and an alert
 * message is thrown if the message failed to send
 */
function sendMessage () {
  //Only send a message if a chat instance is selected
  if (type_selected != null){
    var message = cleanInput($inputMessage.val());
    if (message){
      if (useProto){ //Using protocol buffers
        var data = new MsgClient({
          id: parseInt(cleanInput(currently_selected)),
          chat_type: type_selected,
          message: message
        });

        data = {protoString: data.toBase64()}
      }
      else{ //Using RESTFUL 
        var data = {message: message, 
                    other_uid: parseInt(cleanInput(currently_selected)),
                    select_type: type_selected};
      }

      failure = function() {
        console.log("Message Failed to Send");
        alert('Message Failed to Send');
      }
      success = function (){
        console.log("Message Sent");
      }

      //Send message to server
      $.ajax({
          type: "POST",
          url: "send_message", 
          data: data, 
          success: success,
          error: failure
        })

      //Clear the message input
      $inputMessage.val('');
    }
    updateChat();
  }
}

/*!
 * This function makes a post request to the server in order to update the current
 * chat. This function will use either RESTFUL or Protocol buffers to generate
 * a package containing the requested information, and it should return a package
 * containing the messages to display on success, and alerts the failed message fetch
 * on error.
 */
function updateChat() {

  //If messages successfully fetched, display them
  success = function(messages) {
    //unpackage the messages if using Protocol buffers
    if (useProto){
      var msg = PostMsgClient.decode(messages);
      messages = msg.messages;
    }

    var second_index = useProto ? 'message_id' : 0 ;

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

  //if messages failed to load, log and alert if first time
  failure = function() {
    console.log("Failed to load messages");

    //If we have not thrown an alert yet, notify user that we cannot load messages
    if (!message_load_error){
      alert('Failed to load messages');
      message_load_error = true;
    }
  }

  //Only get messages if a chat is selected
  if (currently_selected){
    //bundle requests and send the user id of the person we are looking for
    if (useProto){
      data = new MsgClient({
        id: parseInt(cleanInput(currently_selected)),
        chat_type: type_selected
      });
      data = {protoString: data.toBase64()}

      //send request to server
      $.ajax({
        type: "POST",
        url: "get_messages", 
        responseType: 'arraybuffer',
        data: data, 
        success: success,
        error: failure
      })
    }
    else{
      data = {user_id: parseInt(cleanInput(currently_selected)),
              select_type: type_selected}

      //send request to server
      $.ajax({
        type: "POST",
        url: "get_messages", 
        dataType: 'json',
        data: data, 
        success: success,
        error: failure
      })
    } 
  }
}

/*!
 * This function makes a post request to the server in order to update the current
 * users. When receiving the package, this function will use either RESTFUL or Protocol buffers 
 * in order to parse the requested information. On success, this funciton will add the new users
 * to the current list, and on failure it will log the error and alert once that we failed to load users
 * or that we failed to load groups, but not both. If the users are the same as the last request that
 * was made, the list of users on the webpage is left untouched.
 */
function updateUsers(){
  //On success, check if new users added and if so add them
  success = function(users) {
    if (useProto){
      var Usrmsg = UsrGrpClient.decode(users);
      users = Usrmsg.members;
    }

    var second_index = useProto ? 'id' : 0 ;

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
            user_data.user_id = user['id'];
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

  //if users failed to load, log and alert if first time
  failure = function() {
    console.log("Failed to load users");

    //If we have not thrown an alert yet, notify user that we cannot load users
    if (!usr_grp_load_error){
      alert('Failed to load users');
      usr_grp_load_error = true;
    }
  }

  if (useProto){
    $.ajax({
      url: "get_users",
      success: success,
      responseType: 'arraybuffer',
      error: failure
    });
  }
  else{
    $.ajax({
      dataType: "json",
      url: "get_users",
      data: {format:'json'},
      success: success,
      error: failure
    });
  }
}

/*!
 * This function is similar to updateUsers() except it is specifically for groups
 * could eventually be combined into one function but left separate during development
 */
function updateGroups(){
  //On success, check if new groups added and if so add them
  success = function(groups) {
    if (useProto){
      var Groupmsg = UsrGrpClient.decode(groups);
      groups = Groupmsg.members;
    }

    var second_index = useProto ? 'id' : 0 ;

    //If we see that we have more groups than the global count
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
            groups_data.group_id = group['id']
            groups_data.group_name = group['name']
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

  //if users failed to load, log and alert if first time
  failure = function() {
    console.log("Failed to load groups");

    //If we have not thrown an alert yet, notify user that we cannot load groups
    if (!usr_grp_load_error){
      alert('Failed to load groups');
      usr_grp_load_error = true;
    }
  }

  if (useProto){
    $.ajax({
      url: "get_groups",
      success: success,
      responseType: 'arraybuffer',
      error: failure
    });
  }
  else{
    $.ajax({
      dataType: "json",
      url: "get_groups",
      data: {format:'json'},
      success: success,
      error: failure
    });
  }
}

/*!
 * This function takes in a message object containing a username and
 * message field, and displays the message in the chat field on the main page
 */
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

/*!
 * This function adds a message element to the messages and scrolls to the bottom
 * el - The element to add as a message
 * options.fade - If the element should fade-in (default = true)
 * options.prepend - If the element should prepend
 */
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
  updateInfo('#u_sel', USER, '#g_sel');
});

//Update infor that new group is selected
$('#g_sel').change(function(){ 
  updateInfo('#g_sel', GROUP, '#u_sel')
});

/*!
 * This is the callback for when the creategroup button is pressed
 * user is alerted whether the group was successfully created or not
 */
$('.modalCreateButton').click(function (){
  //users added to group
  var values = $("#group_select>option:selected").map(function() { return parseInt($(this).val()); });
  values = cleanInput(values.get())

  //name of group
  var name = cleanInput($("#group_name").val())
  
  $("#group_select>option:selected").removeAttr("selected");
  $('.ui.dropdown').dropdown('restore defaults'); 
  $('#group_name').val('');
  
  data = {user_ids: values, name:name}
  if (useProto){
    data_client = new UsrGrp(data);
    data = {protoString: data_client.toBase64()}
  }

  failure = function() {
    console.log("Failed to create group");
    alert("Failed to create group");
  }
  success = function (){
    console.log("Successfully created new group");
    alert("Successfully created new group");
  }

  $.ajax({
    type: "POST",
    url: 'create_group',
    data: data,
    success: success,
    error: failure
   });
  
})

//When the document is ready, update 
$(document).ready(updateAll());

//How often we update the chat
window.setInterval(updateChat, CHAT_INT);

//how often we update the users/groups
window.setInterval(updateAll, USER_INT);

