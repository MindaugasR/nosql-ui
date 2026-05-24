<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="requestClose"
        />

        <!-- Modal -->
        <div
          class="relative z-10 w-[700px] max-w-[92vw] max-h-[80vh] flex flex-col rounded-xl bg-surface-container-low border border-outline-variant shadow-2xl"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0 bg-surface-container rounded-t-xl"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-[15px] text-primary shrink-0">
                add_circle
              </span>
              <span class="font-mono text-code-sm font-semibold text-on-surface">
                New document
              </span>
              <span class="text-on-surface-variant/60 text-body-sm shrink-0">
                — {{ collection }}
              </span>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
              @click="requestClose"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto min-h-0">
            <DocumentTree
              :document="doc"
              :create-mode="true"
              @update:document="doc = $event"
            />
          </div>

          <!-- Insert error -->
          <Transition name="confirm-slide">
            <div
              v-if="insertError"
              class="px-4 py-2.5 border-t border-error/30 bg-error-container/20 shrink-0 flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-error text-[14px] shrink-0">error</span>
              <p class="text-[12px] text-error font-mono">{{ insertError }}</p>
            </div>
          </Transition>

          <!-- Discard confirm -->
          <Transition name="confirm-slide">
            <div
              v-if="showCloseConfirm"
              class="px-4 py-3 border-t border-error/30 bg-error-container/20 shrink-0"
            >
              <p class="text-body-sm text-on-surface mb-2.5">Discard this document?</p>
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-1.5 rounded bg-error text-on-error text-body-sm font-medium hover:opacity-90 transition-opacity"
                  @click="forceClose"
                >
                  Discard
                </button>
                <button
                  class="px-3 py-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  @click="showCloseConfirm = false"
                >
                  Keep editing
                </button>
              </div>
            </div>
          </Transition>

          <!-- Footer -->
          <div
            class="flex items-center justify-end gap-2 px-4 py-3 border-t border-outline-variant shrink-0 bg-surface-container rounded-b-xl"
          >
            <button
              class="px-4 py-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
              @click="requestClose"
            >
              Cancel
            </button>
            <button
              class="px-4 py-1.5 bg-primary text-on-primary rounded text-body-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="inserting"
              @click="insert"
            >
              <span
                v-if="inserting"
                class="material-symbols-outlined text-[14px] animate-spin"
              >sync</span>
              Insert
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import DocumentTree from "./DocumentTree.vue";
import { api } from "@/lib/api";
import { useConnectionsStore } from "@/stores/connections";
import { useDatabaseStore } from "@/stores/useDatabaseStore";

const props = defineProps<{
  open: boolean;
  collection: string;
}>();

const emit = defineEmits<{
  close: [];
  inserted: [];
}>();

const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();

const doc = ref<Record<string, unknown>>({});
const inserting = ref(false);
const insertError = ref<string | null>(null);
const showCloseConfirm = ref(false);

const isDirty = computed(() => Object.keys(doc.value).length > 0);

watch(
  () => props.open,
  (open) => {
    if (open) {
      doc.value = {};
      inserting.value = false;
      insertError.value = null;
      showCloseConfirm.value = false;
    }
  },
);

const requestClose = () => {
  if (isDirty.value) {
    showCloseConfirm.value = true;
  } else {
    emit("close");
  }
};

const forceClose = () => {
  showCloseConfirm.value = false;
  emit("close");
};

const insert = async () => {
  if (!connectionStore.active || !databaseStore.database()) return;
  insertError.value = null;
  inserting.value = true;
  try {
    await api.data.insert(
      connectionStore.active,
      databaseStore.database()!.name,
      props.collection,
      doc.value,
    );
    emit("inserted");
    emit("close");
  } catch (e: any) {
    insertError.value = e.message;
  } finally {
    inserting.value = false;
  }
};
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
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
