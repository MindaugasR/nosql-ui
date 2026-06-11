<template>
  <div class="flex-1 min-w-0">
    <!--
      Outer div is always max-height: 96px — toolbar height never changes.
      overflow-hidden clips content when collapsed.
      overflow-visible lets expanded content float over elements below.
    -->
    <div
      class="relative"
      :class="
        collapsed || !overflowing ? 'overflow-hidden' : 'overflow-visible'
      "
      style="max-height: 96px"
    >
      <!--
        Inner wrapper: when expanded, becomes a floating overlay panel
        via position: relative + z-index + background + shadow.
      -->
      <div
        :class="
          !collapsed && overflowing
            ? 'relative z-40 bg-surface-container shadow-xl border-b border-x border-outline-variant/40 rounded-b-lg pb-1'
            : ''
        "
      >
        <div
          ref="containerRef"
          class="py-2 cursor-text"
          @click="focusEditor()"
        />

        <!-- fade gradient when collapsed -->
        <div
          v-if="collapsed && overflowing"
          class="absolute inset-x-0 bottom-0 h-10 pointer-events-none bg-linear-to-t from-surface-container to-transparent"
        />

        <!-- collapse button inside the floating panel -->
        <button
          v-if="!collapsed && overflowing"
          class="flex items-center gap-0.5 text-[10px] text-on-surface-variant/40 hover:text-primary transition-colors mx-2 mt-0.5 hover:cursor-pointer"
          @click.stop="collapsed = true"
        >
          <span class="material-symbols-outlined text-[12px]">unfold_less</span>
          collapse
        </button>
      </div>
    </div>

    <!-- expand button in normal flow, shown below the 96px box -->
    <button
      v-if="collapsed && overflowing"
      class="flex items-center gap-0.5 text-[10px] text-on-surface-variant/40 hover:text-primary transition-colors mb-1 hover:cursor-pointer"
      @click.stop="collapsed = false"
    >
      <span class="material-symbols-outlined text-[12px]">unfold_more</span>
      expand
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  tooltips,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascriptLanguage } from "@codemirror/lang-javascript";
import {
  autocompletion,
  startCompletion,
  snippet,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from "@codemirror/autocomplete";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { MONGO_OPS, FILTER_TEMPLATES } from "../../lib/mongo-operators";

export interface FieldInfo {
  name: string;
  type: string;
}

const model = defineModel<string>();

const props = defineProps<{
  fields: FieldInfo[];
}>();

const emit = defineEmits<{
  submit: [];
}>();

// ── Build completion option lists from centralised definitions ────────────────

// All $ operators — shown when user types $
const ALL_OP_COMPLETIONS: Completion[] = MONGO_OPS.map((op) => ({
  label: op.label,
  detail: op.detail,
  type: "keyword",
  apply: snippet(op.valueSnippet),
}));

// Full filter templates — shown in empty filter with Ctrl+Space
const TEMPLATE_COMPLETIONS: Completion[] = FILTER_TEMPLATES.map((tpl, i) => ({
  label: tpl.label,
  detail: tpl.detail,
  type: "text",
  apply: snippet(tpl.snippet),
  boost: FILTER_TEMPLATES.length - i,
}));

// Logical ops for top-level key position
const LOGICAL_COMPLETIONS: Completion[] = MONGO_OPS.filter(
  (op) => op.category === "logical",
).map((op) => ({
  label: op.label,
  detail: op.detail,
  type: "keyword",
  apply: snippet(op.filterSnippet),
}));

// ── Autocomplete ──────────────────────────────────────────────────────────────

// Operators without outer {} — for when cursor is already inside a value object
const INNER_OP_COMPLETIONS: Completion[] = MONGO_OPS.map((op) => {
  const s = op.valueSnippet;
  const inner =
    s.startsWith("{") && s.endsWith("}") ? s.slice(1, -1).trim() : s;
  return {
    label: op.label,
    detail: op.detail,
    type: "keyword",
    apply: snippet(inner),
  };
});

// Count unbalanced { outside strings to detect nesting depth
function openBraceDepth(text: string): number {
  let depth = 0,
    inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && text[i - 1] !== "\\") inStr = !inStr;
    if (!inStr) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
  }
  return depth;
}

