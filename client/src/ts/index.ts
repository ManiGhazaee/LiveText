import { _, id, replace, spice } from "./lib.js";
import { Socket } from "socket.io-client";

declare function io(opts?: string): Socket;

const root = document.getElementById("root")!;

const socket = io("ws://0.0.0.0:8080");

socket.on("hello", (data: string) => {
    console.log(data);
});
socket.emit("hello", "hello");
console.log(socket);

let text = "";
let caretIndex = 0;

window.addEventListener("keydown", (ev) => {
    console.log(ev.key);
    if (ev.key === "Backspace") {
        if (caretIndex === 0) return;
        text = spice(text, caretIndex - 1, 1);
        caretIndex--;
        replaceChatInput();
        return;
    }
    if (ev.key === "Enter") {
        text = spice(text, caretIndex, 0, "\n");
        caretIndex++;
        replaceChatInput();
        return;
    }
    if (ev.key === "ArrowRight") {
        if (caretIndex === text.length) return;
        caretIndex++;
        replaceChatInput();
        return;
    }
    if (ev.key === "ArrowLeft") {
        if (caretIndex === 0) return;
        caretIndex--;
        replaceChatInput();
        return;
    }
    if (ev.key.length > 1) return;

    if (ev.key === ";") {
        text = spice(text, caretIndex, 0, ";");
    } else {
        text = spice(text, caretIndex, 0, ev.key);
    }
    caretIndex++;
    replaceChatInput();
    // console.log("text", text);
    // console.log("caretIndex", caretIndex);
    // console.log("chatInput", ChatInput());
});

const ChatInput = () => {
    const wrapper = _`;chat-input-wrapper;`;

    let textByLines: string[] = text.slice().split("\n");
    let charIndex = -1;

    for (let i = 0; i < textByLines.length; i++) {
        textByLines[i] += " ";
        const lineWrapper = _`;chat-input-line-wrapper;`;

        for (let j = 0; j < textByLines[i].length; j++) {
            charIndex++;
            const char = InputChar(textByLines[i][j]);

            if (caretIndex === charIndex) {
                char.classList.add("input-char-caret");
            }

            const _charIndex = charIndex;
            char.addEventListener("mousedown", (ev: MouseEvent) => {
                ev.stopPropagation();
                caretIndex = _charIndex;
                replaceChatInput();
            });

            lineWrapper.appendChild(char);
        }

        const _charIndex = charIndex;
        lineWrapper.addEventListener("mousedown", (ev: MouseEvent) => {
            ev.stopPropagation();
            caretIndex = _charIndex;
            replaceChatInput();
        });
        wrapper.appendChild(lineWrapper);
    }

    if (caretIndex === text.length + 1) {
        wrapper.lastChild?.appendChild(_`;;input-caret;_`);
    }

    wrapper.addEventListener("click", (ev) => {
        if (ev.target !== wrapper) return;
        // caretIndex = text.length;
        replaceChatInput();
    });
    return wrapper;
};

const InputChar = (char: string) => {
    switch (char) {
        case ";": {
            char = "CTM_IGNR_SEMIC";
        }
        case "%": {
            char = "CTM_IGNR_PERC";
        }
        case "`": {
            char = "CTM_IGNR_BCKTICK";
        }
        case "'": {
            char = "CTM_IGNR_APOS_1";
        }
        case '"': {
            char = "CTM_IGNR_APOS_2";
        }
        case " ": {
            const elem = _`;;input-char-space ;_`;
            elem.innerHTML = "&nbsp;&nbsp;";
            return elem;
        }
        default: {
            return _`;;input-char;${char}`;
        }
    }
};

root.appendChild(ChatInput());

function replaceChatInput() {
    replace(id("chat-input-wrapper"), ChatInput());
}

function StatusBar() {}
