// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Use the gravatar module, to turn email addresses into avatar images:



// Export a function, so that we can pass 
// the app and io instances from the app.js file:

module.exports = function(app,io){

	// Initialize a new socket.io application, named 'chat'
	var chat = io.on('connection', function (socket) {

		// When the client emits the 'load' event, reply with the 
		// number of people in this chat room

		socket.on('load',function(data){

			var room = findClientsSocket(io,data);
			if(room.length === 0 ) {

				socket.emit('peopleinchat', {number: 0});
			}
			else if(room.length >= 1 && room.length <= 4) {

				//console.log(room);
				var user_names = [],
						profile_pics = [];
					room.forEach(function(data){
						user_names.push(data.user_name);
						profile_pics.push(data.profile_pic);
					});
				socket.emit('peopleinchat', {
					number: room.length,
					user_names: user_names,
					profile_pics: profile_pics,
					id: data
				});
			}
			else if(room.length > 4) {
				chat.emit('tooMany', {boolean: true});
			}
		});

		// When the client emits 'login', save his name and avatar,
		// and add them to the room
		socket.on('login', function(data) {

			var room = findClientsSocket(io, data.id);
			// Only two people per room are allowed
			if (room.length < 4) {

				// Use the socket object to store data. Each client gets
				// their own unique socket object

				socket.user_name = data.user_name;
				socket.room = data.id;
				socket.profile_pic = data.profile_pic;

				// Tell the person what he should use for an avatar
//				socket.emit('img', socket.avatar);


				// Add the client to the room
				socket.join(data.id);

				if (room.length >= 1) {

					var user_names = [],
						profile_pics = [];

					room.forEach(function(data){
						user_names.push(data.user_name);
						profile_pics.push(data.profile_pic);
					});
					user_names.push(socket.user_name);
					
					profile_pics.push(socket.profile_pic);



					// Send the startChat event to all the people in the
					// room, along with a list of people that are in it.

					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						user_names: user_names,
						profile_pics: profile_pics
					});
				}
			}
			else {
				socket.emit('tooMany', {boolean: true});
			}
		});

		// Somebody left the chat
		socket.on('disconnect', function() {

			// Notify the other person in the chat room
			// that his partner has left

			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user_name: this.username,
				profile_pic: this.profile_pic
			});

			// leave the room
			socket.leave(socket.room);
		});


		// Handle the sending of messages
		socket.on('msg', function(data){

			// When the server receives a message, it sends it to the other person in the room.
			socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user_name: data.user_name, profile_pic: data.profile_pic});
		});
	});
};

function findClientsSocket(io,roomId, namespace) {
	var res = [],
		ns = io.of(namespace ||"/");    // the default namespace is "/"

	if (ns) {
		for (var id in ns.connected) {
			if(roomId) {
				var index = ns.connected[id].rooms.indexOf(roomId) ;
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			}
			else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}


