<template>
  <div class="p-3 space-y-3">
    <div class="flex items-center gap-3">
      <label
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 w-16"
        >Field</label
      >
      <div class="flex-1">
        <SelectBox
          :model-value="localField"
          :options="fieldOpts"
          searchable
          allow-custom
          placeholder="arrayField"
          @update:model-value="
            localField = $event;
            emitUpdate();
          "
        />
      </div>
    </div>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="localPreserveNull"
        type="checkbox"
        class="w-4 h-4 accent-primary"
        @change="emitUpdate"
      />
      <span class="text-[12px] text-on-surface-variant"
        >Preserve null and empty arrays</span
      >
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/SelectBox.vue";

const props = defineProps<{
  modelValue: { field: string; preserveNull: boolean };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { field: string; preserveNull: boolean }];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);
const localField = ref(props.modelValue.field);
const localPreserveNull = ref(props.modelValue.preserveNull);

watch(
  () => props.modelValue,
  (val) => {
    localField.value = val.field;
    localPreserveNull.value = val.preserveNull;
  },
  { deep: true },
);

function emitUpdate() {
  emit("update:modelValue", {
    field: localField.value,
    preserveNull: localPreserveNull.value,
  });
}
</script>
