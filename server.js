
const express = require("express");
const app = express();
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const axios = require('axios').default;
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const server = http.createServer(app);
const io = socketio(server);
app.use(express.static(path.join(__dirname, './public')));

const {
  Sequelize
} = require('sequelize');

const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");

const router = express.Router();

// dotenv.config();

require('dotenv').config();


const sequelize = new Sequelize(process.env.DATABASE_URL)
// 'postgres://localhost:5432/dunia'


// const sequelize = new Sequelize('postgres://localhost:5432/dunia')


//middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));



app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);


//testing 
app.get('/',(req,res)=>{
  res.send('welcome to homepage!!');
})








let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({
      userId,
      socketId
    });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

const createConvo = (senderId, receiverId, text) => {
  axios.post('http://localhost:8800/api/conversations/', {
      senderId: senderId,
      receiverId: receiverId
    })
    .then((response) => {
      console.log(response.data);
      saveMessage(response.data.id, senderId, text)
    })
    .catch(function (error) {
      console.log(error);
    });
}

const saveMessage = (conversationId, sender, text) => {
  axios.post('http://localhost:8800/api/messages/', {
      conversationId: conversationId,
      sender: sender,
      text: text
    })
    .then((response) => {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

io.on("connection", (socket) => {
  //when ceonnect
  console.log("a user connected.");


  //take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  //send and get message
  socket.on("sendMessage", ({
    senderId,
    receiverId,
    text
  }) => {
    const user = getUser(receiverId);

    axios.get(`http://localhost:8800/api/conversations/find/${senderId}/${receiverId}`)
      .then((response) => {
        console.log('response.data' + response.data);
        if (response.data) {
          saveMessage(response.data.id, senderId, text)
          io.to(user.socketId).emit("getMessage", {
            senderId,
            text,
          });
        } else {
          createConvo(senderId, receiverId, text)
          io.to(user.socketId).emit("getMessage", {
            senderId,
            text,
          });
        }
      })
      .catch(function (error) {
        console.log(error);
      });
  });

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

const start = (port) => {
  server.listen(port, async () => {
    try {
      await sequelize.authenticate();
      console.log('Connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }

    console.log("Backend server is running!");
  });
}
module.exports = {
  app,
  start
}

