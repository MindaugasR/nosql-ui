<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="open" class="fixed inset-0 z-50">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm"
          @click="$emit('close')"
        />

        <!-- Sheet -->
        <div class="absolute inset-x-0 bottom-0 bg-surface-container-low border-t border-outline-variant rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col overflow-hidden">
          <!-- Handle -->
          <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div class="w-10 h-1 rounded-full bg-outline-variant"></div>
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-outline-variant shrink-0">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[18px]">add_circle</span>
              <span class="text-body-md font-semibold text-on-surface">Add Pipeline Stage</span>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
              @click="$emit('close')"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Search -->
          <div class="px-5 py-3 shrink-0">
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
              <input
                v-model="search"
                type="text"
                placeholder="Search stages…"
                autofocus
                class="w-full bg-surface-container border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <!-- Stage categories -->
          <div class="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
            <div v-for="cat in filteredCategories" :key="cat.label">
              <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {{ cat.label }}
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <button
                  v-for="stage in cat.stages"
                  :key="stage.type"
                  class="flex flex-col gap-1 p-3 bg-surface-container rounded-xl border border-outline-variant/50 text-left hover:border-primary hover:bg-primary/5 transition-all group"
                  @click="onAdd(stage.type)"
                >
                  <span
                    class="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border"
                    :class="stageBadgeClass(stage.type)"
                  >{{ stage.type }}</span>
                  <span class="text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors leading-tight">
                    {{ stage.desc }}
                  </span>
                </button>
              </div>
            </div>

            <p
              v-if="filteredCategories.length === 0"
              class="text-body-sm text-on-surface-variant/50 text-center py-8"
            >
              No stages match "{{ search }}"
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StageType } from '@/stores/useAggregationStore'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  add: [type: StageType]
}>()

const search = ref('')

type StageEntry = { type: StageType; desc: string }
type Category = { label: string; stages: StageEntry[] }

const CATEGORIES: Category[] = [
  {
    label: '🔍 Filter',
    stages: [
      { type: '$match', desc: 'Filter documents by conditions' },
      { type: '$sample', desc: 'Randomly select N documents' },
    ],
  },
  {
    label: '📊 Group & Count',
    stages: [
      { type: '$group', desc: 'Group docs and compute aggregates' },
      { type: '$count', desc: 'Count pipeline documents' },
      { type: '$sortByCount', desc: 'Group by field and sort by count' },
    ],
  },
  {
    label: '🔄 Transform',
    stages: [
      { type: '$project', desc: 'Select/rename/exclude fields' },
      { type: '$addFields', desc: 'Add computed fields' },
      { type: '$set', desc: 'Alias for $addFields' },
      { type: '$unset', desc: 'Remove fields' },
      { type: '$replaceRoot', desc: 'Replace root with subdocument' },
    ],
  },
  {
    label: '📋 Sort & Page',
    stages: [
      { type: '$sort', desc: 'Sort by fields' },
      { type: '$limit', desc: 'Keep first N docs' },
      { type: '$skip', desc: 'Skip first N docs' },
    ],
  },
  {
    label: '🔗 Join',
    stages: [
      { type: '$lookup', desc: 'Join with another collection' },
    ],
  },
  {
    label: '📦 Arrays',
    stages: [
      { type: '$unwind', desc: 'Flatten array into separate docs' },
    ],
  },
  {
    label: '💾 Output',
    stages: [
      { type: '$out', desc: 'Write to new collection' },
      { type: '$merge', desc: 'Merge into existing collection' },
    ],
  },
  {
    label: '⚙️ Raw JSON',
    stages: [
      { type: '$raw', desc: 'Write any stage as raw JSON' },
    ],
  },
]

const filteredCategories = computed(() => {
  if (!search.value.trim()) return CATEGORIES
  const q = search.value.toLowerCase()
  return CATEGORIES
    .map(cat => ({
      ...cat,
      stages: cat.stages.filter(
        s => s.type.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q),
      ),
    }))
    .filter(cat => cat.stages.length > 0)
})

function onAdd(type: StageType) {
  emit('add', type)
  emit('close')
  search.value = ''
}

function stageBadgeClass(type: StageType): string {
  if (type === '$match') return 'bg-primary/20 text-primary border-primary/30'
  if (['$group', '$count', '$sortByCount'].includes(type)) return 'bg-secondary/20 text-secondary border-secondary/30'
  if (['$sort', '$limit', '$skip'].includes(type)) return 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
  if (['$project', '$addFields', '$set', '$unset', '$replaceRoot'].includes(type)) return 'bg-tertiary/20 text-tertiary border-tertiary/30'
  if (['$lookup', '$unwind'].includes(type)) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  if (['$out', '$merge'].includes(type)) return 'bg-error/10 text-error border-error/20'
  return 'bg-outline-variant/30 text-on-surface-variant border-outline-variant'
}
</script>

<style scoped>
.slide-up-enter-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease;
}
.slide-up-leave-active {
  transition: transform 0.22s ease, opacity 0.18s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
