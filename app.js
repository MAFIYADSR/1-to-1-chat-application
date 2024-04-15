require('dotenv').config();
var mongoose = require('mongoose');
const ejs = require('ejs');
const path = require('path')
const express = require('express')

mongoose.connect('mongodb://127.0.0.1:27017/dynamic-chat-app');

// const public = require('./public')
const app = require('express')();

app.set('views', path.join(__dirname, 'views'))
app.set("view engine", "ejs");

const http = require('http').Server(app);

const userRoute = require('./routes/userRoutes');
const User = require('./models/userModel')
const Chat = require('./models/chatModel');

app.use(express.static(path.join(__dirname, 'public')))

app.use('/', userRoute);

const io = require('socket.io')(http);

var usp = io.of('/user-namespace');//I used /user-namespace. you can any other name also
usp.on('connection', async function(socket){
    console.log('User Connected');
    
    // console.log(socket)  //Go to console log terminal. Search for handshake in handshake search for auth.Where you will get token(User._id)
    var userId =socket.handshake.auth.token;
    await User.findByIdAndUpdate({_id: userId}, {$set:{is_online: '1'}});
     //User broadcust online status
     socket.broadcast.emit('getOnlineUser', {user_id: userId});

    socket.on('disconnect', async function(){
        console.log('User disconnected')
        var userId =socket.handshake.auth.token;
        await User.findByIdAndUpdate({_id: userId}, {$set:{is_online: '0'}});
           //User broadcust offline status
        socket.broadcast.emit('getOfflineUser', {user_id: userId});
    })

    //Chatting implementation
    socket.on('newChat', function(data){
        socket.broadcast.emit('loadNewChat', data);
    })

    // load old chat
    socket.on('existsChat', async function(data){
        var chats =  await Chat.find({$or:[
            { sender_id: data.sender_id, receiver_id: data.receiver_id},
            { sender_id: data.receiver_id, receiver_id: data.sender_id}
        ]
        });

        socket.emit('loadChats', { chats: chats});
    });

    // delete chats

    socket.on('chatDeleted', function(id){
        socket.broadcast.emit('chatMessageDeleted', id);
    })


});



http.listen(3000, function () {
    console.log("Server is running");
})