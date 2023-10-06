export function htmlFromString(htmlString: string) {
    const fragment = document.createDocumentFragment();
    const container = document.createElement("div");
    container.innerHTML = htmlString;
    while (container.firstChild) {
        fragment.appendChild(container.firstChild);
    }
    return fragment;
}

export function html(strings: TemplateStringsArray, ...expressions: any[]) {
    let markup = strings[0];

    for (let i = 1, l = strings.length; i < l; i++) {
        markup += expressions[i - 1];
        markup += strings[i];
    }

    if (!markup) return htmlFromString(`<div></div>`);
    return htmlFromString(markup);
}

class HTMLElementInfo {
    constructor(
        public tag: string,
        public id: string,
        public ctmId: string,
        public className: string,
        public content: string,
        public attributes: Record<string, string>,
        public children: HTMLElementInfo[]
    ) {}
}

function parseHTMLElement(input: string): HTMLElementInfo {
    const lines = input.split(/\n|%%/).filter(Boolean);
    let currentIndex = 0;

    for (let i = 0; i < lines.length - 1; i++) {
        if (leadingSpace(lines[i]) > leadingSpace(lines[i + 1])) {
            lines[i + 1] = " ".repeat(leadingSpace(lines[i])) + lines[i + 1];
        }
    }

    function parseTagInfo(): HTMLElementInfo {
        const line = lines[currentIndex++];
        const [tag, id, className, content] = line.split(";");
        const ctmId = id;
        let attributes: Record<string, string> = {};

        while (currentIndex < lines.length) {
            const nextLine = lines[currentIndex];
            if (leadingSpace(nextLine) === leadingSpace(line) && nextLine.includes("=")) {
                const [attrKey, attrValue] = nextLine.trim().split("=");
                attributes[attrKey] = attrValue;
                currentIndex++;
            } else {
                break;
            }
        }

        const children = [];

        while (currentIndex < lines.length) {
            const nextLine = lines[currentIndex];
            if (leadingSpace(nextLine) > leadingSpace(line)) {
                children.push(parseTagInfo());
            } else {
                break;
            }
        }

        return new HTMLElementInfo(
            tag.trim() === "" ? "div" : tag.trim(),
            id,
            ctmId,
            className,
            content,
            attributes,
            children
        );
    }

    return parseTagInfo();
}

function generateHTMLFromInfo(info: HTMLElementInfo): HTMLElement {
    const element = document.createElement(info.tag);

    if (info.id) {
        element.id = info.id;
        element.setAttribute("ctm-id", info.id);
    }

    if (info.className) {
        element.className = info.className;
    }

    if (info.content) {
        info.content = info.content.replaceAll("CTM_IGNR_SEMIC", ";");
        info.content = info.content.replaceAll("CTM_IGNR_PERC", "%");
        info.content = info.content.replaceAll("CTM_IGNR_EQ", "=");
        info.content = info.content.replaceAll("CTM_IGNR_BCKTICK", "`");
        info.content = info.content.replaceAll("CTM_IGNR_APOS_1", "'");
        info.content = info.content.replaceAll("CTM_IGNR_APOS_2", '"');

        element.textContent = info.content;
    }

    for (const [key, value] of Object.entries(info.attributes)) {
        element.setAttribute(key, value);
    }

    for (const childInfo of info.children) {
        const childElement = generateHTMLFromInfo(childInfo);
        element.appendChild(childElement);
    }

    return element;
}

export function ctm(markup?: string | undefined) {
    if (!markup) return generateHTMLFromInfo(parseHTMLElement(`;`));
    return generateHTMLFromInfo(parseHTMLElement(markup));
}

export function _(strings: TemplateStringsArray, ...expressions: any[]) {
    let markup = strings[0];

    for (let i = 1, l = strings.length; i < l; i++) {
        markup += expressions[i - 1];
        markup += strings[i];
    }

    if (!markup) return generateHTMLFromInfo(parseHTMLElement(`;`));
    return generateHTMLFromInfo(parseHTMLElement(markup));
}

export function leadingSpace(input: string): number {
    const leadingSpaces = input.match(/^\s*/)?.[0];
    return (leadingSpaces && leadingSpaces.length) || 0;
}

export function replace(before: HTMLElement, after: HTMLElement) {
    before.replaceWith(after);
}

export function render(root: HTMLElement, html: HTMLElement): void {
    while (root.firstChild) {
        root.firstChild.remove();
    }
    root.appendChild(html);
}

export function warpper(html: HTMLElement[]) {
    document.createElement("div").append(...html);
}

export function id(id: string) {
    return document.getElementById(id)!;
}
/**
 * splice for strings
 */
export function spice(string: string, start: number, deleteCount: number, insertString?: string): string {
    return string.slice(0, start) + (insertString || "") + string.slice(start + (deleteCount || 0));
}

export const enum SettingModes {
    boolean,
    number,
    string,
}

export class States {
    [key: string]: {
        state: any;
        mode: SettingModes;
        desc: string;
        default: any;
        max?: number;
        min?: number;
    };
    constructor(
        states: { name: string; mode: SettingModes; desc: string; default: any; min?: number; max?: number }[]
    ) {
        for (const i of states) {
            this[i.name] = {
                mode: i.mode,
                state: i.default,
                desc: i.desc,
                default: i.default,
            };
            if (i.min) {
                this[i.name].min = i.min;
            }
            if (i.max) {
                this[i.name].max = i.max;
            }
        }
    }
}
