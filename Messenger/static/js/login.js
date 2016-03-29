// This is our local javascript file used for the login and register page
// These pages are different than the main chat page and so they have a 
// simplified javascript sheet used for the simple information
// mainly used to post data to the server to create and update account info

// Initialize tags
var $window = $(window);
var $loginButton = $('.login_button'); 
var $registerButton = $('.register_button'); 
var $loginInput = $('.loginInput');
var $usernameInput = $('.usernameInput'); // Input for username
$usernameInput.focus();

var ENTER = 13;

// Prevents input from having injected markup
function cleanInput (input) {
  return $('<div/>').text(input).text();
}

//When the loginbutton is clicked, send the email and password to the server
$loginButton.click(function(){
	var email = cleanInput($($loginInput[0]).val());
	var password = cleanInput($($loginInput[1]).val());
	if (email && password) {
		$.ajax({
			type: "POST",
			url: "login", 
			data: {email:email, password:password},
			success:function(data){window.location.replace("/");}
		})
	}
	else {
		console.log('Empty fields')
	}
})

//When the register button is clicked, send the email, password and name to server 
//in order to create an account
$registerButton.click(function(){
	//We are on register page so we try to send info to the server
  if (document.URL.indexOf('register') != -1) { 
  	// Check to make sure that things exist
  	var name = cleanInput($($loginInput[0]).val());
  	var email = cleanInput($($loginInput[1]).val());
		var password = cleanInput($($loginInput[2]).val());

		$.ajax({
			type: "POST",
			url: "register", 
			data: {email:email, password:password, name:name}, 
			success:function(data){window.location.replace("/");}
			})
	  }
  else { //we are on login page so go to register page
  	window.location.replace("register");
  };
})

//Register or login when hitting enter depending on URL
$window.keydown(function (event) {
  // When the client hits ENTER on their keyboard
  if (event.which === ENTER) {
	  if (document.URL.indexOf('register') != -1) { 
	  	$registerButton.click()
	  }
	  else {
	  	$loginButton.click()
	  }
  }
});


