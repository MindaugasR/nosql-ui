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
          :data-final-transform="`translateX(${-(stack.length - 1 - idx) * 50}px)`"
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

            <Button variant="icon" class="w-7 h-7 shrink-0" @click="requestClose()">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </Button>
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

          <!-- Discard confirm bar -->
          <Transition name="confirm-slide">
            <div
              v-if="showCloseConfirm && idx === stack.length - 1"
              class="px-4 py-3 border-t border-error/30 bg-error-container/20 shrink-0"
            >
              <p class="text-body-sm text-on-surface mb-2.5">Discard unsaved changes?</p>
              <div class="flex items-center gap-2">
                <Button variant="error" @click="discardAndClose">Discard</Button>
                <Button variant="ghost" @click="showCloseConfirm = false">Keep editing</Button>
              </div>
            </div>
          </Transition>

          <!-- Footer (top panel only) -->
          <div
            v-if="idx === stack.length - 1 && !aggregation"
            class="flex items-center justify-between px-4 py-3 border-t border-outline-variant shrink-0 bg-surface-container"
          >
            <Button variant="danger" @click="emit('delete')">
              <span class="material-symbols-outlined text-[15px]">delete</span>
              Delete
            </Button>
            <div class="flex items-center gap-2">
              <Button variant="ghost" @click="requestClose()">Cancel</Button>
              <Button variant="primary" :disabled="saving || !isDirty" :loading="saving" @click="save">Save</Button>
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
import Button from "./ui/Button.vue";
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

const localDoc = ref<Record<string, unknown> | null>(null);
const originalDoc = ref<Record<string, unknown> | null>(null);
const showCloseConfirm = ref(false);

const topEntry = computed(() =>
  props.stack ? props.stack[props.stack.length - 1] : null,
);

const isDirty = computed(() => {
  if (!localDoc.value || !originalDoc.value) return false;
  return JSON.stringify(localDoc.value) !== JSON.stringify(originalDoc.value);
});

watch(
  topEntry,
  (entry) => {
    const doc = entry ? JSON.parse(JSON.stringify(entry.doc)) : null;
    localDoc.value = doc;
    originalDoc.value = doc ? JSON.parse(JSON.stringify(doc)) : null;
    showCloseConfirm.value = false;
  },
  { immediate: true },
);

const save = () => {
  if (localDoc.value) emit("save", localDoc.value);
};

const requestClose = () => {
  if (isDirty.value) {
    showCloseConfirm.value = true;
  } else {
    emit("close");
  }
};

const discardAndClose = () => {
  showCloseConfirm.value = false;
  emit("close");
};

const onPanelEnter = (el: Element, done: () => void) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.transform = "translateX(100%)";
  requestAnimationFrame(() => {
    const finalTransform = htmlEl.dataset.finalTransform ?? "translateX(0)";
    const anim = htmlEl.animate(
      [{ transform: "translateX(100%)" }, { transform: finalTransform }],
      { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    );
    anim.onfinish = () => {
      htmlEl.style.transform = finalTransform;
      done();
    };
  });
};
</script>

<style scoped>
.editor-fade-leave-active {
  transition: opacity 0.15s ease;
}
.editor-fade-leave-to {
  opacity: 0;
}

.confirm-slide-enter-active,
.confirm-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.confirm-slide-enter-from,
.confirm-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
