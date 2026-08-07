<template>
  <el-form label-position="top" :model="form">
    <el-form-item label="标题"><el-input v-model="form.title" size="large" /></el-form-item>
    <div v-if="!editingId && themeSuggestChips.length" class="theme-suggest">
      <p class="muted tiny-hint" style="margin-top: 0">
        本周主题软建议（点一下预填微习惯，确认后点「发布」才会创建）
        <template v-if="themeSuggestLabel"> · {{ themeSuggestLabel }}</template>
      </p>
      <div class="suggest-chips">
        <button
          v-for="s in themeSuggestChips"
          :key="s"
          type="button"
          class="suggest-chip"
          @click="applyThemeSuggest(s)"
        >
          {{ s }}
        </button>
      </div>
    </div>
    <el-form-item label="说明">
      <el-input v-model="form.description" type="textarea" size="large" />
    </el-form-item>
    <el-form-item label="类型">
      <el-select v-model="form.category" size="large" style="width: 100%">
        <el-option label="学习" value="study" />
        <el-option label="家务" value="chore" />
        <el-option label="习惯" value="routine" />
      </el-select>
      <p class="muted tiny-hint">{{ categoryHint }}</p>
    </el-form-item>
    <el-form-item label="兴趣探索">
      <el-switch v-model="form.isInterest" />
      <p class="muted tiny-hint">
        打开后，学生端会强调好奇与投入，庆祝时弱化积分；适合阅读、乐器、动手探索。
      </p>
    </el-form-item>
    <el-form-item v-if="form.isInterest || form.category === 'study'" label="为什么值得做（给学生看）">
      <el-input
        v-model="form.meaningNote"
        type="textarea"
        :rows="2"
        maxlength="160"
        show-word-limit
        size="large"
        placeholder="例如：读完这一章，故事会更完整；练琴是为了下周能弹给家人听"
      />
    </el-form-item>
    <el-form-item label="时段">
      <el-select v-model="form.timeSlot" size="large" style="width: 100%">
        <el-option-group
          v-for="g in slotOptionGroups"
          :key="g.label"
          :label="g.label"
        >
          <el-option
            v-for="o in g.options"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-option-group>
      </el-select>
      <p class="muted tiny-hint">
        学生今日默认只看到「当前时段」。同一时段塞太多，容易一眼焦虑；请尽量分散到起床后 / 放学后 / 晚饭后 / 睡前。
      </p>
    </el-form-item>
    <el-form-item label="周期">
      <el-select v-model="form.schedule" size="large" style="width: 100%">
        <el-option label="一次性" value="once" />
        <el-option label="每日" value="daily" />
        <el-option label="每周" value="weekly" />
      </el-select>
      <p class="muted tiny-hint">{{ scheduleHint }}</p>
    </el-form-item>
    <el-form-item label="目标类型">
      <el-select v-model="form.targetType" size="large" style="width: 100%">
        <el-option label="完成一次" value="once" />
        <el-option label="次数" value="count" />
        <el-option label="时长(分钟)" value="duration" />
      </el-select>
    </el-form-item>
    <el-form-item label="目标值">
      <el-input-number v-model="form.targetValue" :min="1" size="large" />
    </el-form-item>
    <el-form-item label="积分奖励">
      <el-input-number v-model="form.pointsReward" :min="0" size="large" />
    </el-form-item>
    <el-form-item label="难度阶梯">
      <el-select v-model="form.difficultyLevel" size="large" style="width: 100%">
        <el-option label="入门（小步开始）" value="intro" />
        <el-option label="熟练（默认）" value="practice" />
        <el-option label="挑战（加一点难度）" value="challenge" />
      </el-select>
      <p class="muted tiny-hint">学生端只见难度名，用于纵向比较，不是排名。</p>
    </el-form-item>
    <el-form-item label="执行意图（可选）">
      <el-input
        v-model="form.intentionCue"
        size="large"
        maxlength="120"
        placeholder="锚定：例如「吃完晚饭」"
        style="margin-bottom: 8px"
      />
      <el-input
        v-model="form.intentionWhen"
        size="large"
        maxlength="120"
        placeholder="然后：例如「读 10 分钟」"
      />
      <p class="muted tiny-hint">会形成 if-then 句式，帮孩子把任务挂到已有习惯上。</p>
    </el-form-item>
    <el-form-item label="微习惯">
      <el-switch v-model="form.isMicroHabit" size="large" />
      <p class="muted tiny-hint">极小步开始（建议 2–5 分钟），适合新习惯起步。</p>
    </el-form-item>
    <el-form-item label="兄妹一起完成">
      <el-switch v-model="form.jointComplete" :disabled="form.sharedComplete" size="large" />
      <p class="muted tiny-hint">
        每人各自打卡、互见进度，非「谁快谁赢」。与「共享完成」互斥；建议 0 积分。
      </p>
    </el-form-item>
    <el-form-item label="需家长确认">
      <el-switch v-model="form.requireConfirm" size="large" />
      <p class="muted tiny-hint">{{ confirmHint }}</p>
    </el-form-item>
    <el-form-item label="共享完成（一人即可）">
      <el-switch v-model="form.sharedComplete" size="large" />
      <p class="muted tiny-hint">{{ sharedCompleteHint }}</p>
    </el-form-item>
    <el-form-item v-if="form.sharedComplete" label="按天轮值">
      <el-switch v-model="form.rotateEnabled" size="large" />
      <p class="muted tiny-hint">{{ rotateHint }}</p>
    </el-form-item>
    <el-form-item v-if="form.schedule === 'once'" label="截止日期（可选）">
      <el-date-picker
        v-model="form.deadline"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="过期后可申请补上进度"
        size="large"
        style="width: 100%"
      />
      <p class="muted tiny-hint">过了约定时间不能直接满分打卡，可申请「补上进度」拿部分积分</p>
    </el-form-item>
    <el-form-item label="步骤（可选，逗号分隔）">
      <el-input v-model="form.stepsText" size="large" placeholder="整理错题,复习公式" />
    </el-form-item>
    <el-form-item label="指派学生">
      <el-select v-model="form.studentIds" multiple size="large" style="width: 100%">
        <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <p v-if="editingId" class="muted tiny-hint">取消勾选会立刻撤销该学生的任务</p>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import type { ParentTaskFormModel } from './parentTaskForm'

const props = defineProps<{
  form: ParentTaskFormModel
  students: Array<{ id: number; name: string }>
  editingId: number
  slotOptionGroups: Array<{
    label: string
    options: Array<{ label: string; value: string }>
  }>
  categoryHint: string
  scheduleHint: string
  confirmHint: string
  sharedCompleteHint: string
  rotateHint: string
  themeSuggestChips?: string[]
  themeSuggestLabel?: string
}>()

function applyThemeSuggest(title: string) {
  props.form.title = title
  props.form.isMicroHabit = true
  props.form.category = 'routine'
  if (!props.form.pointsReward || props.form.pointsReward > 10) {
    props.form.pointsReward = 5
  }
  if (props.form.schedule === 'once') props.form.schedule = 'daily'
}
</script>

<style scoped>
.tiny-hint {
  margin: 6px 0 0;
  font-size: 0.82rem;
  line-height: 1.4;
}
.theme-suggest {
  margin: -4px 0 12px;
}
.suggest-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.suggest-chip {
  border: 1px solid var(--line, #d8e0d6);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
  cursor: pointer;
  font-size: 0.88rem;
  min-height: var(--tap-min, 40px);
}
</style>
