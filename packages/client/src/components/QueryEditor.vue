<template>
  <div
    ref="containerRef"
    class="qe-editor bg-surface-container border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary/60 transition-colors cursor-text"
    @click="focusEditor()"
  />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  tooltips,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { javascriptLanguage } from "@codemirror/lang-javascript";
import {
  autocompletion,
  closeBrackets,
  startCompletion,
  snippet,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from "@codemirror/autocomplete";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  syntaxHighlighting,
  bracketMatching,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import {
  MONGO_OPS,
  COLLECTION_METHODS,
  CURSOR_CHAIN_METHODS,
} from "@/lib/mongo-operators";
import type { FieldInfo } from "@/components/ui/FilterInput.vue";

const model = defineModel<string>({ default: "" });

const props = defineProps<{
  collections: string[];
  fields: FieldInfo[];
}>();

const emit = defineEmits<{
  run: [];
}>();

// ── Completions ───────────────────────────────────────────────────────────────

const methodCompletions: Completion[] = COLLECTION_METHODS.map((m) => ({
  label: m.label,
  detail: m.detail,
  type: m.isWrite ? "keyword" : "function",
  info: m.description,
  apply: snippet(m.snippet),
}));

const chainCompletions: Completion[] = CURSOR_CHAIN_METHODS.map((m) => ({
  label: m.label,
  detail: m.detail,
  type: "function",
  info: m.description,
  apply: snippet(m.snippet),
}));

const operatorCompletions: Completion[] = MONGO_OPS.map((op) => ({
  label: op.label,
  detail: op.detail,
  type: "keyword",
  apply: snippet(
    op.valueSnippet.startsWith("{") && op.valueSnippet.endsWith("}")
      ? op.valueSnippet.slice(1, -1).trim()
      : op.valueSnippet,
  ),
}));

const bsonCompletions: Completion[] = [
  {
    label: 'ObjectId("…")',
    detail: "BSON ObjectId",
    type: "keyword",
    apply: snippet('ObjectId("#{hexId}")'),
  },
  {
    label: 'ISODate("…")',
    detail: "BSON Date",
    type: "keyword",
    apply: snippet('ISODate("#{2026-01-01}")'),
  },
  { label: "true", detail: "boolean", type: "keyword", apply: "true" },
  { label: "false", detail: "boolean", type: "keyword", apply: "false" },
  { label: "null", detail: "null", type: "keyword", apply: "null" },
];

// Collection completion: insert name + "." and immediately suggest methods
const collectionApply =
  (name: string): Completion["apply"] =>
  (view: EditorView, _c: Completion, from: number, to: number) => {
    const text = `${name}.`;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    requestAnimationFrame(() => startCompletion(view));
  };

/** Paren depth at cursor, string-aware — >0 means inside a call's arguments. */
const parenDepth = (text: string): number => {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
  }
  return depth;
};

