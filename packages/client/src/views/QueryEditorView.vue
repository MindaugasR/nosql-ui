<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Toolbar -->
    <div
      class="flex items-center gap-3 px-5 py-3 border-b border-outline-variant bg-surface-container-high shrink-0"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-[20px]"
          >terminal</span
        >
        <span class="text-body-md font-semibold text-on-surface"
          >Query Editor</span
        >
      </div>

      <div class="flex items-center gap-2 ml-6">
        <span class="text-[11px] text-on-surface-variant uppercase tracking-wider"
          >Database</span
        >
        <div class="w-44">
          <SelectBox
            v-model="selectedDbName"
            :options="dbOptions"
            searchable
            placeholder="Select database…"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <Button variant="icon" class="w-8 h-8" title="Query history" @click="showHistory = true">
          <span class="material-symbols-outlined text-[18px]">history</span>
        </Button>
        <Button
          variant="primary"
          :disabled="running || !selectedDbName"
          :loading="running"
          @click="run"
        >
          <span v-if="!running" class="material-symbols-outlined text-[16px]"
            >play_arrow</span
          >
          Run
          <span class="text-[10px] opacity-60 font-normal">Ctrl+↵</span>
        </Button>
      </div>
    </div>

    <!-- Editor -->
    <div class="px-5 pt-4 shrink-0">
      <QueryEditor
        ref="editorRef"
        v-model="query"
        :collections="collectionNames"
        :fields="currentFields"
        @run="run"
      />

      <!-- Error -->
      <div
        v-if="error"
        class="flex items-start gap-2 text-error bg-error/8 border border-error/20 rounded-lg px-3 py-2 mt-3"
      >
        <span class="material-symbols-outlined text-[16px] mt-0.5">error</span>
        <span class="text-body-sm font-mono">{{ error }}</span>
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="flex flex-col flex-1 min-h-0 px-5 pb-5 mt-4">
      <div class="flex items-center gap-3 pb-2 shrink-0">
        <p class="text-body-sm text-on-surface-variant">
          <template v-if="result.type === 'documents'">
            <span class="text-on-surface font-semibold">{{ result.count }}</span>
            document{{ result.count === 1 ? "" : "s" }}
          </template>
          <template v-else>Result</template>
          <span class="opacity-50"> · {{ result.executionMs }} ms</span>
        </p>

        <!-- View tabs -->
        <div
          v-if="result.type === 'documents'"
          class="flex items-center gap-0.5 ml-auto bg-surface-container rounded-lg p-0.5 border border-outline-variant"
        >
          <button
            v-for="tab in ['table', 'json', 'tree'] as const"
            :key="tab"
            class="px-3 py-1 rounded-md text-[11px] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            :class="
              viewTab === tab
                ? 'bg-primary/15 text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            "
            @click="viewTab = tab"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-auto">
        <!-- Scalar / write result -->
        <pre
          v-if="result.type === 'value'"
          class="bg-surface-container border border-outline-variant rounded-lg p-4 font-mono text-code-sm text-on-surface whitespace-pre-wrap"
          >{{ formatJson(result.value) }}</pre
        >

        <!-- Documents: table -->
        <DocumentsTable
          v-else-if="viewTab === 'table'"
          :documents="result.documents"
          :total="result.count"
          :limit="result.count ?? 0"
          :aggrgation="true"
        />

        <!-- Documents: JSON -->
        <pre
          v-else-if="viewTab === 'json'"
          class="bg-surface-container border border-outline-variant rounded-lg p-4 font-mono text-code-sm text-on-surface whitespace-pre-wrap"
          >{{ formatJson(result.documents) }}</pre
        >

        <!-- Documents: tree -->
        <div
          v-else
          class="bg-surface-container border border-outline-variant rounded-lg divide-y divide-outline-variant/30"
        >
          <div
            v-for="(doc, i) in result.documents"
            :key="i"
            class="px-4 py-2"
          >
            <DocumentTree :document="doc" readonly />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!error"
      class="flex-1 flex flex-col items-center justify-center text-on-surface-variant/40 gap-2"
    >
      <span class="material-symbols-outlined text-[40px]">terminal</span>
      <p class="text-body-sm">
        Type a query like
        <span class="font-mono text-on-surface-variant"
          >db.collection.find({ })</span
        >
        and press Ctrl+Enter
      </p>
    </div>

    <!-- Write confirm modal -->
    <Teleport to="body">
      <Transition name="qe-fade">
        <div
          v-if="pendingWrite"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="pendingWrite = null" />
          <div
            class="relative bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl w-[420px] p-5"
          >
            <div class="flex items-center gap-2 text-amber-400 mb-3">
              <span class="material-symbols-outlined text-[20px]">warning</span>
              <span class="text-body-md font-semibold text-on-surface"
                >Confirm write operation</span
              >
            </div>
            <p class="text-body-sm text-on-surface-variant">
              You are about to run
              <span class="font-mono text-primary">{{ pendingWrite.method }}</span>
              on
              <span class="font-mono text-primary">{{ pendingWrite.collection }}</span>
              in
              <span class="font-mono text-primary">{{ selectedDbName }}</span
              >.
              <template v-if="pendingWrite.method.startsWith('delete') || pendingWrite.method === 'drop'">
                This cannot be undone.
              </template>
            </p>
            <div class="flex items-center justify-end gap-2 mt-5">
              <Button variant="ghost" @click="pendingWrite = null">Cancel</Button>
              <Button variant="error" @click="confirmWrite">Execute</Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- History panel -->
    <QueryHistoryPanel
      :open="showHistory"
      :history="history"
      :favorites="favorites"
      @close="showHistory = false"
      @select="onHistorySelect"
      @add-favorite="onAddFavorite"
      @remove-favorite="onRemoveFavorite"
      @rename-favorite="onRenameFavorite"
      @clear-history="onClearHistory"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { api } from "@/lib/api";
