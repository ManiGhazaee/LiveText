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

    socket.on("room_join", (data: { name: string; room: string }) => {
        const adptrRoom = io.sockets.adapter.rooms.get(data.room);
        if (!adptrRoom || (adptrRoom && adptrRoom.size === 0)) {
            socket.join(data.room);
            room = data.room;
            socket.emit("room_join", {
                success: true,
                msg: `"${data.room}" created and "${data.name}" joined ${new Date()}`,
                room: data.room,
                state: "TALK",
            });
        } else if (adptrRoom && adptrRoom.size === 1) {
            socket.join(data.room);
            room = data.room;
            socket.emit("room_join", {
                success: true,
                msg: `Joined "${data.room}" ${new Date()}`,
                room: data.room,
                state: "LISTEN",
            });
            socket.to(data.room).emit("joined", { msg: `"${data.name}" joined "${data.room}"` });
        } else {
            socket.emit("room_join", { success: false, msg: `"${data.room}" is full`, room: "", state: "MENU" });
        }
    });

    socket.on("send_text", (data: { text: string; caretIndex: number }) => {
        if (room) {
            socket.to(room).emit("send_text", data);
        }
    });

    socket.on("text", (data: { text: string; caretIndex: number }) => {
        if (room) {
            socket.to(room).emit("text", data);
        }
    });

    socket.on("talk_request", (data: { room: string }) => {
        if (room) {
            socket.to(room).emit("talk_request", data);
        }
    });

    socket.on("force_talk", (data: { room: string }) => {
        if (room) {
            socket.to(room).emit("force_talk", data);
        }
    });

    socket.on("leave", (data: { name: string; room: string }) => {
        if (room) {
            socket.to(room).emit("leave", data);
        }
        io.sockets.adapter.rooms.delete(data.room);
    });
});

io.listen(8080);

function randStr(len: number) {
    return;
}
