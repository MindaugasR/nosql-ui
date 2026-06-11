<template>
  <Teleport to="body">
    <Transition name="qb-drop">
      <div v-if="open" class="fixed inset-0 z-45">
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="$emit('close')"
        />

        <div
          class="absolute top-11 left-60 right-0 z-10 flex justify-center items-start"
        >
          <div
            class="w-full max-w-4xl flex flex-col bg-surface-container-low border border-outline-variant shadow-2xl max-h-[75vh] rounded-xl overflow-hidden"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container shrink-0"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]"
                  >filter_alt</span
                >
                <span class="text-body-md font-semibold text-on-surface"
                  >Query Builder</span
                >
              </div>

              <div class="flex items-center gap-2">
                <span class="text-body-sm text-on-surface-variant">Match</span>
                <div
                  class="flex rounded-lg border border-outline-variant overflow-hidden text-body-sm font-semibold"
                >
                  <button
                    class="px-3 py-1 transition-colors"
                    :class="
                      logic === 'AND'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    "
                    @click="logic = 'AND'"
                  >
                    ALL
                  </button>
                  <button
                    class="px-3 py-1 transition-colors"
                    :class="
                      logic === 'OR'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    "
                    @click="logic = 'OR'"
                  >
                    ANY
                  </button>
                </div>
                <span class="text-body-sm text-on-surface-variant"
                  >conditions</span
                >
              </div>

              <button
                class="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                @click="$emit('close')"
              >
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Conditions -->
            <div class="px-5 py-4 space-y-2.5 overflow-y-auto">
              <div
                v-for="(cond, idx) in conditions"
                :key="cond.id"
                class="flex items-center gap-3"
              >
                <div class="w-12 text-right text-body-sm font-mono shrink-0">
                  <span
                    v-if="idx === 0"
                    class="text-on-surface-variant/50 text-[11px] uppercase tracking-wider"
                    >WHERE</span
                  >
                  <span
                    v-else
                    class="text-primary font-bold text-[11px] uppercase tracking-wider"
                    >{{ logic }}</span
                  >
                </div>

                <!-- Field -->
                <FieldCombobox
                  :model-value="cond.field"
                  :fields="fields"
                  @update:model-value="(val) => onFieldChange(cond, val)"
                />

                <!-- Operator — only shown once a field is chosen -->
                <select
                  v-if="cond.field"
                  v-model="cond.op"
                  class="bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-code-sm text-on-surface outline-none focus:border-primary transition-colors w-40 shrink-0"
                  @change="onOpChange(cond)"
                >
                  <option
                    v-for="op in opsForField(cond.field)"
                    :key="op.value"
                    :value="op.value"
                  >
                    {{ op.label }}
                  </option>
                </select>

                <!-- Value — only shown once a field is chosen -->
                <div v-if="cond.field" class="flex-1 min-w-0">
                  <select
                    v-if="cond.op === '$exists'"
                    v-model="cond.value"
                    class="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-code-sm text-on-surface outline-none focus:border-primary transition-colors"
                  >
                    <option value="true">exists (true)</option>
                    <option value="false">does not exist (false)</option>
                  </select>
                  <select
                    v-else-if="fieldType(cond.field) === 'boolean'"
                    v-model="cond.value"
                    class="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-code-sm text-on-surface outline-none focus:border-primary transition-colors"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                  <input
                    v-else
                    v-model="cond.value"
                    type="text"
                    :placeholder="valuePlaceholder(cond.op, cond.field)"
                    class="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-code-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
                <div v-else class="flex-1 min-w-0">
                  <span class="text-code-sm text-on-surface-variant/30 italic"
                    >select a field first</span
                  >
                </div>

                <button
                  class="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors shrink-0"
                  title="Remove"
                  @click="removeCondition(idx)"
                >
                  <span class="material-symbols-outlined text-[16px]"
                    >remove</span
                  >
                </button>
              </div>

              <button
                class="flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors mt-1 ml-15"
                @click="addCondition"
              >
                <span class="material-symbols-outlined text-[16px]">add</span>
                Add condition
              </button>
            </div>

            <!-- Preview + Actions -->
            <div
              class="border-t border-outline-variant px-5 py-3 flex items-start gap-4 shrink-0 bg-surface-container/50"
            >
              <div class="flex-1 min-w-0">
                <p
                  class="text-label-caps text-on-surface-variant uppercase tracking-widest mb-1.5"
                >
                  Generated filter
                </p>
                <pre
                  class="font-mono text-code-sm bg-surface-container rounded-lg border border-outline-variant px-4 py-3 text-on-surface overflow-x-auto whitespace-pre max-h-32"
                  >{{ previewFilter }}</pre
                >
              </div>

              <div class="flex flex-col gap-2 shrink-0 pt-5">
                <button
                  class="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-body-sm font-semibold hover:opacity-90 transition-opacity"
                  @click="onApply"
                >
                  <span class="material-symbols-outlined text-[15px]"
                    >play_arrow</span
                  >
                  Apply
                </button>
                <button
                  class="text-body-sm text-on-surface-variant px-4 py-2 rounded-lg border border-outline-variant hover:border-primary hover:text-on-surface transition-colors"
                  @click="onClear"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { FieldInfo } from "./ui/FilterInput.vue";
import FieldCombobox from "./FieldCombobox.vue";

const props = defineProps<{
  open: boolean;
  fields: FieldInfo[];
  filterString?: string;
}>();

const emit = defineEmits<{
  close: [];
  apply: [filter: string];
}>();

