<template>
  <div
    class="h-full w-60 bg-surface-container border-r border-outline-variant flex flex-col shrink-0 overflow-hidden"
  >
    <!-- DB combobox -->
    <div class="px-2 py-2 border-b border-outline-variant/50 shrink-0 relative">
      <button
        class="w-full flex items-center gap-1.5 px-2 py-1.5 rounded border border-outline-variant bg-surface-container-lowest text-left hover:border-primary transition-colors"
        @click="onOpenDatabaseDropdown"
      >
        <span
          class="material-symbols-outlined text-[13px] text-on-surface-variant shrink-0"
        >
          storage
        </span>
        <span
          class="flex-1 truncate font-mono text-code-sm"
          :class="database ? 'text-on-surface' : 'text-on-surface-variant/50'"
        >
          {{ database?.name ?? "Select database…" }}
        </span>
        <span
          class="material-symbols-outlined text-[13px] text-on-surface-variant shrink-0"
        >
          unfold_more
        </span>
      </button>

      <div
        v-if="dropdownOpen"
        class="fixed inset-0 z-50"
        @click="dropdownOpen = false"
      />

      <div
        v-if="dropdownOpen"
        class="absolute left-2 right-2 top-full mt-1 bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl z-60 overflow-hidden"
      >
        <div class="p-1.5 border-b border-outline-variant/50">
          <input
            v-model="databaseFilter"
            type="text"
            placeholder="Search…"
            autofocus
            class="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
            @click.stop
          />
        </div>
        <div class="max-h-52 overflow-y-auto py-1">
          <button
            v-for="db in filteredDatabases"
            :key="db.name"
            class="w-full text-left px-3 py-1.5 font-mono text-code-sm transition-colors flex items-center gap-2 hover:cursor-pointer"
            :class="
              db.name === database?.name
                ? 'text-primary bg-primary/8'
                : 'text-on-surface hover:bg-surface-container-high'
            "
            @click="onSelectedDatabase(db)"
          >
            <span class="material-symbols-outlined text-[12px] opacity-50">
              folder
            </span>
            {{ db.name }}
          </button>
          <p
            v-if="filteredDatabases.length === 0"
            class="px-3 py-2 text-code-sm text-on-surface-variant opacity-50 font-mono"
          >
            No matches
          </p>
        </div>
      </div>
    </div>

    <!-- Collections filter -->
    <div class="px-2 py-2 border-b border-outline-variant/30 shrink-0">
      <div class="relative">
        <span
          class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[13px]"
        >
          search
        </span>
        <input
          v-model="sidebarFilter"
          type="text"
          placeholder="Filter collections…"
          class="w-full bg-surface-container-lowest border border-outline-variant rounded pl-7 pr-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-colors"
        />
      </div>
    </div>

    <!-- Collections list -->
    <div class="flex-1 overflow-y-auto min-h-0 py-1">
      <button
        v-for="col in filteredCollections"
        :key="col.name"
        class="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group/col"
        :class="
          col.name === collection?.name
            ? 'text-primary bg-primary/8'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
        "
        @click="onCollectionSelect(col)"
      >
        <span
          class="material-symbols-outlined text-[13px] opacity-40 group-hover/col:opacity-80"
        >
          data_object
        </span>
        <span class="font-mono text-code-sm truncate">{{ col.name }}</span>
      </button>
      <p
        v-if="filteredCollections.length === 0 && collections.length > 0"
        class="px-3 py-2 text-code-sm text-on-surface-variant opacity-50 font-mono"
      >
        No matches
      </p>
      <p
        v-if="collections.length === 0"
        class="px-3 py-2 text-code-sm text-on-surface-variant opacity-40 font-mono"
      >
        No collections
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConnectionsStore } from "../stores/connections";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import { Collection, Database } from "@/types";

const router = useRouter();
const connStore = useConnectionsStore();
const collectionStore = useCollectionStore();
const databaseStore = useDatabaseStore();

const sidebarFilter = ref("");
const dropdownOpen = ref(false);
const databaseFilter = ref("");

const database = computed(() => databaseStore.database());
const databases = computed(() => databaseStore.databases());
const collections = computed(() => collectionStore.collections());
const collection = computed(() => collectionStore.collection());
const sort = computed(() => collectionStore.sort());

const filteredCollections = computed(() => {
  const list = collections.value.filter((c) =>
    c.name.toLowerCase().includes(sidebarFilter.value.toLowerCase()),
  );

  const dir = sort.value.sortDir === "asc" ? 1 : -1;

  if (sort.value.sortBy === "docCount")
    return [...list].sort(
      (a, b) => ((a.docCount ?? -1) - (b.docCount ?? -1)) * dir,
    );

  if (sort.value.sortBy === "storageSize")
    return [...list].sort(
      (a, b) => ((a.storageSize ?? -1) - (b.storageSize ?? -1)) * dir,
    );

  return [...list].sort((a, b) => a.name.localeCompare(b.name) * dir);
});

const filteredDatabases = computed(() =>
  databases.value.filter((d) =>
    d.name.toLowerCase().includes(databaseFilter.value.toLowerCase()),
  ),
);

const onOpenDatabaseDropdown = () => {
  databaseFilter.value = "";
  dropdownOpen.value = true;
};

const onSelectedDatabase = async (db: Database) => {
  if (!connStore.active) return;
  if (db.name === database.value?.name) return;

  databaseStore.setDatabase(connStore.active, db);
  collectionStore.fetchCollections(connStore.active, db);

  dropdownOpen.value = false;
};

const onCollectionSelect = (col: Collection) => {
  router.push("/collections/" + col.name);
};

onMounted(async () => {
  await databaseStore.loadDatabases();
});
</script>
