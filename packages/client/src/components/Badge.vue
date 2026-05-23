<template>
  <span
    class="inline-flex items-center font-mono text-[11px] font-medium px-1.5 py-0.5 rounded border"
    :class="variantClasses"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "primary" | "secondary" | "success" | "warning" | "error";
  }>(),
  { variant: "default" },
);

const variantClasses = computed(() => ({
  default:   "bg-surface-container-high text-on-surface-variant border-outline-variant/50",
  primary:   "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/10 text-secondary border-secondary/20",
  success:   "bg-green-500/10 text-green-400 border-green-500/20",
  warning:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error:     "bg-error/10 text-error border-error/20",
}[props.variant]));
</script>
