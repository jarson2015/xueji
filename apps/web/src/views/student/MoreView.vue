<template>
  <div class="page">
    <h2 class="page-title">{{ labels.studentMore }}</h2>
    <p class="lead muted">
      日常做事请回「{{ labels.studentToday }}」。这里是计划、公约和家庭功能。
    </p>

    <section class="more-section" aria-labelledby="stu-plan">
      <h3 id="stu-plan" class="section-label">计划</h3>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/me')"
        @keydown.enter="$router.push('/student/me')"
      >
        <div>
          <h3>{{ labels.studentMe }}</h3>
          <p class="muted">自己的小计划，和本周高光回顾</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card archive-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/tasks')"
        @keydown.enter="$router.push('/student/tasks')"
      >
        <div>
          <h3>{{ labels.studentTasks }}</h3>
          <p class="muted">查全部、搜名字、补进度 · 日常请回「今日」处理</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>

    <section class="more-section" aria-labelledby="stu-family">
      <h3 id="stu-family" class="section-label">家庭</h3>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/journal')"
        @keydown.enter="$router.push('/student/journal')"
      >
        <div>
          <h3>
            {{ journalTitle }}
            <el-badge
              v-if="journalNewReplies > 0"
              :value="journalNewReplies"
              class="journal-badge"
            />
          </h3>
          <p class="muted">全家动态；{{ privateShort }}仅本人可见</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/covenant')"
        @keydown.enter="$router.push('/student/covenant')"
      >
        <div>
          <h3>{{ labels.studentCovenant }}</h3>
          <p class="muted">看看我们一起定的规则</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/weekend-meeting')"
        @keydown.enter="$router.push('/student/weekend-meeting')"
      >
        <div>
          <h3>周末小会</h3>
          <p class="muted">和家人聊聊本周骄傲与下周小改</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/growth?tab=portfolio')"
        @keydown.enter="$router.push('/student/growth?tab=portfolio')"
      >
        <div>
          <h3>我的成长作品集</h3>
          <p class="muted">本周主题、照片与里程碑</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>

    <section
      v-if="showOptional"
      class="more-section"
      aria-labelledby="stu-extra"
    >
      <h3 id="stu-extra" class="section-label">可选</h3>
      <div
        v-if="flags.allowance"
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/allowance')"
        @keydown.enter="$router.push('/student/allowance')"
      >
        <div>
          <h3>{{ labels.studentAllowance }}</h3>
          <p class="muted">记账、储蓄目标（和积分愿望分开）</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        v-if="flags.pacts"
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/pacts')"
        @keydown.enter="$router.push('/student/pacts')"
      >
        <div>
          <h3>{{ labels.studentPacts }}</h3>
          <p class="muted">和兄弟姐妹约定借用积分、按日还回（不是钱）</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>

    <section class="more-section" aria-labelledby="stu-other">
      <h3 id="stu-other" class="section-label">其它</h3>
      <div
        class="card-panel link-card archive-card"
        role="button"
        tabindex="0"
        @click="$router.push('/student/archive')"
        @keydown.enter="$router.push('/student/archive')"
      >
        <div>
          <h3>已放下的任务</h3>
          <p class="muted">日终归档、家人代完成 —— 不是失败，只是不再催促</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import http from '../../api/http'
import { labels } from '../../composables/labels'
import { journalProductName } from '../../composables/journalLabels'
import { useFeatureFlags } from '../../composables/useFeatureFlags'
import { showStudentOptionalSection } from '../../composables/studentMoreEmpty'

const { flags } = useFeatureFlags()
const showOptional = computed(() => showStudentOptionalSection(flags))
const journalNewReplies = ref(0)
const ageBand = localStorage.getItem('ageBand') || 'general'
const journalTitle = journalProductName(ageBand)
const privateShort = ageBand === 'young' ? '悄悄话' : '私密日记'

onMounted(async () => {
  try {
    const data: any = await http.get('/journal/activity-hint')
    journalNewReplies.value = Number(data?.newReplyCount || 0)
  } catch {
    journalNewReplies.value = 0
  }
})
</script>

<style scoped>
.lead {
  margin: -4px 0 14px;
}
.more-section {
  margin-bottom: 18px;
}
.section-label {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  min-height: var(--tap-min);
  transition: transform 0.2s ease;
  margin-bottom: 8px;
}
.link-card.archive-card {
  opacity: 0.9;
  border-style: dashed;
}
.link-card:hover {
  transform: translateY(-1px);
}
.link-card h3 {
  margin: 0 0 4px;
  font-family: var(--font-display);
}
.journal-badge {
  margin-left: 6px;
  vertical-align: middle;
}
.arrow {
  font-size: 1.6rem;
  color: var(--muted);
}

@media (min-width: 768px) {
  .more-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
  }
  .section-label {
    grid-column: 1 / -1;
  }
}
</style>
