<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from "vue";
import SelectBox from "./SelectBox.vue";

export type BsonType =
  | "string"
  | "int32"
  | "int64"
  | "double"
  | "boolean"
  | "date"
  | "objectId"
  | "null"
  | "object"
  | "array";

interface TreeNode {
  path: string;
  key: string;
  value: unknown;
  type: BsonType;
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
}

interface NodeRow {
  kind: "node";
  node: TreeNode;
}

interface AddRow {
  kind: "add";
  parentPath: string;
  isArray: boolean;
  depth: number;
}

type FlatRow = NodeRow | AddRow;

const BSON_TYPES: { value: BsonType; label: string; color: string }[] = [
  { value: "string", label: "String", color: "text-green-400" },
  { value: "int32", label: "Int32", color: "text-blue-400" },
  { value: "int64", label: "Int64", color: "text-blue-300" },
  { value: "double", label: "Double", color: "text-cyan-400" },
  { value: "boolean", label: "Boolean", color: "text-yellow-400" },
  { value: "date", label: "Date", color: "text-orange-400" },
  { value: "objectId", label: "ObjectId", color: "text-purple-400" },
  { value: "null", label: "Null", color: "text-on-surface-variant" },
  { value: "object", label: "Object", color: "text-on-surface-variant" },
  { value: "array", label: "Array", color: "text-on-surface-variant" },
];

const props = defineProps<{
  document: Record<string, unknown>;
  readonly?: boolean;
  createMode?: boolean;
}>();

const emit = defineEmits<{
  "update:document": [doc: Record<string, unknown>];
  "link-click": [objectId: string];
}>();

const expanded = ref(new Set<string>());
const localDoc = ref<Record<string, unknown>>({});
const changedPaths = ref(new Set<string>());

watch(
  () => props.createMode ? undefined : (props.document as Record<string, unknown>)._id,
  () => {
    localDoc.value = JSON.parse(JSON.stringify(props.document));
    expanded.value = new Set();
    changedPaths.value = new Set();
  },
  { immediate: true },
);

const detectType = (value: unknown): BsonType => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return "double";
    return Math.abs(value) > 2_147_483_647 ? "int64" : "int32";
  }
  if (typeof value === "string") {
    if (/^[0-9a-f]{24}$/i.test(value)) return "objectId";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return "date";
    return "string";
  }
  return "string";
};

const flattenRows = (
  obj: unknown,
  parentPath: string,
  depth: number,
): FlatRow[] => {
  if (obj === null || typeof obj !== "object") return [];
  const entries: [string, unknown][] = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v])
    : Object.entries(obj as Record<string, unknown>);

  const rows: FlatRow[] = [];
  for (const [key, value] of entries) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const type = detectType(value);
    const hasChildren = type === "object" || type === "array";
    const childrenCount = hasChildren
      ? Array.isArray(value)
        ? (value as unknown[]).length
        : Object.keys(value as object).length
      : 0;

    const node: TreeNode = { path, key, value, type, depth, hasChildren, childrenCount };
    rows.push({ kind: "node", node });
    if (hasChildren && expanded.value.has(path)) {
      rows.push(...flattenRows(value, path, depth + 1));
    }
  }

  if (props.createMode) {
    rows.push({ kind: "add", parentPath, isArray: Array.isArray(obj), depth });
  }

  return rows;
};

const rows = computed<FlatRow[]>(() => flattenRows(localDoc.value, "", 0));

const rowKey = (row: FlatRow): string =>
  row.kind === "node" ? `n:${row.node.path}` : `a:${row.parentPath}`;

const toggle = (path: string) => {
  const next = new Set(expanded.value);
  next.has(path) ? next.delete(path) : next.add(path);
  expanded.value = next;
};

const formatValue = (node: TreeNode): string => {
  if (node.type === "null") return "null";
  if (node.type === "boolean") return String(node.value);
  if (node.type === "object")
    return `{ ${node.childrenCount} field${node.childrenCount !== 1 ? "s" : ""} }`;
  if (node.type === "array")
    return `[ ${node.childrenCount} item${node.childrenCount !== 1 ? "s" : ""} ]`;
  if (node.type === "date") {
    try {
      return new Date(node.value as string).toLocaleString();
    } catch {
      return String(node.value);
    }
  }
  return String(node.value ?? "");
};

