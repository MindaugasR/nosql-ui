<script setup lang="ts" generic="T extends string">
import { ref, computed, nextTick, watch } from "vue";

const props = defineProps<{
  modelValue: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  searchable?: boolean;
  allowCustom?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: T];
}>();

const open = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
const search = ref("");
const highlightIdx = ref(0);

const currentLabel = computed(
  () =>
    props.options.find((o) => o.value === props.modelValue)?.label ??
    props.modelValue ??
    props.placeholder ??
    "",
);

const filteredOptions = computed(() => {
  if (!props.searchable || !search.value) return props.options;
  const q = search.value.toLowerCase();
  return props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  );
});

watch(filteredOptions, () => {
  highlightIdx.value = 0;
});

const openDropdown = async () => {
  if (!triggerRef.value) return;

  // Calculate position from trigger BEFORE opening so dropdown renders already positioned
  const rect = triggerRef.value.getBoundingClientRect();
  const dropdownHeight = Math.min(
    props.options.length * 32 + (props.searchable ? 44 : 8),
    300,
  );
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const availableVertical = spaceBelow >= spaceAbove ? spaceBelow : spaceAbove;

  const style: Record<string, string> = {
    position: "fixed",
    minWidth: `${Math.max(rect.width, 120)}px`,
    maxWidth: "220px",
    maxHeight: `${Math.min(availableVertical - 8, 300)}px`,
    zIndex: "9999",
  };

  if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
    style.top = `${rect.bottom + 2}px`;
  } else {
    style.bottom = `${window.innerHeight - rect.top + 2}px`;
  }

  const rightIfAlignLeft = rect.left + 120;
  if (rightIfAlignLeft > window.innerWidth - 8) {
    style.right = `${window.innerWidth - rect.right}px`;
  } else {
    style.left = `${rect.left}px`;
  }

  dropdownStyle.value = style;
  open.value = true;
  search.value = "";
  highlightIdx.value = 0;
  await nextTick();
  searchRef.value?.focus();
};

const select = (value: T) => {
  emit("update:modelValue", value);
  open.value = false;
  search.value = "";
};

const commitCustom = () => {
  if (!props.allowCustom || !search.value.trim()) return;
  const highlighted = filteredOptions.value[highlightIdx.value];
  if (highlighted) {
    select(highlighted.value);
  } else {
    emit("update:modelValue", search.value.trim() as T);
    open.value = false;
    search.value = "";
  }
};

const onSearchKeydown = (e: KeyboardEvent) => {
  const len = filteredOptions.value.length;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightIdx.value = (highlightIdx.value + 1) % Math.max(len, 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightIdx.value =
      (highlightIdx.value - 1 + Math.max(len, 1)) % Math.max(len, 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (len > 0) select(filteredOptions.value[highlightIdx.value].value);
    else if (props.allowCustom) commitCustom();
  } else if (e.key === "Escape") {
    open.value = false;
    search.value = "";
  }
};
</script>

<template>
  <div class="relative w-full">
    <button
      ref="triggerRef"
      class="w-full border border-outline-variant rounded flex items-center justify-between gap-1 px-1.5 py-0.5 text-[11px] transition-colors"
      :class="
        disabled
          ? 'text-on-surface-variant/40 cursor-default italic'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 cursor-pointer'
      "
      :disabled="disabled"
      @click.stop="openDropdown"
    >
      <span class="truncate">{{ currentLabel }}</span>
      <span
        v-if="!disabled"
        class="material-symbols-outlined text-[11px] shrink-0 opacity-40"
        >unfold_more</span
      >
    </button>

    <Teleport to="body">
      <template v-if="open">
        <div
          class="fixed inset-0"
          style="z-index: 9998"
          @click.stop="open = false"
        />

        <div
          class="bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl overflow-hidden flex flex-col"
          :style="dropdownStyle"
        >
          <!-- Search input -->
          <div
            v-if="searchable"
            class="p-1.5 border-b border-outline-variant/50 shrink-0"
          >
            <input
              ref="searchRef"
              v-model="search"
              type="text"
              :placeholder="allowCustom ? 'Search or type a value…' : 'Search…'"
              class="w-full bg-surface-container border border-outline-variant rounded px-2 py-1 text-[11px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
              @click.stop
              @keydown="onSearchKeydown"
            />
          </div>

          <!-- Options list -->
          <div class="overflow-y-auto py-1">
            <button
              v-for="(opt, idx) in filteredOptions"
              :key="opt.value"
              class="w-full text-left px-3 py-1.5 text-[12px] transition-colors whitespace-nowrap cursor-pointer hover:bg-on-surface/10"
              :class="
                opt.value === modelValue && idx !== highlightIdx
                  ? 'text-primary bg-primary/15 font-medium'
                  : idx === highlightIdx
                    ? 'bg-on-surface/10 text-on-surface'
                    : 'text-on-surface'
              "
              @click.stop="select(opt.value)"
              @mousemove="highlightIdx = idx"
            >
              {{ opt.label }}
            </button>

            <p
              v-if="filteredOptions.length === 0 && !allowCustom"
              class="px-3 py-2 text-[11px] text-on-surface-variant/50 text-center"
            >
              No matches
            </p>
            <button
              v-else-if="
                filteredOptions.length === 0 && allowCustom && search.trim()
              "
              class="w-full text-left px-3 py-1.5 text-[12px] text-primary hover:bg-primary/8 transition-colors cursor-pointer"
              @click.stop="commitCustom"
            >
              Use "{{ search.trim() }}"
            </button>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>
