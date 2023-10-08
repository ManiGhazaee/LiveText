import {
    _,
    id,
    replace,
    spice,
    SettingModes,
    States,
    updateTextWrapperHtml,
    updateHtmlElement,
    hoursAndMinutes,
    clamp,
    render,
    insertHTMLElementAt,
    clearClassForEach,
} from "./lib.js";
import { Socket } from "socket.io-client";

declare function io(opts?: string): Socket;

const root = document.getElementById("root")!;

// const socket = io("ws://0.0.0.0:8080");

// socket.on("hello", (data: string) => {
//     console.log(data);
// });
// socket.emit("hello", "hello");

// let text = `i`.repeat(2000) + "K".repeat(970);
let text = "";
let caretIndex = 0;
let settingState = false;
let isShiftPressed = false;
let maxTextLength = 300;

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
            text = removeFromStart(text, maxTextLength);
            caretIndex = clamp(0, caretIndex, maxTextLength);
            changeText();
            return;
        }
        case "Enter": {
            if (isShiftPressed) {
                handleShiftEnter();
                text = removeFromStart(text, maxTextLength);
                caretIndex = clamp(0, caretIndex, maxTextLength);
                return;
            }
            text = spice(text, caretIndex, 0, "\n");
            text = removeFromStart(text, maxTextLength);
            caretIndex = clamp(0, caretIndex + 1, maxTextLength);
            replaceText();
            return;
        }
        case "ArrowRight": {
            if (caretIndex === text.length) return;
            caretIndex = clamp(0, caretIndex + 1, maxTextLength);
            changeText();
            return;
        }
        case "ArrowLeft": {
            if (caretIndex === 0) return;
            caretIndex = clamp(0, caretIndex - 1, maxTextLength);
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
    text = removeFromStart(text, maxTextLength);
    if (text.length !== maxTextLength) {
        caretIndex = clamp(0, caretIndex + 1, maxTextLength);
    }
    changeText();
    console.log("ci", caretIndex);
    console.log("tl", text.length);
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
    text += `\n//--${"John"}--To:${"Mani"}--${hoursAndMinutes(new Date())}--\n\n`;
    text = removeFromStart(text, maxTextLength);
    caretIndex = clamp(0, text.length, maxTextLength);

    changeText();
}

function TextRender(text: string, wrapperId: string) {
    const wrapper = document.createElement("div");
    wrapper.id = wrapperId;

    let textByLines: string[] = text.slice().split("\n");
    let charIndex = -1;

    for (let i = 0; i < textByLines.length; i++) {
        textByLines[i] += " ";
        const lineWrapper = document.createElement("div");

        for (let j = 0; j < textByLines[i].length; j++) {
            charIndex++;
            const char = InputChar(textByLines[i][j]);

            if (caretIndex === charIndex) {
                char.classList.add("caret");
            }

            char.id = charIndex.toString();
            lineWrapper.appendChild(char);
        }

        wrapper.appendChild(lineWrapper);
    }

    wrapper.addEventListener("mousedown", (ev) => {
        const target = ev.target as HTMLElement;
        if (target.classList.contains("text-char") || target.classList.contains("text-char-space")) {
            caretIndex = parseInt(target.id);
            clearClassNameForTextWrapper("caret");
            if (!target.classList.contains("caret")) {
                target.classList.add("caret");
            }
        } else {
            caretIndex = text.length;
            replaceText();
        }
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

    reReplace({
        fn: StatusBar,
    });

    updateTextWrapperHtml(wrapper, newText);
    // const newWrapper = id("text-wrapper");
    // newWrapper.addEventListener("mousedown", textWrapperListener);
}

function clearClassNameForTextWrapper(className: string) {
    const warpper = id("text-wrapper");
    for (const i of warpper.children) {
        if (i.classList.contains(className)) {
            i.classList.remove(className);
        }
        for (const j of i.children) {
            if (j.classList.contains(className)) {
                j.classList.remove(className);
            }
        }
    }
}

function textWrapperListener(ev: Event) {
    const target = ev.target as HTMLElement;
    if (target.classList.contains("input-char") || target.classList.contains("input-char-space")) {
        caretIndex = parseInt(target.id);
        clearClassNameForTextWrapper("caret");
        if (!target.classList.contains("caret")) {
            target.classList.add("caret");
        }
    } else {
        caretIndex = text.length;
        replaceText();
    }
}

function replaceText() {
    const newChatInput = TextRender(text, "text-wrapper");
    const wrapper = id("text-wrapper");
    reReplace({
        fn: StatusBar,
    });
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
    const wrapper = _`;StatusBar;`;
    const bluh = _`;;;--TALK--|TextLength:${text.length}/${maxTextLength}`;

    wrapper.appendChild(bluh);
    return wrapper;
}

interface ReRenderParam {
    fn: (...args: any[]) => HTMLElement;
    root?: HTMLElement;
    params?: any;
}

function reReplace(...items: ReRenderParam[]) {
    for (let i = 0; i < items.length; i++) {
        replace(items[i].root ?? id(items[i].fn.name), items[i].fn(items[i].params));
    }
}

function removeFromStart(string: string, limit: number) {
    if (string.length < limit) return string;
    return string.slice(string.length - limit, string.length);
}

// setInterval(() => {
//     console.log(states.font_size.state);
// }, 500);
