<template>
  <div class="p-3">
    <div class="flex items-center gap-3">
      <label class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0">Sample size</label>
      <input
        v-model.number="localSize"
        type="number"
        min="1"
        class="w-32 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface outline-none focus:border-primary transition-colors font-mono"
        @input="emit('update:modelValue', { size: localSize })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: { size: number }
}>()

const emit = defineEmits<{
  'update:modelValue': [v: { size: number }]
}>()

const localSize = ref(props.modelValue.size)

watch(() => props.modelValue.size, (val) => { localSize.value = val })
</script>