// Type-specific value completions shown right after "field":
function valueOptionsForField(f: FieldInfo): Completion[] {
  if (f.type === "ObjectId")
    return [
      {
        label: 'ObjectId("...")',
        detail: "exact match",
        type: "keyword",
        apply: snippet('ObjectId("#{hexId}")'),
      },
      {
        label: '{"$eq": ObjectId("...")}',
        detail: "with operator",
        type: "text",
        apply: snippet('{"$eq": ObjectId("#{hexId}")}'),
      },
      {
        label: '{"$ne": ObjectId("...")}',
        detail: "exclude",
        type: "text",
        apply: snippet('{"$ne": ObjectId("#{hexId}")}'),
      },
      {
        label: '{"$in": [ObjectId("...")]}',
        detail: "match any",
        type: "keyword",
        apply: snippet('{"$in": [ObjectId("#{id}")]}'),
      },
      {
        label: '{"$exists": true}',
        detail: "field present",
        type: "keyword",
        apply: snippet('{"$exists": #{true}}'),
      },
    ] as Completion[];
  if (f.type === "string")
    return [
      {
        label: '"value"',
        detail: "exact match",
        type: "text",
        apply: snippet('"#{value}"'),
      },
      {
        label: '{"$regex": "..."}',
        detail: "regex search",
        type: "keyword",
        apply: snippet('{"$regex": "#{pattern}", "$options": "i"}'),
      },
      {
        label: '{"$in": [...]}',
        detail: "match any",
        type: "keyword",
        apply: snippet('{"$in": ["#{val}"]}'),
      },
      {
        label: '{"$exists": true}',
        detail: "field present",
        type: "keyword",
        apply: snippet('{"$exists": #{true}}'),
      },
    ] as Completion[];
  if (f.type === "int" || f.type === "double")
    return [
      {
        label: "0",
        detail: "exact number",
        type: "text",
        apply: snippet("#{0}"),
      },
      {
        label: '{"$gt": 0}',
        detail: "greater than",
        type: "keyword",
        apply: snippet('{"$gt": #{0}}'),
      },
      {
        label: '{"$lt": 0}',
        detail: "less than",
        type: "keyword",
        apply: snippet('{"$lt": #{0}}'),
      },
      {
        label: '{"$gte": 0, "$lte": 1}',
        detail: "range",
        type: "keyword",
        apply: snippet('{"$gte": #{min}, "$lte": #{max}}'),
      },
    ] as Completion[];
  if (f.type === "boolean")
    return [
      { label: "true", detail: "boolean", type: "keyword", apply: "true" },
      { label: "false", detail: "boolean", type: "keyword", apply: "false" },
    ] as Completion[];
  if (f.type === "date")
    return [
      {
        label: '{"$gte": "date"}',
        detail: "from date",
        type: "keyword",
        apply: snippet('{"$gte": "#{date}"}'),
      },
      {
        label: '{"$lt": "date"}',
        detail: "before date",
        type: "keyword",
        apply: snippet('{"$lt": "#{date}"}'),
      },
    ] as Completion[];
  return [];
}

function fieldApply(f: FieldInfo): Completion["apply"] {
  if (f.type === "boolean") return snippet(`"${f.name}": #{true}`);
  if (f.type === "int" || f.type === "double")
    return snippet(`"${f.name}": #{0}`);
  if (f.type === "string") return snippet(`"${f.name}": "#{value}"`);
  // ObjectId, date, unknown: insert "field": then trigger value autocomplete
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    const text = `"${f.name}": `;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    requestAnimationFrame(() => startCompletion(view));
  };
}

function fieldFilterApply(f: FieldInfo): Completion["apply"] {
  if (f.type === "ObjectId")
    return snippet(`{"${f.name}": {"$eq": ObjectId("#{hexId}")}}`);
  if (f.type === "boolean") return snippet(`{"${f.name}": #{true}}`);
  if (f.type === "int" || f.type === "double")
    return snippet(`{"${f.name}": #{0}}`);
  if (f.type === "string") return snippet(`{"${f.name}": "#{value}"}`);
  return snippet(`{"${f.name}": #{value}}`);
}

