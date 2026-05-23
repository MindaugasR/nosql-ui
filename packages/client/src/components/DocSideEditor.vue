<template>
  <Teleport to="body">
    <Transition name="editor-fade">
      <TransitionGroup
        v-if="stack && open && stack.length > 0"
        tag="div"
        :css="false"
        @enter="onPanelEnter"
      >
        <!-- Render each panel in the stack — all anchored right:0, older ones peek 50px to the left -->
        <div
          v-for="(entry, idx) in stack"
          :key="entry.id"
          class="fixed bottom-0 flex flex-col w-[42vw] bg-surface-container-low border-l border-outline-variant shadow-2xl"
          :style="{
            top: '44px',
            right: '0',
            zIndex: 50 + idx,
            transform: `translateX(${-(stack.length - 1 - idx) * 50}px)`,
          }"
        >
          <!-- Left-edge strip — visible when this panel is behind a newer one -->
          <div
            v-if="idx < stack.length - 1"
            class="absolute left-0 inset-y-0 w-12.5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-surface-container hover:bg-surface-variant/40 transition-colors z-10 border-r border-outline-variant/60"
            @click="emit('pop-to', idx)"
          >
            <span class="material-symbols-outlined text-[13px] text-primary">
              data_object
            </span>
            <span
              class="font-mono text-[9px] text-on-surface-variant max-h-32 overflow-hidden"
              style="
                writing-mode: vertical-rl;
                transform: rotate(180deg);
                letter-spacing: 0.05em;
              "
              >{{ entry.collection }}</span
            >
          </div>

          <!-- Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0 bg-surface-container"
          >
            <!-- Breadcrumb -->
            <div class="flex items-center gap-1 min-w-0 flex-1">
              <template v-for="(e, i) in stack" :key="i">
                <button
                  v-if="i < stack.length - 1"
                  class="font-mono text-[10px] text-on-surface-variant/50 hover:text-primary transition-colors truncate max-w-20 shrink-0"
                  @click="emit('pop-to', i)"
                >
                  {{ e.collection }}
                </button>
                <span
                  v-if="i < stack.length - 1"
                  class="text-on-surface-variant/30 text-[10px] shrink-0"
                  >›</span
                >
              </template>
              <span
                class="material-symbols-outlined text-[14px] text-primary shrink-0"
              >
                data_object
              </span>
              <span
                class="font-mono text-code-sm text-on-surface-variant truncate"
              >
                {{ String(entry.doc._id ?? "—") }}
              </span>
            </div>

            <!-- Resolving spinner -->
            <span
              v-if="resolving && idx === stack.length - 1"
              class="material-symbols-outlined text-[16px] text-on-surface-variant animate-spin mr-2 shrink-0"
              >sync</span
            >

            <button
              class="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Tree content -->
          <div class="flex-1 overflow-y-auto">
            <DocumentTree
              v-if="idx === stack.length - 1 ? localDoc : entry.doc"
              :document="
                (idx === stack.length - 1 ? localDoc : entry.doc) as Record<
                  string,
                  unknown
                >
              "
              :readonly="idx < stack.length - 1"
              @update:document="localDoc = $event"
              @link-click="emit('link-click', $event)"
            />
          </div>

          <!-- Footer (top panel only) -->
          <div
            v-if="idx === stack.length && !aggregation"
            class="flex items-center justify-between px-4 py-3 border-t border-outline-variant shrink-0 bg-surface-container"
          >
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-error hover:bg-error-container/20 transition-colors text-body-sm"
              @click="emit('delete')"
            >
              <span class="material-symbols-outlined text-[15px]">delete</span>
              Delete
            </button>
            <div class="flex items-center gap-2">
              <button
                class="px-4 py-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                @click="emit('close')"
              >
                Cancel
              </button>
              <button
                class="px-4 py-1.5 bg-primary text-on-primary rounded text-body-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                :disabled="saving"
                @click="save"
              >
                <span
                  v-if="saving"
                  class="material-symbols-outlined text-[14px] animate-spin"
                >
                  sync
                </span>
                Save
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import DocumentTree from "./DocumentTree.vue";
import { StackEntry } from "@/types";

const props = defineProps<{
  stack?: StackEntry[] | null;
  open: boolean;
  saving?: boolean;
  resolving?: boolean;
  aggregation?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [doc: Record<string, unknown>];
  delete: [];
  "link-click": [objectId: string];
  "pop-to": [index: number];
}>();

// Local editable copy of the TOP document only
const localDoc = ref<Record<string, unknown> | null>(null);

const topEntry = computed(() =>
  props.stack ? props.stack[props.stack.length - 1] : null,
);

watch(
  topEntry,
  (entry) => {
    localDoc.value = entry ? JSON.parse(JSON.stringify(entry.doc)) : null;
  },
  { immediate: true },
);

const save = () => {
  if (localDoc.value) emit("save", localDoc.value);
};

const onPanelEnter = (el: Element, done: () => void) => {
  const finalTransform = (el as HTMLElement).style.transform;
  const anim = el.animate(
    [
      { transform: "translateX(100%)" },
      { transform: finalTransform || "translateX(0)" },
    ],
    { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  );
  anim.onfinish = done;
};
</script>

<style scoped>
.editor-fade-enter-active,
.editor-fade-leave-active {
  transition: opacity 0.15s ease;
}
.editor-fade-enter-from,
.editor-fade-leave-to {
  opacity: 0;
}
</style>
