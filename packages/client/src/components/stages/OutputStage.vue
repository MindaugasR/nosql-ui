<template>
  <div class="p-3">
    <div class="flex items-center gap-3">
      <label class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0">Target collection</label>
      <div class="flex-1">
        <SelectBox
          :model-value="localValue"
          :options="collectionOpts"
          searchable
          allow-custom
          placeholder="collectionName"
          @update:model-value="localValue = $event; emitUpdate()"
        />
      </div>
    </div>
    <p v-if="stageName === '$out'" class="text-[11px] text-amber-400/80 mt-2">
      Warning: $out replaces the target collection.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SelectBox from '@/components/SelectBox.vue'

const props = defineProps<{
  modelValue: { collection?: string; into?: string }
  stageName: '$out' | '$merge'
  collections?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: { collection?: string; into?: string }]
}>()

const collectionOpts = computed(() =>
  (props.collections ?? []).map((c) => ({ value: c, label: c })),
)

const localValue = ref(
  props.stageName === '$out' ? props.modelValue.collection ?? '' : props.modelValue.into ?? '',
)

watch(
  () => props.modelValue,
  (val) => {
    localValue.value = props.stageName === '$out' ? val.collection ?? '' : val.into ?? ''
  },
  { deep: true },
)

function emitUpdate() {
  if (props.stageName === '$out') {
    emit('update:modelValue', { collection: localValue.value })
  } else {
    emit('update:modelValue', { into: localValue.value })
  }
}
</script>
