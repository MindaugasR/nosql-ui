<template>
  <!-- Page Header -->
  <div
    class="shrink-0 border-b border-outline-variant/50 bg-background px-8 pt-6 pb-5"
  >
    <div
      class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-stack-md"
    >
      <div>
        <h2
          class="text-headline-lg font-bold text-on-surface flex items-center gap-3"
        >
          Collections
          <span
            class="bg-surface-container-high text-on-surface-variant font-mono text-code-sm px-2 py-1 rounded border border-outline-variant"
          >
            {{ filteredCollections.length }} total
          </span>
        </h2>
        <p class="text-body-md text-on-surface-variant mt-1">
          Showing all collections in
          <button
            class="font-mono text-code-sm text-secondary px-1.5 py-0.5 bg-surface-container rounded border border-outline-variant/50 hover:border-primary transition-colors"
            @click="onChangeDatabase"
          >
            {{ database?.name ?? "—" }}
            <span
              class="material-symbols-outlined text-[12px] align-middle ml-0.5"
            >
              unfold_more
            </span>
          </button>
        </p>
      </div>

      <div class="flex flex-col md:flex-row items-center gap-stack-md">
        <!-- Sort -->
        <div
          class="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg p-1"
        >
          <button
            v-for="opt in SORT_OPTIONS"
            :key="opt.value"
            class="px-3 py-1 rounded text-body-sm transition-colors flex items-center gap-1"
            :class="
              sort.sortBy === opt.value
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-on-surface-variant hover:text-on-surface'
            "
            @click="setSort(opt.value)"
          >
            {{ opt.label }}
            <span
              class="material-symbols-outlined text-xs!"
              :class="sort.sortBy !== opt.value ? 'invisible' : ''"
            >
              {{ sort.sortDir === "asc" ? "arrow_upward" : "arrow_downward" }}
            </span>
          </button>
        </div>

        <!-- Search -->
        <div class="relative w-56">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]"
          >
            search
          </span>
          <input
            v-model="filter"
            type="text"
            placeholder="Filter collections..."
            class="w-full bg-surface-container border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-on-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50"
          />
        </div>
        <button
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors"
          title="Refresh"
          @click="onRefreshCollections"
        >
          <span
            class="material-symbols-outlined text-[18px]"
            :class="
              loadingCols ? 'animate-spin pointer-events-none opacity-50' : ''
            "
          >
            refresh
          </span>
        </button>
        <button
          class="bg-primary h-9 hover:opacity-90 text-on-primary font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-opacity"
        >
          <span class="material-symbols-outlined text-[18px]">add_box</span>
          Create New
        </button>
      </div>
    </div>
  </div>

  <!-- Scrollable grid -->
  <div class="flex-1 overflow-y-auto px-8 py-6">
    <div class="max-w-7xl mx-auto">
      <!-- Error -->
      <div
        v-if="error"
        class="mb-6 bg-error-container/20 border border-error/30 rounded-lg px-4 py-3 flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-error text-[18px]">
          error
        </span>
        <p class="text-body-sm text-error">{{ error }}</p>
      </div>

      <!-- Loading -->
      <div
        v-if="loadingCols"
        class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-stack-lg"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="bg-surface-container-high border border-outline-variant rounded-xl p-stack-md h-48 animate-pulse"
        />
      </div>

      <!-- Collections Grid -->
      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-stack-lg"
      >
        <div
          v-for="col in filteredCollections"
          :key="col.name"
          class="bg-surface-container-high border border-outline-variant rounded-xl p-stack-md flex flex-col gap-stack-md hover:border-primary/50 transition-colors group relative overflow-hidden"
        >
          <div
            class="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-secondary-container/20 border border-secondary/30 flex items-center justify-center text-secondary"
              >
                <span class="material-symbols-outlined text-[24px]">
                  data_object
                </span>
              </div>
              <div>
                <h3
                  class="text-headline-md font-semibold text-on-surface font-mono"
                >
                  {{ col.name }}
                </h3>
                <p
                  class="text-label-caps text-on-surface-variant uppercase tracking-widest mt-0.5"
                >
                  Collection
                </p>
              </div>
            </div>
            <button
              class="text-on-surface-variant hover:text-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span class="material-symbols-outlined">more_vert</span>
            </button>
          </div>

          <div
            class="grid grid-cols-2 gap-stack-sm bg-surface-container p-3 rounded-lg border border-outline-variant/50"
          >
            <div>
              <p class="text-label-caps text-on-surface-variant mb-1">
                Doc Count
              </p>
              <p class="font-mono text-code-md text-primary">
                {{ formatCount(col.docCount) }}
              </p>
            </div>
            <div>
              <p class="text-label-caps text-on-surface-variant mb-1">
                Storage Size
              </p>
              <p class="font-mono text-code-md text-secondary">
                {{ formatBytes(col.storageSize) }}
              </p>
            </div>
            <div
              v-if="col.indexes !== null"
              class="mt-2 pt-2 border-t border-outline-variant/50"
            >
              <p class="text-label-caps text-on-surface-variant mb-1">
                Indexes
              </p>
              <p class="font-mono text-code-md text-on-surface">
                {{ col.indexes }} active
              </p>
            </div>
            <div
              v-if="col.avgObjSize !== null"
              class="mt-2 pt-2 border-t border-outline-variant/50"
            >
              <p class="text-label-caps text-on-surface-variant mb-1">
                Avg Obj Size
              </p>
              <p class="font-mono text-code-md text-on-surface">
                {{ formatBytes(col.avgObjSize) }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between mt-auto pt-1">
            <div class="flex gap-2">
              <button
                class="bg-primary/10 border border-primary/30 hover:border-primary text-primary px-3 py-1.5 rounded text-body-sm transition-colors"
                @click.stop="router.push('/collections/' + col.name)"
              >
                Browse Data
              </button>
              <button
                v-if="col.indexes !== null"
                class="bg-transparent hover:bg-surface-variant text-on-surface-variant px-3 py-1.5 rounded text-body-sm transition-colors"
              >
                Manage Indexes
              </button>
            </div>
            <div class="flex gap-1">
              <button
                class="w-8 h-8 flex items-center justify-center rounded hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors"
                title="Drop collection"
              >
                <span class="material-symbols-outlined text-[18px]">
                  delete
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="
            filteredCollections.length === 0 && !loadingCols && database?.name
          "
          class="lg:col-span-3 text-center py-16 text-on-surface-variant"
        >
          <span
            class="material-symbols-outlined text-[48px] mb-4 block opacity-30"
          >
            folder_open
          </span>
          <p class="text-body-lg">No collections found</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionsStore } from "../stores/connections";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { SortBy, SortDir } from "@/types";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import { formatBytes, formatCount } from "@/utils";

