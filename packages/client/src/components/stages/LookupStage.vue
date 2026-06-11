<template>
  <div class="p-3 space-y-2">
    <div class="flex items-center gap-2">
      <label
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 w-24"
        >From</label
      >
      <div class="flex-1">
        <SelectBox
          :model-value="local.from"
          :options="collectionOpts"
          searchable
          allow-custom
          placeholder="collectionName"
          @update:model-value="local.from = $event; emitUpdate()"
        />
      </div>
    </div>
    <div class="flex items-center gap-2">
      <label
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 w-24"
        >Local field</label
      >
      <div class="flex-1">
        <SelectBox
          :model-value="local.localField"
          :options="fieldOpts"
          searchable
          allow-custom
          placeholder="localField"
          @update:model-value="
            local.localField = $event;
            emitUpdate();
          "
        />
      </div>
    </div>
    <div class="flex items-center gap-2">
      <label
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 w-24"
        >Foreign field</label
      >
      <input
        v-model="local.foreignField"
        type="text"
        placeholder="foreignField"
        class="flex-1 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
        @input="emitUpdate"
      />
    </div>
    <div class="flex items-center gap-2">
      <label
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 w-24"
        >As</label
      >
      <input
        v-model="local.as"
        type="text"
        placeholder="joined"
        class="flex-1 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
        @input="emitUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

const props = defineProps<{
  modelValue: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  };
  fields: string[];
  collections?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [
    v: { from: string; localField: string; foreignField: string; as: string },
  ];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);
const collectionOpts = computed(() =>
  (props.collections ?? []).map((c) => ({ value: c, label: c })),
);
const local = reactive({ ...props.modelValue });

watch(
  () => props.modelValue,
  (val) => Object.assign(local, val),
  { deep: true },
);

function emitUpdate() {
  emit("update:modelValue", { ...local });
}
</script>
