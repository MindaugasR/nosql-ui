<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "outline" | "ghost" | "danger" | "error" | "icon";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { variant: "ghost" },
);

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary rounded text-body-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
  outline:
    "border border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors rounded-lg text-body-sm font-semibold flex items-center gap-1.5 px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "text-on-surface-variant hover:text-on-surface transition-colors text-body-sm px-4 py-1.5",
  danger:
    "text-error hover:bg-error-container/20 transition-colors rounded text-body-sm flex items-center gap-1.5 px-3 py-1.5",
  error:
    "bg-error text-on-error rounded text-body-sm font-medium hover:opacity-90 transition-opacity px-3 py-1.5",
  icon: "flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors",
};

const cls = computed(() => VARIANT_CLASSES[props.variant]);
</script>

<template>
  <button v-bind="$attrs" :disabled="disabled || loading" :class="cls">
    <span
      v-if="loading"
      class="material-symbols-outlined text-[14px] animate-spin"
      >sync</span
    >
    <slot />
  </button>
</template>
