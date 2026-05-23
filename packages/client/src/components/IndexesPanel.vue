<template>
  <Teleport to="body">
    <Transition name="qb-drop">
      <div v-if="open" class="fixed inset-0 z-45">
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="$emit('close')"
        />

        <div
          class="absolute top-11 left-60 right-0 z-10 flex justify-center items-start"
        >
          <div
            class="w-full max-w-5xl flex flex-col bg-surface-container-low border border-outline-variant shadow-2xl max-h-[80vh] rounded-xl overflow-hidden"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-high shrink-0"
            >
              <div class="flex items-center gap-3">
                <div class="p-1.5 bg-primary/10 rounded">
                  <span
                    class="material-symbols-outlined text-primary text-[18px]"
                    >key</span
                  >
                </div>
                <div>
                  <span class="text-body-md font-semibold text-on-surface"
                    >Collection Indexes</span
                  >
                  <p class="text-[11px] text-on-surface-variant mt-0.5">
                    <span v-if="!loading && indexes.length > 0">
                      {{ indexes.length }} index{{
                        indexes.length === 1 ? "" : "es"
                      }}
                      on
                      <span class="text-primary font-mono">{{
                        collection?.name
                      }}</span>
                    </span>
                    <span v-else-if="!loading">
                      <span class="font-mono text-primary">{{
                        collection?.name
                      }}</span>
                    </span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded text-label-caps font-semibold uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all text-[11px]"
                >
                  <span class="material-symbols-outlined text-[15px]">add</span>
                  Create Index
                </button>
                <button
                  class="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                  @click="$emit('close')"
                >
                  <span class="material-symbols-outlined text-[18px]"
                    >close</span
                  >
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="overflow-y-auto">
              <!-- Loading skeletons -->
              <template v-if="loading">
                <div class="p-5 space-y-2">
                  <div
                    v-for="n in 3"
                    :key="n"
                    class="h-11 bg-surface-container-high rounded-lg animate-pulse"
                  />
                </div>
              </template>

              <!-- Error -->
              <div
                v-else-if="error"
                class="flex items-center gap-2 text-error px-5 py-4"
              >
                <span class="material-symbols-outlined text-[16px]"
                  >warning</span
                >
                <span class="text-body-sm">{{ error }}</span>
              </div>

              <!-- Table -->
              <div v-else class="px-5 py-4">
                <div
                  class="bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden"
                >
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr
                        class="bg-surface-container-high/60 text-on-surface-variant border-b border-outline-variant"
                      >
                        <th
                          class="px-4 py-2.5 text-label-caps font-semibold text-[11px] uppercase tracking-wider"
                        >
                          Name
                        </th>
                        <th
                          class="px-4 py-2.5 text-label-caps font-semibold text-[11px] uppercase tracking-wider"
                        >
                          Fields
                        </th>
                        <th
                          class="px-4 py-2.5 text-label-caps font-semibold text-[11px] uppercase tracking-wider"
                        >
                          Properties
                        </th>
                        <th
                          class="px-4 py-2.5 text-label-caps font-semibold text-[11px] uppercase tracking-wider"
                        >
                          Size
                        </th>
                        <th
                          class="px-4 py-2.5 text-label-caps font-semibold text-[11px] uppercase tracking-wider"
                        >
                          Usage
                        </th>
                        <th
                          class="px-4 py-2.5 text-label-caps font-semibold text-[11px] uppercase tracking-wider text-center"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-outline-variant/30">
                      <tr
                        v-for="index in indexes"
                        :key="index.name"
                        class="hover:bg-surface-container-high/30 transition-colors"
                      >
                        <!-- Name -->
                        <td class="px-4 py-3">
                          <div class="flex flex-col">
                            <span
                              class="font-mono text-code-sm text-on-surface"
                              >{{ index.name }}</span
                            >
                            <span
                              v-if="index.name === '_id_'"
                              class="text-[10px] text-on-surface-variant uppercase tracking-tighter mt-0.5"
                              >System Default</span
                            >
                          </div>
                        </td>

                        <!-- Fields -->
                        <td class="px-4 py-3">
                          <div
                            class="flex items-center gap-1 flex-wrap font-mono text-code-sm text-secondary"
                          >
                            <span class="opacity-50">{</span>
                            <template
                              v-for="([field, dir], i) in Object.entries(
                                index.key,
                              )"
                              :key="field"
                            >
                              <span
                                class="bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20 text-secondary"
                              >
                                {{ field }}:
                                {{
                                  dir === 1
                                    ? "ASC"
                                    : dir === -1
                                      ? "DESC"
                                      : String(dir)
                                }}
                              </span>
                              <span
                                v-if="i < Object.entries(index.key).length - 1"
                                class="opacity-40"
                                >,</span
                              >
                            </template>
                            <span class="opacity-50">}</span>
                          </div>
                        </td>

                        <!-- Properties -->
                        <td class="px-4 py-3">
                          <div class="flex gap-1.5 flex-wrap">
                            <span
                              v-if="index.unique || index.name === '_id_'"
                              class="text-[10px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant rounded font-medium"
                              >Unique</span
                            >
                            <span
                              v-if="Object.keys(index.key).length > 1"
                              class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 font-medium"
                              >Compound</span
                            >
                            <span
                              v-if="index.sparse"
                              class="text-[10px] px-1.5 py-0.5 bg-surface-variant text-secondary rounded font-medium"
                              >Sparse</span
                            >
                            <span
                              v-if="index.hidden"
                              class="text-[10px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant/60 rounded font-medium"
                              >Hidden</span
                            >
                            <span
                              v-if="index.expireAfterSeconds != null"
                              class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-medium"
                              >TTL {{ index.expireAfterSeconds }}s</span
                            >
                            <span
                              v-if="index.partialFilterExpression"
                              class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 font-medium"
                              >Partial</span
                            >
                            <span
                              v-if="
                                !index.unique &&
                                index.name !== '_id_' &&
                                Object.keys(index.key).length <= 1 &&
                                !index.sparse &&
                                !index.hidden &&
                                index.expireAfterSeconds == null &&
                                !index.partialFilterExpression
                              "
                              class="text-[10px] px-1.5 py-0.5 bg-outline-variant/20 text-on-surface-variant rounded italic"
                              >—</span
                            >
                          </div>
                        </td>

                        <!-- Size -->
                        <td
                          class="px-4 py-3 text-body-sm text-on-surface-variant whitespace-nowrap"
                        >
                          <span v-if="index.sizeKb != null">{{
                            formatSize(index.sizeKb)
                          }}</span>
                          <span v-else class="opacity-30">—</span>
                        </td>

                        <!-- Usage -->
                        <td
                          class="px-4 py-3 text-body-sm text-on-surface-variant whitespace-nowrap"
                        >
                          <span
                            v-if="index.usageOps != null"
                            :title="
                              index.usageSince
                                ? `Since ${new Date(index.usageSince).toLocaleDateString()}`
                                : undefined
                            "
                          >
                            {{ formatOps(index.usageOps) }}
                          </span>
                          <span v-else class="opacity-30">—</span>
                        </td>

                        <!-- Actions -->
                        <td class="px-4 py-3 text-center">
                          <span
                            v-if="index.name === '_id_'"
                            class="material-symbols-outlined text-[18px] text-on-surface-variant/40 cursor-not-allowed"
                            title="Cannot drop system index"
                            >lock</span
                          >
                          <button
                            v-else
                            class="material-symbols-outlined text-[18px] text-on-surface-variant/50 hover:text-error hover:bg-error/10 p-1.5 rounded transition-colors"
                            title="Drop index"
                          >
                            delete
                          </button>
                        </td>
                      </tr>

                      <!-- Empty state -->
                      <tr v-if="indexes.length === 0 && !loading">
                        <td
                          colspan="6"
                          class="px-4 py-8 text-center text-on-surface-variant text-body-sm"
                        >
                          No indexes found
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { api } from "@/lib/api";
import type { IndexInfo } from "@/lib/api";
import type { Collection } from "@/types/Collection";
import type { Connection } from "@/lib/types";
import type { Database } from "@/types";

const props = defineProps<{
  open: boolean;
  collection: Collection | null;
  connection: Connection | null;
  database: Database | null;
}>();

defineEmits<{
  close: [];
}>();

const indexes = ref<IndexInfo[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function formatSize(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function formatOps(ops: number): string {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M hits`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}k hits`;
  return `${ops} hits`;
}

async function fetchIndexes() {
  if (!props.connection || !props.database || !props.collection) return;
  loading.value = true;
  error.value = null;
  try {
    const result = await api.data.indexes(
      props.connection,
      props.database,
      props.collection,
    );
    indexes.value = result.indexes;
  } catch (err: any) {
    error.value = err.message ?? "Failed to load indexes";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) fetchIndexes();
  },
);
</script>

<style scoped>
.qb-drop-enter-active {
  transition:
    transform 0.2s ease,
    opacity 0.15s ease;
}
.qb-drop-leave-active {
  transition:
    transform 0.18s ease,
    opacity 0.15s ease;
}
.qb-drop-enter-from,
.qb-drop-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
