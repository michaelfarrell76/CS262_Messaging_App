var $loginButton = $('.login_button'); // Input message input box
var $registerButton = $('.register_button'); // Input message input box
var $loginInput = $('.loginInput');
var $window = $(window);

// Need to show login/registration failures
function warning (message) {
	console.log(message)
}

function cleanInput (input) {
  return $('<div/>').text(input).text();
}

$loginButton.click(function(){
  // Show error mesages if not
	var email = cleanInput($($loginInput[0]).val());
	var password = cleanInput($($loginInput[1]).val());
	if (email && password) {
		$.ajax({
		type: "POST",
		url: "login", 
		data: {email:email, password:password}, 
		success:function(data){window.location.replace("/");},
		// Failure message should be flashed via Flask
		error: function(data){console.log('failure'); console.log(data)}
		})
	}
	else {
		warning('Empty fields')
	}
})

$registerButton.click(function(){
  if (document.URL.indexOf('register') != -1) { 
  	// Check to make sure that things exist
  	var name = cleanInput($($loginInput[0]).val());
  	var email = cleanInput($($loginInput[1]).val());
	var password = cleanInput($($loginInput[2]).val());

	$.ajax({
		type: "POST",
		url: "register", 
		data: {email:email, password:password, name:name}, 
		success:function(data){window.location.replace("/");},
		error: function(data){console.log('failure'); console.log(data)}
		})
  }
  else {
  	window.location.replace("register");
  };
})

$window.keydown(function (event) {
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
	  if (document.URL.indexOf('register') != -1) { 
	  	$registerButton.click()
	  }
	  else {
	  	$loginButton.click()
	  }
  }
});