const typeColor = (type: BsonType) =>
  BSON_TYPES.find((t) => t.value === type)?.color ?? "text-on-surface-variant";

const setPath = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> => {
  const clone = JSON.parse(JSON.stringify(obj));
  const parts = path.split(".");
  let cur: any = clone;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
  return clone;
};

const coerce = (value: unknown, toType: BsonType): unknown => {
  if (toType === "null") return null;
  if (toType === "boolean") return Boolean(value);
  if (toType === "string") return String(value ?? "");
  if (toType === "int32" || toType === "int64")
    return Math.trunc(Number(value) || 0);
  if (toType === "double") return Number(value) || 0;
  if (toType === "date") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (toType === "objectId") return String(value ?? "");
  if (toType === "object") return {};
  if (toType === "array") return [];
  return value;
};

const changeType = (node: TreeNode, newType: BsonType) => {
  if (props.readonly || node.key === "_id") return;
  const coerced = coerce(node.value, newType);
  const next = setPath(localDoc.value, node.path, coerced);
  localDoc.value = next;
  changedPaths.value = new Set([...changedPaths.value, node.path]);
  emit("update:document", next);
};

const editingPath = ref<string | null>(null);
const editingValue = ref("");
const editingInitialValue = ref("");
const editingNode = ref<TreeNode | null>(null);

function onOutsideMouseDown(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest("[data-editing-cell]")) {
    if (editingNode.value) commitEdit(editingNode.value);
  }
}

onUnmounted(() => {
  window.removeEventListener("mousedown", onOutsideMouseDown);
});

const startEdit = (node: TreeNode) => {
  if (
    props.readonly ||
    node.hasChildren ||
    node.key === "_id" ||
    node.type === "null"
  )
    return;
  if (node.type === "boolean") {
    const next = setPath(localDoc.value, node.path, !node.value);
    localDoc.value = next;
    changedPaths.value = new Set([...changedPaths.value, node.path]);
    emit("update:document", next);
    return;
  }
  if (editingNode.value && editingNode.value.path !== node.path) {
    commitEdit(editingNode.value);
  }
  editingPath.value = node.path;
  editingNode.value = node;
  if (node.type === "date") {
    const d = new Date(node.value as string);
    const pad = (n: number) => String(n).padStart(2, "0");
    editingValue.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } else {
    editingValue.value = String(node.value ?? "");
  }
  editingInitialValue.value = editingValue.value;
  window.addEventListener("mousedown", onOutsideMouseDown);
};

const commitEdit = (node: TreeNode) => {
  if (editingPath.value !== node.path) return;
  let parsed: unknown = editingValue.value;
  if (node.type === "int32" || node.type === "int64")
    parsed = Math.trunc(Number(editingValue.value) || 0);
  else if (node.type === "double") parsed = Number(editingValue.value) || 0;
  else if (node.type === "date") {
    const d = new Date(editingValue.value);
    parsed = isNaN(d.getTime()) ? node.value : d.toISOString();
  }
  const next = setPath(localDoc.value, node.path, parsed);
  localDoc.value = next;
  editingPath.value = null;
  editingNode.value = null;
  window.removeEventListener("mousedown", onOutsideMouseDown);
  if (editingValue.value !== editingInitialValue.value) {
    changedPaths.value = new Set([...changedPaths.value, node.path]);
  }
  emit("update:document", next);
};

const cancelEdit = () => {
  editingPath.value = null;
  editingNode.value = null;
  window.removeEventListener("mousedown", onOutsideMouseDown);
};

// ── createMode: add / delete fields ──────────────────────────────────────────

const addingAtPath = ref<string | null>(null);
const newFieldKey = ref("");
const newFieldType = ref<BsonType>("string");
const newFieldRawValue = ref("");
const newFieldBoolValue = ref(false);
const addKeyInputEl = ref<HTMLInputElement | null>(null);

const newFieldHasInput = computed(
  () =>
    newFieldType.value !== "object" &&
    newFieldType.value !== "array" &&
    newFieldType.value !== "null",
);

