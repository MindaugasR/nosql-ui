<template>
  <div
    class="shrink-0 border-b border-outline-variant/50 bg-background px-5 py-2 flex items-start gap-3"
  >
    <div class="flex items-center gap-2 shrink-0 mt-1.5">
      <span class="material-symbols-outlined text-[15px] text-primary">
        data_object
      </span>
      <span class="font-mono text-code-sm font-semibold text-on-surface">
        {{ collection?.name }}
      </span>
      <Badge v-if="total != null" variant="secondary">
        {{ total.toLocaleString() }}
      </Badge>
    </div>

    <div class="h-4 w-px bg-outline-variant/50 shrink-0 mt-2" />

    <!-- Filter -->
    <div
      class="flex-1 flex items-start bg-surface-container border rounded-lg pl-3 pr-1 min-w-0 transition-colors"
      :class="
        filterError
          ? 'border-error'
          : 'border-outline-variant focus-within:border-primary'
      "
    >
      <span
        class="material-symbols-outlined text-on-surface-variant text-[14px] shrink-0 mr-1.5 mt-2"
      >
        filter_alt
      </span>
      <FilterInput
        v-model="filterInput"
        :fields="filterFields"
        @submit="runFilter"
      />
      <div class="flex items-center gap-1 shrink-0 mt-1 ml-1">
        <button
          v-if="filterInput.trim() !== '{}' && filterInput.trim() !== ''"
          class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-variant transition-colors"
          title="Clear filter"
          @click="onClearFilter"
        >
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
        <button
          class="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors"
          :class="
            filterError
              ? 'text-error bg-error/10 hover:bg-error/20'
              : 'text-primary bg-primary/10 hover:bg-primary/20'
          "
          title="Run filter (Ctrl+Enter)"
          @click="runFilter"
        >
          <span class="material-symbols-outlined text-[14px]">play_arrow</span>
          Run
        </button>
      </div>
    </div>

    <!-- Limit -->
    <select
      v-model.number="limit"
      class="bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary shrink-0 mt-1"
      @change="onLimitChange"
    >
      <option v-for="obj of PageLimit" :value="obj.value">
        {{ obj.label }} / page
      </option>
    </select>

    <button
      :disabled="!collection"
      class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-body-sm font-semibold transition-colors shrink-0 mt-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      :class="
        showBuilder
          ? 'border-primary text-primary bg-primary/10'
          : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface'
      "
      title="Query Builder"
      @click="showBuilder = !showBuilder"
    >
      <span class="material-symbols-outlined text-[15px]">build</span>
      Builder
    </button>

    <button
      :disabled="!collection"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-body-sm font-semibold transition-colors shrink-0 mt-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      :class="showIndexes ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface'"
      @click="showIndexes = !showIndexes"
    >
      <span class="material-symbols-outlined text-[15px]">database</span>
      Indexes
      <Badge v-if="collection?.indexes != null" variant="default">{{ collection.indexes }}</Badge>
    </button>

    <button
      class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors shrink-0 mt-1"
      title="Refresh"
      @click="onRefresh"
    >
      <span
        class="material-symbols-outlined text-[16px]"
        :class="isLoading ? 'animate-spin' : ''"
      >
        refresh
      </span>
    </button>

    <router-link
      v-if="collection"
      :to="`/collections/${collection.name}/aggregation`"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-outline-variant text-body-sm font-semibold text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors shrink-0 mt-1"
      title="Aggregation Pipeline Builder"
    >
      <span class="material-symbols-outlined text-[15px]">account_tree</span>
      Aggregate
    </router-link>

    <button
      :disabled="!collection"
      class="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-body-sm font-semibold hover:opacity-90 transition-opacity shrink-0 mt-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      @click="showCreate = true"
    >
      <span class="material-symbols-outlined text-[15px]">add</span>
      Add
    </button>

    <button
      :disabled="!collection"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-body-sm font-semibold text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors shrink-0 mt-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      @click="showImport = true"
    >
      <span class="material-symbols-outlined text-[15px]">upload</span>
      Import
    </button>
  </div>

  <!-- Filter syntax error -->
  <div
    v-if="filterError"
    class="shrink-0 mx-5 mt-2 bg-error-container/10 border border-error/20 rounded-lg px-3 py-2 flex items-start gap-2"
  >
    <span
      class="material-symbols-outlined text-error text-[14px] mt-px shrink-0"
    >
      warning
    </span>
    <div class="min-w-0">
      <p class="text-[12px] text-error font-mono">{{ filterError }}</p>
      <p class="text-[11px] text-on-surface-variant/60 mt-0.5">
        Filter must be valid JSON — e.g.
        <span class="font-mono text-on-surface-variant">
          {"field": {"$eq": "value"}}
        </span>
      </p>
    </div>
  </div>

  <!-- API error -->
  <div
    v-if="error"
    class="shrink-0 mx-5 mt-2 bg-error-container/20 border border-error/30 rounded-lg px-3 py-2 flex items-center gap-2"
  >
    <span class="material-symbols-outlined text-error text-[14px]">error</span>
    <p class="text-[12px] text-error">{{ error }}</p>
  </div>

  <QueryBuilderPanel
    :open="showBuilder"
    :fields="filterFields"
    :filter-string="filterInput"
    @close="showBuilder = false"
    @apply="onApplyFilter"
  />

  <IndexesPanel
    :open="showIndexes"
    :collection="collection"
    :connection="connectionStore.active"
    :database="database"
    @close="showIndexes = false"
  />

  <!-- Table area -->
  <DocumentsTable
    :documents="documents"
    :limit="limit"
    :skip="skip"
    :total="total"
    :loading="isLoading"
    :collection="collection"
  />

  <CreateDocumentModal
    :open="showCreate"
    :collection="collection?.name ?? ''"
    @close="showCreate = false"
    @inserted="onRefresh"
  />

  <ImportDocumentsModal
    :open="showImport"
    :collection="collection?.name ?? ''"
    @close="showImport = false"
    @imported="onRefresh"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import FilterInput, { type FieldInfo } from "../components/FilterInput.vue";
