<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="includeList">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Comma-separated or array of SFC `name` options to cache */
  include: string | string[]
}>()

const includeList = computed(() =>
  Array.isArray(props.include) ? props.include : props.include.split(',').map((s) => s.trim()),
)
</script>
