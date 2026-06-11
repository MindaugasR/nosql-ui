<template>
  <div class="p-3">
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
          placeholder="fieldName"
          @update:model-value="
            localField = $event;
            emit('update:modelValue', { field: localField });
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

const props = defineProps<{
  modelValue: { field: string };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { field: string }];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);
const localField = ref(props.modelValue.field);

watch(
  () => props.modelValue.field,
  (val) => {
    localField.value = val;
  },
);
</script>
