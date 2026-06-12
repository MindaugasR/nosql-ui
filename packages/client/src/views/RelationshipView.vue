<template>
  <!-- AppLayout's <main> is a flex row — flex-1 makes the page span the full width -->
  <div class="flex-1 min-w-0 flex flex-col h-full min-h-0">
    <!-- Toolbar -->
    <div
      class="flex items-center gap-3 px-5 py-3 border-b border-outline-variant bg-surface-container-high shrink-0 flex-wrap"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-[20px]">account_tree</span>
        <span class="text-body-md font-semibold text-on-surface">Relationships</span>
      </div>

      <div class="flex items-center gap-2 ml-4">
        <span class="text-[11px] text-on-surface-variant uppercase tracking-wider">Database</span>
        <div class="w-44">
          <SelectBox
            v-model="selectedDbName"
            :options="dbOptions"
            searchable
            placeholder="Select database…"
          />
        </div>
      </div>

      <!-- Collections picker -->
      <div class="relative">
        <Button variant="outline" @click="pickerOpen = !pickerOpen">
          <span class="material-symbols-outlined text-[16px]">checklist</span>
          Collections
          <span class="text-[10px] text-on-surface-variant font-mono"
            >{{ selectedCollections.size }}/{{ allCollections.length }}</span
          >
        </Button>

        <Teleport to="body">
          <template v-if="pickerOpen">
            <div class="fixed inset-0 z-40" @click="pickerOpen = false" />
            <div
              class="fixed z-50 w-64 bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl flex flex-col max-h-96"
              :style="pickerStyle"
            >
              <div
                class="flex items-center justify-between px-3 py-2 border-b border-outline-variant/50 shrink-0"
              >
                <button
                  class="text-[11px] text-primary hover:underline cursor-pointer"
                  @click="selectAll"
                >
                  Select all
                </button>
                <button
                  class="text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  @click="selectedCollections = new Set()"
                >
                  Clear
                </button>
              </div>
              <div class="overflow-y-auto py-1">
                <div
                  v-for="name in allCollections"
                  :key="name"
                  class="px-3 py-1 hover:bg-on-surface/5"
                >
                  <Checkbox
                    :model-value="selectedCollections.has(name)"
                    @update:model-value="toggleCollection(name, $event)"
                  >
                    <span class="font-mono text-[12px]">{{ name }}</span>
                  </Checkbox>
                </div>
              </div>
            </div>
          </template>
        </Teleport>
      </div>

      <!-- View tabs -->
      <div
        class="flex items-center gap-0.5 bg-surface-container rounded-lg p-0.5 border border-outline-variant ml-2"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          :class="
            viewTab === tab.id
              ? 'bg-primary/15 text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          @click="viewTab = tab.id"
        >
          <span class="material-symbols-outlined text-[14px]">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          :disabled="loading || selectedCollections.size === 0"
          title="Probe sampled ObjectId values against every selected collection to find references name heuristics miss"
          @click="mapSchema(true)"
        >
          <span class="material-symbols-outlined text-[16px]">network_intelligence</span>
          Auto-Detect
        </Button>
        <Button
          variant="primary"
          :disabled="loading || selectedCollections.size === 0"
          :loading="loading"
          @click="mapSchema(false)"
        >
          <span v-if="!loading" class="material-symbols-outlined text-[16px]">schema</span>
          Map Schema
        </Button>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="flex items-center gap-2 text-error bg-error/8 border border-error/20 rounded-lg px-3 py-2 mx-5 mt-3"
    >
      <span class="material-symbols-outlined text-[16px]">error</span>
      <span class="text-body-sm">{{ error }}</span>
    </div>

    <!-- Graph view -->
    <div v-show="viewTab === 'graph'" class="flex-1 min-h-0 relative">
      <VueFlow
        v-if="nodes.length > 0"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :min-zoom="0.15"
        :max-zoom="2.5"
        fit-view-on-init
        class="rel-flow"
        @edge-click="onEdgeClick"
        @pane-click="closePanels"
      >
        <Background pattern-color="#2d3449" :gap="22" :size="1.6" />
      </VueFlow>

      <!-- Relationship details panel -->
      <Transition name="rel-panel">
        <div
          v-if="selectedRel"
          class="absolute top-4 right-4 w-88 bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100%-2rem)]"
        >
          <div
            class="flex items-center justify-between px-4 py-2.5 bg-surface-container-high border-b border-outline-variant shrink-0"
          >
            <div class="flex items-center gap-2">
              <Button
                v-if="cameFromIncoming"
                variant="icon"
                class="w-6 h-6 -ml-1"
                title="Back to incoming list"
                @click="selectedRel = null"
              >
                <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              </Button>
              <span class="material-symbols-outlined text-primary text-[16px]">link</span>
              <span class="text-body-sm font-semibold text-on-surface">Relationship</span>
            </div>
            <Button variant="icon" class="w-6 h-6" @click="closePanels">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </Button>
          </div>

          <div class="p-4 flex flex-col gap-3 overflow-y-auto">
            <!-- From → To -->
            <div class="flex flex-col gap-1">
              <p class="text-[9px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                From — referencing field
              </p>
              <div
                class="w-full px-3 py-2 bg-amber-400/10 rounded-lg border border-amber-400/20 font-mono text-[13px] break-all leading-snug"
              >
                <span class="text-amber-300/60">{{ selectedRel.sourceCollection }}.</span><span class="text-amber-300 font-semibold">{{ selectedRel.sourceField }}</span>
              </div>

              <div class="flex justify-center -my-0.5">
                <span class="material-symbols-outlined text-on-surface-variant/50 text-[16px]"
                  >south</span
                >
              </div>

              <p class="text-[9px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                To — referenced collection
              </p>
              <div
                class="w-full px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 font-mono text-[13px] break-all leading-snug"
              >
                <span class="text-primary font-semibold">{{ selectedRel.targetCollection }}</span><span class="text-primary/60">._id</span>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 font-medium">
                {{ selectedRel.cardinality }}
              </span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium"
                :class="
                  selectedRel.confidence === 'high'
                    ? 'bg-secondary/10 text-secondary border border-secondary/20'
                    : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                "
              >
                {{ selectedRel.confidence }} confidence
              </span>
              <span
                v-if="selectedRel.verified"
                class="text-[10px] px-1.5 py-0.5 bg-secondary/10 text-secondary rounded border border-secondary/20 font-medium flex items-center gap-0.5"
              >
                <span class="material-symbols-outlined text-[11px]">check</span>
                value-verified
              </span>
              <span
                v-else
                class="text-[10px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant rounded font-medium"
                >name-based guess</span
              >
            </div>

            <p class="text-[11px] text-on-surface-variant leading-relaxed">
              <template v-if="selectedRel.cardinality === 'N:M'">
                Each <span class="font-mono text-on-surface">{{ selectedRel.sourceCollection }}</span> document holds an
                <span class="font-mono text-on-surface">array</span> of ids referencing
                <span class="font-mono text-on-surface">{{ selectedRel.targetCollection }}</span> documents.
              </template>
              <template v-else>
                Each <span class="font-mono text-on-surface">{{ selectedRel.sourceCollection }}</span> document references one
                <span class="font-mono text-on-surface">{{ selectedRel.targetCollection }}</span> document — one
                <span class="font-mono text-on-surface">{{ selectedRel.targetCollection }}</span> can be referenced by many.
              </template>
            </p>

            <!-- $lookup snippet -->
            <div class="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
              <div class="flex items-center justify-between px-3 py-1.5 border-b border-outline-variant/50">
                <span class="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">$lookup</span>
                <Button variant="icon" class="w-6 h-6" :title="copied ? 'Copied!' : 'Copy'" @click="copyLookup">
                  <span class="material-symbols-outlined text-[14px]" :class="copied ? 'text-secondary' : ''">
                    {{ copied ? "check" : "content_copy" }}
                  </span>
                </Button>
              </div>
              <pre class="px-3 py-2 font-mono text-[10px] text-secondary whitespace-pre-wrap leading-relaxed">{{ lookupSnippet }}</pre>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Incoming references panel -->
      <Transition name="rel-panel">
        <div
          v-if="incomingFor && !selectedRel"
          class="absolute top-4 right-4 w-88 bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100%-2rem)]"
        >
          <div
            class="flex items-center justify-between px-4 py-2.5 bg-surface-container-high border-b border-outline-variant shrink-0"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-primary text-[16px]">south_west</span>
              <span class="text-body-sm font-semibold text-on-surface truncate">
                Incoming → <span class="font-mono text-primary">{{ incomingFor }}._id</span>
              </span>
            </div>
            <Button variant="icon" class="w-6 h-6" @click="closePanels">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </Button>
          </div>

          <div class="overflow-y-auto py-1">
            <button
              v-for="(rel, i) in incomingRels"
              :key="i"
              class="w-full flex items-center justify-between gap-2 px-4 py-2 hover:bg-on-surface/5 transition-colors cursor-pointer text-left border-b border-outline-variant/20"
              @click="openRelFromIncoming(rel)"
            >
              <span class="font-mono text-[12px] min-w-0 truncate">
                <span class="text-amber-300/60">{{ rel.sourceCollection }}.</span><span class="text-amber-300">{{ rel.sourceField }}</span>
              </span>
              <span class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] px-1.5 py-px bg-primary/10 text-primary rounded font-medium">{{ rel.cardinality }}</span>
                <span
                  v-if="rel.verified"
                  class="material-symbols-outlined text-[13px] text-secondary"
                  title="value-verified"
                  >check</span
                >
                <span class="material-symbols-outlined text-[14px] text-on-surface-variant/40">chevron_right</span>
              </span>
            </button>
          </div>
        </div>
      </Transition>

      <!-- Empty state -->
      <div
        v-if="nodes.length === 0 && !loading"
        class="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant/40 gap-2"
      >
        <span class="material-symbols-outlined text-[40px]">account_tree</span>
        <p class="text-body-sm">
          Pick a database and collections, then press
          <span class="text-on-surface-variant font-semibold">Map Schema</span>
        </p>
        <p class="text-[11px] opacity-70">
          Auto-Detect additionally probes sampled ids against every collection
        </p>
      </div>

      <!-- Canvas controls -->
      <div
        v-if="nodes.length > 0"
        class="absolute bottom-4 right-4 flex flex-col gap-1 bg-surface-container-high border border-outline-variant rounded-lg p-1 shadow-xl"
      >
        <Button variant="icon" class="w-8 h-8" title="Zoom in" @click="zoomIn()">
          <span class="material-symbols-outlined text-[18px]">add</span>
        </Button>
        <Button variant="icon" class="w-8 h-8" title="Zoom out" @click="zoomOut()">
          <span class="material-symbols-outlined text-[18px]">remove</span>
        </Button>
        <Button variant="icon" class="w-8 h-8" title="Fit view" @click="fitView({ padding: 0.2 })">
          <span class="material-symbols-outlined text-[18px]">fit_screen</span>
        </Button>
        <Button variant="icon" class="w-8 h-8" title="Re-layout" @click="applyLayout()">
          <span class="material-symbols-outlined text-[18px]">auto_fix</span>
        </Button>
      </div>

      <!-- Legend -->
      <div
        v-if="edges.length > 0"
        class="absolute bottom-4 left-4 bg-surface-container-high/90 border border-outline-variant rounded-lg px-3 py-2 text-[10px] text-on-surface-variant flex flex-col gap-1"
      >
        <span class="flex items-center gap-2">
          <span class="inline-block w-5 border-t-2 border-primary" /> verified reference
        </span>
        <span class="flex items-center gap-2">
          <span class="inline-block w-5 border-t-2 border-dashed border-on-surface-variant/50" />
          name-based guess
        </span>
      </div>
    </div>

    <!-- Schema map view -->
    <div v-show="viewTab === 'schema'" class="flex-1 min-h-0 overflow-y-auto px-5 py-4">
      <div
        v-if="schema"
        class="grid gap-4"
        style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))"
      >
        <div
          v-for="coll in schema.collections"
          :key="coll.name"
          class="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-4 py-2.5 bg-surface-container-high border-b border-outline-variant"
          >
            <span class="text-body-sm font-semibold text-primary font-mono">{{ coll.name }}</span>
            <span class="text-[10px] text-on-surface-variant/60">
              sampled {{ coll.sampled }}<template v-if="coll.count != null"> of {{ coll.count }}</template>
            </span>
          </div>
          <div class="py-1.5 max-h-80 overflow-y-auto">
            <div
              v-for="field in coll.allFields"
              :key="field.name"
              class="flex items-center justify-between gap-3 px-4 py-1"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <span
                  class="font-mono text-[11px] truncate"
                  :class="fkMap[coll.name]?.[field.name] ? 'text-amber-300' : 'text-on-surface'"
                  >{{ field.name }}</span
                >
                <span
                  v-if="fkMap[coll.name]?.[field.name]"
                  class="text-[8px] px-1 py-px bg-amber-400/15 text-amber-300 rounded font-bold shrink-0"
                  >→ {{ fkMap[coll.name][field.name] }}</span
                >
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <!-- presence bar -->
                <span class="w-10 h-1 rounded bg-outline-variant/40 overflow-hidden" :title="`${Math.round(field.presence * 100)}% of sampled docs`">
                  <span
                    class="block h-full bg-secondary/70"
                    :style="`width: ${Math.round(field.presence * 100)}%`"
                  />
                </span>
                <span class="font-mono text-[10px] text-on-surface-variant/60 w-20 text-right">{{
                  field.type
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else
        class="h-full flex flex-col items-center justify-center text-on-surface-variant/40 gap-2"
      >
        <span class="material-symbols-outlined text-[40px]">schema</span>
        <p class="text-body-sm">Run Map Schema to inspect sampled collection schemas</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, markRaw } from "vue";
import {
  VueFlow,
  useVueFlow,
  type Node,
  type Edge,
  type NodeTypesObject,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import dagre from "@dagrejs/dagre";
import { api } from "@/lib/api";
import type { SchemaMapResponse, SchemaRelationship } from "@/lib/api";
import { useConnectionsStore } from "@/stores/connections";
import { useDatabaseStore } from "@/stores/useDatabaseStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { Database } from "@/types";
import CollectionNode from "@/components/relationship/CollectionNode.vue";
import SelectBox from "@/components/ui/SelectBox.vue";
import Button from "@/components/ui/Button.vue";
import Checkbox from "@/components/ui/Checkbox.vue";

const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();
const collectionStore = useCollectionStore();
const { zoomIn, zoomOut, fitView } = useVueFlow();

// Vue Flow's NodeTypesObject typing doesn't accept typed SFC components directly
const nodeTypes: NodeTypesObject = {
  collection: markRaw(CollectionNode) as unknown as NodeTypesObject[string],
};

// ── Database & collections selection ─────────────────────────────────────────

const SYSTEM_DBS = new Set(["admin", "config", "local"]);

const selectedDbName = ref("");
const dbOptions = computed(() =>
  databaseStore.databases().map((d) => ({ value: d.name, label: d.name })),
);
const selectedDb = computed<Database | null>(
  () =>
    databaseStore.databases().find((d) => d.name === selectedDbName.value) ??
    (selectedDbName.value ? ({ name: selectedDbName.value } as Database) : null),
);

const allCollections = ref<string[]>([]);
const selectedCollections = ref(new Set<string>());
const pickerOpen = ref(false);
const pickerStyle = ref<Record<string, string>>({});

onMounted(async () => {
  const conn = connectionStore.active;
  if (!conn) return;
  await databaseStore.loadDatabases(conn);
  const dbs = databaseStore.databases();
  selectedDbName.value =
    databaseStore.database()?.name ??
    dbs.find((d) => !SYSTEM_DBS.has(d.name))?.name ??
    dbs[0]?.name ??
    "";
});

watch(selectedDbName, async (dbName) => {
  allCollections.value = [];
  selectedCollections.value = new Set();
  schema.value = null;
  nodes.value = [];
  edges.value = [];
  const conn = connectionStore.active;
  if (!conn || !dbName) return;
  const db =
    databaseStore.databases().find((d) => d.name === dbName) ??
    ({ name: dbName } as Database);
  // Sync the app-wide selection so collectionStore keys resolve, then reuse
  // collections already loaded elsewhere (e.g. the Collections page)
  databaseStore.setDatabase(conn, db);
  try {
    await collectionStore.ensureCollections(conn, db);
    allCollections.value = collectionStore
      .collections()
      .map((c) => c.name)
      .sort();
    selectedCollections.value = new Set(allCollections.value);
  } catch (err: any) {
    error.value = err.message ?? "Failed to load collections";
  }
});

const toggleCollection = (name: string, on: boolean | undefined) => {
  const next = new Set(selectedCollections.value);
  if (on) next.add(name);
  else next.delete(name);
  selectedCollections.value = next;
};

const selectAll = () => {
  selectedCollections.value = new Set(allCollections.value);
};

watch(pickerOpen, (open) => {
  if (!open) return;
  // Position the dropdown under the trigger button
  requestAnimationFrame(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const rect = trigger?.getBoundingClientRect();
    if (rect) {
      pickerStyle.value = {
        top: `${rect.bottom + 6}px`,
        left: `${Math.min(rect.left, window.innerWidth - 280)}px`,
      };
    }
  });
});

// ── Schema mapping ────────────────────────────────────────────────────────────

const tabs = [
  { id: "graph", label: "Graph View", icon: "hub" },
  { id: "schema", label: "Schema Map", icon: "schema" },
] as const;

const viewTab = ref<"graph" | "schema">("graph");
const loading = ref(false);
const error = ref<string | null>(null);
const schema = ref<SchemaMapResponse | null>(null);

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

// ── Relationship details panel ────────────────────────────────────────────────

const selectedRel = ref<SchemaRelationship | null>(null);
const copied = ref(false);
// Collection whose incoming references are listed; remembers panel navigation
const incomingFor = ref<string | null>(null);
const cameFromIncoming = ref(false);

const incomingRels = computed(() =>
  (schema.value?.relationships ?? []).filter(
    (rel) => rel.targetCollection === incomingFor.value,
  ),
);

const onEdgeClick = ({ edge }: { edge: Edge }) => {
  selectedRel.value = (edge.data as SchemaRelationship) ?? null;
  cameFromIncoming.value = false;
  incomingFor.value = null;
  copied.value = false;
};

const openRelFromIncoming = (rel: SchemaRelationship) => {
  selectedRel.value = rel;
  cameFromIncoming.value = true;
  copied.value = false;
};

const closePanels = () => {
  selectedRel.value = null;
  incomingFor.value = null;
  cameFromIncoming.value = false;
};

const lookupSnippet = computed(() => {
  const rel = selectedRel.value;
  if (!rel) return "";
  return [
    "{",
    "  $lookup: {",
    `    from: "${rel.targetCollection}",`,
    `    localField: "${rel.sourceField}",`,
    '    foreignField: "_id",',
    `    as: "${rel.sourceField}_docs"`,
    "  }",
    "}",
  ].join("\n");
});

const copyLookup = async () => {
  try {
    await navigator.clipboard.writeText(lookupSnippet.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* clipboard unavailable */
  }
};

// collection → field → target collection (for FK badges)
const fkMap = computed<Record<string, Record<string, string>>>(() => {
  const map: Record<string, Record<string, string>> = {};
  for (const rel of schema.value?.relationships ?? []) {
    (map[rel.sourceCollection] ??= {})[rel.sourceField] = rel.targetCollection;
  }
  return map;
});

const NODE_WIDTH = 280;
const nodeHeight = (fieldCount: number) =>
  64 + Math.min(fieldCount, 12) * 26 + 12;

const applyLayout = () => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 70, ranksep: 160, marginx: 40, marginy: 40 });
  for (const node of nodes.value) {
    const coll = schema.value?.collections.find((c) => c.name === node.id);
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: nodeHeight(coll?.fields.length ?? 5),
    });
  }
  for (const edge of edges.value) g.setEdge(edge.source, edge.target);
  dagre.layout(g);
  nodes.value = nodes.value.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - pos.height / 2 } };
  });
  requestAnimationFrame(() => fitView({ padding: 0.2 }));
};

