<template>
  <div class="p-3 space-y-1.5">
    <div
      v-for="(cond, idx) in conditions"
      :key="cond.id"
      class="flex items-center gap-2"
    >
      <!-- Connector -->
      <div class="w-14 shrink-0 flex justify-end items-center">
        <span
          v-if="idx === 0"
          class="text-[10px] text-on-surface-variant/50 uppercase tracking-wider"
          >WHERE</span
        >
        <SelectBox
          v-else
          :model-value="cond.join"
          :options="JOIN_OPTS"
          @update:model-value="setJoin(idx, $event)"
        />
      </div>

      <!-- Field -->
      <div class="flex-1 min-w-0">
        <SelectBox
          :model-value="cond.field"
          :options="fieldOpts"
          searchable
          allow-custom
          placeholder="field"
          @update:model-value="
            cond.field = $event;
            emit('update:modelValue', toValue());
          "
        />
      </div>

      <!-- Operator -->
      <div class="w-24 shrink-0">
        <SelectBox
          :model-value="cond.op"
          :options="ALL_OPS"
          @update:model-value="
            cond.op = $event;
            emit('update:modelValue', toValue());
          "
        />
      </div>

      <!-- Value -->
      <input
        v-model="cond.value"
        type="text"
        placeholder="value"
        class="flex-1 min-w-0 bg-surface-container border border-outline-variant rounded px-2 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
        @input="emit('update:modelValue', toValue())"
      />

      <!-- Delete -->
      <button
        class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
        @click="removeCond(idx)"
      >
        <span class="material-symbols-outlined text-[15px]">remove</span>
      </button>
    </div>

    <button
      class="flex items-center gap-1 text-[12px] text-on-surface-variant hover:text-primary transition-colors mt-1 ml-12"
      @click="addCond"
    >
      <span class="material-symbols-outlined text-[14px]">add</span>
      Add condition
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import SelectBox from "@/components/ui/SelectBox.vue";

type Join = "and" | "or" | "nor";
type Condition = {
  id: string;
  field: string;
  op: string;
  value: string;
  join: Join;
};

const props = defineProps<{
  modelValue: { conditions: Condition[] };
  fields: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: { conditions: Condition[] }];
}>();

const stageId = crypto.randomUUID().slice(0, 8);
const fieldOpts = computed(() =>
  props.fields.map((f) => ({ value: f, label: f })),
);

const JOIN_OPTS: { value: Join; label: string }[] = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
  { value: "nor", label: "NOR" },
];

const ALL_OPS = [
  { value: "$eq", label: "= eq" },
  { value: "$ne", label: "≠ ne" },
  { value: "$gt", label: "> gt" },
  { value: "$gte", label: "≥ gte" },
  { value: "$lt", label: "< lt" },
  { value: "$lte", label: "≤ lte" },
  { value: "$regex", label: "~ regex" },
  { value: "$in", label: "∈ in" },
  { value: "$nin", label: "∉ nin" },
  { value: "$exists", label: "∃ exists" },
];

const conditions = ref<Condition[]>(
  props.modelValue.conditions.length
    ? props.modelValue.conditions.map((c) => ({ ...c, join: c.join ?? "and" }))
    : [newCond()],
);

watch(
  () => props.modelValue,
  (val) => {
    conditions.value = val.conditions.length
      ? val.conditions.map((c) => ({ ...c, join: c.join ?? "and" }))
      : [newCond()];
  },
  { deep: true },
);

function newCond(): Condition {
  return {
    id: crypto.randomUUID(),
    field: "",
    op: "$eq",
    value: "",
    join: "and",
  };
}

function toValue() {
  return { conditions: conditions.value.map((c) => ({ ...c })) };
}

function setJoin(idx: number, val: Join) {
  conditions.value[idx].join = val;
  emit("update:modelValue", toValue());
}

function addCond() {
  conditions.value.push(newCond());
  emit("update:modelValue", toValue());
}

function removeCond(idx: number) {
  if (conditions.value.length === 1) {
    conditions.value[0] = newCond();
  } else {
    conditions.value.splice(idx, 1);
  }
  emit("update:modelValue", toValue());
}
</script>
