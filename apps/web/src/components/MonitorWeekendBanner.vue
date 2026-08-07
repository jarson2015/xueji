<template>
  <div
    class="card-panel weekend-ritual-banner"
    role="region"
    aria-label="周末小会"
  >
    <div class="weekend-ritual-copy">
      <strong>周末小会</strong>
      <p class="muted tiny">这周可以一起聊聊：骄傲 · 改一件 · 陪伴</p>
    </div>
    <div class="weekend-ritual-actions">
      <el-button
        type="primary"
        class="tap-btn"
        @click="$router.push('/parent/weekend-meeting')"
      >
        开小会
      </el-button>
      <el-button
        class="tap-btn"
        @click="$router.push({ path: '/parent/growth', query: { tab: 'portfolio' } })"
      >
        作品集
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.weekend-ritual-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  background: linear-gradient(105deg, rgba(255, 246, 232, 0.95), rgba(238, 246, 241, 0.9));
  border-color: rgba(240, 223, 194, 0.8);
}
.weekend-ritual-copy {
  flex: 1;
  min-width: 0;
}
.weekend-ritual-copy strong {
  font-family: var(--font-display);
  font-size: 1.05rem;
}
.weekend-ritual-copy .tiny {
  margin: 4px 0 0;
}
.weekend-ritual-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
