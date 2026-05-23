<template>
  <div class="p-3">
    <div class="flex items-center gap-3">
      <label class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0">Output field</label>
      <input
        v-model="localField"
        type="text"
        placeholder="count"
        class="w-40 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
        @input="emit('update:modelValue', { outputField: localField })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: { outputField: string }
}>()

const emit = defineEmits<{
  'update:modelValue': [v: { outputField: string }]
}>()

const localField = ref(props.modelValue.outputField)

watch(() => props.modelValue.outputField, (val) => { localField.value = val })
</script>
