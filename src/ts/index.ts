import { _, html, id, render, replace, spice } from "./lib.js";
const root = document.getElementById("root")!;

let text = "";
let caretIndex = 0;

window.addEventListener("keydown", (ev) => {
    if (ev.key === "Backspace") {
        text = spice(text, caretIndex - 1, 1);
        if (caretIndex !== 0) {
            caretIndex--;
        }
        replaceChatInput();
        return;
    }
    if (ev.key === "Enter") {
        text = spice(text, caretIndex, 0, "\n");
        caretIndex++;
        replaceChatInput();
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

            function x() {
                const _charIndex = charIndex;
                return (ev: MouseEvent) => {
                    ev.stopPropagation();
                    console.log(_charIndex);
                    if (ev.target !== char) return;
                    caretIndex = _charIndex;
                    replaceChatInput();
                };
            }

            char.addEventListener("mousedown", x());

            lineWrapper.appendChild(char);
        }

        function x() {
            const _charIndex = charIndex;
            return (ev: MouseEvent) => {
                ev.stopPropagation();
                console.log("char", _charIndex);
                console.log(text.length);
                caretIndex = _charIndex;
                replaceChatInput();
            };
        }
        lineWrapper.addEventListener("mousedown", x());
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
    }
    return char === " " ? _`;;input-char-space ;_` : _`;;input-char;${char}`;
};

root.appendChild(ChatInput());

function replaceChatInput() {
    replace(id("chat-input-wrapper"), ChatInput());
}
