<template>
  <Teleport to="body">
    <Transition name="qh-slide">
      <div v-if="open" class="fixed inset-0 z-45">
        <div class="absolute inset-0 bg-black/20" @click="$emit('close')" />

        <aside
          class="absolute top-0 right-0 bottom-0 w-96 bg-surface-container-low border-l border-outline-variant shadow-2xl flex flex-col"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-high shrink-0"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[18px]"
                >history</span
              >
              <span class="text-body-md font-semibold text-on-surface"
                >Query History</span
              >
            </div>
            <Button variant="icon" class="w-7 h-7" @click="$emit('close')">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </Button>
          </div>

          <div class="overflow-y-auto flex-1">
            <!-- Favorites -->
            <template v-if="favorites.length > 0">
              <p
                class="px-4 pt-3 pb-1 text-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant"
              >
                Favorites
              </p>
              <div
                v-for="fav in favorites"
                :key="fav.id"
                class="group px-4 py-2 hover:bg-surface-container-high/40 cursor-pointer border-b border-outline-variant/20"
                @click="$emit('select', fav)"
              >
                <div class="flex items-center gap-1.5">
                  <span
                    class="material-symbols-outlined text-[14px] text-amber-400"
                    >star</span
                  >
                  <TextInput
                    v-if="renamingId === fav.id"
                    v-model="renameValue"
                    class="flex-1 text-[12px]! py-0.5!"
                    @click.stop
                    @keydown.enter="commitRename(fav.id)"
                    @keydown.escape="renamingId = null"
                    @blur="commitRename(fav.id)"
                  />
                  <span
                    v-else
                    class="flex-1 text-body-sm font-medium text-on-surface truncate"
                    >{{ fav.name }}</span
                  >
                  <Button
                    variant="icon"
                    class="w-6 h-6 opacity-0 group-hover:opacity-100"
                    title="Rename"
                    @click.stop="startRename(fav)"
                  >
                    <span class="material-symbols-outlined text-[14px]"
                      >edit</span
                    >
                  </Button>
                  <Button
                    variant="icon"
                    class="w-6 h-6 opacity-0 group-hover:opacity-100 hover:text-error!"
                    title="Remove favorite"
                    @click.stop="$emit('removeFavorite', fav.id)"
                  >
                    <span class="material-symbols-outlined text-[14px]"
                      >delete</span
                    >
                  </Button>
                </div>
                <p
                  class="font-mono text-[11px] text-on-surface-variant truncate mt-0.5 pl-5"
                >
                  {{ fav.query }}
                </p>
              </div>
            </template>

            <!-- Recent -->
            <div class="flex items-center justify-between px-4 pt-3 pb-1">
              <p
                class="text-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant"
              >
                Recent
              </p>
              <button
                v-if="history.length > 0"
                class="text-[11px] text-on-surface-variant/60 hover:text-error transition-colors cursor-pointer"
                @click="$emit('clearHistory')"
              >
                Clear
              </button>
            </div>
            <p
              v-if="history.length === 0"
              class="px-4 py-6 text-center text-body-sm text-on-surface-variant/50"
            >
              No queries yet — run one!
            </p>
            <div
              v-for="(entry, i) in history"
              :key="i"
              class="group px-4 py-2 hover:bg-surface-container-high/40 cursor-pointer border-b border-outline-variant/20"
              @click="$emit('select', entry)"
            >
              <div class="flex items-center gap-1.5">
                <p
                  class="flex-1 font-mono text-[11px] text-on-surface truncate"
                >
                  {{ entry.query }}
                </p>
                <Button
                  variant="icon"
                  class="w-6 h-6 opacity-0 group-hover:opacity-100"
                  title="Save as favorite"
                  @click.stop="$emit('addFavorite', entry)"
                >
                  <span class="material-symbols-outlined text-[14px]"
                    >star</span
                  >
                </Button>
              </div>
              <p class="text-[10px] text-on-surface-variant/50 mt-0.5">
                {{ entry.db }} · {{ formatTs(entry.ts) }}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/ui/Button.vue";
import TextInput from "@/components/ui/TextInput.vue";
import type { HistoryEntry, FavoriteEntry } from "@/lib/query-history";

defineProps<{
  open: boolean;
  history: HistoryEntry[];
  favorites: FavoriteEntry[];
}>();

const emit = defineEmits<{
  close: [];
  select: [entry: HistoryEntry];
  addFavorite: [entry: HistoryEntry];
  removeFavorite: [id: string];
  renameFavorite: [id: string, name: string];
  clearHistory: [];
}>();

const renamingId = ref<string | null>(null);
const renameValue = ref("");

const startRename = (fav: FavoriteEntry) => {
  renamingId.value = fav.id;
  renameValue.value = fav.name;
};

const commitRename = (id: string) => {
  if (renamingId.value !== id) return;
  const name = renameValue.value.trim();
  if (name) emit("renameFavorite", id, name);
  renamingId.value = null;
};

const formatTs = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return new Date(ts).toLocaleDateString();
};
</script>

<style scoped>
.qh-slide-enter-active,
.qh-slide-leave-active {
  transition: opacity 0.18s ease;
}
.qh-slide-enter-active aside,
.qh-slide-leave-active aside {
  transition: transform 0.22s ease;
}
.qh-slide-enter-from,
.qh-slide-leave-to {
  opacity: 0;
}
.qh-slide-enter-from aside,
.qh-slide-leave-to aside {
  transform: translateX(100%);
}
</style>
