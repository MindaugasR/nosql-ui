<template>
  <div ref="triggerRef" class="relative shrink-0">
    <button
      class="flex items-center gap-1.5 bg-surface-container border border-outline-variant rounded-lg px-2.5 py-0.5 text-code-sm outline-none transition-colors w-44 min-w-0 hover:cursor-pointer"
      :class="
        open
          ? 'border-primary'
          : modelValue
            ? 'text-on-surface hover:border-primary'
            : 'text-on-surface-variant/50 hover:border-primary'
      "
      @click="toggle"
    >
      <span class="flex-1 text-left font-mono truncate">
        {{ modelValue || "— field —" }}
      </span>
      <span
        class="material-symbols-outlined text-[13px] text-on-surface-variant shrink-0"
      >
        unfold_more
      </span>
    </button>

    <div v-if="open" class="fixed inset-0 z-50" @click="close" />

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed z-60 bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl overflow-hidden"
        :style="dropdownStyle"
      >
        <div class="p-1.5 border-b border-outline-variant/50">
          <input
            ref="searchRef"
            v-model="search"
            type="text"
            placeholder="Search fields…"
            class="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
            @click.stop
            @keydown.escape="close"
            @keydown.down.prevent="moveHighlight(1)"
            @keydown.up.prevent="moveHighlight(-1)"
            @keydown.enter.prevent="selectHighlighted"
          />
        </div>
        <div class="max-h-52 overflow-y-auto py-1" ref="listRef">
          <button
            v-for="(f, idx) in filteredFields"
            :key="f.name"
            class="w-full text-left px-3 py-1.5 text-code-sm font-mono flex items-center gap-2 transition-colors"
            :class="
              f.name === modelValue
                ? 'text-primary bg-primary/8'
                : idx === highlightIdx
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface hover:bg-surface-container-high'
            "
            @click="select(f.name)"
          >
            <span class="flex-1 truncate">{{ f.name }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded font-sans shrink-0"
              :class="typeClass(f.type)"
              >{{ f.type }}</span
            >
          </button>
          <p
            v-if="filteredFields.length === 0"
            class="px-3 py-2 text-code-sm text-on-surface-variant/50 font-mono"
          >
            No matches
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import type { FieldInfo } from "./ui/FilterInput.vue";

const props = defineProps<{
  modelValue: string;
  fields: FieldInfo[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const triggerRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const open = ref(false);
const search = ref("");
const highlightIdx = ref(0);

const dropdownStyle = computed(() => {
  const rect = triggerRef.value?.getBoundingClientRect();
  if (!rect) return {};
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 240)}px`,
  };
});

const filteredFields = computed(() =>
  props.fields.filter((f) =>
    f.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
);

watch(filteredFields, () => {
  highlightIdx.value = 0;
});

const toggle = () => {
  if (open.value) {
    close();
  } else {
    open.value = true;
    search.value = "";
    highlightIdx.value = 0;
    nextTick(() => searchRef.value?.focus());
  }
};

const close = () => {
  open.value = false;
  search.value = "";
};

const select = (name: string) => {
  emit("update:modelValue", name);
  close();
};

const moveHighlight = (dir: 1 | -1) => {
  const len = filteredFields.value.length;
  if (len === 0) return;
  highlightIdx.value = (highlightIdx.value + dir + len) % len;
};

const selectHighlighted = () => {
  const f = filteredFields.value[highlightIdx.value];
  if (f) select(f.name);
};

const typeClass = (type: string): string => {
  const map: Record<string, string> = {
    string: "bg-green-500/15 text-green-400",
    int: "bg-blue-500/15 text-blue-400",
    double: "bg-blue-500/15 text-blue-400",
    number: "bg-blue-500/15 text-blue-400",
    boolean: "bg-yellow-500/15 text-yellow-400",
    ObjectId: "bg-purple-500/15 text-purple-400",
    date: "bg-orange-500/15 text-orange-400",
    array: "bg-cyan-500/15 text-cyan-400",
    object: "bg-surface-variant text-on-surface-variant",
    null: "bg-surface-variant text-on-surface-variant/50",
  };
  return map[type] ?? "bg-surface-variant text-on-surface-variant";
};
</script>
