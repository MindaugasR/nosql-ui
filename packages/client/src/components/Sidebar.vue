<template>
  <nav
    class="h-screen fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex flex-col py-3 z-50 shrink-0 transition-all duration-200 overflow-hidden"
    :class="collapsed ? 'w-12 items-center' : 'w-55 items-stretch'"
  >
    <!-- Logo -->
    <div
      class="flex items-center gap-3 mb-4 shrink-0"
      :class="collapsed ? 'justify-center' : 'px-4'"
    >
      <div
        class="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0"
      >
        <span
          class="material-symbols-outlined text-[16px]"
          :style="{ fontVariationSettings: `'FILL' 1` }"
        >
          database
        </span>
      </div>
      <span
        v-if="!collapsed"
        class="text-body-md font-semibold text-on-surface whitespace-nowrap overflow-hidden"
      >
        NoSQL Manager
      </span>
    </div>

    <!-- Nav items -->
    <div
      class="flex-1 flex flex-col gap-1 w-full"
      :class="collapsed ? 'items-center' : 'px-2'"
    >
      <div
        v-for="item in navItems"
        :key="item.to"
        class="relative group w-full"
        :class="collapsed ? 'flex justify-center' : ''"
      >
        <RouterLink
          :to="item.to"
          class="flex items-center gap-3 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
          :class="collapsed ? 'w-9 h-9 justify-center' : 'px-3 py-2 w-full'"
          active-class="!text-primary bg-primary/10"
        >
          <span class="material-symbols-outlined text-[20px] shrink-0">
            {{ item.icon }}
          </span>
          <span v-if="!collapsed" class="text-body-sm whitespace-nowrap">
            {{ item.label }}
          </span>
        </RouterLink>
        <!-- Tooltip (only when collapsed) -->
        <div
          v-if="collapsed"
          class="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-surface-container-highest text-on-surface text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-60 border border-outline-variant/50 shadow-lg"
        >
          {{ item.label }}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div
      class="flex flex-col gap-1 w-full border-t border-outline-variant/50 pt-2"
      :class="collapsed ? 'items-center' : 'px-2'"
    >
      <div
        v-for="item in footerItems"
        :key="item.to"
        class="relative group w-full"
        :class="collapsed ? 'flex justify-center' : ''"
      >
        <RouterLink
          :to="item.to"
          class="flex items-center gap-3 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
          :class="collapsed ? 'w-9 h-9 justify-center' : 'px-3 py-2 w-full'"
          active-class="!text-primary bg-primary/10"
        >
          <span class="material-symbols-outlined text-[20px] shrink-0">{{
            item.icon
          }}</span>
          <span v-if="!collapsed" class="text-body-sm whitespace-nowrap">{{
            item.label
          }}</span>
        </RouterLink>
        <div
          v-if="collapsed"
          class="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-surface-container-highest text-on-surface text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-60 border border-outline-variant/50 shadow-lg"
        >
          {{ item.label }}
        </div>
      </div>

      <!-- Toggle button -->
      <div
        class="relative group w-full"
        :class="collapsed ? 'flex justify-center' : ''"
      >
        <button
          class="flex items-center gap-3 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
          :class="collapsed ? 'w-9 h-9 justify-center' : 'px-3 py-2 w-full'"
          @click="toggleCollapsed"
        >
          <span
            class="material-symbols-outlined text-[20px] shrink-0 transition-transform duration-200"
            :class="collapsed ? '' : 'rotate-180'"
          >
            chevron_right
          </span>
          <span v-if="!collapsed" class="text-body-sm whitespace-nowrap"
            >Collapse</span
          >
        </button>
        <div
          v-if="collapsed"
          class="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-surface-container-highest text-on-surface text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-60 border border-outline-variant/50 shadow-lg"
        >
          Expand sidebar
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useSidebar } from "../composables/useSidebar";

const navItems = [
  { label: "Dashboard", icon: "dashboard", to: "/dashboard" },
  { label: "Collections", icon: "table_chart", to: "/collections" },
  { label: "Query Editor", icon: "terminal", to: "/query" },
];
const footerItems = [{ label: "Settings", icon: "settings", to: "/settings" }];

const { collapsed, toggleCollapsed } = useSidebar();
</script>
