<template>
  <!-- Toolbar -->
  <div
    class="shrink-0 border-b border-outline-variant/50 bg-background px-5 py-2 flex items-center gap-3"
  >
    <!-- Collection info -->
    <div class="flex items-center gap-2 shrink-0">
      <span class="material-symbols-outlined text-[15px] text-primary">
        data_object
      </span>
      <span class="font-mono text-code-sm font-semibold text-on-surface">
        {{ collection?.name }}
      </span>
      <Badge v-if="collection?.docCount != null" variant="secondary">
        {{ collection.docCount.toLocaleString() }}
      </Badge>
    </div>

    <div class="h-4 w-px bg-outline-variant/50 shrink-0" />

    <!-- Aggregation label -->
    <span
      class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest"
    >
      Pipeline
    </span>
    <Badge v-if="aggStore.stages.length > 0" variant="default">
      {{ aggStore.stages.length }}
    </Badge>

    <div class="flex-1" />

    <!-- Navigate to Browse -->
    <router-link
      :to="`/collections/${collection?.name}`"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-outline-variant text-body-sm font-semibold text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors"
    >
      <span class="material-symbols-outlined text-[15px]">table_rows</span>
      Documents
    </router-link>

    <!-- Export JSON button -->
    <Button
      variant="outline"
      title="Copy pipeline JSON to clipboard"
      @click="onExportPipeline"
    >
      <span class="material-symbols-outlined text-[15px]">content_copy</span>
      Export JSON
    </Button>

    <!-- Run Pipeline button -->
    <Button
      variant="primary"
      class="rounded-lg"
      :disabled="aggStore.isRunning || aggStore.stages.length === 0"
      @click="aggStore.runPipeline()"
    >
      <span
        class="material-symbols-outlined text-[15px]"
        :class="aggStore.isRunning ? 'animate-spin' : ''"
      >
        {{ aggStore.isRunning ? "progress_activity" : "play_arrow" }}
      </span>
      {{ aggStore.isRunning ? "Running…" : "Run Pipeline" }}
    </Button>
  </div>

  <!-- Body: canvas + live query sidebar -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Pipeline canvas + pinned results -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Scrollable stages area -->
      <div
        ref="stagesScrollArea"
        class="flex-1 overflow-y-auto min-h-0 bg-background"
        style="
          background-image: radial-gradient(
            circle,
            rgba(var(--color-outline-variant), 0.3) 1px,
            transparent 1px
          );
          background-size: 24px 24px;
        "
      >
        <div class="max-w-3xl mx-auto px-6 py-8">
          <!-- Input Source card -->
          <div
            class="bg-surface-container rounded-xl border border-outline-variant/50 border-dashed p-4 flex items-center gap-3"
          >
            <span
              class="material-symbols-outlined text-[20px] text-on-surface-variant/60"
              >storage</span
            >
            <div class="flex-1 min-w-0">
              <p
                class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5"
              >
                Input Source
              </p>
              <p class="font-mono text-code-sm text-on-surface truncate">
                {{ collection?.name ?? "—" }}
              </p>
            </div>
            <span class="text-[11px] text-on-surface-variant/50 font-mono">
              {{
                collection?.docCount != null
                  ? collection.docCount.toLocaleString() + " docs"
                  : ""
              }}
            </span>
          </div>

          <!-- Stages -->
          <TransitionGroup name="stage-move" tag="div">
            <div
              v-for="stage in visualStages"
              :key="stage.id"
              :data-stage-id="stage.id"
              class="transition-opacity duration-150"
              :class="isDraggingStage(stage) ? 'opacity-25' : ''"
              @pointerdown="onWrapperPointerDown($event, storeIdx(stage))"
            >
              <AggregationStageConnector
                :highlight="dragOverIdx === storeIdx(stage) && !isDraggingStage(stage)"
              />
              <AggregationStageCard
                :stage="stage"
                :fields="fieldNames"
                :collections="collectionNames"
                :index="storeIdx(stage)"
                :total="aggStore.stages.length"
                @remove="aggStore.removeStage(stage.id)"
                @move-up="aggStore.moveStage(stage.id, 'up')"
                @move-down="aggStore.moveStage(stage.id, 'down')"
                @toggle="aggStore.toggleStage(stage.id)"
                @update:config="aggStore.updateStageConfig(stage.id, $event)"
                @update:label="aggStore.updateStageLabel(stage.id, $event)"
              />
            </div>
          </TransitionGroup>

          <!-- Add Stage button -->
          <AggregationStageConnector v-if="aggStore.stages.length > 0" />
          <div class="flex justify-center mt-4 pb-6">
            <button
              class="group flex flex-col items-center gap-2"
              @click="showPicker = true"
            >
              <div
                class="w-12 h-12 rounded-full bg-surface-container border-2 border-dashed border-outline-variant flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary group-hover:scale-110 transition-all duration-300"
              >
                <span
                  class="material-symbols-outlined text-on-surface-variant group-hover:text-primary"
                >
                  add
                </span>
              </div>
              <span
                class="text-[10px] font-bold text-on-surface-variant group-hover:text-primary tracking-widest uppercase"
              >
                Add Pipeline Stage
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Results panel — pinned to bottom, shown after first run -->
      <Transition name="results-panel">
        <div
          v-if="hasRun || aggStore.error"
          class="shrink-0 flex flex-col border-t border-outline-variant/50 bg-surface-container-low/60 overflow-hidden transition-[height] duration-200 ease-in-out"
          :style="{ height: resultsCollapsed ? '37px' : '256px' }"
        >
          <!-- Panel header -->
          <div
            class="px-4 py-2 border-b border-outline-variant/40 flex items-center gap-2 shrink-0"
          >
            <span class="material-symbols-outlined text-[15px] text-secondary">
              table_chart
            </span>
            <span
              class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Results
            </span>
            <Badge v-if="aggStore.results.length > 0" variant="secondary">
              {{ aggStore.results.length }}
            </Badge>
            <span
              v-if="aggStore.results.length > 0"
              class="text-[11px] text-on-surface-variant/40"
            >
              showing up to 50
            </span>
            <div class="flex-1" />
            <span
              v-if="aggStore.isRunning"
              class="material-symbols-outlined text-[15px] text-primary animate-spin"
              >progress_activity</span
            >
            <button
              class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-variant transition-colors hover:cursor-pointer"
              :title="resultsCollapsed ? 'Expand results' : 'Collapse results'"
              @click="resultsCollapsed = !resultsCollapsed"
            >
              <span
                class="material-symbols-outlined text-[16px] transition-transform duration-200"
                :class="resultsCollapsed ? 'rotate-180' : ''"
              >
                expand_more
              </span>
            </button>
          </div>

          <!-- Error state -->
          <div
            v-if="aggStore.error"
            class="flex-1 flex items-start p-4 overflow-y-auto"
          >
            <div
              class="bg-error/10 border border-error/30 rounded-xl px-4 py-3 flex items-start gap-2 w-full"
            >
              <span
                class="material-symbols-outlined text-error text-[16px] shrink-0 mt-0.5"
              >
                error
              </span>
              <div>
                <p class="text-[12px] font-semibold text-error">
                  Pipeline error
                </p>
                <p class="text-[11px] text-error/80 font-mono mt-0.5">
                  {{ aggStore.error }}
                </p>
              </div>
            </div>
          </div>

          <!-- Documents table — reuses browse view table + DocSideEditor preview -->
          <DocumentsTable
            v-else
            :documents="displayedResults"
            :collection="collection"
            :loading="aggStore.isRunning"
            :total="0"
            :aggrgation="true"
          />
        </div>
      </Transition>
    </div>

    <!-- Live Query sidebar -->
    <div
      class="w-72 xl:w-80 shrink-0 flex flex-col border-l border-outline-variant/50 bg-surface-container-low/40 overflow-hidden"
    >
      <!-- Header -->
      <div
        class="px-4 py-2.5 border-b border-outline-variant/50 flex items-center gap-2 shrink-0"
      >
        <span class="material-symbols-outlined text-[15px] text-secondary"
          >data_object</span
        >
        <span
          class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex-1"
          >Live Query</span
        >
        <span
          v-if="aggStore.stages.length > 0"
          class="text-[10px] font-mono text-on-surface-variant/40"
          >{{ enabledStageCount }} stage{{
            enabledStageCount !== 1 ? "s" : ""
          }}</span
        >
        <button
          class="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-variant transition-colors"
          title="Copy pipeline JSON"
          @click="onExportPipeline"
        >
          <span class="material-symbols-outlined text-[14px]"
            >content_copy</span
          >
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="aggStore.stages.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant/30 px-4 text-center"
      >
        <span class="material-symbols-outlined text-[36px]">code_blocks</span>
        <p class="text-[11px] leading-relaxed">
          Add a stage to preview the pipeline query
        </p>
      </div>

      <!-- JSON preview -->
      <div v-else class="flex-1 overflow-y-auto p-3">
        <pre
          class="font-mono text-[11px] leading-relaxed whitespace-pre select-all"
          v-html="highlightedPipeline"
        />
      </div>
    </div>
  </div>

  <!-- Stage Picker overlay -->
  <AggregationStagePicker
    :open="showPicker"
    @close="showPicker = false"
    @add="onAddStage"
  />

  <!-- Copied toast -->
  <Transition name="toast">
    <div
      v-if="showCopied"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-2xl z-50"
    >
      <span class="material-symbols-outlined text-secondary text-[16px]"
        >check_circle</span
      >
      <span class="text-body-sm text-on-surface"
        >Pipeline JSON copied to clipboard</span
      >
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  useAggregationStore,
  type StageType,
  type Stage,
} from "@/stores/useAggregationStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import AggregationStageCard from "@/components/AggregationStageCard.vue";
import AggregationStageConnector from "@/components/AggregationStageConnector.vue";
import AggregationStagePicker from "@/components/AggregationStagePicker.vue";
import DocumentsTable from "@/components/DocumentsTable.vue";

