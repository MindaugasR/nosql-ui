<script setup lang="ts">
import { ref, nextTick } from "vue";
import type { DocEntry } from "@/lib/mongo-docs";

const props = defineProps<{
  entry: DocEntry;
}>();

const open = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});

async function toggle() {
  if (open.value) {
    open.value = false;
    return;
  }
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const width = 300;
  const style: Record<string, string> = {
    position: "fixed",
    width: `${width}px`,
    zIndex: "10000",
    top: `${rect.bottom + 6}px`,
  };
  // Keep the popover within the viewport horizontally.
  const left = rect.left + rect.width / 2 - width / 2;
  style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
  popoverStyle.value = style;
  open.value = true;
  await nextTick();
}
</script>

<template>
  <span class="inline-flex">
    <button
      ref="triggerRef"
      type="button"
      class="material-symbols-outlined text-base! leading-none transition-colors"
      :class="
        open
          ? 'text-primary'
          : 'text-on-surface-variant/50 hover:text-on-surface-variant'
      "
      :title="entry.title"
      @click.stop="toggle"
    >
      info
    </button>

    <Teleport to="body">
      <template v-if="open">
        <div
          class="fixed inset-0"
          style="z-index: 9999"
          @click.stop="open = false"
        />
        <div
          class="bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl p-3.5 flex flex-col gap-2"
          :style="popoverStyle"
          @click.stop
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-body-sm font-semibold text-on-surface">{{
              entry.title
            }}</span>
            <button
              class="material-symbols-outlined text-[15px] text-on-surface-variant/50 hover:text-on-surface transition-colors -mt-0.5"
              @click.stop="open = false"
            >
              close
            </button>
          </div>
          <p class="text-[12px] leading-relaxed text-on-surface-variant">
            {{ entry.summary }}
          </p>
          <a
            :href="entry.docsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[12px] text-primary hover:underline mt-0.5"
            @click.stop
          >
            Learn more
            <span class="material-symbols-outlined text-[13px]"
              >open_in_new</span
            >
          </a>
        </div>
      </template>
    </Teleport>
  </span>
</template>
