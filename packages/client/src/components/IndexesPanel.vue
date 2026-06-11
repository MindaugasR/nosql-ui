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
                  >
                    key
                  </span>
                </div>
                <div>
                  <span class="text-body-md font-semibold text-on-surface">
                    Collection Indexes
                  </span>
                  <p class="text-[11px] text-on-surface-variant mt-0.5">
                    <span v-if="!loading && indexes.length > 0">
                      {{ indexes.length }} index
                      {{ indexes.length === 1 ? "" : "es" }}
                      on
                      <span class="text-primary font-mono">{{
                        collection?.name
                      }}</span>
                    </span>
                    <span v-else-if="!loading">
                      <span class="font-mono text-primary">
                        {{ collection?.name }}
                      </span>
                    </span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <Button
                  :variant="showCreate ? 'outline' : 'primary'"
                  @click="showCreate ? (showCreate = false) : openCreate()"
                >
                  <span class="material-symbols-outlined text-[15px]">
                    {{ showCreate ? "close" : "add" }}
                  </span>
                  {{ showCreate ? "Cancel" : "Create Index" }}
                </Button>
                <Button variant="icon" class="w-7 h-7" @click="$emit('close')">
                  <span class="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </Button>
              </div>
            </div>

            <!-- Create index form -->
            <Transition name="idx-expand">
              <div v-if="showCreate" class="grid shrink-0">
                <div class="overflow-hidden">
                  <div
                    class="px-5 py-4 border-b border-outline-variant bg-surface-container-low/60"
                  >
                    <p
                      class="text-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant mb-2"
                    >
                      Fields to index
                    </p>
                    <div class="space-y-2">
                      <div
                        v-for="(key, i) in form.keys"
                        :key="i"
                        class="flex items-center gap-2"
                      >
                        <div class="flex-1 min-w-0">
                          <SelectBox
                            v-model="key.field"
                            :options="fieldOptions"
                            searchable
                            allow-custom
                            placeholder="Select or type a field…"
                          />
                        </div>
                        <div class="w-32 shrink-0">
                          <SelectBox v-model="key.dir" :options="dirOptions" />
                        </div>
                        <Button
                          variant="icon"
                          class="material-symbols-outlined text-[18px] text-on-surface-variant/50! hover:text-error! hover:bg-error/10! p-1 disabled:opacity-20 disabled:cursor-not-allowed"
                          :disabled="form.keys.length === 1"
                          title="Remove field"
                          @click="removeKeyRow(i)"
                        >
                          close
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      class="flex! items-center gap-1 mt-2 px-0! py-1! text-[11px]!"
                      @click="addKeyRow"
                    >
                      <span class="material-symbols-outlined text-[14px]">
                        add
                      </span>
                      Add field
                    </Button>

                    <!-- Options -->
                    <p
                      class="text-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant mt-4 mb-2"
                    >
                      Options
                    </p>
                    <div class="flex items-center gap-x-4 gap-y-2 flex-wrap">
                      <div class="flex items-center gap-1">
                        <Checkbox v-model="form.unique">Unique</Checkbox>
                        <InfoPopover :entry="INDEX_OPTION_DOCS.unique" />
                      </div>
                      <div class="flex items-center gap-1">
                        <Checkbox v-model="form.sparse">Sparse</Checkbox>
                        <InfoPopover :entry="INDEX_OPTION_DOCS.sparse" />
                      </div>
                      <div class="flex items-center gap-1">
                        <Checkbox v-model="form.hidden">Hidden</Checkbox>
                        <InfoPopover :entry="INDEX_OPTION_DOCS.hidden" />
                      </div>
                      <div class="flex items-center gap-1">
                        <Checkbox v-model="form.ttl">TTL</Checkbox>
                        <InfoPopover :entry="INDEX_OPTION_DOCS.ttl" />
                      </div>
                      <div class="flex items-center gap-1">
                        <Checkbox v-model="form.partial">Partial</Checkbox>
                        <InfoPopover :entry="INDEX_OPTION_DOCS.partial" />
                      </div>

                      <div class="flex items-center gap-2 ml-auto">
                        <span class="text-body-sm text-on-surface-variant"
                          >Name</span
                        >
                        <TextInput
                          v-model="form.name"
                          placeholder="(auto)"
                          class="w-44 text-[12px]! py-1!"
                        />
                      </div>
                    </div>

                    <!-- TTL seconds -->
                    <div v-if="form.ttl" class="flex items-center gap-2 mt-3">
                      <span class="text-body-sm text-on-surface-variant"
                        >Expire after</span
                      >
                      <TextInput
                        v-model="form.ttlSeconds"
                        type="number"
                        step="1"
                        placeholder="3600"
                        class="w-28 text-[12px]! py-1!"
                      />
                      <span class="text-body-sm text-on-surface-variant"
                        >seconds</span
                      >
                    </div>

                    <!-- Partial filter expression -->
                    <div v-if="form.partial" class="mt-3">
                      <span class="text-body-sm text-on-surface-variant"
                        >Partial filter expression (JSON)</span
                      >
                      <textarea
                        v-model="form.partialFilter"
                        rows="2"
                        placeholder='{ "age": { "$gt": 18 } }'
                        class="mt-1 w-full bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-[12px] font-mono text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors resize-y"
                      />
                    </div>

                    <p v-if="createError" class="text-error text-body-sm mt-3">
                      {{ createError }}
                    </p>

                    <div class="flex items-center justify-end gap-2 mt-4">
                      <Button variant="ghost" @click="showCreate = false">
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        :loading="creating"
                        :disabled="creating"
                        @click="submitCreate"
                      >
                        {{ creating ? "Creating…" : "Create Index" }}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>

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
                          <Button
                            v-else
                            variant="icon"
                            class="material-symbols-outlined text-[18px] text-on-surface-variant/50! hover:text-error! hover:bg-error/10! p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            :disabled="dropping === index.name"
                            title="Drop index"
                            @click="dropIndex(index.name)"
                          >
                            {{
                              dropping === index.name
                                ? "hourglass_empty"
                                : "delete"
                            }}
                          </Button>
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
import { ref, watch, reactive, computed } from "vue";
import { api } from "@/lib/api";
import type { IndexInfo } from "@/lib/api";
import type { Collection } from "@/types/Collection";
import type { Connection } from "@/lib/types";
import type { Database } from "@/types";
import TextInput from "@/components/ui/TextInput.vue";
import SelectBox from "@/components/ui/SelectBox.vue";
import Checkbox from "@/components/ui/Checkbox.vue";
import InfoPopover from "@/components/ui/InfoPopover.vue";
import Button from "@/components/ui/Button.vue";
import type { FieldInfo } from "@/components/ui/FilterInput.vue";
import { INDEX_OPTION_DOCS } from "@/lib/mongo-docs";

