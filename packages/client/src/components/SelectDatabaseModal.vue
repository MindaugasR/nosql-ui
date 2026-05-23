<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-background/40 backdrop-blur-md"
    @click.self="emit('cancel')"
  >
    <div
      class="bg-surface-container-low border border-outline-variant w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div
        class="p-stack-lg border-b border-outline-variant bg-surface-container-highest/20"
      >
        <div class="flex items-center gap-3 mb-2">
          <div
            class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
          >
            <span class="material-symbols-outlined">database</span>
          </div>
          <h3 class="text-headline-md font-semibold text-on-surface">
            Select Database to Continue
          </h3>
        </div>
        <p class="text-body-md text-on-surface-variant">
          Choose the database you want to manage collections in.
        </p>
      </div>

      <!-- Content -->
      <div class="p-stack-lg flex-1">
        <!-- Filter -->
        <div class="relative mb-stack-md">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
          >
            filter_list
          </span>
          <input
            v-model="filter"
            type="text"
            placeholder="Filter databases..."
            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-outline/60"
          />
        </div>

        <!-- Loading -->
        <div v-if="loading" class="space-y-2">
          <div
            v-for="i in 3"
            :key="i"
            class="h-14 bg-surface-container-lowest border border-outline-variant rounded-lg animate-pulse"
          />
        </div>

        <!-- Database list -->
        <div v-else class="space-y-2 max-h-80 overflow-y-auto pr-1">
          <button
            v-for="db in filtered"
            :key="db.name"
            class="relative w-full flex items-center p-3 rounded-lg border text-left transition-all"
            :class="
              db.name === props.currentDb
                ? 'border-outline-variant bg-surface-container-lowest opacity-40 cursor-not-allowed'
                : picked === db
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
            "
            :disabled="db.name === props.currentDb"
            @click="picked = db"
          >
            <div
              class="w-8 h-8 rounded bg-surface-variant flex items-center justify-center mr-4 text-on-surface-variant shrink-0"
            >
              <span class="material-symbols-outlined text-[18px]">storage</span>
            </div>
            <span
              class="text-body-md font-medium text-on-surface font-mono flex-1"
            >
              {{ db.name }}
            </span>
            <span
              v-if="db.name === props.currentDb"
              class="text-label-caps text-on-surface-variant uppercase tracking-widest text-[10px] mr-2"
            >
              current
            </span>
            <!-- Radio indicator -->
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
              :class="
                picked === db ? 'border-primary bg-primary' : 'border-outline'
              "
            >
              <div
                v-if="picked === db"
                class="w-2 h-2 rounded-full bg-on-primary"
              />
            </div>
          </button>

          <p
            v-if="!filtered || filtered.length === 0"
            class="text-body-sm text-on-surface-variant text-center py-6"
          >
            No databases found
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-stack-lg border-t border-outline-variant flex items-center justify-end gap-stack-md bg-surface-container-highest/10"
      >
        <button
          class="px-6 py-2.5 text-body-md font-medium text-on-surface-variant hover:text-on-surface transition-all"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="px-8 py-2.5 bg-primary text-on-primary rounded font-bold text-body-md hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-40"
          :disabled="!picked"
          @click="confirm"
        >
          Confirm Selection
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database } from "@/types";
import { ref, computed } from "vue";

const props = defineProps<{
  databases?: Database[];
  loading?: boolean;
  currentDb?: string | null;
}>();

const emit = defineEmits<{
  select: [db: Database];
  cancel: [];
}>();

const filter = ref("");
const picked = ref<Database | null>(null);

const filtered = computed(() =>
  props.databases?.filter((d) =>
    d.name.toLowerCase().includes(filter.value.toLowerCase()),
  ),
);

const confirm = () => {
  if (picked.value) emit("select", picked.value);
};
</script>