import { useConnectionsStore } from "../stores/connections";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import { StackEntry } from "@/types";
import { ROUTE_NAME } from "@/route";
import DocumentsTable from "@/components/DocumentsTable.vue";
import QueryBuilderPanel from "@/components/QueryBuilderPanel.vue";
import IndexesPanel from "@/components/IndexesPanel.vue";
import Badge from "@/components/Badge.vue";
import CreateDocumentModal from "@/components/CreateDocumentModal.vue";
import ImportDocumentsModal from "@/components/ImportDocumentsModal.vue";

const router = useRouter();
const route = useRoute();
const connectionStore = useConnectionsStore();
const collectionStore = useCollectionStore();
const documentStore = useDocumentStore();
const databaseStore = useDatabaseStore();

const DEFAULT_LIMIT = 25;

const PageLimit = ref([
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 75, label: "75" },
  { value: 100, label: "100" },
  { value: 150, label: "150" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1000" },
]);

const collectionName = computed(() => route.params.name as string);
const collection = computed(() => collectionStore.collection());
const database = computed(() => databaseStore.database());

const isLoading = ref(false);
const showBuilder = ref(false);
const showIndexes = ref(false);
const showCreate = ref(false);
const showImport = ref(false);
const error = ref<string | null>(null);

const limit = ref(PageLimit.value.at(0)?.value ?? DEFAULT_LIMIT);
const skip = ref(0);
const filterError = ref<string | null>(null);

const docStack = ref<StackEntry[]>([]);

const documents = computed(() => documentStore.documents());
const total = computed(() => documentStore.total());

// Single source of truth: filter string lives in the store
const filterInput = computed({
  get: () => documentStore.filterString(),
  set: (val: string) => documentStore.setFilterString(val),
});

const filterFields = computed<FieldInfo[]>(() =>
  Object.entries(documentStore.fieldTypes()).map(([name, type]) => ({
    name,
    type,
  })),
);

const preprocessFilter = (text: string): string =>
  text
    .replace(/ObjectId\s*\(\s*["']([^"']+)["']\s*\)/gi, '{"$$oid":"$1"}')
    .replace(/ISODate\s*\(\s*["']([^"']+)["']\s*\)/gi, '"$1"')
    .replace(
      /([{,\[]?\s*)([$a-zA-Z_][$\w]*)(\s*:)/g,
      (_, pre, key, post) => `${pre}"${key}"${post}`,
    )
    .replace(/'([^'\\]*)'/g, '"$1"')
    .replace(/,(\s*[}\]])/g, "$1");

const parseFilter = (): Record<string, unknown> | null => {
  try {
    filterError.value = null;
    const text = preprocessFilter(filterInput.value.trim());
    return JSON.parse(text || "{}");
  } catch (e: any) {
    const raw: string = e.message ?? "Invalid JSON";
    filterError.value = raw
      .replace(/^JSON\.parse:\s*/i, "")
      .replace(/^Unexpected token\s+/, "Unexpected: ");
    return null;
  }
};

const runFilter = async () => {
  const filter = parseFilter();
  if (filter === null) return;
  skip.value = 0;
  try {
    isLoading.value = true;
    await documentStore.fetchDocuments(undefined, {
      filter,
      skip: 0,
      limit: limit.value,
    });
  } finally {
    isLoading.value = false;
  }
};

const onClearFilter = async () => {
  filterError.value = null;
  skip.value = 0;
  isLoading.value = true;
  try {
    await documentStore.clearFilter();
  } finally {
    isLoading.value = false;
  }
};

const onApplyFilter = async (filterStr: string) => {
  filterInput.value = filterStr;
  filterError.value = null;
  skip.value = 0;

  try {
    isLoading.value = true;

    await documentStore.fetchDocuments(undefined, {
      filter: JSON.parse(filterStr),
      skip: 0,
      limit: limit.value,
    });
  } finally {
    isLoading.value = false;
  }
};

const onLimitChange = () => {
  documentStore.fetchDocuments(undefined, {
    limit: limit.value,
  });
};

const onRefresh = async () => {
  try {
    isLoading.value = true;
    await documentStore.fetchDocuments();
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!connectionStore.active || !database.value)
    router.replace("/collections");

  collectionStore.selectCollection(collectionName.value);
  await documentStore.fetchDocuments();
});

watch(route, async (route) => {
  if (route.name !== ROUTE_NAME.DOCUMENTS) return;

  if (route.params?.name === collection.value?.name) return;

  try {
    isLoading.value = true;
    collectionStore.selectCollection(collectionName.value);
    await documentStore.fetchDocuments();
  } finally {
    isLoading.value = false;
  }
});

watch(docStack, (openedDoc) => {
  documentStore.openDocument(openedDoc);
});
</script>
