
// to reduce development headaches
// do not include in production
const io = require('socket.io')({
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const socket = {io: io};

// open a connection on /api/socket
io.of('/api/socket').on("connection", (socket) => {

    console.log("socket.io: User connected: ", socket.id);

    socket.on("disconnect", () => {
        console.log("socket.io: User disconnected: ", socket.id);
    });
});

module.exports = socket;
