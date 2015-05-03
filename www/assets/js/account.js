"use strict";
// initialize Hoodie
var hoodie  = new Hoodie();

var login = $("#login");
var loginform = $("#loginform");

function loginHide(){
	login.hide();
	$('#userName').html(hoodie.account.username);
}

if(hoodie.account.username == undefined)  {
	login.show();
} else {
	loginHide();
};

$('#loginform').submit(function (event) {
  event.preventDefault();
  var username = $('#user').val();
  var password = $('#pwd').val();

  hoodie.account.signIn(username, password)
  .done(
  	function(){
  		loginHide();
  	}
  ).fail(
		function(){
  			hoodie.account.signUp(username, password, password)
			  .done(
			  	function(){
			  		loginHide();
			  	}
			  ).fail(
					function(){
			  			console.log('fail');
			  		}
			  );
  		}
  );
  
});
hoodie.account.on('error:unauthenticated signout', function(){
	login.show();
});

hoodie.account.on('signin signup', function(){
	login.hide();
});

$('#signOut').click(function(){
	hoodie.account.signOut();
});
