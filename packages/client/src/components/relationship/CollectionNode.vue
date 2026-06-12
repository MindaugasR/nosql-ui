<template>
  <div
    class="w-70 bg-surface-container-low border rounded-xl shadow-xl overflow-hidden transition-shadow"
    :class="selected ? 'border-primary shadow-primary/20' : 'border-outline-variant'"
  >
    <!-- Header fallback target handle (only used when _id wasn't sampled) -->
    <Handle
      id="self"
      type="target"
      :position="Position.Left"
      class="rel-handle rel-handle--target"
      :style="{ opacity: hasIdField ? 0 : 1 }"
    />

    <!-- Header -->
    <div
      class="flex items-center justify-between px-3.5 py-2.5 bg-surface-container-high border-b border-outline-variant"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="material-symbols-outlined text-primary text-[16px]">table_chart</span>
        <span class="text-body-sm font-semibold text-primary truncate">{{ data.collection.name }}</span>
      </div>
      <span
        v-if="data.collection.count != null"
        class="text-[10px] text-on-surface-variant/60 font-mono shrink-0"
        >{{ formatCount(data.collection.count) }}</span
      >
    </div>

    <!-- Fields -->
    <div class="py-1">
      <div
        v-for="field in visibleFields"
        :key="field.name"
        class="relative flex items-center justify-between gap-3 px-3.5 py-1 group"
      >
        <div class="flex items-center gap-1.5 min-w-0">
          <span
            class="font-mono text-[11px] truncate"
            :class="
              field.name === '_id'
                ? 'text-on-surface-variant/50'
                : fkTargets[field.name]
                  ? 'text-amber-300'
                  : 'text-on-surface'
            "
            >{{ field.name }}</span
          >
          <span
            v-if="fkTargets[field.name]"
            class="text-[8px] px-1 py-px bg-amber-400/15 text-amber-300 rounded font-bold tracking-wider shrink-0"
            :title="`references ${fkTargets[field.name]}`"
            >FK</span
          >
        </div>
        <span class="font-mono text-[10px] text-on-surface-variant/60 shrink-0">{{
          field.type
        }}</span>

        <!-- Source handle on FK rows: edges leave from the exact field -->
        <Handle
          v-if="fkTargets[field.name]"
          :id="field.name"
          type="source"
          :position="Position.Right"
          class="rel-handle rel-handle--source"
        />

        <!-- Target handle on the _id row: incoming references land here -->
        <Handle
          v-if="field.name === '_id'"
          id="_id"
          type="target"
          :position="Position.Left"
          class="rel-handle rel-handle--target-row"
        />
      </div>

      <p
        v-if="hiddenCount > 0"
        class="px-3.5 py-1 text-[10px] text-on-surface-variant/40 italic"
      >
        +{{ hiddenCount }} more field{{ hiddenCount === 1 ? "" : "s" }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { SchemaCollection } from "@/lib/api";

const props = defineProps<{
  selected?: boolean;
  data: {
    collection: SchemaCollection;
    // field name → target collection
    fkTargets: Record<string, string>;
  };
}>();

const fkTargets = computed(() => props.data.fkTargets);

const MAX_FIELDS = 12;

// _id pinned on top (incoming edges land on it), then FK fields, then the rest
const visibleFields = computed(() => {
  const fields = [...props.data.collection.fields];
  fields.sort((a, b) => {
    const rank = (f: typeof a) =>
      f.name === "_id" ? 0 : fkTargets.value[f.name] ? 1 : 2;
    return rank(a) - rank(b) || b.presence - a.presence;
  });
  return fields.slice(0, MAX_FIELDS);
});

const hasIdField = computed(() =>
  props.data.collection.fields.some((f) => f.name === "_id"),
);

const hiddenCount = computed(() =>
  Math.max(props.data.collection.fields.length - MAX_FIELDS, 0),
);

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M docs`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k docs`;
  return `${n} docs`;
};
</script>

<style scoped>
.rel-handle {
  width: 8px;
  height: 8px;
  border: 2px solid #0b1326;
  background: #c0c1ff;
}
.rel-handle--target {
  top: 21px;
  left: -5px;
}
.rel-handle--target-row {
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
}
.rel-handle--source {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  background: #fbbf24;
}
</style>
