<template>
  <div class="p-3 space-y-2">
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

      <!-- ASC / DESC toggle -->
      <div
        class="flex rounded border border-outline-variant overflow-hidden text-[11px] font-semibold shrink-0"
      >
        <button
          class="px-2 py-1 transition-colors"
          :class="
            row.direction === 1
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          "
          @click="
            row.direction = 1;
            emitUpdate();
          "
        >
          ASC
        </button>
        <button
          class="px-2 py-1 transition-colors"
          :class="
            row.direction === -1
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          "
          @click="
            row.direction = -1;
            emitUpdate();
          "
        >
          DESC
        </button>
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
      Add sort field
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

type SortField = { id: string; field: string; direction: number };

const props = defineProps<{
  modelValue: { fields: SortField[] };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { fields: SortField[] }];
}>();

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);

const localFields = ref<SortField[]>(
  props.modelValue.fields.map((f) => ({ ...f })),
);

watch(
  () => props.modelValue,
  (val) => {
    localFields.value = val.fields.map((f) => ({ ...f }));
  },
  { deep: true },
);

function emitUpdate() {
  emit("update:modelValue", {
    fields: localFields.value.map((f) => ({ ...f })),
  });
}

function addRow() {
  localFields.value.push({ id: crypto.randomUUID(), field: "", direction: 1 });
  emitUpdate();
}

function removeRow(idx: number) {
  localFields.value.splice(idx, 1);
  emitUpdate();
}
</script>
