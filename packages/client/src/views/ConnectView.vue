<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionsStore } from '../stores/connections'
import { api } from '../lib/api'
import type { Connection, NewConnection } from '../lib/types'

const router = useRouter()
const store = useConnectionsStore()

const connName = ref('')
const uri = ref('')
const host = ref('localhost')
const port = ref('27017')
const username = ref('')
const password = ref('')

const connecting = ref(false)
const errorMsg = ref<string | null>(null)
const envConns = ref<Connection[]>([])
const selectedConnId = ref<string | null>(null)

const parseUri = (uriStr: string) => {
  try {
    const u = new URL(uriStr)
    if (u.hostname) host.value = u.hostname
    if (u.port) port.value = u.port
    if (u.username) username.value = decodeURIComponent(u.username)
    if (u.password) password.value = decodeURIComponent(u.password)
  } catch { /* invalid/incomplete URI */ }
}

watch(uri, (val) => { if (val.trim()) parseUri(val.trim()) })

const loadConn = (conn: Connection) => {
  selectedConnId.value = conn.id
  connName.value = conn.label
  uri.value = conn.uri
  parseUri(conn.uri)
  errorMsg.value = null
}

onMounted(async () => {
  try {
    const res = await api.envConnections()
    envConns.value = res.connections.map((c) => ({
      ...c,
      id: `env::${c.label}`,
    })) as Connection[]
  } catch { /* ignore */ }
})

const allConnections = computed(() => [...envConns.value, ...store.connections])

const buildUri = () => uri.value.trim() || `mongodb://${host.value}:${port.value}`

const buildBody = (): Record<string, unknown> => ({ type: 'mongodb', uri: buildUri() })

const buildConnection = (): NewConnection => ({
  type: 'mongodb',
  label: connName.value || buildUri(),
  uri: buildUri(),
})

const clearForm = () => {
  selectedConnId.value = null
  connName.value = ''
  uri.value = ''
  host.value = 'localhost'
  port.value = '27017'
  username.value = ''
  password.value = ''
  errorMsg.value = null
}

const handleConnect = async (conn?: Connection) => {
  errorMsg.value = null
  connecting.value = true
  try {
    if (conn) {
      await api.testConnection({ type: 'mongodb', uri: conn.uri })
      store.openConnection(conn)
      router.push('/dashboard')
      return
    }
    const targetUri = buildUri()
    await api.testConnection({ type: 'mongodb', uri: targetUri })
    // Reuse existing connection with matching URI — never duplicate
    const existing = allConnections.value.find((c) => c.uri === targetUri)
    if (existing) {
      store.openConnection(existing)
    } else {
      store.addConnection(buildConnection())
      store.openConnection(store.connections.at(-1)!)
    }
    router.push('/dashboard')
  } catch (err: any) {
    errorMsg.value = err.message
  } finally {
    connecting.value = false
  }
}

const handleSave = async () => {
  errorMsg.value = null
  connecting.value = true
  try {
    await api.testConnection(buildBody())
    const data = buildConnection()

    // Editing a selected saved connection — update it
    if (selectedConnId.value && !selectedConnId.value.startsWith('env::')) {
      store.updateConnection(selectedConnId.value, data)
      return
    }

    // Same URI already saved — update label only
    const duplicate = store.connections.find((c) => c.uri === data.uri)
    if (duplicate) {
      store.updateConnection(duplicate.id, { label: data.label })
      selectedConnId.value = duplicate.id
      return
    }

    store.addConnection(data)
    selectedConnId.value = store.connections.at(-1)!.id
  } catch (err: any) {
    errorMsg.value = err.message
  } finally {
    connecting.value = false
  }
}
</script>