const showDatabaseModal = inject<(state: boolean) => void>("showDatabaseModal");

const router = useRouter();
const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();
const collectionStore = useCollectionStore();

const loadingCols = ref(false);
const hadDbBeforeModal = ref(false);
const filter = ref("");
const sortBy = ref<SortBy>("name");
const sortDir = ref<SortDir>("asc");
const error = ref<string | null>(null);

const collections = computed(() => collectionStore.collections());
const collection = computed(() => collectionStore.collection());
const sort = computed(() => collectionStore.sort());
const database = computed(() => databaseStore.database());

const SORT_OPTIONS: { value: typeof sortBy.value; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "docCount", label: "Doc Count" },
  { value: "storageSize", label: "Size" },
];

const setSort = (key: typeof sortBy.value) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = key;
    sortDir.value = key === "name" ? "asc" : "desc";
  }

  collectionStore.setSort(connectionStore.active, {
    sortBy: sortBy.value,
    sortDir: sortDir.value,
  });
};

const filteredCollections = computed(() => {
  const list = collections.value.filter((c) =>
    c.name.toLowerCase().includes(filter.value.toLowerCase()),
  );
  const dir = sort.value.sortDir === "asc" ? 1 : -1;

  if (sortBy.value === "docCount")
    return [...list].sort(
      (a, b) => ((a.docCount ?? -1) - (b.docCount ?? -1)) * dir,
    );

  if (sortBy.value === "storageSize")
    return [...list].sort(
      (a, b) => ((a.storageSize ?? -1) - (b.storageSize ?? -1)) * dir,
    );

  return [...list].sort((a, b) => a.name.localeCompare(b.name) * dir);
});

const onChangeDatabase = () => {
  hadDbBeforeModal.value = !!database.value?.name;
  showDatabaseModal?.(true);
};

const onRefreshCollections = async () => {
  if (!connectionStore.active) return;

  try {
    loadingCols.value = true;
    await collectionStore.fetchCollections(connectionStore.active);
  } finally {
    loadingCols.value = false;
  }
};
</script>
