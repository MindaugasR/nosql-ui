<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-7xl mx-auto space-y-stack-lg">
      <!-- Page header -->
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h2 class="text-headline-lg font-bold text-on-surface">
            Cluster Overview
          </h2>
          <p class="text-body-md text-on-surface-variant mt-1">
            Metrics for
            <span class="font-mono text-secondary">
              {{ connectionStore.active?.label }}
            </span>
          </p>
        </div>
        <button
          class="px-4 py-2 bg-surface-container border border-outline-variant rounded-sm text-body-sm hover:border-primary text-on-surface transition-colors flex items-center gap-2"
          :disabled="loading"
          @click="onRefresh(true)"
        >
          <span
            class="material-symbols-outlined text-sm!"
            :class="{ 'animate-spin': loading }"
          >
            sync
          </span>
          Refresh
        </button>
      </div>

      <!-- Error -->
      <div
        v-if="error"
        class="bg-error-container/20 border border-error/30 rounded-lg px-4 py-3 flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-error text-[18px]">
          error
        </span>
        <p class="text-body-sm text-error">{{ error }}</p>
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="i in 3"
            :key="i"
            class="bg-surface-container-high border border-outline-variant rounded-lg p-5 h-32 animate-pulse"
          />
        </div>
      </template>

      <template v-else-if="stats">
        <!-- System Health Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Memory -->
          <div
            v-if="stats.memory"
            class="bg-surface-container-high border border-outline-variant rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden"
          >
            <div class="flex justify-between items-center z-10">
              <span
                class="font-mono text-code-sm text-on-surface-variant uppercase tracking-wider"
              >
                Memory Usage
              </span>
              <span class="material-symbols-outlined text-tertiary">
                memory
              </span>
            </div>
            <div class="flex items-end gap-3 z-10">
              <span class="text-headline-lg font-bold text-on-surface">
                {{ formatBytes(stats.memory.used * 1024 * 1024) }}
              </span>
              <span class="text-body-sm text-on-surface-variant mb-1">
                / {{ formatBytes(stats.memory.total * 1024 * 1024) }}
              </span>
            </div>
            <div
              class="w-full bg-surface-container-lowest rounded-full h-1.5 mt-auto z-10"
            >
              <div
                class="bg-tertiary h-1.5 rounded-full transition-all"
                :style="{
                  width:
                    formatPercents(stats.memory.used, stats.memory.total) + '%',
                }"
              />
            </div>
          </div>

          <!-- Connections -->
          <div
            v-if="stats.connections"
            class="bg-surface-container-high border border-outline-variant rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden"
          >
            <div class="flex justify-between items-center z-10">
              <span
                class="font-mono text-code-sm text-on-surface-variant uppercase tracking-wider"
              >
                Active Connections
              </span>
              <span class="material-symbols-outlined text-secondary">lan</span>
            </div>
            <div class="flex items-end gap-3 z-10">
              <span class="text-headline-lg font-bold text-on-surface">
                {{ stats.connections.current.toLocaleString() }}
              </span>
              <span class="text-body-sm text-on-surface-variant mb-1">
                /
                {{ stats.connections.available.toLocaleString() }}
                avail.
              </span>
            </div>
          </div>

          <!-- Ops -->
          <div
            v-if="stats.ops"
            class="bg-surface-container-high border border-outline-variant rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden"
          >
            <div class="flex justify-between items-center z-10">
              <span
                class="font-mono text-code-sm text-on-surface-variant uppercase tracking-wider"
              >
                Total Operations
              </span>
              <span class="material-symbols-outlined text-primary">speed</span>
            </div>
            <div class="flex items-end gap-2 z-10">
              <span class="text-headline-lg font-bold text-on-surface">
                {{
                  (
                    stats.ops.insert +
                    stats.ops.query +
                    stats.ops.update +
                    stats.ops.delete
                  ).toLocaleString()
                }}
              </span>
            </div>
            <div
              class="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-code-sm font-mono text-on-surface-variant z-10"
            >
              <div class="flex flex-col text-center">
                <span>Query</span>
                <span>
                  {{ stats.ops.query.toLocaleString() }}
                </span>
              </div>
              <div class="flex flex-col text-center">
                <span>Insert</span>
                <span>{{ stats.ops.insert.toLocaleString() }}</span>
              </div>
              <div class="flex flex-col text-center">
                <span>Update</span>
                <span>{{ stats.ops.update.toLocaleString() }}</span>
              </div>
              <div class="flex flex-col text-center">
                <span>Delete</span
                ><span>{{ stats.ops.delete.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Version + Uptime (always shown if version exists) -->
          <div
            v-if="stats.version"
            class="bg-surface-container-high border border-outline-variant rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden"
            :class="{
              'md:col-span-3':
                !stats.memory && !stats.connections && !stats.ops,
            }"
          >
            <div class="flex justify-between items-center">
              <span
                class="font-mono text-code-sm text-on-surface-variant uppercase tracking-wider"
              >
                Server Info
              </span>
              <span class="material-symbols-outlined text-primary">info</span>
            </div>
            <div class="flex items-center gap-6">
              <div>
                <div
                  class="text-label-caps text-on-surface-variant uppercase tracking-widest mb-1"
                >
                  Version
                </div>
                <div class="font-mono text-code-md text-secondary">
                  {{ stats.version }}
                </div>
              </div>
              <div v-if="stats.uptime !== null">
                <div
                  class="text-label-caps text-on-surface-variant uppercase tracking-widest mb-1"
                >
                  Uptime
                </div>
                <div class="font-mono text-code-md text-on-surface">
                  {{ formatUptime(stats.uptime) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Databases / Keyspaces -->
      <div
        v-if="databases.length"
        class="bg-surface-container border border-outline-variant rounded-xl overflow-hidden"
      >
        <div
          class="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low"
        >
          <h3
            class="text-headline-sm font-semibold text-on-surface flex items-center gap-2"
          >
            <span
              class="material-symbols-outlined text-primary"
              :style="{ fontVariationSettings: `'FILL' 1` }"
            >
              dns
            </span>
            Databases
          </h3>
          <span class="font-mono text-code-sm text-on-surface-variant">
            {{ databases.length }} total
          </span>
        </div>

        <div class="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="db in databases"
            :key="db.name"
            class="bg-surface-container-high border border-outline-variant rounded-lg p-4 hover:border-primary cursor-pointer transition-colors group"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2">
                <span
                  class="material-symbols-outlined text-secondary group-hover:text-primary transition-colors"
                  :style="{ fontVariationSettings: `'FILL' 1` }"
                  >folder</span
                >
                <span class="font-mono text-code-md text-on-surface">
                  {{ db.name }}
                </span>
              </div>
              <span
                class="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1"
              ></span>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3">
              <div v-if="db.sizeBytes !== null">
                <div class="font-mono text-code-sm text-on-surface-variant">
                  Size
                </div>
                <div class="text-body-md text-on-surface">
                  {{ formatBytes(db.sizeBytes) }}
                </div>
              </div>
              <div v-if="db.collections !== null">
                <div class="font-mono text-code-sm text-on-surface-variant">
                  Collections
                </div>
                <div class="text-body-md text-on-surface">
                  {{ db.collections }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useConnectionsStore } from "@/stores/connections";
import { formatBytes, formatPercents, formatUptime } from "@/utils";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import { useServerStore } from "@/stores/useServerStore";

const router = useRouter();
const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();
const serverStore = useServerStore();

const loading = ref(true);

const databases = computed(() => databaseStore.databases());
const stats = computed(() => serverStore.stats());
const error = computed(() => serverStore.statsError());

const load = async (force = false) => {
  try {
    loading.value = true;
    await databaseStore.loadDatabases(undefined, force);
    await serverStore.loadStats(undefined, force);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (!connectionStore.active) {
    router.push("/connect");
    return;
  }

  load();
});

const onRefresh = async (forceReload = false) => {
  load(forceReload);
};
</script>
