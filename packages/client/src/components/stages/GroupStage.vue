<template>
  <div class="p-3 space-y-3">
    <!-- Group By -->
    <div class="flex items-center gap-2">
      <span
        class="text-[11px] text-on-surface-variant uppercase tracking-wider shrink-0 w-20"
        >Group by</span
      >
      <div class="flex-1">
        <SelectBox
          :model-value="localGroupBy"
          :options="fieldOpts"
          searchable
          allow-custom
          placeholder="null (all documents)"
          @update:model-value="
            localGroupBy = $event;
            emitUpdate();
          "
        />
      </div>
    </div>

    <div class="border-t border-outline-variant/30" />

    <!-- Accumulators -->
    <div class="space-y-2">
      <span class="text-[11px] text-on-surface-variant uppercase tracking-wider"
        >Accumulators</span
      >

      <div
        v-for="(acc, idx) in localAccumulators"
        :key="acc.id"
        class="flex items-center gap-2"
      >
        <input
          v-model="acc.output"
          type="text"
          placeholder="outputField"
          class="w-28 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
          @input="emitUpdate"
        />
        <span class="text-on-surface-variant text-sm shrink-0">=</span>
        <div class="w-24 shrink-0">
          <SelectBox
            :model-value="acc.op"
            :options="ACC_OPS_OPTS"
            @update:model-value="
              acc.op = $event;
              emitUpdate();
            "
          />
        </div>
        <div v-if="acc.op !== '$count'" class="flex-1 min-w-0">
          <SelectBox
            :model-value="acc.field"
            :options="fieldOpts"
            searchable
            allow-custom
            placeholder="field or 1"
            @update:model-value="
              acc.field = $event;
              emitUpdate();
            "
          />
        </div>
        <span
          v-else
          class="flex-1 min-w-0 text-code-sm text-on-surface-variant/50 italic"
          >no field needed</span
        >
        <button
          class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
          @click="removeAcc(idx)"
        >
          <span class="material-symbols-outlined text-[15px]">remove</span>
        </button>
      </div>

      <button
        class="flex items-center gap-1 text-[12px] text-on-surface-variant hover:text-primary transition-colors"
        @click="addAcc"
      >
        <span class="material-symbols-outlined text-[14px]">add</span>
        Add accumulator
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

type Accumulator = { id: string; output: string; op: string; field: string };

const props = defineProps<{
  modelValue: { groupBy: string; accumulators: Accumulator[] };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { groupBy: string; accumulators: Accumulator[] }];
}>();

const ACC_OPS_OPTS = [
  "$sum",
  "$avg",
  "$min",
  "$max",
  "$first",
  "$last",
  "$push",
  "$count",
].map((op) => ({ value: op, label: op }));

const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);

const localGroupBy = ref(props.modelValue.groupBy);
const localAccumulators = ref<Accumulator[]>(
  props.modelValue.accumulators.map((a) => ({ ...a })),
);

watch(
  () => props.modelValue,
  (val) => {
    localGroupBy.value = val.groupBy;
    localAccumulators.value = val.accumulators.map((a) => ({ ...a }));
  },
  { deep: true },
);

function emitUpdate() {
  emit("update:modelValue", {
    groupBy: localGroupBy.value,
    accumulators: localAccumulators.value.map((a) => ({ ...a })),
  });
}

function addAcc() {
  localAccumulators.value.push({
    id: crypto.randomUUID(),
    output: "",
    op: "$sum",
    field: "1",
  });
  emitUpdate();
}

function removeAcc(idx: number) {
  localAccumulators.value.splice(idx, 1);
  emitUpdate();
}
</script>
