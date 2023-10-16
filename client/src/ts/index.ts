import {
    _,
    id,
    replace,
    spice,
    SettingModes,
    SettingStates,
    updateTextWrapperHtml,
    hoursAndMinutes,
    clamp,
    reReplace,
    lsSyncedStates,
} from "./lib.js";
import { manual } from "./strings.js";

enum EGS /* EnumGlobalStatus */ {
    Talk = "TALK",
    Listen = "LISTEN",
    TalkRequest = "TALK-REQUEST",
    ListenRequest = "LISTEN-REQUEST",
    ForceTalk = "FORCE-TALK",
    ForceListen = "FORCE-LISTEN",
    Idle = "IDLE",
    Connecting = "CONNECTING",
    Menu = "MENU",
    Setting = "SETTING",
}

class GlobalStatus {
    private _state: EGS;
    public prev: EGS;
    constructor(initVal: EGS) {
        this._state = initVal;
        this.prev = initVal;
    }
    get state() {
        return this._state;
    }
    set state(newVal: EGS) {
        this.prev = this._state;
        this._state = newVal;
        reReplace({
            fn: StatusBar,
        });
        if (this._state === EGS.Listen || this._state === EGS.ForceListen || this._state === EGS.TalkRequest) {
            document.documentElement.style.setProperty("--primary-color", "#acacac");
        } else {
            document.documentElement.style.setProperty("--primary-color", "#fff");
        }
    }
    toPrev() {
        this._state = this.prev;
    }
    toggle(stateA: EGS, stateB: EGS) {
        if (this._state === stateA) {
            this.state = stateB;
        } else if (this._state === stateB) {
            this.state = stateA;
        } else {
            this.state = stateA;
        }
    }
    toggleWithPrev(state: EGS) {
        if (this._state === state) {
            this.state = this.prev;
        } else if (this._state === this.prev) {
            this.state = state;
        } else {
            this.state = state;
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

class Participants {
    private _self: string = localStorage.getItem("selfName") || "Anonymous";
    private _other: string = "";
    constructor() {}
    get self() {
        return this._self;
    }
    set self(str: string) {
        this._self = str;
        localStorage.setItem("selfName", str);
    }
    get other() {
        return this._other;
    }
    set other(str: string) {
        this._other = str;
    }
}

class LocalStorageStates {
    endInfo: bool = 1;
}

type bool = 0 | 1;
interface Command {
    name: string;
    fn: (...args: any[]) => any;
    max: number;
    min?: number;
}
declare function io(opts?: string): Socket;

const root = document.getElementById("root")!;
const cmdId = "$";
const commands: Command[] = [
    {
        name: "man",
        fn: cmdManual,
        max: 0,
    },
    {
        name: "clear",
        fn: cmdClear,
        max: 0,
    },
    {
        name: "c",
        fn: cmdClear,
        max: 0,
    },
    {
        name: "clear_line",
        fn: cmdClearLine,
        max: 0,
    },
    {
        name: "cl",
        fn: cmdClearLine,
        max: 0,
    },
    {
        name: "math",
        fn: cmdMath,
        max: 1,
    },
    {
        name: "join",
        fn: cmdRoomJoin,
        max: 1,
    },
    {
        name: "name",
        fn: cmdName,
        max: 1,
        min: 0,
    },
    {
        name: "leave",
        fn: cmdLeave,
        max: 0,
    },
    {
        name: "cya",
        fn: cmdLeave,
        max: 0,
    },
    {
        name: "bye",
        fn: cmdLeave,
        max: 0,
    },
    {
        name: "end_info",
        fn: cmdEndInfo,
        max: 1,
        min: 0,
    },
];
const settingStates = new SettingStates([
    {
        name: "font_size",
        mode: SettingModes.number,
        desc: "Font size",
        default: 18,
        min: 10,
        max: 40,
    },
]);

let pressedKeys = new PressedKeys();
let text = manual;
let caretIndex = text.length;
let maxTextLength = 4000;
let gs = new GlobalStatus(EGS.Connecting);
let lss = lsSyncedStates(new LocalStorageStates());
let room = "";
let names = new Participants();

const socket = io("https://live-text-server.onrender.com");

main();

socket.on("connect", () => {
    gs.toPrev();
    if (gs.state === EGS.Connecting) {
        gs.state = EGS.Menu;
    }
});
socket.on("disconnect", () => {
    gs.state = EGS.Connecting;
});
socket.on("room_join", (data: { success: boolean; msg: string; room: string; state: "TALK" | "LISTEN" | "MENU" }) => {
    console.log(data);
    room = data.room;

    text = "/*" + data.msg + "*/\n";
    caretIndex = text.length;
    replaceText();

    if (data.success) {
        switch (data.state) {
            case "TALK": {
                gs.state = EGS.Talk;
                break;
            }
            case "LISTEN": {
                gs.state = EGS.Listen;
                break;
            }
            default: {
                gs.state = EGS.Menu;
            }
        }
    }
});
socket.on("joined", (data: { msg: string }) => {
    text += "/*" + data.msg + "*/\n\n";
    caretIndex = text.length;
    replaceText();
});
socket.on("send_text", (data: { text: string; caretIndex: number }) => {
    text = data.text;
    caretIndex = data.caretIndex;
    gs.state = EGS.Talk;
    changeText();
});
socket.on("text", (data: { text: string; caretIndex: number }) => {
    text = data.text;
    caretIndex = data.caretIndex;
    changeText();
});
socket.on("talk_request", (data: { room: string }) => {
    gs.state = EGS.ListenRequest;
});
socket.on("force_talk", (data: { room: string }) => {
    gs.state = EGS.ForceListen;
});
socket.on("leave", (data: { name: string; room: string }) => {
    gs.state = EGS.Menu;
    text = `/*"${data.name}" closed "${data.room}"*/\n`;
    caretIndex = text.length;
    replaceText();
});

function main() {
    root.appendChild(TextRender(text, "text-wrapper"));
    root.appendChild(Setting());
    root.appendChild(StatusBar());
}

window.addEventListener("keyup", (ev) => {
    pressedKeys.up(ev.key);
});

window.addEventListener("keydown", (ev) => {
    // if (gs.state === EGS.Setting) return;

    pressedKeys.down(ev.key);

    switch (ev.key) {
        case "Backspace": {
            if (caretIndex === 0) return;
            if (notAllowedToInteract()) return;
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
            if (notAllowedToInteract()) return;
            text = spice(text, caretIndex, 0, "\n");
            text = removeFromStart(text, maxTextLength);
            caretIndex = clamp(0, caretIndex + 1, maxTextLength);
            replaceText();
            return;
        }
        case "ArrowRight": {
            if (caretIndex === text.length) return;
            if (notAllowedToInteract()) return;
            caretIndex = clamp(0, caretIndex + 1, maxTextLength);
            changeText();
            return;
        }
        case "ArrowLeft": {
            if (caretIndex === 0) return;
            if (notAllowedToInteract()) return;
            caretIndex = clamp(0, caretIndex - 1, maxTextLength);
            changeText();
            return;
        }
        case "Escape": {
            gs.toggleWithPrev(EGS.Setting);
            replaceSetting();
            return;
        }
    }
    if (ev.key.length > 1) return;
    if (notAllowedToInteract()) return;

    text = spice(text, caretIndex, 0, ev.key);
    text = removeFromStart(text, maxTextLength);
    if (text.length !== maxTextLength) {
        caretIndex = clamp(0, caretIndex + 1, maxTextLength);
    }
    changeText();
});

function notAllowedToInteract(): boolean {
    return gs.state === EGS.Listen || gs.state === EGS.ForceListen || gs.state === EGS.TalkRequest;
}

function handleShiftEnter() {
    const cmdHasExecuted = checkForCommand(text);

    if (gs.state === EGS.Listen) {
        gs.state = EGS.TalkRequest;
        sendTalkRequest();
        return;
    }
    if (gs.state === EGS.TalkRequest) {
        gs.state = EGS.ForceTalk;
        sendForceTalk();
        return;
    }

    if (!cmdHasExecuted && gs.state !== EGS.Menu && gs.state !== EGS.Connecting) {
        sendText();
    }
}

function sendTalkRequest() {
    socket.emit("talk_request", { room });
}

function sendForceTalk() {
    socket.emit("force_talk", { room });
}

function sendText() {
    if (lss.endInfo === 1) {
        text += `\n/*${names.self}|${hoursAndMinutes(new Date())}*/\n\n`;
        text = removeFromStart(text, maxTextLength);
        caretIndex = clamp(0, text.length, maxTextLength);
        changeText();
    }

    gs.state = EGS.Listen;
    socket.emit("send_text", { text, caretIndex });
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

    if (gs.state === EGS.Talk || gs.state === EGS.ForceTalk || gs.state === EGS.ListenRequest) {
        socket.emit("text", { text, caretIndex });
    }
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

    if (gs.state === EGS.Talk || gs.state === EGS.ForceTalk || gs.state === EGS.ListenRequest) {
        socket.emit("text", { text, caretIndex });
    }
}

function replaceSetting() {
    replace(id("Setting"), Setting());
}

function Setting() {
    if (gs.state !== EGS.Setting) {
        return _`;Setting;`;
    }

    const wrapper = _`
    ;Setting;
        ;;;Setting;%%style=position: relative;
            ;setting-close;;Close;
    `;

    const settingClose = wrapper.querySelector("#setting-close")! as HTMLElement;
    settingClose.addEventListener("click", () => {
        gs.toPrev();
        replaceSetting();
    });

    for (const key in settingStates) {
        if (!Object.prototype.hasOwnProperty.call(settingStates, key)) continue;

        const item = settingStates[key];

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
                            settingStates[key].state = parseInt(lastChild.innerHTML);
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
    const item = settingStates[stateName];

    if (!item || !("min" in item) || !("max" in item)) return;
    if ((item.min && parseInt(item.state) < item.min) || (item.max && parseInt(item.state) > item.max)) {
        settingStates[stateName].state = settingStates[stateName].default;
    }
}

function StatusBar() {
    const wrapper = _`;StatusBar;`;
    const elems = _`
    ;
    style=display: flex; width: 100%;
        span;;;--${gs.state}--;
        style=flex-grow: 1; position: relative;
        span;;;TextLength:${text.length}/${maxTextLength}
    `;

    wrapper.appendChild(elems);
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
        if (string[i] === cmdId) {
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
            if (
                parseCommand.length - 1 > commands[i].max ||
                parseCommand.length - 1 < (commands[i].min ?? commands[i].max)
            )
                return false;
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
    if (/^[0-9\(\)+-/*.]+$/.test(str) && str.length < 40) {
        const { slice } = parseCommand(text)!;
        text = text.slice(0, text.length - slice.length);
        try {
            eval(str);
            text += eval(str);
            caretIndex = text.length;
            replaceText();
        } catch (e) {
            console.error(e);
            caretIndex = text.length;
            replaceText();
            return;
        }
    }
}

function cmdRoomJoin(str: string) {
    if (socket) {
        socket.emit("room_join", { name: names.self, room: str });
    }
}

function cmdName(str?: string) {
    if (!str) {
        text += `\n/*Current name: "${names.self}"*/\n`;
        caretIndex = text.length;
        replaceText();
    } else {
        names.self = str;
        text += `\n/*Name changed to "${names.self}"*/\n`;
        caretIndex = text.length;
        replaceText();
    }
}

function cmdLeave() {
    text = `/*"${room}" closed*/\n`;
    caretIndex = text.length;
    gs.state = EGS.Menu;
    socket.emit("leave", { name: names.self, room });
    replaceText();
}

function cmdManual() {
    text = manual;
    caretIndex = text.length;
    replaceText();
}

function cmdClearLine() {
    for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === "\n" || i === 0) {
            text = text.slice(0, i);
            caretIndex = text.length;
            changeText();
            break;
        }
    }
}

function cmdEndInfo(str?: string) {
    if (!str) {
        text += `\n/*end_info: (${lss.endInfo})*/\n`;
        caretIndex = text.length;
        changeText();
    } else {
        if (str === "0") {
            lss.endInfo = 0;
            text += `\n/*end_info: (${lss.endInfo})*/\n`;
            caretIndex = text.length;
            changeText();
        } else if (str === "1") {
            lss.endInfo = 1;
            text += `\n/*end_info: (${lss.endInfo})*/\n`;
            caretIndex = text.length;
            changeText();
        }
    }
}

// setInterval(() => {
//     console.log(pressedKeys);
// }, 500);
