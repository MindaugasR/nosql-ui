<template>
  <div class="p-3">
    <textarea
      v-model="localJson"
      rows="5"
      spellcheck="false"
      placeholder='{ "$match": { "field": "value" } }'
      class="w-full bg-surface-container-lowest border rounded px-3 py-2 font-mono text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-y transition-colors"
      :class="parseError ? 'border-error' : 'border-outline-variant focus:border-primary'"
      @input="onInput"
    />
    <p v-if="parseError" class="text-[11px] text-error mt-1">
      {{ parseError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: { json: string }
}>()

const emit = defineEmits<{
  'update:modelValue': [v: { json: string }]
}>()

const localJson = ref(props.modelValue.json)
const parseError = ref<string | null>(null)

watch(
  () => props.modelValue.json,
  (val) => { localJson.value = val },
)

function onInput() {
  try {
    JSON.parse(localJson.value)
    parseError.value = null
  } catch (e: unknown) {
    parseError.value = e instanceof Error ? e.message : 'Invalid JSON'
  }
  emit('update:modelValue', { json: localJson.value })
}
</script>
