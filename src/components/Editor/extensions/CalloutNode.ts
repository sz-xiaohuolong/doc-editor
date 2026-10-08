import { Node, mergeAttributes, wrappingInputRule, InputRule } from "@tiptap/core";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType;
      toggleCallout: () => ReturnType;
    };
  }
}

export const CalloutNode = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-callout-type") || "note",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "callout",
        class: "wolai-callout note my-3 p-3.5 rounded-lg bg-blue-50/70 border-l-4 border-blue-500 flex gap-3 text-slate-800",
      }),
      [
        "span",
        { class: "select-none text-xl leading-none flex-shrink-0 mt-0.5", contenteditable: "false" },
        "💡",
      ],
      ["div", { class: "flex-1 min-w-0" }, 0],
    ];
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*\[!([a-zA-Z]+)\]\s$/,
        type: this.type,
        getAttributes: (match) => ({
          type: (match[1] || "note").toLowerCase(),
        }),
      }),
      new InputRule({
        find: /^\s*\[!([a-zA-Z]+)\]\s$/,
        handler: ({ state, range }) => {
          const { $from } = state.selection;
          const parentNode = $from.node(-1);
          if (parentNode && parentNode.type.name === "blockquote") {
            state.tr.delete(range.from, range.to);
            setTimeout(() => {
              this.editor.chain().lift("blockquote").setCallout().run();
            }, 0);
          }
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const type = (node.attrs.type || "NOTE").toUpperCase();
          state.write(`> [!${type}]\n`);
          state.wrapBlock("> ", null, node, () => state.renderContent(node));
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll("blockquote").forEach((bq) => {
              const text = bq.textContent || "";
              const match = text.trim().match(/^\[!([a-zA-Z]+)\]/);
              if (match) {
                const type = match[1].toLowerCase();
                const calloutDiv = document.createElement("div");
                calloutDiv.setAttribute("data-type", "callout");
                calloutDiv.setAttribute("data-callout-type", type);
                const firstP = bq.querySelector("p");
                if (firstP) {
                  firstP.textContent = firstP.textContent?.replace(/^\[!([a-zA-Z]+)\]\s*/, "") || "";
                }
                while (bq.firstChild) {
                  calloutDiv.appendChild(bq.firstChild);
                }
                bq.replaceWith(calloutDiv);
              }
            });
          },
        },
      },
    };
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
    };
  },
});