function mongoComplete(context: CompletionContext): CompletionResult | null {
  const textBefore = context.state.sliceDoc(0, context.pos);
  const docText = context.state.doc.toString().trim();

  // ① ObjectId literal — match any uppercase-starting word that is a prefix of "ObjectId"
  const upperWord = context.matchBefore(/[A-Z]\w*/);
  if (upperWord && "ObjectId".startsWith(upperWord.text)) {
    return {
      from: upperWord.from,
      options: [
        {
          label: 'ObjectId("...")',
          detail: "BSON ObjectId",
          type: "keyword",
          apply: snippet('ObjectId("#{hexId}")'),
        },
      ],
      validFor: (text: string) => "ObjectId".startsWith(text),
    };
  }

  // ② $ → operators; context-aware: inside value {} → strip outer braces
  const dollarWord = context.matchBefore(/\$\w*/);
  if (dollarWord) {
    const before = context.state.sliceDoc(0, dollarWord.from).trimEnd();
    const insideValueObj = /"\s*:\s*\{[^{}]*$/.test(before);
    return {
      from: dollarWord.from,
      options: insideValueObj ? INNER_OP_COMPLETIONS : ALL_OP_COMPLETIONS,
      validFor: /^\$\w*$/,
    };
  }

  // ③ Empty filter + explicit → templates + field names
  const isEmpty = docText === "" || /^\{?\s*\}?$/.test(docText);
  if (isEmpty && context.explicit) {
    return {
      from: context.pos,
      options: [
        ...TEMPLATE_COMPLETIONS,
        ...props.fields.map((f) => ({
          label: f.name,
          type: "property" as const,
          detail: f.type,
          apply: fieldFilterApply(f),
          boost: -1,
        })),
      ],
    };
  }

  // ④ Value position: right after "field": → type-specific options (auto-triggered)
  const valuePosMatch = textBefore.match(/"([\w.]+)"\s*:\s*$/);
  if (valuePosMatch) {
    const field = props.fields.find((f) => f.name === valuePosMatch[1]);
    if (field) {
      const options = valueOptionsForField(field);
      if (options.length > 0) return { from: context.pos, options };
    }
  }

  // ⑤ Key position (top-level only) → field names + logical ops
  if (
    openBraceDepth(textBefore) === 1 &&
    /(?:^\s*\{|[{,])\s*"?[\w]*$/.test(textBefore)
  ) {
    const word = context.matchBefore(/"?[\w]+/);
    if (!word && !context.explicit) return null;
    return {
      from: word?.from ?? context.pos,
      options: [
        ...props.fields.map((f) => ({
          label: f.name,
          type: "property" as const,
          detail: f.type,
          apply: fieldApply(f),
        })),
        ...LOGICAL_COMPLETIONS,
      ],
      validFor: /^"?[\w]*$/,
    };
  }

  return null;
}

// ── Theme & highlighting ───────────────────────────────────────────────────────

const highlight = HighlightStyle.define([
  { tag: t.propertyName, color: "#c0c1ff" }, // field keys — primary violet
  { tag: t.string, color: "#86efac" }, // string values — green
  { tag: t.number, color: "#60a5fa" }, // numbers — blue
  { tag: t.bool, color: "#f59e0b" }, // booleans — amber
  { tag: t.null, color: "#908fa0" }, // null — muted
  { tag: t.bracket, color: "#c7c4d7" }, // { } [ ] — light
  { tag: t.punctuation, color: "#89ceff" }, // : , — secondary blue (visible!)
]);

const theme = EditorView.theme(
  {
    "&": {
      fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
      background: "transparent",
    },
    ".cm-content": { padding: "0", caretColor: "#c0c1ff" },
    "&.cm-focused": { outline: "none" },
    ".cm-line": { padding: "0" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      background: "rgba(192,193,255,0.18)",
    },
    "&.cm-focused .cm-cursor": { borderLeftColor: "#c0c1ff" },
    ".cm-placeholder": { color: "#3d3c4e" },
    // Snippet placeholders
    ".cm-snippet-field": {
      background: "rgba(192,193,255,0.15)",
      borderRadius: "2px",
    },
    ".cm-snippet-field-0": { borderBottom: "1px solid #c0c1ff" },
    // Autocomplete dropdown
    ".cm-tooltip": {
      background: "#131b2e",
      border: "1px solid #2d3449",
      borderRadius: "10px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete ul": {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "12px",
      maxHeight: "280px",
    },
    ".cm-tooltip-autocomplete ul li": { padding: "4px 12px" },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      background: "rgba(192,193,255,0.1)",
      color: "#c0c1ff",
    },
    ".cm-completionLabel": { color: "#dae2fd" },
    ".cm-completionDetail": {
      color: "#908fa0",
      fontSize: "11px",
      fontStyle: "normal",
      paddingLeft: "10px",
    },
    ".cm-completionMatchedText": {
      color: "#c0c1ff",
      textDecoration: "none",
      fontWeight: "600",
    },
    ".cm-completionIcon": { display: "none" },
  },
  { dark: true },
);

// ── Editor lifecycle ───────────────────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null);
const collapsed = ref(true);
const overflowing = ref(false);
let view: EditorView | null = null;

function checkOverflow() {
  requestAnimationFrame(() => {
    if (containerRef.value) {
      overflowing.value = containerRef.value.scrollHeight > 96;
    }
  });
}

onMounted(() => {
  view = new EditorView({
    state: EditorState.create({
      doc: model.value,
      extensions: [
        history(),
        javascriptLanguage.configure({ top: "SingleExpression" }),
        syntaxHighlighting(highlight),
        tooltips({ parent: document.body }),
        autocompletion({
          override: [mongoComplete],
          activateOnTyping: false,
          maxRenderedOptions: 14,
          defaultKeymap: true,
        }),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              emit("submit");
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        cmPlaceholder(
          "{ field: value }  —  Ctrl+Enter to run, $ for operators",
        ),
        EditorView.lineWrapping,
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            model.value = update.state.doc.toString();
            checkOverflow();
            if (
              update.transactions.some((tr) => tr.isUserEvent("input.type"))
            ) {
              requestAnimationFrame(() => startCompletion(update.view));
            }
          }
        }),
      ],
    }),
    parent: containerRef.value!,
  });
});

watch(model, (val) => {
  if (!view || view.state.doc.toString() === val) return;

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: val },
  });

  collapsed.value = true;
  checkOverflow();
});

const focusEditor = () => view?.focus();

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>
