<template>
  <div class="flex-1 overflow-auto">
    <!-- Loading skeleton -->
    <div v-if="loading" class="p-5 space-y-2">
      <div
        v-for="i in limit"
        :key="i"
        class="h-9 bg-surface-container-high rounded animate-pulse"
      />
    </div>

    <template v-else-if="documentList?.length > 0 && !loading">
      <table class="text-left border-collapse">
        <thead class="sticky top-0 z-10 bg-surface-container-high">
          <tr>
            <th
              v-for="col in columns"
              :key="col"
              class="px-4 py-2.5 font-mono text-code-sm text-on-surface-variant font-normal whitespace-nowrap border-b border-r border-outline-variant/40 last:border-r-0"
            >
              {{ col }}
            </th>
            <th class="w-6 border-b border-outline-variant/40" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in documentList"
            :key="String(doc._id)"
            class="border-b border-l-4 border-outline-variant/20 hover:bg-primary/5 cursor-pointer transition-colors group"
            :class="
              selectedDocument?._id === doc._id
                ? 'border-l-primary bg-primary/5'
                : 'border-l-transparent'
            "
            @click="onOpenDocument(doc)"
          >
            <td
              v-for="col in columns"
              :key="col"
              class="px-4 py-2 font-mono text-code-sm max-w-52 border-r border-outline-variant/15 last:border-r-0"
              :class="cellClass(col, doc[col])"
            >
              <span class="block truncate">{{ formatCell(doc[col]) }}</span>
            </td>
            <td class="px-2 py-2 text-right">
              <span
                class="material-symbols-outlined text-sm! text-on-surface-variant opacity-0 group-hover:opacity-60 transition-opacity"
              >
                chevron_right
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Empty -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-24 text-on-surface-variant"
    >
      <span class="material-symbols-outlined text-[48px] opacity-25 mb-4">
        search_off
      </span>
      <p class="text-body-lg opacity-60">No documents found</p>
      <p class="text-body-sm opacity-40 mt-1">Try adjusting your filter</p>
    </div>
  </div>

  <!-- Pagination -->
  <div
    v-if="totalDocuments > 0"
    class="shrink-0 border-t border-outline-variant/50 px-5 py-2.5 flex items-center justify-between bg-surface-container-low text-body-sm"
  >
    <span class="text-on-surface-variant">
      {{ (skipDocuments + 1).toLocaleString() }}
      –
      {{ Math.min(skipDocuments + limit, totalDocuments).toLocaleString() }}
      of {{ totalDocuments.toLocaleString() }} documents
    </span>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        class="rounded py-1 disabled:opacity-30"
        :disabled="skipDocuments === 0"
        @click="prevPage"
      >
        ← Prev
      </Button>
      <span class="text-on-surface-variant px-1">
        {{ documentsPage }} / {{ documentsTotalPages }}
      </span>
      <Button
        variant="outline"
        class="rounded py-1 disabled:opacity-30"
        :disabled="skipDocuments + limit >= totalDocuments"
        @click="nextPage"
      >
        Next →
      </Button>
    </div>
  </div>

  <DocSideEditor
    :stack="openedDocument"
    :open="editorOpen"
    :saving="saving"
    :resolving="resolving"
    :aggregation="aggrgation"
    @close="onCloseEditor"
    @save="onSaveDocument"
    @delete="onDeleteDocument"
    @link-click="onFollowLink"
    @pop-to="onPopTo"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api } from "@/lib/api";
import { Document, Collection, StackEntry } from "@/types";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { formatCell } from "@/utils";

import DocSideEditor from "@/components/DocSideEditor.vue";
import Button from "@/components/ui/Button.vue";
import { useConnectionsStore } from "@/stores/connections";
import { useDatabaseStore } from "@/stores/useDatabaseStore";

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    documents?: Document[];
    collection?: Collection | null;
    total?: number;
    skip?: number;
    limit?: number;
    aggrgation?: boolean;
  }>(),
  {
    loading: false,
    total: 0,
    skip: 0,
    limit: 0,
    aggrgation: false,
  },
);

