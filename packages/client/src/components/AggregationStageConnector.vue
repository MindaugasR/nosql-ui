<template>
  <div class="flex flex-col items-center py-0.5 shrink-0 transition-all duration-150">
    <div
      class="w-0.5 h-8 bg-linear-to-b transition-all duration-150"
      :class="highlight ? 'from-primary to-primary opacity-100 scale-y-110' : 'from-primary to-secondary opacity-60'"
    />
    <div
      class="transition-all duration-150"
      :class="highlight
        ? 'border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary'
        : 'border-l-4 border-r-4 border-t-[5px] border-l-transparent border-r-transparent border-t-secondary/60'"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  highlight?: boolean
}>()
</script>
