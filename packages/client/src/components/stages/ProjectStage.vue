<template>
  <div class="p-3 space-y-3">
    <!-- Mode toggle -->
    <div class="flex items-center gap-2">
      <span
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0"
        >Mode</span
      >
      <div
        class="flex rounded border border-outline-variant overflow-hidden text-[11px] font-semibold"
      >
        <button
          class="px-3 py-1 transition-colors"
          :class="
            localMode === 'include'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          "
          @click="
            localMode = 'include';
            emitUpdate();
          "
        >
          Include fields
        </button>
        <button
          class="px-3 py-1 transition-colors"
          :class="
            localMode === 'exclude'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          "
          @click="
            localMode = 'exclude';
            emitUpdate();
          "
        >
          Exclude fields
        </button>
      </div>
    </div>

    <!-- Fields -->
    <div class="space-y-2">
      <div
        v-for="(row, idx) in localFields"
        :key="row.id"
        class="flex items-center gap-2"
      >
        <div class="flex-1">
          <SelectBox
            :model-value="row.field"
            :options="fieldOpts"
            searchable
            allow-custom
            placeholder="field"
            @update:model-value="
              row.field = $event;
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

type ProjectField = { id: string; field: string };

const props = defineProps<{
  modelValue: { mode: "include" | "exclude"; fields: ProjectField[] };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [
    v: { mode: "include" | "exclude"; fields: ProjectField[] },
  ];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);
const localMode = ref<"include" | "exclude">(props.modelValue.mode);
const localFields = ref<ProjectField[]>(
  props.modelValue.fields.map((f) => ({ ...f })),
);

watch(
  () => props.modelValue,
  (val) => {
    localMode.value = val.mode;
    localFields.value = val.fields.map((f) => ({ ...f }));
  },
  { deep: true },
);

function emitUpdate() {
  emit("update:modelValue", {
    mode: localMode.value,
    fields: localFields.value.map((f) => ({ ...f })),
  });
}

function addRow() {
  localFields.value.push({ id: crypto.randomUUID(), field: "" });
  emitUpdate();
}

function removeRow(idx: number) {
  localFields.value.splice(idx, 1);
  emitUpdate();
}
</script>
