import { ref, computed } from 'vue'

const userCollapsed = ref(
  localStorage.getItem('nosql-sidebar-collapsed') === 'true'
)

export function useSidebar() {
  const collapsed = computed(() => userCollapsed.value)

  const toggleCollapsed = () => {
    userCollapsed.value = !userCollapsed.value
    localStorage.setItem('nosql-sidebar-collapsed', String(userCollapsed.value))
  }

  return { collapsed, toggleCollapsed }
}
