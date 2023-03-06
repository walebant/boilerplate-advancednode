$(document).ready(function () {
  const socket = io();

  socket.on("user", (data) => {
    $("#num-users").text(`${data.currentUsers} users online`);
    const message = `${data.username} has ${
      data.connected ? "joined " : "left"
    } the chat.`;
    $("#messages").append($("<li>").html("<b>" + message + "</br>"));
  });

  socket.on("chat message", (data) => {
    $("#messages").append($("<li>").text(`${data.username}: ${data.message}`));
  });

  // Form submittion with new message in field with id 'm'
  $("form").submit(function () {
    const messageToSend = $("#m").val();
    socket.emit("chat message", messageToSend);
    $("#m").val("");
    return false; // prevent form submit from refreshing page
  });
});