function shellComplete(context: CompletionContext): CompletionResult | null {
  const textBefore = context.state.sliceDoc(0, context.pos);

  // ── Inside call arguments ──────────────────────────────────────────────────
  if (parenDepth(textBefore) > 0) {
    // $operators
    const dollarWord = context.matchBefore(/\$\w*/);
    if (dollarWord) {
      return {
        from: dollarWord.from,
        options: operatorCompletions,
        validFor: /^\$\w*$/,
      };
    }

    // Value position — after "key":
    if (/[:]\s*(?:[A-Z]\w*)?$/.test(textBefore)) {
      const upperWord = context.matchBefore(/[A-Z]\w*/);
      return {
        from: upperWord?.from ?? context.pos,
        options: bsonCompletions,
        validFor: /^[A-Z]?\w*$/,
      };
    }

    // Key position — after { or , → field names + operators
    if (/[{,]\s*"?[\w.]*$/.test(textBefore)) {
      const word = context.matchBefore(/"?[\w.]+/);
      if (!word && !context.explicit) return null;
      return {
        from: word?.from ?? context.pos,
        options: [
          ...props.fields.map((f) => ({
            label: f.name,
            detail: f.type,
            type: "property" as const,
            apply: snippet(`${/^[a-zA-Z_$][\w$]*$/.test(f.name) ? f.name : `"${f.name}"`}: #{}`),
          })),
          ...operatorCompletions.map((c) => ({ ...c, boost: -2 })),
        ],
        validFor: /^"?[\w.]*$/,
      };
    }

    return null;
  }

  // ── Chain methods after ")." ───────────────────────────────────────────────
  const chainMatch = textBefore.match(/\)\s*\.\s*([$\w]*)$/);
  if (chainMatch) {
    return {
      from: context.pos - chainMatch[1].length,
      options: chainCompletions,
      validFor: /^[$\w]*$/,
    };
  }

  // ── Methods after "db.collection." ─────────────────────────────────────────
  const methodMatch = textBefore.match(
    /\bdb\s*\.\s*[$\w]+\s*\.\s*([$\w]*)$/,
  );
  if (methodMatch) {
    return {
      from: context.pos - methodMatch[1].length,
      options: methodCompletions,
      validFor: /^[$\w]*$/,
    };
  }

  // ── Collections after "db." ────────────────────────────────────────────────
  const collMatch = textBefore.match(/(?:^|[^\w$.])db\s*\.\s*([$\w]*)$/);
  if (collMatch) {
    // No list yet (still loading) → return null so CodeMirror re-queries on the
    // next keystroke instead of caching an empty result for this token
    if (props.collections.length === 0) return null;
    return {
      from: context.pos - collMatch[1].length,
      options: props.collections.map((name) => ({
        label: name,
        detail: "collection",
        type: "class",
        apply: collectionApply(name),
      })),
      validFor: /^[$\w]*$/,
    };
  }

  // ── Start of query → "db." ─────────────────────────────────────────────────
  const startMatch = textBefore.match(/(?:^|[\s;])(d[b]?)$/);
  if (startMatch || (context.explicit && textBefore.trim() === "")) {
    return {
      from: context.pos - (startMatch?.[1].length ?? 0),
      options: [
        {
          label: "db",
          detail: "current database",
          type: "namespace",
          apply: (view: EditorView, _c: Completion, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: "db." },
              selection: { anchor: from + 3 },
            });
            requestAnimationFrame(() => startCompletion(view));
          },
        },
      ],
      validFor: /^d?b?$/,
    };
  }

  return null;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const highlight = HighlightStyle.define([
  { tag: t.propertyName, color: "#c0c1ff" },
  { tag: t.variableName, color: "#dae2fd" },
  { tag: t.function(t.propertyName), color: "#89ceff" },
  { tag: t.string, color: "#86efac" },
  { tag: t.number, color: "#60a5fa" },
  { tag: t.bool, color: "#f59e0b" },
  { tag: t.null, color: "#908fa0" },
  { tag: t.bracket, color: "#c7c4d7" },
  { tag: t.punctuation, color: "#89ceff" },
]);

const theme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', monospace",
      background: "transparent",
    },
    ".cm-content": { padding: "10px 4px", caretColor: "#c0c1ff" },
    "&.cm-focused": { outline: "none" },
    ".cm-gutters": {
      background: "transparent",
      border: "none",
      color: "#3d3c4e",
      paddingLeft: "6px",
    },
    ".cm-activeLineGutter": { background: "transparent", color: "#908fa0" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      background: "rgba(192,193,255,0.18)",
    },
    "&.cm-focused .cm-cursor": { borderLeftColor: "#c0c1ff" },
    ".cm-placeholder": { color: "#3d3c4e" },
    ".cm-snippet-field": {
      background: "rgba(192,193,255,0.15)",
      borderRadius: "2px",
    },
    ".cm-snippet-field-0": { borderBottom: "1px solid #c0c1ff" },
    ".cm-matchingBracket": {
      background: "rgba(137,206,255,0.2)",
      outline: "1px solid rgba(137,206,255,0.4)",
    },
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
    ".cm-completionInfo": {
      background: "#131b2e",
      border: "1px solid #2d3449",
      borderRadius: "8px",
      padding: "8px 10px",
      fontSize: "11px",
      color: "#c7c4d7",
      maxWidth: "260px",
    },
  },
  { dark: true },
);

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

onMounted(() => {
  view = new EditorView({
    state: EditorState.create({
      doc: model.value,
      extensions: [
        history(),
        lineNumbers(),
        closeBrackets(),
        bracketMatching(),
        javascriptLanguage.configure({ top: "SingleExpression" }),
        syntaxHighlighting(highlight),
        tooltips({ parent: document.body }),
        autocompletion({
          override: [shellComplete],
          activateOnTyping: false,
          maxRenderedOptions: 16,
          defaultKeymap: true,
        }),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              emit("run");
              return true;
            },
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        cmPlaceholder(
          'db.collection.find({ field: value })  —  Ctrl+Enter to run, Ctrl+Space for suggestions',
        ),
        EditorView.lineWrapping,
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            model.value = update.state.doc.toString();
            if (update.transactions.some((tr) => tr.isUserEvent("input.type"))) {
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
});

const focusEditor = () => view?.focus();
defineExpose({ focus: focusEditor });

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<style scoped>
.qe-editor :deep(.cm-editor) {
  min-height: 96px;
  max-height: 280px;
}
.qe-editor :deep(.cm-scroller) {
  overflow: auto;
}
</style>
