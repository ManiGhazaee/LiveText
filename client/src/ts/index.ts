import { _, id, replace, spice, SettingModes, States } from "./lib.js";
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
let settingState = true;
let isShiftPressed = false;

const states = new States([
    {
        name: "font_size",
        mode: SettingModes.number,
        desc: "Font size",
        default: 18,
        min: 10,
        max: 40,
    },
]);

window.addEventListener("keyup", (ev) => {
    if (ev.key === "Shift") {
        isShiftPressed = false;
    }
});

window.addEventListener("keydown", (ev) => {
    if (settingState) return;

    switch (ev.key) {
        case "Backspace": {
            if (caretIndex === 0) return;
            text = spice(text, caretIndex - 1, 1);
            caretIndex--;
            replaceChatInput();
            return;
        }
        case "Enter": {
            if (isShiftPressed) {
                sendMessage();
                return;
            }
            text = spice(text, caretIndex, 0, "\n");
            caretIndex++;
            replaceChatInput();
            return;
        }
        case "ArrowRight": {
            if (caretIndex === text.length) return;
            caretIndex++;
            replaceChatInput();
            return;
        }
        case "ArrowLeft": {
            if (caretIndex === 0) return;
            caretIndex--;
            replaceChatInput();
            return;
        }
        case "Escape": {
            settingState = !settingState;
            return;
        }
        case "Shift": {
            isShiftPressed = true;
            return;
        }
    }
    if (ev.key.length > 1) return;

    if (ev.key === ";") {
        text = spice(text, caretIndex, 0, ";");
    } else {
        text = spice(text, caretIndex, 0, ev.key);
    }
    caretIndex++;
    replaceChatInput();
    console.log("text", text);
    // console.log("text", text);
    // console.log("caretIndex", caretIndex);
    // console.log("chatInput", ChatInput());
});

function sendMessage() {
    text = "";
    caretIndex = 0;
    replaceChatInput();
}

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
            break;
        }
        case "%": {
            char = "CTM_IGNR_PERC";
            break;
        }
        case "`": {
            char = "CTM_IGNR_BCKTICK";
            break;
        }
        case "'": {
            char = "CTM_IGNR_APOS_1";
            break;
        }
        case '"': {
            char = "CTM_IGNR_APOS_2";
            break;
        }
        case " ": {
            const elem = _`;;input-char-space ;_`;
            elem.innerHTML = "&nbsp;";
            return elem;
        }
    }
    return _`;;input-char;${char}`;
};

root.appendChild(ChatInput());

function replaceChatInput() {
    replace(id("chat-input-wrapper"), ChatInput());
}

function replaceSetting() {
    replace(id("setting-wrapper"), Setting(settingState));
}

function Setting(displayState: boolean) {
    if (!displayState) {
        return _``;
    }

    const wrapper = _`
    ;setting-wrapper;
        ;;;Setting;%%style=padding-left: 8px; position: relative;
            ;setting-close;;Close;
    `;

    const settingClose = wrapper.querySelector("#setting-close")! as HTMLElement;
    settingClose.addEventListener("click", () => {
        settingState = false;
        replaceSetting();
    });

    for (const key in states) {
        if (!Object.prototype.hasOwnProperty.call(states, key)) continue;

        const item = states[key];

        switch (item.mode) {
            case SettingModes.number: {
                const elem = _`
                ;${key};setting-item;${item.desc};
                tabindex=0
                    ;${key}-state;setting-item-state;${item.state}
                `;

                elem.addEventListener("focusin", (ev) => {
                    elem.style.backgroundColor = "white";
                    elem.style.color = "black";

                    const lastChild = (elem.lastChild as HTMLElement)!;
                    lastChild.innerHTML = "";

                    elem.addEventListener("keydown", (ev) => {
                        if (/\d/.test(ev.key)) {
                            lastChild.innerHTML += ev.key;
                            states[key].state = parseInt(lastChild.innerHTML);
                        }
                    });
                });
                elem.addEventListener("focusout", (ev) => {
                    elem.style.backgroundColor = "black";
                    elem.style.color = "white";

                    elem.removeEventListener("keydown", (ev) => {});

                    correctByMinMax(key);
                    replaceSetting();
                });

                wrapper.appendChild(elem);
            }
        }
    }
    return wrapper;
}

// setInterval(() => {
//     console.log(states.font_size.state);
// }, 500);

function correctByMinMax(stateName: string) {
    const item = states[stateName];

    if (!item || !("min" in item) || !("max" in item)) return;
    if ((item.min && parseInt(item.state) < item.min) || (item.max && parseInt(item.state) > item.max)) {
        states[stateName].state = states[stateName].default;
    }
}

root.appendChild(Setting(settingState));

function chat() {}
