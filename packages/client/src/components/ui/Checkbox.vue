<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();

const model = defineModel<boolean>();
</script>

<template>
  <label
    class="inline-flex items-center gap-2 text-body-sm text-on-surface select-none"
    :class="disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'"
  >
    <input
      v-model="model"
      type="checkbox"
      class="sr-only peer"
      :disabled="disabled"
    />
    <span
      class="w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors border-outline-variant bg-surface-container peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40"
    >
      <span
        v-show="model"
        class="material-symbols-outlined text-[14px] leading-none text-on-primary font-bold"
        >check</span
      >
    </span>
    <slot />
  </label>
</template>
