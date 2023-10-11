import {
    _,
    id,
    replace,
    spice,
    SettingModes,
    States,
    updateTextWrapperHtml,
    hoursAndMinutes,
    clamp,
    reReplace,
} from "./lib.js";
import { Socket } from "socket.io-client";

enum EGlobalStatus {
    Talk = "TALK",
    Listen = "LISTEN",
    Idle = "IDLE",
    Connecting = "CONNECTING",
    Menu = "MENU",
    Setting = "SETTING",
}

class GlobalStatus {
    private _state: EGlobalStatus;
    public prev: EGlobalStatus;
    constructor(initVal: EGlobalStatus) {
        this._state = initVal;
        this.prev = initVal;
    }
    get state() {
        return this._state;
    }
    set state(newVal: EGlobalStatus) {
        this.prev = this._state;
        this._state = newVal;
        reReplace({
            fn: StatusBar,
        });
    }
    toggle(stateA: EGlobalStatus, stateB: EGlobalStatus) {
        if (this._state === stateA) {
            this.state = stateB;
        } else if (this._state === stateB) {
            this.state = stateA;
        } else {
            this.state = stateA;
        }
    }
}

class PressedKeys {
    pressed: string[];
    Shift = false;
    Control = false;
    constructor() {
        this.pressed = [];
    }
    down(key: string) {
        if (!this.pressed.includes(key)) {
            this.pressed.push(key);
        }
        if (key in this) {
            // @ts-expect-error
            this[key] = true;
        }
    }
    up(key: string) {
        const index = this.pressed.indexOf(key);
        if (index !== -1) {
            this.pressed.splice(index, 1);
        }
        if (key in this) {
            // @ts-expect-error
            this[key] = false;
        }
    }
}

let pressedKeys = new PressedKeys();

const root = document.getElementById("root")!;
// let text = `a`.repeat(20) + "b".repeat(20) + "c".repeat(20) + "d".repeat(20);
let text = "";
let caretIndex = text.length;
let maxTextLength = 9000;
// let textRenderLimit = 40;
// let textRenderOffsetEnd = 0;
let globalStatus = new GlobalStatus(EGlobalStatus.Connecting);

interface Command {
    name: string;
    fn: (...args: any[]) => any;
    max: number;
}

const commandIdentifier = "$";
const commands: Command[] = [
    {
        name: "clear",
        fn: cmdClear,
        max: 0,
    },
    {
        name: "math",
        fn: cmdMath,
        max: 1,
    },
    {
        name: "room_join",
        fn: cmdRoomJoin,
        max: 1,
    },
    {
        name: "room_create",
        fn: cmdRoomCreate,
        max: 1,
    },
];

declare function io(opts?: string): Socket;

let room = "";

const socket = io("ws://0.0.0.0:8080");

if (socket) {
    socket.on("connect", () => {
        globalStatus.state = EGlobalStatus.Menu;
    });

    socket.on("disconnect", () => {
        globalStatus.state = EGlobalStatus.Connecting;
    });

    socket.on("room_join", (data: { success: boolean; msg: string; room: string }) => {
        console.log(data);
        room = data.room;

        text = "\n/*" + data.msg + "*/\n";
        caretIndex = text.length;
        replaceText();
    });

    socket.on("room_create", (data: { success: boolean; msg: string }) => {
        console.log(data);

        text += "\n/*" + data.msg + "*/\n";
        caretIndex = text.length;
        replaceText();
    });

    socket.on("text", (data: { text: string; caretIndex: number }) => {
        text = data.text;
        caretIndex = data.caretIndex;
        changeText();
    });
}

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
    root.appendChild(Setting());
    root.appendChild(StatusBar());
}

main();

window.addEventListener("keyup", (ev) => {
    pressedKeys.up(ev.key);
});