const mapSchema = async (verifyValues: boolean) => {
  const conn = connectionStore.active;
  if (!conn || !selectedDb.value || selectedCollections.value.size === 0) return;
  loading.value = true;
  error.value = null;
  closePanels();
  try {
    const res = await api.data.schemaMap(conn, selectedDb.value, {
      collections: [...selectedCollections.value],
      verifyValues,
    });
    schema.value = res;

    const fks = new Map<string, Record<string, string>>();
    const incomingCounts = new Map<string, number>();
    for (const rel of res.relationships) {
      const entry = fks.get(rel.sourceCollection) ?? {};
      entry[rel.sourceField] = rel.targetCollection;
      fks.set(rel.sourceCollection, entry);
      incomingCounts.set(
        rel.targetCollection,
        (incomingCounts.get(rel.targetCollection) ?? 0) + 1,
      );
    }

    nodes.value = res.collections.map((coll) => ({
      id: coll.name,
      type: "collection",
      position: { x: 0, y: 0 },
      data: {
        collection: coll,
        fkTargets: fks.get(coll.name) ?? {},
        incomingCount: incomingCounts.get(coll.name) ?? 0,
        onShowIncoming: () => {
          selectedRel.value = null;
          cameFromIncoming.value = false;
          incomingFor.value = coll.name;
        },
      },
    }));

    edges.value = res.relationships
      // Only draw edges whose source field is visible as a node handle
      .filter(
        (rel) =>
          res.collections.some((c) => c.name === rel.sourceCollection) &&
          res.collections.some((c) => c.name === rel.targetCollection),
      )
      .map((rel, i) => ({
        id: `${rel.sourceCollection}.${rel.sourceField}→${rel.targetCollection}#${i}`,
        source: rel.sourceCollection,
        sourceHandle: rel.sourceField,
        target: rel.targetCollection,
        // Land on the target's _id row so it's obvious what is referenced
        targetHandle: res.collections
          .find((c) => c.name === rel.targetCollection)
          ?.fields.some((f) => f.name === "_id")
          ? "_id"
          : "self",
        type: "smoothstep",
        animated: rel.verified,
        data: rel,
        label: `$lookup (${rel.cardinality})`,
        labelStyle: { fill: "#c7c4d7", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace" },
        labelBgStyle: { fill: "#171f33", stroke: "#2d3449" },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6,
        style: rel.verified
          ? { stroke: "#c0c1ff", strokeWidth: 1.6 }
          : { stroke: "#908fa0", strokeWidth: 1.2, strokeDasharray: "6 4", opacity: 0.7 },
      }));

    applyLayout();
    viewTab.value = "graph";
  } catch (err: any) {
    error.value = err.message ?? "Failed to map schema";
  } finally {
    loading.value = false;
  }
};
</script>

<style>
@import "@vue-flow/core/dist/style.css";

.rel-flow {
  background: #0b1326;
}
.rel-flow .vue-flow__edge-textbg {
  rx: 6;
}
.rel-flow .vue-flow__handle {
  border-radius: 9999px;
}
.rel-flow .vue-flow__edge {
  cursor: pointer;
}
.rel-flow .vue-flow__edge.selected path.vue-flow__edge-path {
  stroke: #89ceff;
  stroke-width: 2.4;
}

.rel-panel-enter-active,
.rel-panel-leave-active {
  transition:
    transform 0.18s ease,
    opacity 0.15s ease;
}
.rel-panel-enter-from,
.rel-panel-leave-to {
  transform: translateX(12px);
  opacity: 0;
}
</style>
