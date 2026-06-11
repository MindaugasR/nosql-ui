<template>
  <input
    v-bind="$attrs"
    :value="model"
    :type="type ?? 'text'"
    :step="step"
    :placeholder="placeholder"
    class="bg-surface-container border border-outline-variant rounded px-1.5 py-0.5 text-[11px] font-mono text-on-surface outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    @input="
      $emit('update:modelValue', ($event.target as HTMLInputElement).value)
    "
  />
</template>
<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const model = defineModel<string | number>();

defineProps<{
  type?: string;
  step?: string | number;
  placeholder?: string;
}>();
</script>