import type { QueryResponse } from "@/lib/api";
import {
  parseShellQuery,
  extractCollectionName,
  type ParsedQuery,
} from "@/lib/shell-query";
import {
  loadHistory,
  pushHistory,
  clearHistory,
  loadFavorites,
  addFavorite,
  removeFavorite,
  renameFavorite,
  type HistoryEntry,
} from "@/lib/query-history";
import { useConnectionsStore } from "@/stores/connections";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import type { Collection, Database } from "@/types";
import type { FieldInfo } from "@/components/ui/FilterInput.vue";
import QueryEditor from "@/components/QueryEditor.vue";
import QueryHistoryPanel from "@/components/QueryHistoryPanel.vue";
import DocumentsTable from "@/components/DocumentsTable.vue";
import DocumentTree from "@/components/DocumentTree.vue";
import SelectBox from "@/components/ui/SelectBox.vue";
import Button from "@/components/ui/Button.vue";

const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();

// ── Database selection ────────────────────────────────────────────────────────

const selectedDbName = ref<string>("");
const dbOptions = computed(() =>
  databaseStore.databases().map((d) => ({ value: d.name, label: d.name })),
);
const selectedDb = computed<Database | null>(
  () =>
    databaseStore.databases().find((d) => d.name === selectedDbName.value) ??
    (selectedDbName.value ? ({ name: selectedDbName.value } as Database) : null),
);

onMounted(async () => {
  const conn = connectionStore.active;
  if (!conn) return;
  await databaseStore.loadDatabases(conn);
  selectedDbName.value =
    databaseStore.database()?.name ?? databaseStore.databases()[0]?.name ?? "";
});

// ── Collections + fields for autocomplete ─────────────────────────────────────

const collectionNames = ref<string[]>([]);
const fieldsCache = ref(new Map<string, FieldInfo[]>());

watch(selectedDbName, async (dbName) => {
  collectionNames.value = [];
  fieldsCache.value = new Map();
  const conn = connectionStore.active;
  if (!conn || !dbName) return;
  try {
    const res = await api.stats.collections(conn, dbName);
    collectionNames.value = res.collections.map((c) => c.name);
  } catch {
    collectionNames.value = [];
  }
});