type Condition = {
  id: number;
  field: string;
  op: string;
  value: string;
};

let idCounter = 0;

const logic = ref<"AND" | "OR">("AND");
const conditions = ref<Condition[]>([newCondition()]);

function newCondition(): Condition {
  return { id: idCounter++, field: "", op: "$eq", value: "" };
}

const ALL_OPS: { value: string; label: string }[] = [
  { value: "$eq", label: "= equals" },
  { value: "$ne", label: "≠ not equals" },
  { value: "$gt", label: "> greater than" },
  { value: "$gte", label: "≥ greater or equal" },
  { value: "$lt", label: "< less than" },
  { value: "$lte", label: "≤ less or equal" },
  { value: "$regex", label: "~ matches regex" },
  { value: "$in", label: "∈ in list" },
  { value: "$nin", label: "∉ not in list" },
  { value: "$exists", label: "∃ exists" },
];

const OPS_FOR_TYPE: Record<string, string[]> = {
  string: ["$eq", "$ne", "$regex", "$in", "$nin", "$exists"],
  number: [
    "$eq",
    "$ne",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$in",
    "$nin",
    "$exists",
  ],
  int: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists"],
  double: [
    "$eq",
    "$ne",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$in",
    "$nin",
    "$exists",
  ],
  boolean: ["$eq", "$ne", "$exists"],
  ObjectId: ["$eq", "$ne", "$in", "$nin", "$exists"],
  date: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$exists"],
  array: ["$in", "$nin", "$exists"],
  object: ["$exists"],
  null: ["$eq", "$exists"],
};

const fieldType = (fieldName: string): string =>
  props.fields.find((f) => f.name === fieldName)?.type ?? "string";

const opsForField = (fieldName: string) => {
  const type = fieldType(fieldName);
  const allowed = OPS_FOR_TYPE[type] ?? ALL_OPS.map((o) => o.value);
  return ALL_OPS.filter((o) => allowed.includes(o.value));
};

const valuePlaceholder = (op: string, fieldName: string): string => {
  const type = fieldType(fieldName);
  if (op === "$in" || op === "$nin") return "val1, val2, val3";
  if (op === "$regex") return "^pattern.*";
  if (type === "ObjectId") return "64a1b2c3d4e5f6a7b8c9d0e1";
  if (type === "date") return "2024-01-01T00:00:00Z";
  if (type === "int" || type === "double" || type === "number") return "42";
  return "value";
};

function onFieldChange(cond: Condition, newField: string) {
  cond.field = newField;
  const ops = opsForField(newField);
  if (!ops.find((o) => o.value === cond.op)) {
    cond.op = ops[0]?.value ?? "$eq";
  }
  cond.value = "";
}

function onOpChange(cond: Condition) {
  if (cond.op === "$exists") cond.value = "true";
  else if (fieldType(cond.field) === "boolean") cond.value = "true";
  else cond.value = "";
}

const addCondition = () => conditions.value.push(newCondition());

const removeCondition = (idx: number) => {
  if (conditions.value.length === 1) {
    conditions.value[0] = newCondition();
  } else {
    conditions.value.splice(idx, 1);
  }
};

const clearConditions = () => {
  conditions.value = [newCondition()];
  logic.value = "AND";
};

watch(
  () => props.filterString,
  (val) => {
    if (!val || val.trim() === "{}") clearConditions();
  },
);

function parseValue(raw: string): unknown {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  const n = Number(v);
  if (v !== "" && !isNaN(n)) return n;
  return v;
}

function parseValueForField(raw: string, fieldName: string): unknown {
  const v = raw.trim();
  if (fieldType(fieldName) === "ObjectId" && /^[0-9a-f]{24}$/i.test(v)) {
    return { $oid: v };
  }
  return parseValue(raw);
}

function buildConditionFilter(cond: Condition): Record<string, unknown> | null {
  if (!cond.field) return null;

  if (cond.op === "$exists") {
    return { [cond.field]: { $exists: cond.value !== "false" } };
  }

  if (cond.op === "$in" || cond.op === "$nin") {
    const arr = cond.value
      .split(",")
      .map((v) => parseValueForField(v.trim(), cond.field))
      .filter((v) => v !== "");
    if (arr.length === 0) return null;
    return { [cond.field]: { [cond.op]: arr } };
  }

  if (cond.op === "$regex") {
    if (!cond.value.trim()) return null;
    return { [cond.field]: { $regex: cond.value } };
  }

  const val = parseValueForField(cond.value, cond.field);
  if (val === "") return null;
  return { [cond.field]: { [cond.op]: val } };
}

const builtFilters = computed(
  () =>
    conditions.value.map(buildConditionFilter).filter(Boolean) as Record<
      string,
      unknown
    >[],
);

const generatedFilter = computed((): Record<string, unknown> => {
  const filters = builtFilters.value;
  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return logic.value === "AND" ? { $and: filters } : { $or: filters };
});

const previewFilter = computed(() =>
  JSON.stringify(generatedFilter.value, null, 2),
);

const onApply = () => {
  emit("apply", JSON.stringify(generatedFilter.value, null, 2));
  emit("close");
};

const onClear = () => {
  clearConditions();
  emit("apply", "{}");
  emit("close");
};
</script>

<style scoped>
.qb-drop-enter-active {
  transition:
    transform 0.2s ease,
    opacity 0.15s ease;
}
.qb-drop-leave-active {
  transition:
    transform 0.18s ease,
    opacity 0.15s ease;
}
.qb-drop-enter-from,
.qb-drop-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