window.addEventListener("keydown", (ev) => {
    // if (globalStatus.state === EGlobalStatus.Setting) return;

    pressedKeys.down(ev.key);

    switch (ev.key) {
        case "Backspace": {
            if (caretIndex === 0) return;
            text = spice(text, caretIndex - 1, 1);
            text = removeFromStart(text, maxTextLength);
            caretIndex = clamp(0, caretIndex - 1, maxTextLength);
            changeText();
            return;
        }
        case "Enter": {
            if (pressedKeys.Shift) {
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
            globalStatus.toggle(EGlobalStatus.Setting, EGlobalStatus.Menu);
            console.log(globalStatus);
            replaceSetting();
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
    // console.log("ci", caretIndex);
    // console.log("tl", text.length);
});

function handleShiftEnter() {
    const hasExecuted = checkForCommand(text);

    if (!hasExecuted) {
        sendMessage();
    }
}

function sendMessage() {
    text += `\n/*${"John"}|${hoursAndMinutes(new Date())}*/\n\n`;
    text = removeFromStart(text, maxTextLength);
    caretIndex = clamp(0, text.length, maxTextLength);

    changeText();
    socket.emit("text", { text, caretIndex });
}

function TextRender(text: string, wrapperId: string, limit?: number, offsetEnd?: number) {
    const wrapper = document.createElement("div");
    wrapper.id = wrapperId;

    let textByLines: string[];
    if (limit && offsetEnd) {
        textByLines = text.slice(text.length - limit + offsetEnd, text.length - offsetEnd).split("\n");
    } else {
        textByLines = text.slice().split("\n");
    }

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

            lineWrapper.appendChild(char);
        }

        wrapper.appendChild(lineWrapper);
    }

    wrapper.addEventListener("mousedown", textWrapperListener);
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

    if (target.classList.contains("text-char") || target.classList.contains("text-char-space")) {
        const wrapperChildren = id("text-wrapper").children;
        let targetIndex = 0;

        let prevChildrenLengthSum = 0;

        for (let i = 0; i < wrapperChildren.length; i++) {
            const children = Array.from(wrapperChildren[i].children);
            if (children.indexOf(target) !== -1) {
                targetIndex = children.indexOf(target);
                break;
            }
            prevChildrenLengthSum += children.length;
        }

        caretIndex = prevChildrenLengthSum + targetIndex;

        clearClassNameForTextWrapper("caret");

        if (!target.classList.contains("caret")) {
            target.classList.add("caret");
        }
    } else {
        caretIndex = text.length;
        clearClassNameForTextWrapper("caret");
        const wrapperChildren = id("text-wrapper").children;
        (wrapperChildren[wrapperChildren.length - 1].lastChild as HTMLElement)?.classList.add("caret");
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
    replace(id("Setting"), Setting());
}

function Setting() {
    if (globalStatus.state !== EGlobalStatus.Setting) {
        return _`;Setting;`;
    }

    const wrapper = _`
    ;Setting;
        ;;;Setting;%%style=position: relative;
            ;setting-close;;Close;
    `;

    const settingClose = wrapper.querySelector("#setting-close")! as HTMLElement;
    settingClose.addEventListener("click", () => {
        globalStatus.state = EGlobalStatus.Menu;
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
    const bluh = _`;;;--${globalStatus.state}--|TextLength:${text.length}/${maxTextLength}`;

    wrapper.appendChild(bluh);
    return wrapper;
}

function removeFromStart(string: string, limit: number) {
    if (string.length < limit) return string;
    return string.slice(string.length - limit, string.length);
}

/**
 *
 * @param string
 * @returns boolean - true: command executed, false: command didnt execute
 */
function checkForCommand(string: string): boolean {
    const parsed = parseCommand(string);
    if (parsed === null || parsed.splitted.length === 0) {
        return false;
    }

    return handleCommand(parsed.splitted);
}

function parseCommand(string: string): { splitted: string[]; slice: string } | null {
    for (let i = string.length - 1; i >= 0; i--) {
        if (string[i] === commandIdentifier) {
            return {
                slice: string.slice(i, string.length),
                splitted: string
                    .slice(i + 1, string.length)
                    .split(" ")
                    .filter(Boolean),
            };
        }
    }
    return null;
}

function handleCommand(parseCommand: string[]): boolean {
    const commandName = parseCommand[0];
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].name === commandName) {
            if (parseCommand.length - 1 !== commands[i].max) return false;
            commands[i].fn(...parseCommand.slice(1));
            return true;
        }
    }
    return false;
}

function cmdClear() {
    text = "";
    caretIndex = text.length;
    replaceText();
}

function cmdMath(str: string) {
    if (/^[0-9()+-/*]+$/.test(str) && str.length < 40) {
        const { slice } = parseCommand(text)!;
        text = text.slice(0, text.length - slice.length);
        text += eval(str);
    }
    caretIndex = text.length;
    replaceText();
}

function cmdRoomJoin(str: string) {
    if (socket) {
        socket.emit("room_join", { room: str });
    }
}

function cmdRoomCreate(str: string) {
    if (socket) {
        socket.emit("room_create", { room: str });
    }
}
// setInterval(() => {
//     console.log(pressedKeys);
// }, 500);