const query = ref("");
const referencedCollection = computed(() => extractCollectionName(query.value));
const currentFields = computed<FieldInfo[]>(
  () => fieldsCache.value.get(referencedCollection.value ?? "") ?? [],
);

// Lazily sample field names/types for the referenced collection
let fieldsTimer: ReturnType<typeof setTimeout> | undefined;
watch(referencedCollection, (coll) => {
  clearTimeout(fieldsTimer);
  if (!coll || fieldsCache.value.has(coll)) return;
  fieldsTimer = setTimeout(async () => {
    const conn = connectionStore.active;
    if (!conn || !selectedDb.value || !collectionNames.value.includes(coll)) return;
    try {
      const res = await api.data.find(
        conn,
        selectedDb.value,
        { name: coll } as Collection,
        { limit: 10 },
      );
      fieldsCache.value.set(
        coll,
        Object.entries(res.fieldTypes ?? {}).map(([name, type]) => ({
          name,
          type,
        })),
      );
      fieldsCache.value = new Map(fieldsCache.value);
    } catch {
      /* autocomplete is best-effort */
    }
  }, 500);
});

// ── Execution ─────────────────────────────────────────────────────────────────

const editorRef = ref<InstanceType<typeof QueryEditor> | null>(null);
const running = ref(false);
const error = ref<string | null>(null);
const result = ref<QueryResponse | null>(null);
const viewTab = ref<"table" | "json" | "tree">("table");
const pendingWrite = ref<ParsedQuery | null>(null);

const run = () => {
  error.value = null;
  let parsed: ParsedQuery;
  try {
    parsed = parseShellQuery(query.value);
  } catch (err: any) {
    error.value = err.message;
    return;
  }
  if (parsed.isWrite) {
    pendingWrite.value = parsed;
    return;
  }
  execute(parsed);
};

const confirmWrite = () => {
  const parsed = pendingWrite.value;
  pendingWrite.value = null;
  if (parsed) execute(parsed);
};

const execute = async (parsed: ParsedQuery) => {
  const conn = connectionStore.active;
  if (!conn || !selectedDb.value) {
    error.value = "Select a database first";
    return;
  }
  running.value = true;
  error.value = null;
  try {
    result.value = await api.data.query(conn, selectedDb.value, {
      collection: parsed.collection,
      method: parsed.method,
      args: parsed.args,
      chain: parsed.chain,
    });
    history.value = pushHistory({
      query: query.value.trim(),
      db: selectedDbName.value,
    });
  } catch (err: any) {
    error.value = err.message ?? "Query failed";
    result.value = null;
  } finally {
    running.value = false;
  }
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

// ── History & favorites ───────────────────────────────────────────────────────

const showHistory = ref(false);
const history = ref(loadHistory());
const favorites = ref(loadFavorites());

const onHistorySelect = (entry: HistoryEntry) => {
  query.value = entry.query;
  if (entry.db && dbOptions.value.some((o) => o.value === entry.db)) {
    selectedDbName.value = entry.db;
  }
  showHistory.value = false;
  editorRef.value?.focus();
};

const onAddFavorite = (entry: HistoryEntry) => {
  const coll = extractCollectionName(entry.query);
  const method = entry.query.match(/\.\s*([$\w]+)\s*\(/)?.[1];
  const name =
    coll && method ? `${coll}.${method}` : entry.query.slice(0, 30);
  favorites.value = addFavorite({ name, query: entry.query, db: entry.db });
};

const onRemoveFavorite = (id: string) => {
  favorites.value = removeFavorite(id);
};

const onRenameFavorite = (id: string, name: string) => {
  favorites.value = renameFavorite(id, name);
};

const onClearHistory = () => {
  history.value = clearHistory();
};
</script>

<style scoped>
.qe-fade-enter-active,
.qe-fade-leave-active {
  transition: opacity 0.15s ease;
}
.qe-fade-enter-from,
.qe-fade-leave-to {
  opacity: 0;
}
</style>