const props = defineProps<{
  open: boolean;
  collection: Collection | null;
  connection: Connection | null;
  database: Database | null;
  fields?: FieldInfo[];
}>();

defineEmits<{
  close: [];
}>();

const indexes = ref<IndexInfo[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

type IndexDir = "1" | "-1" | "text" | "2dsphere";
const dirOptions: { value: IndexDir; label: string }[] = [
  { value: "1", label: "ASC (1)" },
  { value: "-1", label: "DESC (-1)" },
  { value: "text", label: "Text" },
  { value: "2dsphere", label: "2dsphere" },
];

const fieldOptions = computed(() =>
  (props.fields ?? []).map((f) => ({
    value: f.name,
    label: f.type ? `${f.name}  ·  ${f.type}` : f.name,
  })),
);

const showCreate = ref(false);
const creating = ref(false);
const createError = ref<string | null>(null);
const form = reactive({
  keys: [{ field: "", dir: "1" as IndexDir }],
  name: "",
  unique: false,
  sparse: false,
  hidden: false,
  ttl: false,
  ttlSeconds: "",
  partial: false,
  partialFilter: "",
});

function resetForm() {
  form.keys = [{ field: "", dir: "1" }];
  form.name = "";
  form.unique = false;
  form.sparse = false;
  form.hidden = false;
  form.ttl = false;
  form.ttlSeconds = "";
  form.partial = false;
  form.partialFilter = "";
  createError.value = null;
}

function openCreate() {
  resetForm();
  showCreate.value = true;
}

function addKeyRow() {
  form.keys.push({ field: "", dir: "1" });
}

function removeKeyRow(i: number) {
  form.keys.splice(i, 1);
}

async function submitCreate() {
  if (!props.connection || !props.database || !props.collection) return;
  const validKeys = form.keys.filter((k) => k.field.trim());
  if (validKeys.length === 0) {
    createError.value = "Add at least one field";
    return;
  }
  const keys: Record<string, 1 | -1 | "text" | "2dsphere"> = {};
  for (const k of validKeys) {
    keys[k.field.trim()] = k.dir === "1" ? 1 : k.dir === "-1" ? -1 : k.dir;
  }

  const options: {
    name?: string;
    unique?: boolean;
    sparse?: boolean;
    hidden?: boolean;
    expireAfterSeconds?: number;
    partialFilterExpression?: Record<string, unknown>;
  } = {};
  if (form.name.trim()) options.name = form.name.trim();
  if (form.unique) options.unique = true;
  if (form.sparse) options.sparse = true;
  if (form.hidden) options.hidden = true;
  if (form.ttl) {
    const secs = Number(form.ttlSeconds);
    if (!Number.isFinite(secs) || secs < 0) {
      createError.value = "TTL must be a non-negative number of seconds";
      return;
    }
    options.expireAfterSeconds = secs;
  }
  if (form.partial) {
    try {
      const parsed = JSON.parse(form.partialFilter);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error("not an object");
      options.partialFilterExpression = parsed;
    } catch {
      createError.value =
        'Partial filter must be valid JSON, e.g. { "age": { "$gt": 18 } }';
      return;
    }
  }

  creating.value = true;
  createError.value = null;
  try {
    await api.data.createIndex(
      props.connection,
      props.database,
      props.collection,
      { keys, options },
    );
    showCreate.value = false;
    await fetchIndexes();
  } catch (err: any) {
    createError.value = err.message ?? "Failed to create index";
  } finally {
    creating.value = false;
  }
}

const dropping = ref<string | null>(null);

async function dropIndex(name: string) {
  if (!props.connection || !props.database || !props.collection) return;
  if (!confirm(`Drop index "${name}"? This cannot be undone.`)) return;
  dropping.value = name;
  error.value = null;
  try {
    await api.data.dropIndex(
      props.connection,
      props.database,
      props.collection,
      name,
    );
    await fetchIndexes();
  } catch (err: any) {
    error.value = err.message ?? "Failed to drop index";
  } finally {
    dropping.value = null;
  }
}

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
    if (val) {
      showCreate.value = false;
      fetchIndexes();
    }
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

/* Smooth collapse/expand of the create-index form via grid-rows */
.idx-expand-enter-active,
.idx-expand-leave-active {
  transition:
    grid-template-rows 0.24s ease,
    opacity 0.2s ease;
  grid-template-rows: 1fr;
}
.idx-expand-enter-from,
.idx-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
</style>
