import { _, id, replace, spice, SettingModes, States, updateHtmlElement, hoursAndMinutes } from "./lib.js";
import { Socket } from "socket.io-client";

declare function io(opts?: string): Socket;

const root = document.getElementById("root")!;

// const socket = io("ws://0.0.0.0:8080");

// socket.on("hello", (data: string) => {
//     console.log(data);
// });
// socket.emit("hello", "hello");

let text = ``;
let caretIndex = 0;
let settingState = false;
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

function main() {
    root.appendChild(TextRender(text, "text-wrapper"));
    root.appendChild(Setting(settingState));
    root.appendChild(StatusBar());
}
main();

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
            changeText();
            return;
        }
        case "Enter": {
            if (isShiftPressed) {
                handleShiftEnter();
                return;
            }
            text = spice(text, caretIndex, 0, "\n");
            caretIndex++;
            replaceText();
            return;
        }
        case "ArrowRight": {
            if (caretIndex === text.length) return;
            caretIndex++;
            changeText();
            return;
        }
        case "ArrowLeft": {
            if (caretIndex === 0) return;
            caretIndex--;
            changeText();
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

    text = spice(text, caretIndex, 0, ev.key);
    caretIndex++;
    changeText();
});

function handleShiftEnter() {
    if (text.endsWith("/clear")) {
        text = "";
        caretIndex = text.length;
        replaceText();
        return;
    }

    sendMessage();
}

function sendMessage() {
    text += `\n//{${"John"}}To:{${"Mani"}}At:{${hoursAndMinutes(new Date())}}\n\n`;
    caretIndex = text.length;
    replaceText();
}

function TextRender(text: string, wrapperId: string) {
    const wrapper = document.createElement("div");
    wrapper.id = `text-wrapper`;

    let textByLines: string[] = text.slice().split("\n");
    let charIndex = -1;

    for (let i = 0; i < textByLines.length; i++) {
        textByLines[i] += " ";
        const lineWrapper = document.createElement("div");

        for (let j = 0; j < textByLines[i].length; j++) {
            charIndex++;
            const char = InputChar(textByLines[i][j]);

            if (caretIndex === charIndex) {
                char.classList.add("text-char-caret");
            }

            char.id = charIndex.toString();
            lineWrapper.appendChild(char);
        }

        wrapper.appendChild(lineWrapper);
    }

    wrapper.addEventListener("mousedown", (ev) => {
        const target = ev.target as HTMLElement;
        if (target.classList.contains("input-char") || target.classList.contains("input-char-space")) {
            caretIndex = parseInt(target.id);
        } else {
            caretIndex = text.length;
        }
        replaceText();
    });
    return wrapper;
}

function InputChar(char: string) {
    const elem = document.createElement("div");
    elem.className = "text-char";
    if (char === " ") {
        elem.append("\u00A0");
    } else {
        elem.textContent = char;
    }
    return elem;
}

function changeText() {
    const newText = TextRender(text, "text-wrapper");
    const wrapper = id("text-wrapper");
    const listener = (ev: Event) => {
        const target = ev.target as HTMLElement;
        if (target.classList.contains("input-char") || target.classList.contains("input-char-space")) {
            caretIndex = parseInt(target.id);
        } else {
            caretIndex = text.length;
        }
        replaceText();
    };
    updateHtmlElement(wrapper, newText);
    const newWrapper = id("text-wrapper");
    newWrapper.addEventListener("mousedown", listener);
}

function replaceText() {
    const newChatInput = TextRender(text, "text-wrapper");
    const wrapper = id("text-wrapper");
    replace(wrapper, newChatInput);
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
        ;;;Setting;%%style=position: relative;
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

function correctByMinMax(stateName: string) {
    const item = states[stateName];

    if (!item || !("min" in item) || !("max" in item)) return;
    if ((item.min && parseInt(item.state) < item.min) || (item.max && parseInt(item.state) > item.max)) {
        states[stateName].state = states[stateName].default;
    }
}

function StatusBar() {
    const wrapper = _`;status-bar;`;
    const bluh = _`;;;Other: John/`;

    wrapper.appendChild(bluh);
    return wrapper;
}

// setInterval(() => {
//     console.log(states.font_size.state);
// }, 500);