const resetNewFieldValue = (type: BsonType) => {
  newFieldBoolValue.value = false;
  if (type === "date") {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    newFieldRawValue.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  } else if (type === "int32" || type === "int64" || type === "double") {
    newFieldRawValue.value = "0";
  } else {
    newFieldRawValue.value = "";
  }
};

const onNewTypeChange = (type: BsonType) => {
  newFieldType.value = type;
  resetNewFieldValue(type);
};

const parseNewFieldValue = (): unknown => {
  const type = newFieldType.value;
  if (type === "null") return null;
  if (type === "object") return {};
  if (type === "array") return [];
  if (type === "boolean") return newFieldBoolValue.value;
  if (type === "int32" || type === "int64")
    return Math.trunc(Number(newFieldRawValue.value) || 0);
  if (type === "double") return Number(newFieldRawValue.value) || 0;
  if (type === "date") {
    const d = new Date(newFieldRawValue.value);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return newFieldRawValue.value;
};

const startAddField = async (parentPath: string, isArray: boolean) => {
  addingAtPath.value = parentPath;
  newFieldKey.value = "";
  newFieldType.value = "string";
  resetNewFieldValue("string");
  if (!isArray) {
    await nextTick();
    addKeyInputEl.value?.focus();
  }
};

const commitAddField = () => {
  if (addingAtPath.value === null) return;

  const clone = JSON.parse(JSON.stringify(localDoc.value));
  const parts = addingAtPath.value ? addingAtPath.value.split(".") : [];
  let target: any = clone;
  for (const part of parts) target = target[part];

  if (Array.isArray(target)) {
    target.push(parseNewFieldValue());
  } else {
    const key = newFieldKey.value.trim();
    if (!key || key in target) return;
    target[key] = parseNewFieldValue();
    if (newFieldType.value === "object" || newFieldType.value === "array") {
      const newPath = addingAtPath.value
        ? `${addingAtPath.value}.${key}`
        : key;
      expanded.value = new Set([...expanded.value, newPath]);
    }
  }

  localDoc.value = clone;
  addingAtPath.value = null;
  emit("update:document", clone);
};

const cancelAddField = () => {
  addingAtPath.value = null;
};

const deleteField = (path: string) => {
  const parts = path.split(".");
  const clone = JSON.parse(JSON.stringify(localDoc.value));
  let cur: any = clone;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  const lastKey = parts[parts.length - 1];
  if (Array.isArray(cur)) {
    cur.splice(Number(lastKey), 1);
  } else {
    delete cur[lastKey];
  }
  localDoc.value = clone;
  emit("update:document", clone);
};

const hoveredPath = ref<string | null>(null);
</script>

<template>
  <div class="font-mono text-code-sm select-none">
    <div class="grid" style="grid-template-columns: max-content 1fr 100px">
      <!-- Header cells -->
      <div
        class="border-b border-outline-variant/60 bg-surface-container-highest/40 px-3 py-1.5 text-[10px] text-on-surface-variant uppercase tracking-widest"
      >
        Field
      </div>
      <div
        class="border-b border-outline-variant/60 bg-surface-container-highest/40 px-3 py-1.5 text-[10px] text-on-surface-variant uppercase tracking-widest"
      >
        Value
      </div>
      <div
        class="border-b border-outline-variant/60 bg-surface-container-highest/40 px-3 py-1.5 text-[10px] text-on-surface-variant uppercase tracking-widest"
      >
        Type
      </div>

      <template v-for="row in rows" :key="rowKey(row)">
        <!-- ── Regular field row (3 cells) ── -->
        <template v-if="row.kind === 'node'">
          <!-- Field -->
          <div
            class="relative flex items-center gap-0.5 py-1.5 min-w-0 pr-3 border-b border-outline-variant/20 transition-colors"
            :class="hoveredPath === row.node.path ? 'bg-surface-variant/20' : ''"
            :style="{ paddingLeft: `${row.node.depth * 14 + 10}px` }"
            @mouseenter="hoveredPath = row.node.path"
            @mouseleave="hoveredPath = null"
          >
            <span
              v-if="!readonly && changedPaths.has(row.node.path)"
              class="absolute top-0 left-0 w-2 h-2 bg-orange-400 pointer-events-none"
              style="clip-path: polygon(0 0, 100% 0, 0 100%)"
            />
            <button
              v-if="row.node.hasChildren"
              class="w-4 h-4 flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
              @click="toggle(row.node.path)"
            >
              <span
                class="material-symbols-outlined text-[13px] transition-transform duration-150"
                :class="expanded.has(row.node.path) ? 'rotate-90' : ''"
                >chevron_right</span
              >
            </button>
            <span v-else class="w-4 shrink-0" />
            <span
              class="whitespace-nowrap"
              :class="
                row.node.key === '_id'
                  ? 'text-on-surface-variant/70'
                  : 'text-on-surface'
              "
              >{{ row.node.key }}</span
            >
            <!-- Delete button (createMode only) -->
            <button
              v-if="createMode && row.node.key !== '_id' && hoveredPath === row.node.path"
              class="ml-auto shrink-0 w-5 h-5 flex items-center justify-center rounded text-on-surface-variant/40 hover:text-error hover:bg-error/10 transition-colors"
              title="Remove field"
              @click.stop="deleteField(row.node.path)"
            >
              <span class="material-symbols-outlined text-[13px]">close</span>
            </button>
          </div>

          <!-- Value -->
          <div
            class="flex items-center gap-1 py-1.5 px-2 min-w-0 border-b border-outline-variant/20 transition-colors"
            :class="hoveredPath === row.node.path ? 'bg-surface-variant/20' : ''"
            :data-editing-cell="editingPath === row.node.path ? '' : undefined"
            @mouseenter="hoveredPath = row.node.path"
            @mouseleave="hoveredPath = null"
            @dblclick="startEdit(row.node)"
          >
            <template v-if="editingPath === row.node.path">
              <input
                v-if="row.node.type === 'date'"
                type="datetime-local"
                :value="editingValue"
                step="1"
                class="w-full bg-primary/5 border-b border-primary outline-none text-on-surface px-0.5"
                autofocus
                @input="editingValue = ($event.target as HTMLInputElement).value"
                @keydown.enter="commitEdit(row.node)"
                @keydown.escape="cancelEdit"
                @blur="commitEdit(row.node)"
              />
              <input
                v-else-if="row.node.type === 'int32' || row.node.type === 'int64' || row.node.type === 'double'"
                type="number"
                :step="row.node.type === 'double' ? 'any' : '1'"
                :value="editingValue"
                class="w-full bg-primary/5 border-b border-primary outline-none text-on-surface px-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                autofocus
                @input="editingValue = ($event.target as HTMLInputElement).value"
                @keydown.enter="commitEdit(row.node)"
                @keydown.escape="cancelEdit"
                @blur="commitEdit(row.node)"
              />
              <input
                v-else
                type="text"
                :value="editingValue"
                class="w-full bg-primary/5 border-b border-primary outline-none text-on-surface px-0.5"
                autofocus
                @input="editingValue = ($event.target as HTMLInputElement).value"
                @keydown.enter="commitEdit(row.node)"
                @keydown.escape="cancelEdit"
                @blur="commitEdit(row.node)"
              />
            </template>
            <template v-else>
              <span
                class="truncate min-w-0"
                :class="[
                  typeColor(row.node.type),
                  row.node.hasChildren || row.node.key === '_id' || row.node.type === 'null'
                    ? ''
                    : row.node.type === 'boolean'
                      ? 'cursor-pointer'
                      : 'cursor-text',
                  row.node.type === 'null' ? 'italic opacity-40' : '',
                  row.node.hasChildren ? 'opacity-50' : '',
                  !row.node.hasChildren && row.node.key !== '_id' && row.node.type !== 'null' && !formatValue(row.node)
                    ? 'italic opacity-30'
                    : '',
                ]"
                >{{ formatValue(row.node) || (row.node.type === 'string' ? '(empty)' : '') }}</span
              >
              <button
                v-if="row.node.type === 'objectId' && row.node.key !== '_id'"
                class="shrink-0 text-purple-400 hover:text-purple-300 opacity-40 hover:opacity-100 transition-opacity ml-0.5"
                title="Open linked document"
                @click.stop="emit('link-click', String(row.node.value))"
                @dblclick.stop
              >
                <span class="material-symbols-outlined text-sm! hover:cursor-pointer">
                  open_in_new
                </span>
              </button>
            </template>
          </div>

          <!-- Type -->
          <div
            class="flex items-center py-1 px-1 border-b border-outline-variant/20 transition-colors"
            :class="hoveredPath === row.node.path ? 'bg-surface-variant/20' : ''"
            @mouseenter="hoveredPath = row.node.path"
            @mouseleave="hoveredPath = null"
          >
            <SelectBox
              :model-value="row.node.type"
              :options="BSON_TYPES"
              :disabled="readonly || row.node.key === '_id'"
              @update:model-value="changeType(row.node, $event)"
            />
          </div>
        </template>

        <!-- ── Add field row (full-width, createMode only) ── -->
        <template v-else-if="row.kind === 'add'">
          <div
            class="border-b border-outline-variant/10 py-1 px-2"
            style="grid-column: 1 / -1"
            :style="{ paddingLeft: `${row.depth * 14 + 10}px` }"
          >
            <template v-if="addingAtPath === row.parentPath">
              <div class="flex items-center gap-1.5">
                <!-- Key input (objects only, not arrays) -->
                <input
                  v-if="!row.isArray"
                  ref="addKeyInputEl"
                  v-model="newFieldKey"
                  type="text"
                  placeholder="field name"
                  class="w-28 shrink-0 bg-primary/5 border-b border-primary outline-none text-on-surface px-1 font-mono text-code-sm"
                  @keydown.enter="commitAddField"
                  @keydown.escape="cancelAddField"
                />

                <!-- Value input (type-specific) -->
                <template v-if="newFieldHasInput">
                  <input
                    v-if="newFieldType === 'boolean'"
                    type="checkbox"
                    :checked="newFieldBoolValue"
                    class="w-4 h-4 accent-primary shrink-0"
                    @change="newFieldBoolValue = ($event.target as HTMLInputElement).checked"
                  />
                  <input
                    v-else-if="newFieldType === 'date'"
                    type="datetime-local"
                    v-model="newFieldRawValue"
                    step="1"
                    class="flex-1 min-w-0 bg-primary/5 border-b border-primary outline-none text-on-surface px-0.5 font-mono text-code-sm"
                    @keydown.enter="commitAddField"
                    @keydown.escape="cancelAddField"
                  />
                  <input
                    v-else-if="newFieldType === 'int32' || newFieldType === 'int64' || newFieldType === 'double'"
                    type="number"
                    :step="newFieldType === 'double' ? 'any' : '1'"
                    v-model="newFieldRawValue"
                    class="flex-1 min-w-0 bg-primary/5 border-b border-primary outline-none text-on-surface px-0.5 font-mono text-code-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    @keydown.enter="commitAddField"
                    @keydown.escape="cancelAddField"
                  />
                  <input
                    v-else
                    type="text"
                    v-model="newFieldRawValue"
                    placeholder="value"
                    class="flex-1 min-w-0 bg-primary/5 border-b border-primary outline-none text-on-surface px-0.5 font-mono text-code-sm"
                    @keydown.enter="commitAddField"
                    @keydown.escape="cancelAddField"
                  />
                </template>
                <span v-else class="flex-1" />

                <!-- Type selector -->
                <SelectBox
                  :model-value="newFieldType"
                  :options="BSON_TYPES"
                  @update:model-value="onNewTypeChange($event)"
                />

                <button
                  class="w-5 h-5 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors shrink-0"
                  title="Add field"
                  @click="commitAddField"
                >
                  <span class="material-symbols-outlined text-[14px]">check</span>
                </button>
                <button
                  class="w-5 h-5 flex items-center justify-center rounded text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-variant transition-colors shrink-0"
                  title="Cancel"
                  @click="cancelAddField"
                >
                  <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            </template>
            <template v-else>
              <button
                class="flex items-center gap-1 text-on-surface-variant/40 hover:text-primary transition-colors text-[11px]"
                @click="startAddField(row.parentPath, row.isArray)"
              >
                <span class="material-symbols-outlined text-[13px]">add</span>
                {{ row.isArray ? "Add item" : "Add field" }}
              </button>
            </template>
          </div>
        </template>
      </template>
    </div>

    <div
      v-if="rows.length === 0"
      class="px-4 py-6 text-center text-on-surface-variant opacity-50 text-body-sm"
    >
      Empty document
    </div>
  </div>
</template>
