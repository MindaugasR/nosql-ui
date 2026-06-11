<template>
  <div class="p-3 space-y-2">
    <div
      v-for="(_, idx) in localFields"
      :key="idx"
      class="flex items-center gap-2"
    >
      <div class="flex-1">
        <SelectBox
          :model-value="localFields[idx]"
          :options="fieldOpts"
          searchable
          allow-custom
          placeholder="fieldName"
          @update:model-value="
            localFields[idx] = $event;
            emitUpdate();
          "
        />
      </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

const props = defineProps<{
  modelValue: { fields: string[] };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { fields: string[] }];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);
const localFields = ref<string[]>([...props.modelValue.fields]);

watch(
  () => props.modelValue,
  (val) => {
    localFields.value = [...val.fields];
  },
  { deep: true },
);

function emitUpdate() {
  emit("update:modelValue", { fields: [...localFields.value] });
}

function addRow() {
  localFields.value.push("");
  emitUpdate();
}

function removeRow(idx: number) {
  localFields.value.splice(idx, 1);
  emitUpdate();
}
</script>
