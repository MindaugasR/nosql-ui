<template>
  <div class="p-3">
    <div class="flex items-center gap-3">
      <label
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0"
        >New root</label
      >
      <div class="flex-1">
        <SelectBox
          :model-value="localValue"
          :options="fieldOpts"
          searchable
          allow-custom
          placeholder="$subdocument"
          @update:model-value="
            localValue = $event;
            emit('update:modelValue', { newRoot: localValue });
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/SelectBox.vue";

const props = defineProps<{
  modelValue: { newRoot: string };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { newRoot: string }];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);
const localValue = ref(props.modelValue.newRoot);

watch(
  () => props.modelValue.newRoot,
  (val) => {
    localValue.value = val;
  },
);
</script>
