<template>
  <div class="p-3">
    <div class="flex items-center gap-3">
      <label class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 capitalize">{{ label }}</label>
      <input
        v-model.number="localValue"
        type="number"
        min="0"
        class="w-32 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface outline-none focus:border-primary transition-colors font-mono"
        @input="emit('update:modelValue', { value: localValue })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: { value: number }
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: { value: number }]
}>()

const localValue = ref(props.modelValue.value)

watch(
  () => props.modelValue.value,
  (val) => { localValue.value = val },
)
</script>
