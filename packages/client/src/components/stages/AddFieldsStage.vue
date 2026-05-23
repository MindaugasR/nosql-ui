<template>
  <div class="p-3 space-y-2">
    <div
      v-for="(row, idx) in localFields"
      :key="row.id"
      class="flex items-center gap-2"
    >
      <input
        v-model="row.name"
        type="text"
        placeholder="fieldName"
        class="w-32 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
        @input="emitUpdate"
      />
      <span class="text-on-surface-variant text-sm shrink-0">=</span>
      <input
        v-model="row.expr"
        type="text"
        placeholder="$existingField or value"
        class="flex-1 min-w-0 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
        @input="emitUpdate"
      />
      <button
        class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
        @click="removeRow(idx)"
      >
        <span class="material-symbols-outlined text-[15px]">remove</span>
      </button>
    </div>

    <button
      class="flex items-center gap-1 text-[12px] text-on-surface-variant hover:text-primary transition-colors"
      @click="addRow"
    >
      <span class="material-symbols-outlined text-[14px]">add</span>
      Add field
    </button>

    <p class="text-[11px] text-on-surface-variant/50 italic">
      Use $fieldName to reference existing fields
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

type AddField = { id: string; name: string; expr: string }

const props = defineProps<{
  modelValue: { fields: AddField[] }
}>()

const emit = defineEmits<{
  'update:modelValue': [v: { fields: AddField[] }]
}>()

const localFields = ref<AddField[]>(props.modelValue.fields.map(f => ({ ...f })))

watch(
  () => props.modelValue,
  (val) => { localFields.value = val.fields.map(f => ({ ...f })) },
  { deep: true },
)

function emitUpdate() {
  emit('update:modelValue', { fields: localFields.value.map(f => ({ ...f })) })
}

function addRow() {
  localFields.value.push({ id: crypto.randomUUID(), name: '', expr: '' })
  emitUpdate()
}

function removeRow(idx: number) {
  localFields.value.splice(idx, 1)
  emitUpdate()
}
</script>
