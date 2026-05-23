<template>
  <SelectDatabaseModal
    v-if="showModal"
    :databases="databases"
    :current-db="connState.selectedDb"
    :loading="isLoading"
    @select="onSelectedDatabase"
    @cancel="onModalCancel"
  />

  <CollectionsSidebar />

  <div class="flex-1 flex flex-col overflow-hidden">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide, watch } from "vue";
import { useRouter } from "vue-router";
import CollectionsSidebar from "../components/CollectionsSidebar.vue";
import SelectDatabaseModal from "../components/SelectDatabaseModal.vue";
import { useConnectionsStore } from "../stores/connections";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import { Database } from "@/types";

const router = useRouter();
const connStore = useConnectionsStore();
const collectionStore = useCollectionStore();
const databaseStore = useDatabaseStore();

const isLoading = ref(false);
const showModal = ref(false);

const connState = computed(() =>
  collectionStore.get(connStore.currentId ?? ""),
);

const databases = computed(() => databaseStore.databases());
const database = computed(() => databaseStore.database());
const selectedDatabase = computed(() => databaseStore.database());

const onSelectedDatabase = async (db: Database) => {
  if (!connStore.active) return;

  databaseStore.setDatabase(connStore.active, db);
  await collectionStore.fetchCollections(connStore.active, db);

  showModal.value = false;
};

const onModalCancel = () => {
  showModal.value = false;
  if (!database.value) router.push("/dashboard");
};

onMounted(async () => {
  if (!connStore.active || !connStore.currentId) {
    router.push("/connect");
    return;
  }

  try {
    isLoading.value = true;

    await databaseStore.loadDatabases(connStore.active);

    if (!selectedDatabase.value) showModal.value = true;
  } finally {
    isLoading.value = false;
  }
});

const initForConnection = async () => {
  if (!connStore.active || !connStore.currentId) {
    router.push("/connect");
    return;
  }

  databaseStore.loadDatabases();
  collectionStore.fetchCollections(connStore.active);

  if (!database.value) showModal.value = true;
};

watch(
  () => connStore.active,
  async () => {
    await initForConnection();
  },
);

provide("showDatabaseModal", (state: boolean) => (showModal.value = state));
</script>
