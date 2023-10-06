import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "*",
    },
});

io.on("connection", (socket) => {
    console.log("user connected");
    socket.emit("hello", "hello");

    socket.on("hello", (data: string) => {
        console.log(data);
    });
});

io.listen(8080);
