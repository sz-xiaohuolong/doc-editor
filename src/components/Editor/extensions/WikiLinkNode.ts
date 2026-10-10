import { Node, mergeAttributes } from "@tiptap/core";

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: (title: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (targetTitle: string) => ReturnType;
    };
  }
}

export const WikiLinkNode = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      targetTitle: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-target-title") || "",
        renderHTML: (attributes) => ({
          "data-target-title": attributes.targetTitle || "",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wiki-link"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            targetTitle:
              (element as HTMLElement).getAttribute("data-target-title") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const title =
      (node?.attrs?.targetTitle as string) ||
      (HTMLAttributes["data-target-title"] as string) ||
      "";

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "wiki-link",
        "data-target-title": title,
        contenteditable: "false",
        class:
          "wiki-link inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 cursor-pointer font-medium text-[13px] select-none transition-colors align-baseline",
      }),
      [
        "span",
        { class: "text-[11px] opacity-70", contenteditable: "false" },
        "🔗",
      ],
      [
        "span",
        { class: "wiki-link-title" },
        title,
      ],
    ];
  },

  addCommands() {
    return {
      insertWikiLink:
        (targetTitle: string) =>
        ({ commands }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: { targetTitle: targetTitle || "" },
            },
            {
              type: "text",
              text: " ",
            },
          ]);
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`[[${node.attrs.targetTitle || ""}]]`);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            // Traverse all text nodes and replace [[Title]] with wiki-link span
            const walker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_TEXT,
              null
            );

            const nodesToReplace: { node: Text; matches: RegExpMatchArray[] }[] = [];

            let currentNode = walker.nextNode();
            while (currentNode) {
              const textNode = currentNode as Text;
              const text = textNode.nodeValue || "";
              const matches = Array.from(text.matchAll(/\[\[([^\]]+)\]\]/g));
              if (matches.length > 0) {
                nodesToReplace.push({ node: textNode, matches });
              }
              currentNode = walker.nextNode();
            }

            for (const { node, matches } of nodesToReplace) {
              const parent = node.parentNode;
              if (!parent) continue;

              const text = node.nodeValue || "";
              let lastIndex = 0;
              const frag = document.createDocumentFragment();

              for (const match of matches) {
                const matchIndex = match.index ?? 0;
                if (matchIndex > lastIndex) {
                  frag.appendChild(
                    document.createTextNode(text.substring(lastIndex, matchIndex))
                  );
                }

                const targetTitle = match[1].trim();
                const span = document.createElement("span");
                span.setAttribute("data-type", "wiki-link");
                span.setAttribute("data-target-title", targetTitle);
                span.setAttribute("contenteditable", "false");
                span.className =
                  "wiki-link inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 cursor-pointer font-medium text-[13px] select-none transition-colors align-baseline";

                const icon = document.createElement("span");
                icon.className = "text-[11px] opacity-70";
                icon.setAttribute("contenteditable", "false");
                icon.textContent = "🔗";
                span.appendChild(icon);

                const titleSpan = document.createElement("span");
                titleSpan.className = "wiki-link-title";
                titleSpan.textContent = targetTitle;
                span.appendChild(titleSpan);

                frag.appendChild(span);
                lastIndex = matchIndex + match[0].length;
              }

              if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.substring(lastIndex)));
              }

              parent.replaceChild(frag, node);
            }
          },
        },
      },
    };
  },
});