const route = useRoute();
const aggStore = useAggregationStore();
const collectionStore = useCollectionStore();
const documentStore = useDocumentStore();

const showPicker = ref(false);
const showCopied = ref(false);
const hasRun = ref(false);
const resultsCollapsed = ref(false);

// Drag and drop state
const stagesScrollArea = ref<HTMLElement | null>(null);
const dragFromIdx = ref<number | null>(null);
const dragOverIdx = ref<number | null>(null);
let dragOverCooldown = false;

// Visual (preview) order while dragging — other stages shift live
const visualStages = computed<Stage[]>(() => {
  const stages = aggStore.stages;
  const from = dragFromIdx.value;
  const to = dragOverIdx.value;
  if (from === null || to === null || from === to) return stages;
  const result = [...stages];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
});

function storeIdx(stage: Stage): number {
  return aggStore.stages.findIndex((s) => s.id === stage.id);
}

function isDraggingStage(stage: Stage): boolean {
  return dragFromIdx.value !== null && storeIdx(stage) === dragFromIdx.value;
}

function onWrapperPointerDown(e: PointerEvent, idx: number) {
  if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return;
  e.preventDefault();
  dragFromIdx.value = idx;
  dragOverIdx.value = null;
  dragOverCooldown = false;
  document.body.style.setProperty('cursor', 'grabbing', 'important');
  document.body.style.userSelect = 'none';
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
  window.addEventListener('pointercancel', onPointerUp, { once: true });
}

