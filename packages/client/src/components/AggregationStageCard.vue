<template>
  <div
    class="bg-surface-container rounded-xl border transition-all duration-200"
    :class="stage.enabled ? 'border-outline-variant' : 'border-outline-variant/30 opacity-60'"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-container-high rounded-t-xl border-b border-outline-variant/50">
      <!-- Drag handle -->
      <span
        class="material-symbols-outlined text-[16px] text-on-surface-variant/30 shrink-0 cursor-grab hover:text-on-surface-variant/60 transition-colors"
        data-drag-handle
      >drag_indicator</span>

      <!-- Stage badge -->
      <span
        class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0"
        :class="badgeClass"
      >{{ stage.type }}</span>

      <!-- Editable label -->
      <input
        :value="stage.label"
        type="text"
        class="flex-1 min-w-0 bg-transparent text-[13px] font-medium text-on-surface outline-none focus:bg-surface-container focus:border focus:border-primary/50 focus:rounded px-1 py-0.5 transition-all"
        @blur="onLabelBlur"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
      />

      <!-- Enabled toggle -->
      <label class="flex items-center gap-1 cursor-pointer shrink-0" title="Toggle stage">
        <input
          type="checkbox"
          :checked="stage.enabled"
          class="w-3.5 h-3.5 accent-primary"
          @change="emit('toggle')"
        />
      </label>

      <!-- Move up -->
      <button
        v-if="index > 0"
        class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
        title="Move up"
        @click="emit('moveUp')"
      >
        <span class="material-symbols-outlined text-[14px]">keyboard_arrow_up</span>
      </button>
      <div v-else class="w-6 shrink-0" />

      <!-- Move down -->
      <button
        v-if="index < total - 1"
        class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
        title="Move down"
        @click="emit('moveDown')"
      >
        <span class="material-symbols-outlined text-[14px]">keyboard_arrow_down</span>
      </button>
      <div v-else class="w-6 shrink-0" />

      <!-- Delete -->
      <button
        class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
        title="Remove stage"
        @click="emit('remove')"
      >
        <span class="material-symbols-outlined text-[14px]">delete</span>
      </button>
    </div>

    <!-- Body: dynamic stage form -->
    <component
      :is="stageFormComponent"
      v-if="stageFormComponent && stage.enabled"
      :model-value="stage.config"
      :fields="fields"
      :collections="collections"
      :label="stageLabel"
      :stage-name="stage.type"
      @update:model-value="emit('update:config', $event)"
    />
    <div v-else-if="!stage.enabled" class="px-3 py-2 text-[11px] text-on-surface-variant/40 italic">
      Stage disabled — enable to configure
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Stage, StageType } from '@/stores/useAggregationStore'

import MatchStage from './stages/MatchStage.vue'
import GroupStage from './stages/GroupStage.vue'
import SortStage from './stages/SortStage.vue'
import ProjectStage from './stages/ProjectStage.vue'
import LimitSkipStage from './stages/LimitSkipStage.vue'
import UnwindStage from './stages/UnwindStage.vue'
import LookupStage from './stages/LookupStage.vue'
import AddFieldsStage from './stages/AddFieldsStage.vue'
import CountStage from './stages/CountStage.vue'
import SampleStage from './stages/SampleStage.vue'
import SortByCountStage from './stages/SortByCountStage.vue'
import ReplaceRootStage from './stages/ReplaceRootStage.vue'
import UnsetStage from './stages/UnsetStage.vue'
import OutputStage from './stages/OutputStage.vue'
import RawStage from './stages/RawStage.vue'

const FORM_MAP: Partial<Record<StageType, unknown>> = {
  '$match': MatchStage,
  '$group': GroupStage,
  '$sort': SortStage,
  '$project': ProjectStage,
  '$limit': LimitSkipStage,
  '$skip': LimitSkipStage,
  '$unwind': UnwindStage,
  '$lookup': LookupStage,
  '$addFields': AddFieldsStage,
  '$set': AddFieldsStage,
  '$count': CountStage,
  '$sample': SampleStage,
  '$sortByCount': SortByCountStage,
  '$replaceRoot': ReplaceRootStage,
  '$unset': UnsetStage,
  '$out': OutputStage,
  '$merge': OutputStage,
  '$raw': RawStage,
}

const props = defineProps<{
  stage: Stage
  fields: string[]
  collections: string[]
  index: number
  total: number
}>()

const emit = defineEmits<{
  remove: []
  moveUp: []
  moveDown: []
  toggle: []
  'update:config': [config: Record<string, unknown>]
  'update:label': [label: string]
}>()

const stageFormComponent = computed(() => FORM_MAP[props.stage.type] ?? null)

// For LimitSkipStage label prop
const stageLabel = computed(() => {
  if (props.stage.type === '$limit') return 'limit'
  if (props.stage.type === '$skip') return 'skip'
  return ''
})

const badgeClass = computed(() => {
  const t = props.stage.type
  if (t === '$match') return 'bg-primary/20 text-primary border-primary/30'
  if (['$group', '$count', '$sortByCount'].includes(t)) return 'bg-secondary/20 text-secondary border-secondary/30'
  if (['$sort', '$limit', '$skip'].includes(t)) return 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
  if (['$project', '$addFields', '$set', '$unset', '$replaceRoot'].includes(t)) return 'bg-tertiary/20 text-tertiary border-tertiary/30'
  if (['$lookup', '$unwind'].includes(t)) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  if (['$out', '$merge'].includes(t)) return 'bg-error/10 text-error border-error/20'
  return 'bg-outline-variant/30 text-on-surface-variant border-outline-variant'
})

function onLabelBlur(e: FocusEvent) {
  const val = (e.target as HTMLInputElement).value.trim()
  if (val && val !== props.stage.label) {
    emit('update:label', val)
  }
}
</script>
