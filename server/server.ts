import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "*",
    },
});

io.on("connection", (socket) => {
    console.log("user connected");
    socket.emit("hello", "hello");

    let room: string | null = null;

    socket.on("hello", (data: string) => {
        console.log(data);
    });

    socket.on("room_create", (data: { room: string }) => {
        if (io.sockets.adapter.rooms.has(data.room)) {
            socket.emit("room_create", {
                success: false,
                msg: `Room with the name "${data.room}" already exists. Try choosing another name or don't enter a name.`,
            });
            return;
        }
        socket.join(data.room);
        room = data.room;
        socket.emit("room_create", { success: true, msg: `Created and joined room "${data.room}" successfully.` });
    });
    socket.on("room_join", (data: { room: string }) => {
        if (!io.sockets.adapter.rooms.has(data.room)) {
            socket.emit("room_join", {
                success: false,
                msg: `Room with the name "${data.room}" doesn't exists.`,
                room: "",
            });
            return;
        }
        socket.join(data.room);
        room = data.room;
        socket.emit("room_join", { success: true, msg: `Joined room "${data.room}" successfully.`, room: data.room });
    });
    socket.on("text", (data: { text: string; caretIndex: number }) => {
        if (room) {
            socket.to(room).emit("text", data);
        }
    });
});

io.listen(8080);

function randStr(len: number) {
    return;
}