function autoScroll(clientY: number) {
  const container = stagesScrollArea.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const zone = 80;
  const speed = 8;
  if (clientY < rect.top + zone) {
    container.scrollTop -= speed * (1 - (clientY - rect.top) / zone);
  } else if (clientY > rect.bottom - zone) {
    container.scrollTop += speed * (1 - (rect.bottom - clientY) / zone);
  }
}

function onPointerMove(e: PointerEvent) {
  if (dragFromIdx.value === null || !stagesScrollArea.value) return;
  autoScroll(e.clientY);
  if (dragOverCooldown) return;

  const stageDivs = [
    ...stagesScrollArea.value.querySelectorAll<HTMLElement>('[data-stage-id]'),
  ];
  const fromIdx = dragFromIdx.value;

  for (const div of stageDivs) {
    const k = aggStore.stages.findIndex((s) => s.id === div.dataset.stageId);
    if (k === fromIdx) continue;

    const { top, bottom, height } = div.getBoundingClientRect();
    if (e.clientY < top || e.clientY > bottom) continue;

    const inUpperHalf = e.clientY < top + height / 2;
    const newTarget = inUpperHalf
      ? (k < fromIdx ? k : k - 1)
      : (k < fromIdx ? k + 1 : k);

    if (newTarget !== dragOverIdx.value) {
      dragOverIdx.value = newTarget;
      dragOverCooldown = true;
      setTimeout(() => { dragOverCooldown = false; }, 200);
    }
    return;
  }
}

