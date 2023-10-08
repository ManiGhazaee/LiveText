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

export function insertHTMLElementAt<T extends Element>(root: T, HTMLElement: T, index: number) {
    if (!root) return;

    if (root.children.length === 0 || index === root.children.length) {
        root.appendChild(HTMLElement);
    } else {
        root.insertBefore(HTMLElement, root.children[index]);
    }
}

export function deleteHTMLElementAt<T extends Element>(root: T, index: number) {
    if (!root || !root.children || root.children.length === 0) return;

    root.children[index].remove();
}

export function clearClassForEach<T extends Element>(root: T, className: string) {
    if (!root || !root.children || root.children.length === 0) return;
    const children = root.children;
    for (const i of children) {
        i.classList.remove(className);
    }
}

export function addClassAt<T extends Element>(root: T, className: string, index: number) {
    if (!root || !root.children || root.children.length === 0) return;
    root.children[index]?.classList.add(className);
}

export function updateHtmlElement(oldElement: HTMLElement, newElement: HTMLElement) {
    try {
        // Compare the tag names of the elements
        // if (oldElement.tagName !== newElement.tagName) {
        //     throw new Error("Elements have different tag names");
        // }

        const newElementClone = newElement.cloneNode(true);
        // Compare the classes of the elements
        if (oldElement.className !== newElement.className) {
            oldElement.className = newElement.className;
        }

        // Compare the attributes of the elements
        // for (const attr of newElement.attributes) {
        //     if (oldElement.getAttribute(attr.name) !== attr.value) {
        //         oldElement.setAttribute(attr.name, attr.value);
        //     }
        // }

        // Compare the child nodes of the elements
        const oldChildren = Array.from(oldElement.childNodes);
        const newChildren = Array.from(newElement.childNodes);

        for (let i = newChildren.length - 1; i >= 0; i--) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];

            if (!oldChild) {
                // If there is no corresponding old child, insert the new child
                oldElement.appendChild(newChild.cloneNode(true));
            } else if (oldChild.nodeType !== newChild.nodeType) {
                // If the node types are different, replace the old child with the new child
                oldElement.replaceChild(newChild.cloneNode(true), oldChild);
            } else if (oldChild.nodeType === Node.ELEMENT_NODE && oldChild.childNodes.length > 0) {
                // If the child nodes are both elements, recursively compare and update them
                updateHtmlElement(oldChild as HTMLElement, newChild as HTMLElement);
            } else if (oldChild.nodeValue !== newChild.nodeValue) {
                // If the node values are different, update the old node value with the new value
                oldChild.nodeValue = newChild.nodeValue;
            }
        }

        // Remove any extra old child nodes that weren't present in the new element
        while (oldChildren.length > newChildren.length) {
            oldElement.removeChild(oldChildren[oldChildren.length - 1]);
        }
    } catch (e) {
        console.error(e);
    }
}

export function updateTextWrapperHtml(oldElement: HTMLElement, newElement: HTMLElement) {
    const newElementChildren = newElement.childNodes as NodeListOf<HTMLElement>;
    const oldElementChildren = oldElement.childNodes as NodeListOf<HTMLElement>;

    if (oldElementChildren.length < newElementChildren.length) {
        for (let i = 0; i < newElementChildren.length; i++) {
            if (oldElementChildren[i] === undefined) {
                if (oldElementChildren[0].parentNode) {
                    oldElementChildren[0].parentNode.appendChild(newElementChildren[i].cloneNode(true) as HTMLElement);
                }
                continue;
            }
        }
    } else if (oldElementChildren.length > newElementChildren.length) {
        for (let i = 0; i < oldElementChildren.length; i++) {
            if (newElementChildren[i] === undefined) {
                oldElementChildren[i].remove();
                i--;
                continue;
            }
        }
    }

    for (let i = 0; i < newElementChildren.length; i++) {
        const newChildChildren = newElementChildren[i].childNodes as NodeListOf<HTMLElement>;
        const oldChildChildren = oldElementChildren[i].childNodes as NodeListOf<HTMLElement>;

        if (newChildChildren.length === 0) {
            const firstChild = oldElementChildren[i].firstChild;
            while (firstChild) {
                firstChild.remove();
            }
        }

        if (oldChildChildren.length < newChildChildren.length) {
            for (let i = 0; i < newChildChildren.length; i++) {
                if (oldChildChildren[i] === undefined) {
                    if (oldChildChildren[0].parentNode) {
                        oldChildChildren[0].parentNode.appendChild(newChildChildren[i].cloneNode(true) as HTMLElement);
                    }
                    continue;
                }
                if (oldChildChildren[i].className !== newChildChildren[i].className) {
                    oldChildChildren[i].className = newChildChildren[i].className;
                }
                if (oldChildChildren[i].textContent !== newChildChildren[i].textContent) {
                    if (newChildChildren[i].textContent === " ") {
                        oldChildChildren[i].textContent = "";
                        oldChildChildren[i].append("\u00A0");
                    } else {
                        oldChildChildren[i].textContent = newChildChildren[i].textContent;
                    }
                }
            }
        } else if (oldChildChildren.length > newChildChildren.length) {
            for (let i = 0; i < oldChildChildren.length; i++) {
                if (newChildChildren[i] === undefined) {
                    oldChildChildren[i].remove();
                    i--;
                    continue;
                }
                if (oldChildChildren[i].className !== newChildChildren[i].className) {
                    oldChildChildren[i].className = newChildChildren[i].className;
                }
                if (oldChildChildren[i].textContent !== newChildChildren[i].textContent) {
                    if (newChildChildren[i].textContent === " ") {
                        oldChildChildren[i].textContent = "";
                        oldChildChildren[i].append("\u00A0");
                    } else {
                        oldChildChildren[i].textContent = newChildChildren[i].textContent;
                    }
                }
            }
        } else {
            for (let i = 0; i < oldChildChildren.length; i++) {
                if (oldChildChildren[i].className !== newChildChildren[i].className) {
                    oldChildChildren[i].className = newChildChildren[i].className;
                }
                if (oldChildChildren[i].textContent !== newChildChildren[i].textContent) {
                    if (newChildChildren[i].textContent === " ") {
                        oldChildChildren[i].textContent = "";
                        oldChildChildren[i].append("\u00A0");
                    } else {
                        oldChildChildren[i].textContent = newChildChildren[i].textContent;
                    }
                }
            }
        }
    }
}

export function hoursAndMinutes(time: Date | string): string {
    return `${new Date(time).getHours().toString().padStart(2, "0")}:${new Date(time)
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
}

export function clamp(min: number, numbers: number, max: number): number;
export function clamp(min: number, numbers: number[], max: number): number[];
export function clamp(min: number, numbers: number | number[], max: number): number | number[] {
    if (min > max)
        throw new Error(`The minimum value cannot be greater than the maximum value.\nmin: ${min}\nmax: ${max}`);
    if (!Array.isArray(numbers)) {
        return Math.max(Math.min(numbers, max), min);
    } else {
        let result: number[] = [];
        for (let i = 0; i < numbers.length; i++) {
            result.push(Math.max(Math.min(numbers[i], max), min));
        }
        return result;
    }
}