<template>
  <div class="bg-background text-on-surface min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary-container/10 via-background to-background pointer-events-none" />

    <div class="relative w-full max-w-4xl bg-surface-container rounded-xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col md:flex-row" style="height: 580px">
      <!-- Saved connections sidebar -->
      <aside class="w-full md:w-60 bg-surface-container-low border-r border-outline-variant flex flex-col shrink-0">
        <div class="p-gutter border-b border-outline-variant">
          <h2 class="text-headline-sm text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">database</span>
            NoSQL Manager
          </h2>
        </div>

        <div class="flex-1 overflow-y-auto p-stack-md flex flex-col gap-stack-sm">
          <h3 class="text-label-caps text-on-surface-variant uppercase mb-2 tracking-widest">Saved Connections</h3>

          <div v-if="allConnections.length === 0" class="text-body-sm text-on-surface-variant opacity-60 px-1">
            No saved connections yet.
          </div>

          <button
            v-for="conn in allConnections"
            :key="conn.id"
            class="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors group"
            :class="selectedConnId === conn.id
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'"
            @click="loadConn(conn)"
            @dblclick="handleConnect(conn)"
          >
            <span class="material-symbols-outlined text-[18px]">dns</span>
            <span class="text-body-sm flex-1 truncate">{{ conn.label }}</span>
            <span
              v-if="!conn.id.startsWith('env::')"
              class="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-60 hover:opacity-100! hover:text-error transition-opacity"
              @click.stop="store.removeConnection(conn.id)"
            >delete</span>
          </button>
        </div>

        <div class="p-stack-md border-t border-outline-variant">
          <button class="w-full py-2 flex items-center justify-center gap-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-body-sm" @click="clearForm">
            <span class="material-symbols-outlined text-[18px]">add</span>
            New Connection
          </button>
        </div>
      </aside>

      <!-- Form -->
      <main class="flex-1 flex flex-col bg-surface overflow-hidden">
        <div class="p-gutter border-b border-outline-variant bg-surface/80 backdrop-blur-md">
          <h1 class="text-headline-md text-on-surface">Connect to MongoDB</h1>
        </div>

        <div class="flex-1 overflow-y-auto p-gutter space-y-stack-lg">
          <div class="space-y-2">
            <label class="block text-body-sm text-on-surface-variant">Connection Name</label>
            <input
              v-model="connName"
              type="text"
              placeholder="e.g. My Production Cluster"
              class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-body-sm text-on-surface-variant">Connection String (URI)</label>
            <textarea
              v-model="uri"
              placeholder="mongodb://user:pass@host:port/db"
              class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-secondary font-mono text-code-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors h-20 resize-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-stack-md">
            <div class="space-y-2">
              <label class="block text-body-sm text-on-surface-variant">Host</label>
              <input
                v-model="host"
                type="text"
                placeholder="localhost"
                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-body-sm text-on-surface-variant">Port</label>
              <input
                v-model="port"
                type="text"
                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-tertiary font-mono text-code-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-stack-md">
            <div class="space-y-2">
              <label class="block text-body-sm text-on-surface-variant">Username</label>
              <input
                v-model="username"
                type="text"
                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-body-sm text-on-surface-variant">Password</label>
              <input
                v-model="password"
                type="password"
                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div v-if="errorMsg" class="flex items-start gap-2 bg-error-container/20 border border-error/30 rounded-lg px-4 py-3">
            <span class="material-symbols-outlined text-error text-[18px] mt-0.5">error</span>
            <p class="text-body-sm text-error">{{ errorMsg }}</p>
          </div>
        </div>

        <div class="p-gutter border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center shrink-0">
          <button
            v-if="allConnections.length > 0"
            class="px-4 py-2 rounded-lg text-body-sm text-on-surface-variant border border-outline-variant hover:bg-surface-container-high transition-colors"
            @click="router.back()"
          >
            Cancel
          </button>
          <div class="flex gap-3">
            <button
              class="px-4 py-2 rounded-lg text-body-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              :disabled="connecting"
              @click="handleSave"
            >
              Save Connection
            </button>
            <button
              class="px-6 py-2 rounded-lg text-body-sm bg-inverse-primary text-white hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg shadow-inverse-primary/20 flex items-center gap-2 font-medium disabled:opacity-50"
              :disabled="connecting"
              @click="handleConnect()"
            >
              <span class="material-symbols-outlined text-[18px]">cable</span>
              {{ connecting ? 'Connecting…' : 'Connect' }}
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