const documentStore = useDocumentStore();
const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();

const docStack = ref<StackEntry[]>([]);
const stackIdCounter = ref(0);
const skipDocuments = ref(props.skip);
const limitDocuments = ref(props.limit);
const totalDocuments = ref(props.total);
const editorOpen = ref(false);
const saving = ref(false);
const resolving = ref(false);
const error = ref<string | null>(null);

const database = computed(() => databaseStore.database());
const openedDocument = computed(() => documentStore.openedDocument());
const selectedDocument = computed(() => documentStore.selectedDocument());
const documentList = computed(() => props.documents ?? []);
const documentsPage = computed(
  () => Math.floor(skipDocuments.value / limitDocuments.value) + 1,
);
const documentsTotalPages = computed(() =>
  Math.ceil(totalDocuments.value / limitDocuments.value),
);
const columns = computed(() => {
  const keys = new Set<string>(["_id"]);

  documentList.value
    .slice(0, 20)
    .forEach((doc) => Object.keys(doc).forEach((k) => keys.add(k)));

  return Array.from(keys).slice(0, 8);
});

const prevPage = () => {
  skipDocuments.value = Math.max(0, skipDocuments.value - limitDocuments.value);
  documentStore.fetchDocuments(undefined, {
    skip: skipDocuments.value,
  });
};

const nextPage = () => {
  skipDocuments.value = skipDocuments.value + limitDocuments.value;
  documentStore.fetchDocuments(undefined, {
    skip: skipDocuments.value,
  });
};

const cellClass = (col: string, value: unknown): string => {
  if (col === "_id") return "text-on-surface-variant/70";
  if (value === null || value === undefined)
    return "text-on-surface-variant/40 italic";
  if (typeof value === "number") return "text-blue-400";
  if (typeof value === "boolean") return "text-yellow-400";
  if (typeof value === "object") return "text-on-surface-variant/60";
  return "text-on-surface";
};

const onOpenDocument = (doc: Document) => {
  if (!props.collection) return;

  docStack.value = [
    { doc, collection: props.collection?.name, id: stackIdCounter.value++ },
  ];

  editorOpen.value = true;
};

const onCloseEditor = () => {
  editorOpen.value = false;
  docStack.value = [];
  documentStore.unselectDocument();
};

const onSaveDocument = async (doc: Record<string, unknown>) => {
  if (!connectionStore.active) return;
  if (!database.value) return;
  if (props.aggrgation) return;

  saving.value = true;
  try {
    const topEntry = docStack.value[docStack.value.length - 1];
    const id = String(doc._id ?? "");
    const { _id, ...rest } = doc;

    await api.data.update(
      connectionStore.active,
      database.value,
      topEntry.collection,
      id,
      rest,
    );

    onCloseEditor();
    await documentStore.fetchDocuments();
  } catch (err: any) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
};

const onDeleteDocument = async () => {
  if (props.aggrgation) return;
  if (!connectionStore.active || !database.value || docStack.value.length === 0)
    return;

  const topEntry = docStack.value[docStack.value.length - 1];
  const id = String(topEntry.doc._id ?? "");

  try {
    await api.data.delete(
      connectionStore.active,
      database.value,
      topEntry.collection,
      id,
    );
    onCloseEditor();
  } catch (err: any) {
    error.value = err.message;
  }
};

const onFollowLink = async (objectId: string) => {
  if (!connectionStore.active || !database.value) return;
  resolving.value = true;

  try {
    const result = await api.data.resolve(
      connectionStore.active,
      database.value,
      objectId,
    );
    docStack.value = [
      ...docStack.value,
      {
        doc: result.doc,
        collection: result.collection,
        id: stackIdCounter.value++,
      },
    ];
  } catch {
    // document not found — silently ignore
  } finally {
    resolving.value = false;
  }
};

const onPopTo = (index: number) => {
  docStack.value = docStack.value.slice(0, index + 1);
};

watch(docStack, (openedDoc) => {
  documentStore.openDocument(openedDoc);
});
</script>