function onPointerUp() {
  if (
    dragFromIdx.value !== null &&
    dragOverIdx.value !== null &&
    dragFromIdx.value !== dragOverIdx.value
  ) {
    aggStore.reorderStages(dragFromIdx.value, dragOverIdx.value);
  }
  dragFromIdx.value = null;
  dragOverIdx.value = null;
  document.body.style.removeProperty('cursor');
  document.body.style.removeProperty('user-select');
  window.removeEventListener('pointermove', onPointerMove);
}

const collectionName = computed(() => route.params.name as string);
const collection = computed(() => collectionStore.collection());
const collectionNames = computed<string[]>(() =>
  collectionStore.collections().map((c) => c.name),
);

// Field names from document store field types
const fieldNames = computed<string[]>(() =>
  Object.keys(documentStore.fieldTypes()),
);

// Live query preview
const enabledStageCount = computed(
  () => aggStore.stages.filter((s) => s.enabled).length,
);

const highlightedPipeline = computed(() => {
  const pipeline = aggStore.buildPipeline();
  const json = JSON.stringify(pipeline, null, 2);
  return highlightJson(json);
});

function highlightJson(json: string): string {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // JSON key — stage operator ($match, $group…) gets accent color
          const key = match.slice(1, -2);
          const color = key.startsWith("$") ? "#c4b5fd" : "#93c5fd";
          return `<span style="color:${color}">${match}</span>`;
        }
        return `<span style="color:#86efac">${match}</span>`;
      }
      if (/true|false/.test(match))
        return `<span style="color:#fde68a">${match}</span>`;
      if (/null/.test(match))
        return `<span style="color:rgba(255,255,255,0.25)">${match}</span>`;
      return `<span style="color:#7dd3fc">${match}</span>`;
    },
  );
}

// Results display
const displayedResults = computed(() => aggStore.results.slice(0, 50));

function onAddStage(type: StageType) {
  aggStore.addStage(type);
}

const onExportPipeline = async () => {
  const pipeline = aggStore.buildPipeline();
  const json = JSON.stringify(pipeline, null, 2);

  try {
    await navigator.clipboard.writeText(json);
    showCopied.value = true;
    setTimeout(() => {
      showCopied.value = false;
    }, 2500);
  } catch {
    // fallback: do nothing
  }
};

// Track if pipeline has been run at least once
watch(
  () => aggStore.results,
  () => {
    hasRun.value = true;
  },
);
watch(
  () => aggStore.error,
  (err) => {
    if (err) hasRun.value = true;
  },
);

onMounted(() => {
  collectionStore.selectCollection(collectionName.value);
});

watch(collectionName, (name) => {
  collectionStore.selectCollection(name);
});
</script>

<style scoped>
.toast-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.results-panel-enter-active {
  transition:
    height 0.25s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.2s ease;
}
.results-panel-leave-active {
  transition:
    height 0.2s ease,
    opacity 0.15s ease;
}
.results-panel-enter-from,
.results-panel-leave-to {
  height: 0 !important;
  opacity: 0;
}

/* Stage drag-and-drop FLIP animation */
.stage-move-move {
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
</style>
