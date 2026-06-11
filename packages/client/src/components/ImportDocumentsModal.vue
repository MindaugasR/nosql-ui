<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/50" @click="emit('close')" />

        <div
          class="relative z-10 w-[640px] max-w-[92vw] max-h-[80vh] flex flex-col rounded-xl bg-surface-container-low border border-outline-variant shadow-2xl"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0 bg-surface-container rounded-t-xl"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[15px] text-primary shrink-0">
                upload_file
              </span>
              <span class="font-mono text-code-sm font-semibold">Import documents</span>
              <span class="text-on-surface-variant/60 text-body-sm shrink-0">
                — {{ collection }}
              </span>
            </div>
            <Button variant="icon" class="w-7 h-7" @click="emit('close')">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </Button>
          </div>

          <!-- Format tabs -->
          <div class="flex border-b border-outline-variant/50 shrink-0 px-4 gap-1 bg-surface-container">
            <button
              v-for="fmt in FORMATS"
              :key="fmt.value"
              class="px-3 py-2 text-[11px] font-semibold font-mono transition-colors border-b-2 -mb-px"
              :class="
                format === fmt.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant/60 hover:text-on-surface-variant'
              "
              @click="switchFormat(fmt.value)"
            >
              {{ fmt.label }}
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 flex flex-col gap-3 p-4 overflow-y-auto min-h-0">
            <!-- Format hint -->
            <p class="text-[11px] text-on-surface-variant/60">
              {{ formatHint }}
            </p>

            <!-- Textarea -->
            <textarea
              v-model="rawText"
              class="flex-1 min-h-[220px] resize-none bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 font-mono text-[12px] text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/30"
              :placeholder="formatPlaceholder"
              spellcheck="false"
              @input="parseInput"
            />

            <!-- File upload -->
            <div class="flex items-center gap-3">
              <label
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-body-sm text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px]">attach_file</span>
                Upload file
                <input
                  type="file"
                  class="hidden"
                  :accept="fileAccept"
                  @change="onFileUpload"
                />
              </label>
              <span class="text-[11px] text-on-surface-variant/50">{{ fileAccept }}</span>
            </div>

            <!-- Parse result / error -->
            <div
              v-if="parseError"
              class="flex items-start gap-2 px-3 py-2 rounded-lg bg-error-container/20 border border-error/30"
            >
              <span class="material-symbols-outlined text-error text-[14px] shrink-0 mt-px">error</span>
              <p class="text-[12px] text-error font-mono">{{ parseError }}</p>
            </div>
            <div
              v-else-if="parsedDocs.length > 0"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
            >
              <span class="material-symbols-outlined text-primary text-[14px]">check_circle</span>
              <p class="text-[12px] text-primary">
                {{ parsedDocs.length }} document{{ parsedDocs.length !== 1 ? "s" : "" }} ready to import
              </p>
            </div>
          </div>

          <!-- Import error -->
          <Transition name="confirm-slide">
            <div
              v-if="importError"
              class="px-4 py-2.5 border-t border-error/30 bg-error-container/20 shrink-0 flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-error text-[14px] shrink-0">error</span>
              <p class="text-[12px] text-error font-mono">{{ importError }}</p>
            </div>
          </Transition>

          <!-- Footer -->
          <div
            class="flex items-center justify-end gap-2 px-4 py-3 border-t border-outline-variant shrink-0 bg-surface-container rounded-b-xl"
          >
            <Button variant="ghost" @click="emit('close')">Cancel</Button>
            <Button
              variant="primary"
              :disabled="parsedDocs.length === 0 || !!parseError || importing"
              :loading="importing"
              @click="doImport"
            >
              Import {{ parsedDocs.length > 0 ? parsedDocs.length : "" }} doc{{ parsedDocs.length !== 1 ? "s" : "" }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Button from "./ui/Button.vue";
import { api } from "@/lib/api";
import { useConnectionsStore } from "@/stores/connections";
import { useDatabaseStore } from "@/stores/useDatabaseStore";

type ImportFormat = "json" | "csv" | "ndjson";

const FORMATS: { value: ImportFormat; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "ndjson", label: "NDJSON" },
];

const FORMAT_HINTS: Record<ImportFormat, string> = {
  json: "Paste a JSON object {} or an array of objects [{},...]. Extended JSON ($oid, $date) is supported.",
  csv: "First row is the header. Values are auto-coerced (numbers, booleans, empty → null).",
  ndjson: "One JSON object per line (newline-delimited JSON / JSONL).",
};

const FORMAT_PLACEHOLDERS: Record<ImportFormat, string> = {
  json: '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]',
  csv: "name,age,active\nAlice,30,true\nBob,25,false",
  ndjson: '{"name": "Alice", "age": 30}\n{"name": "Bob", "age": 25}',
};

const FILE_ACCEPT: Record<ImportFormat, string> = {
  json: ".json",
  csv: ".csv",
  ndjson: ".json,.ndjson,.jsonl",
};

const props = defineProps<{
  open: boolean;
  collection: string;
}>();

const emit = defineEmits<{
  close: [];
  imported: [];
}>();

const connectionStore = useConnectionsStore();
const databaseStore = useDatabaseStore();

const format = ref<ImportFormat>("json");
const rawText = ref("");
const parsedDocs = ref<Record<string, unknown>[]>([]);
const parseError = ref<string | null>(null);
const importError = ref<string | null>(null);
const importing = ref(false);

const formatHint = computed(() => FORMAT_HINTS[format.value]);
const formatPlaceholder = computed(() => FORMAT_PLACEHOLDERS[format.value]);
const fileAccept = computed(() => FILE_ACCEPT[format.value]);

watch(
  () => props.open,
  (open) => {
    if (open) {
      format.value = "json";
      rawText.value = "";
      parsedDocs.value = [];
      parseError.value = null;
      importError.value = null;
      importing.value = false;
    }
  },
);

const switchFormat = (fmt: ImportFormat) => {
  format.value = fmt;
  parsedDocs.value = [];
  parseError.value = null;
  rawText.value = "";
};

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function coerceCsvValue(v: string): unknown {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && !isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const doc: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      doc[h] = coerceCsvValue(values[i] ?? "");
    });
    return doc;
  });
}

// ── Parse input ───────────────────────────────────────────────────────────────

const parseInput = () => {
  parseError.value = null;
  importError.value = null;
  const text = rawText.value.trim();
  if (!text) {
    parsedDocs.value = [];
    return;
  }
  try {
    if (format.value === "json") {
      const parsed = JSON.parse(text);
      parsedDocs.value = Array.isArray(parsed) ? parsed : [parsed];
    } else if (format.value === "csv") {
      parsedDocs.value = parseCsv(text);
    } else {
      parsedDocs.value = text
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    }
  } catch (e: any) {
    parseError.value = e.message;
    parsedDocs.value = [];
  }
};

const onFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  rawText.value = await file.text();
  parseInput();
};

// ── Import ────────────────────────────────────────────────────────────────────

const doImport = async () => {
  if (!connectionStore.active || !databaseStore.database()) return;
  importError.value = null;
  importing.value = true;
  try {
    await api.data.insertMany(
      connectionStore.active,
      databaseStore.database()!.name,
      props.collection,
      parsedDocs.value,
    );
    emit("imported");
    emit("close");
  } catch (e: any) {
    importError.value = e.message;
  } finally {
    importing.value = false;
  }
};
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.confirm-slide-enter-active,
.confirm-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.confirm-slide-enter-from,
.confirm-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
