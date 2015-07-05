"use strict";
// initialize Hoodie
var hoodie  = new Hoodie();

// replace currentUser avatar data with the current username, if there is one, then fetch the real avatar.
if ( hoodie.account.username ) {
  $('[data-avatar="currentUser"]').attr('data-avatar', hoodie.account.username);
  fetchAvatar();
}

// create a scoped 'message' store for easier re-use
var messageStore = hoodie.store('message');

var avatarStore = hoodie.store('avatar');

// Select the chat form
var chatForm = $('[data-action="chat-input"]');

// Select the textarea from the chat form
var chatBox = $('[data-action="send-message"]');

// Select the chat stream area
var chatStream = $('[data-action="chat-stream"]');

// Setup keydown listener for power user message submitting, CMD/Ctrl + Enter
chatBox.on('keydown', checkSubmit);

function checkSubmit(e) {
  // if the CMD/Ctrl key and the Enter key are both pressed down, then send the message to the store
  if (e.metaKey && e.keyCode === 13) {
    sendMessage(e);
  }
}

// Setup submit event listener on chat form
chatForm.on('submit', sendMessage);

// create sendMessage function
function sendMessage(e) {
  e.preventDefault();

  // check for content in the chatBox,
  // if there is content,
  // then assign it to a variable
  // else, return false to cancel function
  var messageContent = chatBox.val().trim();

  if ( messageContent.length < 1 ) { return false; }

  // create a new message model
  var message = new messageModel(messageContent);

  // using the global messageStore, add this message object and publish it to the global store.
  messageStore.add(message).publish();

  // trigger an immediate sync with the server
  hoodie.remote.push();

  // Dont't forget to clear out the charBox
  chatBox.val('');
}

// create a message model for re-use later
function messageModel(message) {
  var user = hoodie.account.username;
  var postDate = new Date();

  return {
    'user': user,
    'date': postDate,
    'message': message
  };
}

// create a notification model for re-use later
function notifyModel(notification, status) {
  var postDate = new Date();

  return {
    'date': postDate,
    'notification': notification,
    'status': status
  };
}

$('.user-avatar').on('click', showFileInput);

function showFileInput(e) {
  var parent = $('#account');
  var fileInput = $('<input type="file" accept="image/png, image/jpeg, image/gif" data-action="uploadAvatar" />');
  var inputContainer = $('<div class="bg-white input-container"></div>');

  fileInput.on('change', handleImgUpload);

  inputContainer.append(fileInput);
  parent.prepend(inputContainer);
}

function handleImgUpload(e) {
  avatarProcess(e.target.files[0]);
  e.target.remove();
}

// create an avatar for re-use later
function avatarProcess(imgData) {
  function handleImg(img) {
    return function process(e) {
      var src = e.target.result;
      var props = {
        src: src,
        id: hoodie.account.username
      };

      saveAvatar(props);
    };
  }

  var reader = new FileReader();
  reader.onload = handleImg(imgData);
  reader.readAsDataURL(imgData);
}

function saveAvatar(props) {
  hoodie.store.updateOrAdd('avatar', hoodie.account.username, props).publish().then(function(avatar) {
    var avatarEl = $('[data-avatar="'+avatar[0].id+'"]');
    avatarEl[0].src = avatar[0].src;
  })
  .catch(function(error) { console.log(error); });

}

function fetchAvatar(user) {
  var user = user || hoodie.account.username;
  var imgEl = $('[data-avatar="'+user+'"]');
  
  hoodie.global.find('avatar', user)
    .then(function(avatar) { imgEl.attr('src', avatar.src); })
    .catch(function(error) { console.log(user, error); return; });
}

// setup event listener for new messages being saved to Hoodie
hoodie.global.on('add', streamMessage);

// post newly added message to the stream
function streamMessage(message) {
  if(message.notification) { return streamNotification(message); }

  if (message.type !== 'message') { return; }

  var date = new Date(message.date);
  var bgColor = message.user === hoodie.account.username ? "bg-silver" : "bg-white";
  
  // create template to store message content
  var messageTemplate = $('<div class="p1 '+bgColor+' flex flex-stretch"></div>');
  var messageAvatar = $('<aside class="flex flex-stretch rounded overflow-hidden mr2"><img src="http://placekitten.com/g/50/50" width="50px" height="50px" data-avatar="'+message.user+'" alt="'+message.user+'\'s avatar"/></aside>');
  var messageContentContainer = $('<div></div>');
  var messageUser = $('<h4 class="inline-block mt0 mr1">'+message.user+'</h4>');
  var messageDate = $('<span class="inline-block h6 regular muted">'+date.toLocaleTimeString()+'</span>');
  var messageContent = $('<p class="mb0">'+message.message+'</p>');

  // insert data into template
  messageTemplate.append(messageAvatar);
  messageContentContainer.append(messageUser);
  messageContentContainer.append(messageDate);
  messageContentContainer.append(messageContent);
  messageTemplate.append(messageContentContainer);

  // finally, insert template into the chat stream
  // then, clear out the chat box
  messageTemplate.appendTo(chatStream);

  // start async proces of fetching the avatar for this user
  fetchAvatar(message.user);

  // scroll the new message into view if it overflows the chat stream
  scrollIntoViewIfNeeded(messageTemplate[0]);
}

function notifySignIn(e) {
  var notification = e + " has signed into the chat.";
  var model = new notifyModel(notification, 'green');

  messageStore.add(model).publish();
}

function notifySignOut(e) {
  var notification = e + " has signed out or disconnected.";
  var model = new notifyModel(notification, 'red');

  messageStore.add(model).publish();
}

function streamNotification(notification) {
  var date = new Date(notification.date);

  // create template for notification
  var notifyTemplate = $('<div class="px1"></div>');
  var notifyContent = $('<h5 class="inline-block mr1 '+notification.status+'">'+notification.notification+'</h5>');
  var notifyDate = $('<span class="inline-block h6 regular muted">'+date.toLocaleTimeString()+'</span>');

  // insert data into template
  notifyTemplate.append(notifyContent);
  notifyTemplate.append(notifyDate);

  // insert template into chat stream
  notifyTemplate.appendTo(chatStream);

  // scroll the notification into view if it overflows the chat stream
  scrollIntoViewIfNeeded(notifyTemplate[0]);
}

function scrollIntoViewIfNeeded(element) {
  if (element.offsetTop > element.parentNode.offsetHeight) {
    element.scrollIntoView();
  }
}
