<template>
  <div class="flex h-screen bg-background text-on-surface overflow-hidden">
    <Sidebar />

    <!-- Main area, offset by sidebar width -->
    <div
      class="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-200"
      :style="`margin-left: ${collapsed ? 48 : 220}px`"
    >
      <!-- Connection tabs bar -->
      <header
        class="h-11 bg-surface-container-low border-b border-outline-variant flex items-center z-40 shrink-0 overflow-hidden"
      >
        <div class="flex items-center flex-1 overflow-x-auto h-full">
          <button
            v-for="connection in connectionStore.openConnections"
            :key="connection.id"
            class="h-full flex items-center gap-2 px-4 text-body-sm border-r border-outline-variant/50 whitespace-nowrap transition-colors group/tab shrink-0 relative"
            :class="
              connectionStore.currentId === connection.id
                ? 'text-primary bg-surface-container-high'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30'
            "
            @click="switchConnection(connection.id)"
          >
            <span
              v-if="connectionStore.currentId === connection.id"
              class="absolute inset-x-0 top-0 h-0.5 bg-primary"
            />
            <span class="material-symbols-outlined text-sm!">dns</span>
            <span class="max-w-36 truncate">{{ connection.label }}</span>
            <span
              class="material-symbols-outlined text-sm! opacity-0 group-hover/tab:opacity-50 hover:opacity-100! hover:text-error transition-all"
              @click.stop="closeConnection(connection.id)"
            >
              close
            </span>
          </button>
          <button
            class="h-full px-3 flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 transition-colors border-l border-outline-variant/50 shrink-0"
            title="Add connection"
            @click="addConnection"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
        <div
          class="px-3 flex items-center gap-2 border-l border-outline-variant/50 shrink-0"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></span>
          <span
            class="font-mono text-code-sm text-on-surface-variant hidden lg:block"
          >
            {{ connectionUri }}
          </span>
        </div>
      </header>

      <!-- Page content -->
      <main
        class="flex-1 flex overflow-hidden"
        v-if="connectionStore.currentId"
      >
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useConnectionsStore } from "../stores/connections";
import { useSidebar } from "../composables/useSidebar";
import Sidebar from "@/components/Sidebar.vue";
import { computed } from "vue";
import { ROUTE_NAME } from "@/route";
import { useCollectionStore } from "@/stores/useCollectionStore";

const router = useRouter();
const route = useRoute();
const connectionStore = useConnectionsStore();
const collectionStore = useCollectionStore();
const { collapsed } = useSidebar();

const connectionUri = computed(() =>
  connectionStore.active?.uri.replace(/:([^@/]+)@/, ":****@"),
);
const collection = computed(() => collectionStore.collection());

const addConnection = () => router.push("/connect");

const closeConnection = (id: string) => {
  connectionStore.closeConnection(id);
  if (!connectionStore.active) router.push("/connect");
};

const switchConnection = (id: string) => {
  connectionStore.switchConnection(id);

  if (route.name === ROUTE_NAME.DOCUMENTS && collection.value) {
    router.replace({
      name: ROUTE_NAME.DOCUMENTS,
      params: { name: collection.value.name },
    });
  }
};
</script>
