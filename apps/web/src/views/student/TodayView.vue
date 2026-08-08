<template>
  <div
    class="page"
    :class="{
      'kid-mode': kidMode,
      'teen-mode': teenMode,
      'with-sticky-cta': showStickyDone,
    }"
  >
    <PageSkeleton v-if="loading" :rows="5" />
    <template v-else>
    <!-- U1.3：硬加载失败不要误显示「都做完啦」 -->
    <EmptyState
      v-if="loadError"
      tone="error"
      title="今日暂时打不开"
      description="网络或服务暂时不可用，稍后再试。"
      action-label="再试一次"
      @action="retryTodayLoad"
    />
    <template v-else>
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">今日</h2>
      <el-tag v-if="!kidMode" effect="plain" type="success">{{ streakRhythmLabel }}</el-tag>
      <el-tag v-else effect="plain" type="success" class="kid-streak">{{ kidStreakShort }}</el-tag>
    </div>

    <!-- P0：仅「再商量」可排在下一件前（必须立刻看） -->
    <div
      v-if="today.latestRepair?.message"
      class="card-panel repair-banner"
      role="status"
    >
      <strong>{{ today.latestRepair.fromLabel || '家长想和你再商量' }}</strong>
      <p class="muted tiny" style="margin: 6px 0 0">
        {{ today.latestRepair.message }}
        <span v-if="today.latestRepair.taskTitle"> · 「{{ today.latestRepair.taskTitle }}」</span>
      </p>
    </div>

    <div
      v-if="showFadePactBanner"
      class="card-panel fade-pact-banner"
      role="status"
    >
      <span>{{ FADE_PACT_STUDENT_LINE }}</span>
      <el-button text type="primary" class="tap-btn" @click="onDismissFadePact">
        知道了
      </el-button>
    </div>

    <div
      v-if="showTeenWeakPointsTip"
      class="card-panel fade-pact-banner"
      role="status"
    >
      <span>{{ TEEN_WEAK_POINTS_STUDENT_TIP }}</span>
      <el-button text type="primary" class="tap-btn" @click="onDismissTeenWeakTip">
        知道了
      </el-button>
    </div>

    <p v-if="isTv" class="muted tv-today-hint" role="note">
      大屏只看「下一件」；点完成、调整节奏请用手机。
    </p>

    <!-- U2.1：Hero 预算 — 标题 + 一句说明 + 主 CTA；进度/专注/缓做收到次级 -->
    <div v-if="nextItem" class="card-panel hero hero-enter" :key="nextItem.key">
      <div class="badge">{{ heroBadge }}</div>
      <h3>{{ nextItem.title }}</h3>
      <p class="hero-meta muted">
        <span v-if="nextItem.kind === 'task' && nextItem.raw?.isInterest" class="interest-inline"
          >兴趣 ·
        </span>
        {{ nextItem.meta }}
      </p>
      <p
        v-if="nextItem.kind === 'task' && nextItem.raw?.meaningNote"
        class="meaning-note hero-meaning"
      >
        {{ nextItem.raw.meaningNote }}
      </p>

      <!-- 非手机：主按钮在卡片内；手机用吸底，避免与底栏抢热区 -->
      <el-button
        v-if="!isPhone"
        type="primary"
        class="tap-btn full-tap done-btn"
        @click="openCheckin(nextItem)"
      >
        {{ doneButtonLabel }}
      </el-button>

      <p v-if="nextItem.requireConfirm" class="muted tip hero-confirm-tip">
        提交后等家长看一眼，通过后才会加分
      </p>

      <el-collapse v-model="heroExtrasOpen" class="hero-extras">
        <el-collapse-item name="extras">
          <template #title>
            <span class="hero-extras-title">进度与专注</span>
          </template>
          <el-progress
            v-if="nextItem.kind === 'task'"
            :percentage="Math.round(nextItem.progressPercent || 0)"
            :stroke-width="isTv ? 14 : 10"
            style="margin: 0 0 12px"
          />
          <FocusTimer
            :item-key="nextItem.key"
            :title="nextItem.title"
            :age-band="ageBand"
            :start-collapsed="true"
            @finished="onFocusFinished"
            @clear-finished="focusJustDone = false"
          />
          <div v-if="nextItem.kind === 'task' && canDefer" class="hero-secondary">
            <template v-if="deferInMenu">
              <el-dropdown trigger="click" @command="onDeferCommand">
                <el-button text class="tap-btn defer-more-btn" :loading="deferring">
                  更多 ···
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="defer">今天先调整节奏</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <el-button
              v-else
              text
              type="info"
              class="tap-btn defer-link"
              :loading="deferring"
              @click="askDefer"
            >
              今天先调整节奏
            </el-button>
            <p v-if="!kidMode" class="muted tip defer-hint">
              调整节奏不删任务，只是今天不催（今日还可调整 {{ skipsLeft }} 次）
            </p>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <EmptyState
      v-else-if="today.isRestDay"
      hero
      title="休息日，先不催"
      :description="
        kidMode
          ? '今天可以慢慢来。想做就做一件小事。'
          : '今天约定的任务先放一放；想做的话，可以给自己加一件小计划，或慢慢看看这一段。'
      "
      action-label="我想加一件小事"
      secondary-label="看看我的计划"
      @action="openProposeDrawer"
      @secondary="$router.push('/student/me')"
    />

    <EmptyState
      v-else
      hero
      title="今天的事情都做完啦"
      :description="
        kidMode
          ? '可以歇一歇，或再加一件小计划。'
          : '可以给自己加一件小计划，或歇一歇。想和家人商量愿望时再打开愿望页。'
      "
      action-label="我想加一件小事"
      secondary-label="看看愿望"
      @action="openProposeDrawer"
      @secondary="$router.push('/student/rewards')"
    />

    <!-- P0.3：休息日 / 周目标在下一件之后；young 简化皮不展示休息长文 -->
    <div v-if="today.isRestDay && nextItem && !kidMode" class="card-panel rest-banner">
      <div class="badge">休息日</div>
      <h3>今天是家庭休息日</h3>
      <p class="muted">
        {{
          today.restPauseAll
            ? '约定暂停全部任务，先不催你；想做也可以自愿做。'
            : '约定暂停的任务先不催你；仍出现的可以慢慢做。'
        }}
      </p>
    </div>

    <!-- U2.1：主题压成一条，不抢下一件 -->
    <div class="card-panel weekly-goal weekly-goal-compact">
      <div class="weekly-goal-head">
        <div class="weekly-goal-copy">
          <strong>{{ weekThemeTitle || '本周主题' }}</strong>
          <p v-if="weeklyGoalText" class="muted tiny" style="margin: 2px 0 0">
            {{ weeklyGoalText }}
          </p>
          <p v-else-if="!weekThemeTitle" class="muted tiny" style="margin: 2px 0 0">
            定一个主题，打卡更有章节感
          </p>
        </div>
        <el-button text type="primary" class="tap-btn" @click="themeDrawer = true">
          {{ weekThemeTitle || weeklyGoalText ? '去改' : '定一个' }}
        </el-button>
      </div>
      <div v-if="showPortfolioWeekendCta" class="portfolio-weekend-cta">
        <el-button
          text
          type="primary"
          class="tap-btn"
          style="padding-left: 0"
          @click="$router.push({ path: '/student/growth', query: { tab: 'portfolio' } })"
        >
          周末了，去作品集收个尾 ›
        </el-button>
      </div>
    </div>

    <div
      v-if="today.nextWish"
      class="card-panel near-wish-strip"
      role="button"
      tabindex="0"
      @click="$router.push('/student/rewards')"
      @keydown.enter="$router.push('/student/rewards')"
    >
      <div class="near-wish-head">
        <strong>
          {{ today.nextWish.isNearTerm ? '快到手的小愿望' : '一起努力的小目标' }}
        </strong>
        <span class="muted tiny">去愿望 ›</span>
      </div>
      <p class="goal-text" style="margin: 6px 0 0">{{ today.nextWish.title }}</p>
      <p class="muted tiny" style="margin: 4px 0 0">
        {{
          today.nextWish.lackPoints > 0
            ? `再靠近 ${today.nextWish.lackPoints} 就能商量兑现`
            : '可以和家长商量兑现啦'
        }}
      </p>
    </div>

    <JournalSoftTip
      v-if="!isTv"
      journal-path="/student/journal"
      :age-band="ageBand"
    />

    <div
      v-if="!isTv"
      class="card-panel propose-strip"
      :class="{ 'propose-strip-prominent': agePack.proposeStripProminent }"
      role="button"
      tabindex="0"
      @click="openProposeDrawer"
      @keydown.enter="openProposeDrawer"
    >
      <div class="propose-strip-head">
        <strong>{{
          agePack.proposeStripProminent
            ? '我想加一件小事（可以说了算一点）'
            : '我想加一件小事'
        }}</strong>
        <span class="muted tiny">交给家长商量 ›</span>
      </div>
      <p class="muted tiny" style="margin: 6px 0 0">
        <template v-if="pendingProposeHint">{{ pendingProposeHint }}</template>
        <template v-else>不是立刻生效，家长同意后会出现在今日。</template>
      </p>
    </div>

    <el-drawer
      v-model="themeDrawer"
      title="本周主题"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
      class="theme-drawer"
    >
      <p class="muted tiny" style="margin-top: 0">选一个主题，周末小会可以一起收尾。</p>
      <div class="theme-chips">
        <button
          v-for="p in THEME_WEEK_PRESETS"
          :key="p.code"
          type="button"
          class="theme-chip"
          :class="{ on: themeDraftPreset === p.code }"
          @click="pickThemePreset(p.code)"
        >
          {{ p.title }}
        </button>
        <button
          type="button"
          class="theme-chip"
          :class="{ on: !themeDraftPreset }"
          @click="pickThemePreset('')"
        >
          先不定
        </button>
      </div>
      <el-input
        v-if="themeDraftPreset === 'custom'"
        v-model="themeDraftTitle"
        maxlength="40"
        show-word-limit
        size="large"
        placeholder="自定义主题标题"
        style="margin-top: 12px"
      />
      <el-input
        v-model="themeDraftText"
        type="textarea"
        :rows="2"
        maxlength="80"
        show-word-limit
        size="large"
        placeholder="可选：一句本周小目标"
        style="margin-top: 12px"
      />
      <el-button
        type="primary"
        class="tap-btn"
        style="margin-top: 16px; width: 100%"
        :loading="themeSaving"
        @click="saveThemeWeek"
      >
        保存本周主题
      </el-button>
    </el-drawer>

    <el-drawer
      v-model="proposeDrawer"
      title="我想加一件小事"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
      class="propose-drawer"
    >
      <p class="muted tiny" style="margin-top: 0">
        自己提一件想练的小事，家长同意后会出现在今日。不是立刻生效，是商量。
      </p>
      <div v-if="proposeSuggests.length" class="theme-chips" style="margin-bottom: 10px">
        <button
          v-for="s in proposeSuggests"
          :key="s"
          type="button"
          class="theme-chip"
          @click="proposeTitle = s"
        >
          {{ s }}
        </button>
      </div>
      <el-input
        v-model="proposeTitle"
        maxlength="120"
        show-word-limit
        size="large"
        placeholder="例如：每天练跳绳 10 分钟"
        style="margin-bottom: 10px"
      />
      <div class="propose-row">
        <span class="muted tiny">类型</span>
        <el-radio-group v-model="proposeCategory" size="default">
          <el-radio-button value="study">学习</el-radio-button>
          <el-radio-button value="chore">家务</el-radio-button>
          <el-radio-button value="routine">习惯</el-radio-button>
        </el-radio-group>
      </div>
      <div class="propose-row">
        <span class="muted tiny">大约多久（可选）</span>
        <el-input-number v-model="proposeMinutes" :min="5" :max="120" :step="5" size="large" />
        <span class="muted tiny">分钟</span>
      </div>
      <el-button
        type="primary"
        class="tap-btn"
        style="margin-top: 16px; width: 100%"
        :loading="proposeBusy"
        :disabled="!proposeTitle.trim()"
        @click="submitProposal"
      >
        交给家长
      </el-button>
      <p v-if="pendingProposeHint" class="muted tiny" style="margin-top: 12px">
        {{ pendingProposeHint }}
      </p>
    </el-drawer>

    <!-- P0.2 / P0.4：家庭消息折叠（含鼓励、softNudge） -->
    <div v-if="familyMsgCount" class="family-fold">
      <button
        type="button"
        class="family-fold-toggle"
        @click="familyMsgsOpen = !familyMsgsOpen"
      >
        <span>家庭消息 {{ familyMsgCount }} 条</span>
        <span class="muted">{{ familyMsgsOpen ? '收起' : '展开看看' }}</span>
      </button>
      <div v-if="familyMsgsOpen" class="family-fold-body">
        <div
          v-if="today.latestEncouragement?.message"
          class="card-panel encourage-banner"
          role="status"
        >
          <strong>{{ today.latestEncouragement.fromLabel || '家长' }}</strong>
          <p class="muted tiny" style="margin: 6px 0 0">
            {{ today.latestEncouragement.message }}
          </p>
        </div>

        <div v-if="today.softNudge" class="card-panel soft-nudge">
          <span>{{ today.softNudge.message }}</span>
          <el-button
            v-if="today.softNudge.kind === 'pact'"
            text
            type="primary"
            class="tap-btn"
            @click="goPacts(today.pactHints?.focus)"
          >
            去看看
          </el-button>
        </div>

        <div
          v-if="(today.sharedDoneHints || []).length"
          class="card-panel shared-done-banner"
        >
          <strong>家人帮你分担了</strong>
          <p
            v-for="h in today.sharedDoneHints"
            :key="h.assignId"
            class="muted tiny"
            style="margin: 6px 0 0"
          >
            「{{ h.title }}」{{ h.message || '已有家人完成，你今天可以先歇一歇' }}
          </p>
        </div>

        <div
          v-if="(today.rotateHints || []).length"
          class="card-panel rotate-banner"
        >
          <strong>今天的轮值</strong>
          <p
            v-for="h in today.rotateHints"
            :key="h.assignId"
            class="muted tiny"
            style="margin: 6px 0 0"
          >
            {{ h.message }}
          </p>
        </div>

        <div
          v-if="showPactCard"
          class="card-panel pact-panel"
          role="button"
          tabindex="0"
          @click="goPacts(today.pactHints?.focus)"
          @keydown.enter="goPacts(today.pactHints?.focus)"
        >
          <div>
            <h3 class="makeup-title">积分约定</h3>
            <p class="muted tiny">
              {{ today.pactHints?.summary || '和兄弟姐妹约定暂时借用积分（不是钱）' }}
            </p>
          </div>
          <el-button type="primary" class="tap-btn" @click.stop="goPacts(today.pactHints?.focus)">
            打开
          </el-button>
        </div>

        <div
          v-if="today.makeupEnabled && (today.makeupHints || []).length"
          class="card-panel makeup-panel"
        >
          <h3 class="makeup-title">可以补上进度</h3>
          <p class="muted tiny">
            适合生病、外出等特殊收尾，不是日常替代准时完成。补上后约拿
            {{ today.makeupDiscountPercent ?? 50 }}% 积分，需家长看一眼确认。
          </p>
          <div
            v-for="h in today.makeupHints"
            :key="h.assignId + '-' + (h.makeupPeriodKey || '')"
            class="makeup-row"
          >
            <div>
              <strong>{{ h.title }}</strong>
              <div class="muted">
                {{ h.hint || (h.isExpired ? '过了约定时间' : '上一期还没收尾') }}
                · 约 {{ h.makeupPoints }} 分
              </div>
            </div>
            <el-button type="primary" class="tap-btn" @click="openMakeup(h)">补上进度</el-button>
          </div>
        </div>

        <div v-if="today.digestSettlement?.points" class="card-panel digest-banner">
          <strong>本周积分已结算</strong>
          <p class="muted" style="margin: 6px 0 0">
            周汇总发放了 {{ today.digestSettlement.points }} 分，打开「我的计划」可看本周故事。
          </p>
        </div>
      </div>
    </div>

    <!-- 这一段：young 收进「其它待办」折叠；general/teen 照常展示 -->
    <div
      v-if="pendingList.length && (slotWindow.items.length || slotWindow.laterTotal)"
      class="slot-window"
      :class="{ 'slot-window-young': kidMode }"
    >
      <button
        v-if="kidMode"
        type="button"
        class="slot-young-toggle"
        @click="slotListOpen = !slotListOpen"
      >
        <span>其它待办</span>
        <span class="muted">{{ slotListOpen ? '收起' : '展开' }}</span>
      </button>
      <div v-show="!kidMode || slotListOpen" class="slot-window-body">
      <div class="slot-window-head">
        <div class="slot-title">{{ focusSlotLabel }} · 这一段</div>
        <p v-if="!kidMode" class="muted slot-window-hint">{{ slotWindowHint }}</p>
      </div>

      <div v-if="canSwitchSlot" class="slot-switch-row">
        <el-radio-group
          v-model="selectedSlot"
          size="large"
          class="slot-switch"
        >
          <el-radio-button
            v-for="s in switchableSlots"
            :key="s"
            :value="s"
          >
            {{ labelSlot(s) }}
          </el-radio-button>
        </el-radio-group>
        <el-button
          v-if="manualSlot"
          text
          type="primary"
          class="tap-btn back-now-btn"
          @click="backToNow"
        >
          回到现在
        </el-button>
      </div>

      <div
        v-for="item in slotWindow.items"
        :key="item.key"
        class="card-panel slot-row"
        :class="{ 'slot-row-soft': item.windowKind === 'anytime' }"
      >
        <div
          class="slot-main"
          role="button"
          tabindex="0"
          @click="openCheckin(item)"
          @keydown.enter="openCheckin(item)"
        >
          <div class="slot-name">
            <span v-if="item.windowKind === 'carry'" class="slot-chip">上一件</span>
            <span v-else-if="item.windowKind === 'anytime'" class="slot-chip soft">有空再做</span>
            <span v-if="item.raw?.isInterest" class="slot-chip interest">兴趣</span>
            <span v-if="item.raw?.difficultyLabel" class="slot-chip diff">{{
              item.raw.difficultyLabel
            }}</span>
            {{ item.title }}
          </div>
          <div v-if="item.raw?.meaningNote" class="muted slot-meta meaning-inline">
            {{ item.raw.meaningNote }}
          </div>
          <div v-if="item.raw?.intentionText" class="muted slot-meta intention-line">
            {{ item.raw.intentionText }}
          </div>
          <div
            v-if="item.raw?.jointComplete && (item.raw?.jointPeersDone || []).length"
            class="muted slot-meta joint-line"
          >
            {{ item.raw.jointPeersDone.join('、') }}已完成，等你来一起收尾
          </div>
          <div class="muted slot-meta">{{ item.meta }}</div>
        </div>
        <div class="slot-actions">
          <el-button
            v-if="canPromote(item)"
            text
            type="primary"
            class="tap-btn"
            :class="{ 'reorder-prominent': agePack.reorderProminent }"
            @click.stop="promoteItem(item)"
          >
            {{ agePack.reorderProminent ? '先做这件 ✓' : '先做这件' }}
          </el-button>
          <span class="go-hint" role="button" tabindex="0" @click="openCheckin(item)">去做</span>
        </div>
      </div>
      <p v-if="swapsLeftHint" class="muted tiny slot-more-hint">{{ swapsLeftHint }}</p>

      <p v-if="slotWindow.truncatedCount" class="muted tiny slot-more-hint">
        这一段还有 {{ slotWindow.truncatedCount }} 件先收着，做完眼前的再看。
      </p>

      <div v-if="slotWindow.laterTotal" class="later-panel">
        <p class="muted later-summary">
          {{ slotWindow.otherSlotsSummary }}
        </p>
        <template v-if="canPeekLater">
          <el-button
            text
            type="primary"
            class="tap-btn"
            @click="laterOpen = !laterOpen"
          >
            {{ laterOpen ? '收起' : '想先看看' }}
          </el-button>
          <div v-if="laterOpen" class="later-groups">
            <div
              v-for="g in slotWindow.laterGroups"
              :key="g.slot"
              class="later-row"
            >
              <span>{{ g.label }}</span>
              <span class="muted">{{ otherGroupHint(g) }} · {{ g.count }} 件</span>
              <el-button
                v-if="canSwitchSlot"
                text
                type="primary"
                size="small"
                @click="selectedSlot = g.slot"
              >
                看这一段
              </el-button>
            </div>
          </div>
        </template>
      </div>
      </div>
    </div>

    <div v-if="doneList.length && !kidMode" class="done-section">
      <el-collapse>
        <el-collapse-item :title="`已完成 ${doneList.length} 件`" name="done">
          <div v-for="item in doneList" :key="item.key" class="done-row">
            <span>{{ item.title }}</span>
            <el-tag type="success" size="small">完成</el-tag>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <CheckinDrawer
      v-model="dlg"
      :title="formTitle"
      :form="form"
      :reflection-enabled="reflectionEnabled"
      :reflection-prompt="reflectionPrompt"
      :reflection-chips="reflectionChips"
      :show-focus-reflection="focusJustDone"
      :focus-reflection-chips="focusReflectionChips"
      :uploading="uploadingProof"
      :saving="saving"
      :age-band="ageBand"
      v-model:share-reflection-with-parent="shareReflectionWithParent"
      @submit="submit"
      @toggle-chip="toggleReflectChip"
      @toggle-focus-chip="toggleFocusReflectChip"
      @toggle-mood="toggleMoodTag"
      @clear-photo="clearProofPhoto"
      @upload="uploadProof"
    />

    <CheckinCelebrate
      :visible="celebrate.visible"
      :message="celebrate.message"
      :points-awarded="celebrate.pointsAwarded"
      :points-balance="celebrate.pointsBalance"
      :streak="celebrate.streak"
      :require-confirm="celebrate.requireConfirm"
      :next-wish="celebrate.nextWish"
      :quiet="teenMode"
      :reward-mode="celebrate.rewardMode || today.rewardMode || 'always'"
      :growth-hint="celebrate.growthHint"
      :interest-mode="celebrate.isInterest"
      :intrinsic-mode="intrinsicMode || celebrate.intrinsicMode"
      :age-band="ageBand"
      @close="celebrate.visible = false"
    />

    <SoftPrompt
      v-model="deferPromptOpen"
      title="今天先照顾一下节奏？"
      :message="`先把精力留给更合适的事。这一件今天先不催，任务还在，不是放弃（还可调整 ${skipsLeft} 次）。`"
      :show-input="false"
      confirm-text="先调整节奏"
      cancel-text="再想想"
      :kid-mode="kidMode"
      @confirm="deferNext"
    />
    </template>
    </template>

    <!-- 手机拇指热区：吸底主按钮，叠在底栏上方 -->
    <div
      v-if="showStickyDone"
      class="sticky-done-bar"
      :class="{ 'focus-glow': focusJustDone }"
    >
      <el-button
        type="primary"
        class="tap-btn full-tap done-btn"
        @click="openCheckin(nextItem!)"
      >
        {{ doneButtonLabel }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onActivated,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { taskSyncTick } from '../../composables/taskSync'
import { friendlyError, useStudentOnboarding } from '../../composables/useOnboarding'
import {
  CompressImageError,
  compressImageForUpload,
} from '../../composables/compressImage'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'
import { labelCategory, labelSchedule } from '../../composables/taskLabels'
import type { TodayBoardState, TodayEncouragement, TodayLatestRepair } from '../../types/today'
import {
  allowPeekOtherSlots,
  buildSlotWindow,
  labelSlot,
  resolveCurrentSlot,
  resolveDefaultFocusSlot,
  slotOrderForUi,
  slotRank,
  type TimeSlot,
} from '../../composables/timeSlotPolicy'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import JournalSoftTip from '../../components/JournalSoftTip.vue'

/** Heavy drawers / celebrate — split chunks; first paint stays list + CTA */
const CheckinCelebrate = defineAsyncComponent(
  () => import('../../components/CheckinCelebrate.vue'),
)
const CheckinDrawer = defineAsyncComponent(
  () => import('../../components/CheckinDrawer.vue'),
)
const FocusTimer = defineAsyncComponent(
  () => import('../../components/FocusTimer.vue'),
)
const SoftPrompt = defineAsyncComponent(
  () => import('../../components/SoftPrompt.vue'),
)
import {
  applyFocusOrder,
  maxTodaySwaps,
  reflectionChipsForAge,
  focusReflectionChipsForAge,
  habitRhythmLabel,
  persistTodayOrder,
  syncTodayOrderFromServer,
  type TodayOrderState,
} from '../../composables/todayFocusOrder'
import {
  syncWeeklyGoalStateFromServer,
  persistWeeklyGoalState,
} from '../../composables/weeklyGoal'
import { THEME_WEEK_PRESETS, suggestionsForThemePreset } from '../../composables/themeWeek'
import { setStudentIntrinsicMode } from '../../composables/intrinsicMode'
import {
  flushOfflineQueue,
  queueOfflineCheckin,
} from '../../composables/offlineCheckinQueue'
import {
  FADE_PACT_STUDENT_LINE,
  dismissFadePactBanner,
  shouldShowFadePactBanner,
} from '../../composables/eduRelationCopy'
import {
  TEEN_WEAK_POINTS_STUDENT_TIP,
  readReflectionSharePreference,
  shouldOmitReflectionFromApi,
  stashPrivateReflection,
  writeReflectionSharePreference,
} from '../../composables/teenPrivacy'
import { getAgeContentPack } from '../../composables/ageContentPack'

defineOptions({ name: 'StudentTodayView' })

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isPhone, isTv } = useBreakpoint()
const onboard = useStudentOnboarding()
const fadePactTick = ref(0)
/** Age band from family settings / today API */
const ageBand = ref(localStorage.getItem('ageBand') || 'general')
const slotExtendedEnabled = ref(localStorage.getItem('slotExtendedEnabled') === '1')
const slotClockEffective = ref<Record<string, { startHour: number; endHour: number }> | null>(
  null,
)
const kidMode = computed(() => ageBand.value === 'young')
const teenMode = computed(() => ageBand.value === 'teen')
const agePack = computed(() => getAgeContentPack(ageBand.value))
const visibleSlots = computed(() => slotOrderForUi(slotExtendedEnabled.value))
const intrinsicMode = ref(false)
const streakRhythmLabel = computed(() => {
  const n = today.streak || 0
  if (n <= 0) return '今天慢慢来'
  if (n < 7) return `最近 ${n} 天有节奏`
  return '这阵子节奏不错'
})
const kidStreakShort = computed(() => {
  const n = today.streak || 0
  if (n <= 0) return '慢慢来'
  return `坚持 ${n} 天`
})
const today = reactive<TodayBoardState>({
  tasks: [],
  planItems: [],
  streak: 0,
  nextWish: null,
  pointsBalance: 0,
  rewardMode: 'always',
  isRestDay: false,
  restPauseAll: false,
  restPauseCategories: [] as string[],
  softNudge: null,
  latestEncouragement: null as TodayEncouragement | null,
  latestRepair: null as TodayLatestRepair | null,
  sharedDoneHints: [] as any[],
  rotateHints: [] as any[],
  pactHints: null,
  makeupHints: [],
  makeupEnabled: true,
  makeupDiscountPercent: 60,
  dailySkipLimit: 1,
  skipsUsedToday: 0,
  digestSettlement: null,
})
const showFadePactBanner = computed(() => {
  fadePactTick.value
  return shouldShowFadePactBanner(today.rewardMode)
})
function onDismissFadePact() {
  dismissFadePactBanner()
  fadePactTick.value += 1
}

const KEY_TEEN_WEAK_TIP = 'xueji_teen_weak_tip_dismiss'
const teenWeakTipTick = ref(0)
const showTeenWeakPointsTip = computed(() => {
  teenWeakTipTick.value
  return (
    teenMode.value &&
    today.rewardMode === 'always' &&
    !localStorage.getItem(KEY_TEEN_WEAK_TIP)
  )
})
function onDismissTeenWeakTip() {
  localStorage.setItem(KEY_TEEN_WEAK_TIP, '1')
  teenWeakTipTick.value += 1
}

const shareReflectionWithParent = ref(
  readReflectionSharePreference(localStorage.getItem('ageBand') || 'general'),
)
watch(ageBand, (b) => {
  shareReflectionWithParent.value = readReflectionSharePreference(b)
})
watch(shareReflectionWithParent, (v) => {
  if (ageBand.value === 'teen') writeReflectionSharePreference(v)
})

const loading = ref(true)
/** U1.3：硬加载失败（空列表时显示错误态，避免假「做完」） */
const loadError = ref(false)
/** 并发硬加载计数：避免 soft 顶掉旧 hard 后 loading 卡死，或新 hard 被旧 finally 误关 */
let hardLoadInFlight = 0

function retryTodayLoad() {
  void load()
}
/** U2.1：进度/专注默认收起，不占 Hero 预算 */
const heroExtrasOpen = ref<string[]>([])
const dlg = ref(false)
const saving = ref(false)
const uploadingProof = ref(false)
const todayLoadGate = createLoadGate()
const deferring = ref(false)
const deferPromptOpen = ref(false)
const focusJustDone = ref(false)
const familyMsgsOpen = ref(false)
const slotListOpen = ref(false)
const focusOrder = ref<TodayOrderState>({ keys: [], swaps: 0 })
const weeklyGoalText = ref('')
const weekThemeTitle = ref('')
const weekThemePreset = ref('')
const showPortfolioWeekendCta = computed(() => {
  if (!weekThemeTitle.value.trim()) return false
  const dow = new Date().getDay()
  return dow === 0 || dow === 5 || dow === 6
})
const themeDrawer = ref(false)
const themeSaving = ref(false)
const themeDraftPreset = ref('')
const themeDraftTitle = ref('')
const themeDraftText = ref('')

const proposeDrawer = ref(false)
const proposeTitle = ref('')
const proposeCategory = ref('study')
const proposeMinutes = ref<number | undefined>(15)
const proposeBusy = ref(false)
const myProposals = ref<any[]>([])
const proposeSuggests = computed(() =>
  suggestionsForThemePreset(weekThemePreset.value || themeDraftPreset.value).slice(0, 3),
)
const pendingProposeHint = computed(() => {
  const pending = myProposals.value.filter((p) => p.status === 'pending')
  if (!pending.length) return ''
  if (pending.length === 1) return `「${pending[0].title}」还在等家长看看`
  return `有 ${pending.length} 件小事还在等家长看看`
})

function openProposeDrawer() {
  if (isTv.value) return
  proposeDrawer.value = true
}

async function loadMyProposals() {
  try {
    const rows = await http.get('/my/task-proposals')
    myProposals.value = (rows as any[]) || []
  } catch {
    myProposals.value = []
  }
}

async function submitProposal() {
  const title = proposeTitle.value.trim()
  if (!title || proposeBusy.value) return
  proposeBusy.value = true
  try {
    await http.post('/tasks/propose', {
      title,
      category: proposeCategory.value,
      suggestedMinutes: proposeMinutes.value || undefined,
    })
    ElMessage.success('已交给家长商量')
    proposeTitle.value = ''
    proposeDrawer.value = false
    await loadMyProposals()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '提交失败'))
  } finally {
    proposeBusy.value = false
  }
}

function pickThemePreset(code: string) {
  themeDraftPreset.value = code
  if (code && code !== 'custom') {
    const hit = THEME_WEEK_PRESETS.find((p) => p.code === code)
    themeDraftTitle.value = hit?.title || ''
  }
  if (!code) themeDraftTitle.value = ''
}

async function saveThemeWeek() {
  const sid = auth.user?.id
  if (!sid) return
  themeSaving.value = true
  try {
    const s = await persistWeeklyGoalState(sid, {
      text: themeDraftText.value,
      themePreset: themeDraftPreset.value,
      themeTitle: themeDraftTitle.value,
    })
    weeklyGoalText.value = s.text
    weekThemeTitle.value = s.themeTitle
    weekThemePreset.value = s.themePreset
    themeDrawer.value = false
    ElMessage.success(s.themeTitle || s.text ? '本周主题已保存' : '已清空本周主题')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '保存失败'))
  } finally {
    themeSaving.value = false
  }
}
const formTitle = ref('确认完成')
const laterOpen = ref(false)
/** null = follow clock / smart default */
const manualSlot = ref<TimeSlot | null>(null)
/** 分钟心跳：驱动时钟窗随时间推进 */
const nowTick = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null

function bumpClock() {
  nowTick.value = Date.now()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') bumpClock()
}

function backToNow() {
  manualSlot.value = null
  laterOpen.value = false
  bumpClock()
}
const celebrate = reactive<any>({
  visible: false,
  message: '',
  pointsAwarded: 0,
  pointsBalance: 0,
  streak: 0,
  requireConfirm: false,
  rewardMode: 'always',
  nextWish: null,
  growthHint: '',
  isInterest: false,
})

const showPactCard = computed(() => {
  const h = today.pactHints
  if (!h?.enabled) return false
  return !!(
    h.summary ||
    h.openCount > 0 ||
    h.overdue ||
    h.dueSoon ||
    h.awaitMyAccept ||
    h.awaitParent
  )
})

function goPacts(focus?: string | null) {
  router.push({
    path: '/student/pacts',
    query: focus ? { focus: String(focus) } : {},
  })
}
const form = reactive<any>({
  kind: 'task',
  assignId: undefined,
  planItemId: undefined,
  value: 1,
  note: '',
  reflection: '',
  focusReflection: '',
  moodTag: '' as string,
  imageUrl: '',
  targetType: 'once',
  steps: [],
  completedStepIds: [],
  requireConfirm: false,
  isMakeup: false,
  makeupPeriodKey: '',
})
const reflectionPrompt = ref('')
const reflectionEnabled = ref(true)

type TodoItem = {
  key: string
  kind: 'task' | 'plan'
  title: string
  meta: string
  done: boolean
  progressPercent?: number
  requireConfirm?: boolean
  timeSlot: string
  raw: any
}

const todoList = computed<TodoItem[]>(() => {
  const tasks = (today.tasks || []).map((t: any) => {
    const parts = [
      labelCategory(t.category),
      labelSchedule(t.schedule),
      `进度 ${Math.round(t.progressPercent)}%`,
    ]
    if (t.isInterest) parts.unshift('兴趣探索')
    if (t.isMicroHabit) parts.unshift('微习惯')
    const rhythm = habitRhythmLabel(t)
    if (rhythm) parts.push(rhythm)
    return {
      key: `t-${t.assignId}`,
      kind: 'task' as const,
      title: t.title,
      meta: parts.join(' · '),
      done: t.progressPercent >= 100,
      progressPercent: t.progressPercent,
      requireConfirm: !!t.requireConfirm,
      timeSlot: t.timeSlot || 'anytime',
      raw: t,
    }
  })
  const plans = (today.planItems || []).map((p: any) => ({
    key: `p-${p.planItemId}`,
    kind: 'plan' as const,
    title: p.title,
    meta: `自己的计划 · ${p.planTitle}（自愿，无补上进度）`,
    done: !!p.done,
    requireConfirm: false,
    timeSlot: 'anytime',
    raw: p,
  }))
  return [...tasks, ...plans]
})

const pendingList = computed(() => todoList.value.filter((i) => !i.done))
const doneList = computed(() => todoList.value.filter((i) => i.done))
const nextItem = computed(() => {
  const pending = pendingList.value
  if (!pending.length) return null
  const ordered = applyFocusOrder(pending, focusOrder.value.keys)
  return [...ordered].sort((a, b) => {
    const pref = focusOrder.value.keys
    const ai = pref.indexOf(a.key)
    const bi = pref.indexOf(b.key)
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1
      if (bi < 0) return -1
      return ai - bi
    }
    return slotRank(a.timeSlot) - slotRank(b.timeSlot)
  })[0]
})

const familyMsgCount = computed(() => {
  let n = 0
  if (today.latestEncouragement?.message) n += 1
  if (today.softNudge) n += 1
  if ((today.sharedDoneHints || []).length) n += 1
  if ((today.rotateHints || []).length) n += 1
  if (showPactCard.value) n += 1
  if (today.makeupEnabled && (today.makeupHints || []).length) n += 1
  if (today.digestSettlement?.points) n += 1
  return n
})

const reflectionChips = computed(() => reflectionChipsForAge(ageBand.value))
const focusReflectionChips = computed(() =>
  focusReflectionChipsForAge(ageBand.value),
)
const swapLimit = computed(() => maxTodaySwaps(ageBand.value))
const swapsLeft = computed(() =>
  Math.max(0, swapLimit.value - (focusOrder.value.swaps || 0)),
)
const swapsLeftHint = computed(() => {
  if (!swapsLeft.value && focusOrder.value.swaps > 0) {
    return '今天调整顺序的次数用完啦，先按眼前这件做。'
  }
  if (swapsLeft.value && pendingList.value.length > 1) {
    return `这一段里可以点「先做这件」来安排顺序（今天还可 ${swapsLeft.value} 次）`
  }
  return ''
})

function canPromote(item: TodoItem) {
  if (!item || item.key === nextItem.value?.key) return false
  if (swapsLeft.value <= 0) return false
  return pendingList.value.some((p) => p.key === item.key)
}

function promoteItem(item: TodoItem) {
  if (!canPromote(item)) {
    if (swapsLeft.value <= 0) {
      ElMessage.info('今天调整次数用完啦，明天再排')
    }
    return
  }
  const sid = auth.user?.id
  if (!sid) return
  const keys = [item.key, ...focusOrder.value.keys.filter((k) => k !== item.key)]
  focusOrder.value = {
    keys,
    swaps: (focusOrder.value.swaps || 0) + 1,
  }
  void persistTodayOrder(sid, focusOrder.value)
  ElMessage.success('好，先做这件——你来安排顺序')
}

function toggleReflectChip(c: string) {
  form.reflection = form.reflection === c ? '' : c
}

function toggleFocusReflectChip(c: string) {
  form.focusReflection = form.focusReflection === c ? '' : c
}

function toggleMoodTag(tag: string) {
  form.moodTag = form.moodTag === tag ? '' : tag
}

const clockSlot = computed(() => {
  void nowTick.value
  return resolveCurrentSlot(new Date(nowTick.value), {
    extendedEnabled: slotExtendedEnabled.value,
    clockMap: slotClockEffective.value,
  })
})
const defaultFocusSlot = computed(() =>
  resolveDefaultFocusSlot({
    clockSlot: clockSlot.value,
    nextItemSlot: nextItem.value?.timeSlot,
    pending: pendingList.value,
  }),
)
const selectedSlot = computed<TimeSlot>({
  get: () => manualSlot.value || defaultFocusSlot.value,
  set: (v) => {
    manualSlot.value = v
    laterOpen.value = false
  },
})
const focusSlot = selectedSlot
const focusSlotLabel = computed(() => labelSlot(focusSlot.value))
const canSwitchSlot = computed(() => allowPeekOtherSlots(ageBand.value))
const canPeekLater = computed(() => allowPeekOtherSlots(ageBand.value))
const switchableSlots = computed(() => visibleSlots.value)

const slotWindow = computed(() => {
  const win = buildSlotWindow({
    pending: pendingList.value,
    nextKey: nextItem.value?.key,
    focusSlot: focusSlot.value,
    ageBand: ageBand.value,
    slotOrder: visibleSlots.value,
  })
  return {
    ...win,
    items: applyFocusOrder(win.items, focusOrder.value.keys),
  }
})

const slotWindowHint = computed(() => {
  if (!slotWindow.value.items.length && slotWindow.value.laterTotal) {
    return '这一段列表先空着；其它时段还有事，可以到点再看或点下面展开。'
  }
  if (slotWindow.value.laterGroups.some((g) => g.relation === 'earlier')) {
    return '先做好眼前这些；若有之前没收尾的，上面会标「上一件」。'
  }
  return '先做好眼前这些；其它时段的到点再看。'
})

function otherGroupHint(g: { relation: string }) {
  if (g.relation === 'earlier') return '之前未收尾'
  if (g.relation === 'anytime') return '有空再做'
  return '稍后再做'
}

const heroBadge = computed(() => {
  if (today.isRestDay) return '慢慢做'
  const slot = nextItem.value?.timeSlot || focusSlot.value
  return `${labelSlot(slot)} · 这一件`
})

const canDefer = computed(() => {
  const limit = today.dailySkipLimit ?? 1
  if (limit <= 0) return false
  return (today.skipsUsedToday || 0) < limit
})
const skipsLeft = computed(() =>
  Math.max(0, (today.dailySkipLimit ?? 1) - (today.skipsUsedToday || 0)),
)
/** 低龄：缓做藏进菜单，降低误触 */
const deferInMenu = computed(() => kidMode.value)
const showStickyDone = computed(
  () =>
    isPhone.value &&
    !!nextItem.value &&
    !loading.value &&
    !loadError.value &&
    !dlg.value &&
    !celebrate.visible,
)
const doneButtonLabel = computed(() =>
  focusJustDone.value ? '专注结束 · 我做完了' : '我做完了',
)

function onFocusFinished() {
  focusJustDone.value = true
}

/** 低龄 / 普通：确认后再缓；少年可直接缓 */
function askDefer() {
  if (teenMode.value) {
    void deferNext()
    return
  }
  deferPromptOpen.value = true
}

function onDeferCommand(cmd: string) {
  if (cmd === 'defer') askDefer()
}

async function deferNext() {
  const item = nextItem.value
  const assignId = item?.kind === 'task' ? item.raw?.assignId : null
  if (!assignId) return
  if (!tryBegin(deferring)) return
  try {
    await http.post(`/my/assigns/${assignId}/defer-today`)
    ElMessage.success('今天先按更合适的节奏来，这一件不催啦')
    focusJustDone.value = false
    await load({ soft: true })
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '调整节奏没成功'))
  } finally {
    deferring.value = false
  }
}

async function load(opts?: { soft?: boolean }) {
  const soft = !!opts?.soft
  const ticket = todayLoadGate.next()
  if (!soft) {
    hardLoadInFlight += 1
    loading.value = true
  }
  try {
    const res: any = await http.get(soft ? '/my/today/lite' : '/my/today')
    if (!ticket.isCurrent()) return
    loadError.value = false
    today.tasks = res.tasks
    today.planItems = res.planItems
    today.streak = res.streak || 0
    today.nextWish = res.nextWish
    today.pointsBalance = res.pointsBalance || 0
    today.rewardMode = res.rewardMode || 'always'
    if (res.intrinsicMode != null) {
      intrinsicMode.value = !!res.intrinsicMode
      setStudentIntrinsicMode(intrinsicMode.value)
    }
    today.isRestDay = !!res.isRestDay
    today.restPauseAll = !!res.restPauseAll
    today.restPauseCategories = res.restPauseCategories || []
    today.softNudge = res.softNudge || null
    if (!soft) {
      today.latestEncouragement = res.latestEncouragement || null
      today.latestRepair = res.latestRepair || null
      today.digestSettlement = res.digestSettlement || null
    }
    today.sharedDoneHints = res.sharedDoneHints || []
    today.rotateHints = res.rotateHints || []
    today.pactHints = res.pactHints || null
    today.makeupHints = res.makeupHints || []
    today.makeupEnabled = res.makeupEnabled !== false
    today.makeupDiscountPercent = res.makeupDiscountPercent ?? 50
    today.dailySkipLimit = res.dailySkipLimit ?? 1
    today.skipsUsedToday = res.skipsUsedToday ?? 0
    if (res.ageBand) {
      ageBand.value = res.ageBand
      localStorage.setItem('ageBand', res.ageBand)
    }
    const sid = auth.user?.id
    // soft 只刷今日板；顺序/周主题/提案仅硬加载，避免可见性/轮询扇出
    if (sid && !soft) {
      const [order, goalState] = await Promise.all([
        syncTodayOrderFromServer(sid),
        syncWeeklyGoalStateFromServer(sid),
        loadMyProposals(),
      ])
      focusOrder.value = order
      weeklyGoalText.value = goalState.text
      weekThemeTitle.value = goalState.themeTitle
      weekThemePreset.value = goalState.themePreset
      themeDraftText.value = goalState.text
      themeDraftPreset.value = goalState.themePreset
      themeDraftTitle.value = goalState.themeTitle
    }
    if ((today.makeupHints || []).length && !kidMode.value) {
      familyMsgsOpen.value = true
    } else if (kidMode.value) {
      familyMsgsOpen.value = false
    }
    slotExtendedEnabled.value = !!res.slotExtendedEnabled
    localStorage.setItem(
      'slotExtendedEnabled',
      slotExtendedEnabled.value ? '1' : '0',
    )
    slotClockEffective.value = res.slotClockEffective || null
    if (res.slotClockEffective) {
      localStorage.setItem(
        'slotClockEffective',
        JSON.stringify(res.slotClockEffective),
      )
    }
    reflectionEnabled.value = res.reflectionEnabled !== false
    reflectionPrompt.value =
      reflectionEnabled.value && res.reflectionPrompt
        ? String(res.reflectionPrompt)
        : ''
    if (!soft) await auth.fetchMe()
    if (!ticket.isCurrent()) return
    const assignId = Number(route.query.assignId || 0)
    const makeup = route.query.makeup === '1'
    if (assignId) {
      if (makeup) {
        const hint = (today.makeupHints || []).find(
          (h: any) => h.assignId === assignId,
        )
        if (hint) openMakeup(hint)
        else ElMessage.info('这项暂时不能补上进度，或已经处理过啦')
      } else {
        const hit = todoList.value.find(
          (i) => i.kind === 'task' && i.raw.assignId === assignId && !i.done,
        )
        const doneHit = todoList.value.find(
          (i) => i.kind === 'task' && i.raw.assignId === assignId && i.done,
        )
        if (hit) {
          openCheckin(hit)
        } else if (doneHit) {
          ElMessage.success(`「${doneHit.title}」已经完成啦`)
        } else if (today.isRestDay) {
          ElMessage.info(
            '今天是家庭休息日，约定暂停的任务先不催你；想做也可以自愿做，或到「更多 → 任务档案」查看',
          )
        } else {
          ElMessage.warning('今天列表里暂时没有这项，可到「更多 → 任务档案」看看')
        }
      }
      router.replace({ path: '/student/today', query: {} })
    }
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    if (!soft) {
      ElMessage.error(friendlyError(e, '今日列表暂时打不开，稍后再试'))
      const empty =
        !(today.tasks || []).length && !(today.planItems || []).length
      if (empty) loadError.value = true
    }
  } finally {
    if (!soft) {
      hardLoadInFlight = Math.max(0, hardLoadInFlight - 1)
      if (hardLoadInFlight === 0) loading.value = false
    }
  }
}

/** assignId → steps（列表不再带 steps，打开抽屉时按需拉取） */
const stepsCache = new Map<number, Array<{ id: number | string; title: string }>>()

async function openCheckin(item: TodoItem) {
  form.note = ''
  form.reflection = ''
  form.focusReflection = ''
  form.moodTag = ''
  form.imageUrl = ''
  form.completedStepIds = []
  form.isMakeup = false
  form.makeupPeriodKey = ''
  // Keep API-provided prompt; do not reshuffle locally
  if (!reflectionEnabled.value) reflectionPrompt.value = ''
  if (item.kind === 'task') {
    const t = item.raw
    form.kind = 'task'
    form.assignId = t.assignId
    form.planItemId = undefined
    form.targetType = t.targetType
    form.value = t.targetType === 'duration' ? t.targetValue : 1
    form.steps = t.steps?.length ? t.steps : stepsCache.get(Number(t.assignId)) || []
    form.requireConfirm = !!t.requireConfirm
    formTitle.value = t.title
    dlg.value = true
    if (!form.steps.length && t.assignId) {
      try {
        const steps: any = await http.get(`/my/assigns/${t.assignId}/steps`)
        const list = Array.isArray(steps) ? steps : []
        stepsCache.set(Number(t.assignId), list)
        if (form.assignId === t.assignId) form.steps = list
      } catch {
        /* ignore: drawer still usable without steps */
      }
    }
  } else {
    form.kind = 'plan'
    form.assignId = undefined
    form.planItemId = item.raw.planItemId
    form.targetType = 'once'
    form.value = 1
    form.steps = []
    form.requireConfirm = false
    formTitle.value = item.title
    dlg.value = true
  }
}

function openMakeup(h: any) {
  form.note = ''
  form.reflection = ''
  form.moodTag = ''
  form.imageUrl = ''
  form.completedStepIds = []
  form.kind = 'task'
  form.assignId = h.assignId
  form.planItemId = undefined
  form.targetType = 'once'
  form.value = 1
  form.steps = []
  form.requireConfirm = true
  form.isMakeup = true
  form.makeupPeriodKey = h.makeupPeriodKey || 'once'
  formTitle.value = `补上进度：${h.title}`
  dlg.value = true
}

async function uploadProof(option: any) {
  if (!tryBegin(uploadingProof)) return
  try {
    const raw = option.file as File
    const file = await compressImageForUpload(raw)
    const fd = new FormData()
    fd.append('file', file)
    // Do not set Content-Type manually — browser must add multipart boundary.
    const res: any = await http.post('/uploads', fd)
    form.imageUrl = res.url
    ElMessage.success('照片已上传')
  } catch (e: any) {
    const msg =
      e instanceof CompressImageError
        ? e.message
        : friendlyError(e, '照片没传上去，换一张或稍后再试')
    ElMessage.error(msg)
  } finally {
    uploadingProof.value = false
  }
}

function clearProofPhoto() {
  form.imageUrl = ''
}

async function submit() {
  if (!tryBegin(saving)) return
  try {
    const reflectionRaw = form.reflection?.trim() || ''
    const omitReflection = shouldOmitReflectionFromApi(
      ageBand.value,
      shareReflectionWithParent.value,
    )
    if (omitReflection && reflectionRaw) {
      stashPrivateReflection({
        text: reflectionRaw,
        taskTitle: String(formTitle.value || ''),
      })
    }
    const reflection = omitReflection ? '' : reflectionRaw
    const focusReflection = form.focusReflection?.trim() || ''
    const usedFocus = focusJustDone.value
    const clientId = crypto.randomUUID?.() || `c-${Date.now()}`
    const body = {
      assignId: form.assignId,
      planItemId: form.planItemId,
      value: form.value,
      note: form.note || undefined,
      reflection: reflection || undefined,
      focusReflection: focusReflection || undefined,
      moodTag: form.moodTag || undefined,
      reflectionPrompt: reflection ? reflectionPrompt.value || undefined : undefined,
      imageUrl: form.imageUrl || undefined,
      completedStepIds: form.completedStepIds?.length
        ? form.completedStepIds
        : undefined,
      isMakeup: form.isMakeup || undefined,
      makeupPeriodKey: form.isMakeup ? form.makeupPeriodKey : undefined,
      usedFocus: usedFocus || undefined,
      clientId,
    }
    if (!navigator.onLine) {
      queueOfflineCheckin(body)
      dlg.value = false
      celebrate.message = '已记在本地，联网后会自动同步'
      celebrate.growthHint = ''
      celebrate.isInterest = false
      celebrate.pointsAwarded = 0
      celebrate.pointsBalance = today.pointsBalance
      celebrate.streak = today.streak
      celebrate.requireConfirm = false
      celebrate.rewardMode = today.rewardMode || 'always'
      celebrate.intrinsicMode = intrinsicMode.value
      celebrate.nextWish = null
      celebrate.visible = true
      focusJustDone.value = false
      ElMessage.success('离线已保存，恢复网络后会同步')
      return
    }
    const res: any = await http.post('/checkins', body)
    dlg.value = false
    celebrate.message =
      res.message ||
      (res.requireConfirm
        ? '你已经认真做完了，等家长看一眼就好。'
        : '这件事你做到了，这比分数更重要。')
    celebrate.growthHint = res.growthHint || ''
    celebrate.isInterest = !!res.isInterest
    celebrate.pointsAwarded = res.pointsAwarded || 0
    celebrate.pointsBalance = res.pointsBalance ?? today.pointsBalance
    celebrate.streak = res.streak ?? today.streak
    celebrate.requireConfirm = !!res.requireConfirm
    celebrate.rewardMode = res.rewardMode || today.rewardMode || 'always'
    celebrate.intrinsicMode = res.intrinsicMode ?? intrinsicMode.value
    celebrate.nextWish = res.nextWish || today.nextWish
    celebrate.visible = true
    focusJustDone.value = false
    if (res.reflectionPrompt) {
      reflectionPrompt.value = String(res.reflectionPrompt)
    }
    onboard.completeFromCheckin()
    // 软刷新：避免硬 load 骨架屏拆掉庆祝层
    await load({ soft: true })
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '提交没成功，稍后再试'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
  void flushOfflineQueue((payload) => http.post('/checkins', payload)).then((r) => {
    if (r.ok) void load({ soft: true })
  })
  bumpClock()
  clockTimer = setInterval(bumpClock, 60_000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
/** keep-alive 再进入：软刷新，避免首屏与 onMounted 双拉 */
let skipActivatedLoad = true
onActivated(() => {
  if (skipActivatedLoad) {
    skipActivatedLoad = false
    return
  }
  void load({ soft: true })
})
onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
watch(taskSyncTick, () => {
  void load({ soft: true })
})
watch(
  () => route.query.assignId,
  (id) => {
    if (id) void load({ soft: true })
  },
)
watch(
  () => nextItem.value?.key,
  () => {
    focusJustDone.value = false
  },
)
</script>

<style scoped>
.kid-mode .done-btn {
  font-size: 1.3rem !important;
  min-height: var(--tap-young-min, 56px);
}
.kid-mode .hero {
  border-radius: var(--young-radius, 20px);
  background: linear-gradient(165deg, var(--celebrate-warm, #fff6e8) 0%, #fff 55%);
}
.hero-meta {
  margin: 4px 0 0;
  line-height: 1.45;
}
.interest-inline {
  color: var(--accent, #2f6f4e);
  font-weight: 600;
}
.hero-meaning {
  margin: 6px 0 0;
  font-size: 0.92rem;
  line-height: 1.4;
}
.hero-confirm-tip {
  margin: 10px 0 0;
}
.hero-extras {
  margin-top: 10px;
  border: none;
}
.hero-extras :deep(.el-collapse-item__header) {
  min-height: 40px;
  height: auto;
  line-height: 1.3;
  border: none;
  color: var(--accent-strong, #1f4d36);
  font-size: 0.92rem;
}
.hero-extras :deep(.el-collapse-item__wrap) {
  border: none;
}
.hero-extras :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}
.hero-extras-title {
  font-weight: 500;
}
.weekly-goal-compact {
  padding-top: 12px;
  padding-bottom: 12px;
}
.weekly-goal-copy {
  min-width: 0;
  flex: 1;
}
.kid-mode .page-title {
  font-family: var(--font-display);
  font-size: 1.55rem;
}
.slot-young-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px dashed var(--line);
  background: transparent;
  border-radius: var(--young-radius, 20px);
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  min-height: var(--tap-min);
  font: inherit;
  color: inherit;
  margin-bottom: 8px;
}
.slot-window-young .slot-window-body {
  margin-top: 4px;
}
.teen-mode .done-btn {
  font-size: 1.05rem;
}
.soft-nudge {
  background: #fff8e8;
  border-color: rgba(180, 140, 40, 0.25);
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.fade-pact-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  border-color: rgba(100, 120, 90, 0.2);
  background: linear-gradient(160deg, #f7faf5 0%, #fff 90%);
}
.encourage-banner {
  border-color: rgba(60, 120, 90, 0.22);
  background: linear-gradient(160deg, #f6fffa 0%, #fff 85%);
}
.repair-banner {
  border-color: rgba(180, 130, 60, 0.25);
  background: linear-gradient(160deg, #fff9f2 0%, #fff 85%);
}
.weekly-goal {
  border-color: rgba(60, 100, 140, 0.2);
  background: linear-gradient(160deg, #f5f9ff 0%, #fff 85%);
}
.weekly-goal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.near-wish-strip {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 28%, var(--line));
}
.near-wish-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.propose-strip {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 18%, var(--line));
}
.propose-strip-prominent {
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 35%, var(--line));
  background: linear-gradient(160deg, #f3faf6 0%, #fff 80%);
  box-shadow: 0 1px 0 rgba(61, 139, 110, 0.08);
}
.propose-strip-prominent strong {
  font-size: 1.05rem;
}
.reorder-prominent {
  font-weight: 700;
  text-decoration: underline;
}
.propose-strip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.propose-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 10px;
}
.goal-text {
  margin: 8px 0 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.4;
}
.theme-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.theme-chip {
  border: 1px solid var(--line, #d8e0d6);
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  min-height: var(--tap-min, 44px);
  cursor: pointer;
  font: inherit;
}
.theme-chip.on {
  border-color: var(--accent-strong, #2d6b52);
  background: #eef6f1;
}
.interest-pill {
  display: inline-block;
  margin: 0 0 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #fff4e5;
  color: #a05a10;
  font-size: 0.82rem;
  font-weight: 700;
}
.intention-line {
  color: var(--accent-strong, #2d6b52);
  font-weight: 600;
}
.joint-line {
  color: #5a4a9a;
}
.meaning-note {
  margin: 0 0 8px;
  font-size: 0.98rem;
  color: var(--accent-strong);
  font-weight: 600;
  line-height: 1.4;
}
.family-fold {
  margin-top: 4px;
  margin-bottom: 14px;
}
.hero-enter {
  margin-bottom: 14px;
}
.family-fold-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px dashed var(--line);
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  cursor: pointer;
  min-height: var(--tap-min, 48px);
  color: var(--ink);
}
.family-fold-body {
  margin-top: 10px;
}
.slot-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.shared-done-banner {
  border-color: rgba(60, 120, 90, 0.22);
  background: linear-gradient(160deg, #f6fffa 0%, #fff 85%);
}
.shared-done-banner .tiny {
  margin: 6px 0 0;
  font-size: 0.85rem;
}
.pact-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  border-color: rgba(60, 120, 90, 0.22);
  background: linear-gradient(160deg, #f6fffa 0%, #fff 85%);
}
.makeup-panel {
  border-color: rgba(180, 140, 40, 0.28);
  background: linear-gradient(160deg, #fffef6 0%, #fff 80%);
}
.makeup-title {
  margin: 0 0 4px;
  font-family: var(--font-display);
}
.tiny {
  font-size: 0.85rem;
  margin: 0 0 10px;
}
.makeup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px dashed var(--line);
}
.makeup-row:first-of-type {
  border-top: none;
}
.hero,
.rest-banner {
  text-align: center;
  padding: 22px 18px;
}
.rest-banner {
  background: linear-gradient(160deg, #fff 0%, var(--warm) 100%);
  margin-bottom: 12px;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-weight: 700;
  font-size: 0.85rem;
}
.hero h3,
.rest-banner h3 {
  margin: 12px 0 8px;
  font-size: clamp(1.35rem, 3vw, 1.8rem);
  line-height: 1.3;
  font-family: var(--font-display);
}
.done-btn {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
}
.hero-secondary {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.defer-link,
.defer-more-btn {
  color: var(--muted) !important;
  font-weight: 500 !important;
  font-size: 0.95rem !important;
}
.defer-hint {
  margin: 0;
  font-size: 0.82rem;
}
.tip {
  margin: 10px 0 0;
  font-size: 0.9rem;
}
.with-sticky-cta {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}
.sticky-done-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(62px + env(safe-area-inset-bottom, 0px));
  z-index: 28;
  padding: 10px 14px;
  background: linear-gradient(
    180deg,
    rgba(247, 249, 247, 0) 0%,
    rgba(247, 249, 247, 0.92) 28%,
    #f7f9f7 100%
  );
  pointer-events: none;
}
.sticky-done-bar .el-button {
  pointer-events: auto;
  box-shadow: 0 8px 20px rgba(28, 43, 36, 0.14);
}
.sticky-done-bar.focus-glow .el-button {
  animation: sticky-pulse 1.2s ease-in-out 2;
}
@keyframes sticky-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}
.slot-window {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.slot-window-head {
  margin: 4px 4px 0;
}
.slot-window-hint {
  margin: 4px 0 0;
  font-size: 0.88rem;
}
.slot-switch-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.slot-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.back-now-btn {
  flex-shrink: 0;
}
.slot-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-muted, #666);
  font-size: 1rem;
}
.slot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 0;
  padding: 14px 16px;
}
.slot-row-soft {
  opacity: 0.92;
}
.slot-name {
  font-weight: 600;
}
.slot-meta {
  font-size: 0.85rem;
  margin-top: 2px;
}
.slot-chip {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--accent-soft, #e8f0fe);
  color: var(--accent-strong, #1a5fb4);
}
.slot-chip.soft {
  background: var(--line, #eee);
  color: var(--text-muted, #666);
}
.slot-chip.interest {
  background: #fff4e5;
  color: #a05a10;
}
.meaning-inline {
  color: var(--accent-strong) !important;
}
.slot-more-hint,
.later-summary {
  margin: 0 4px;
  font-size: 0.88rem;
}
.later-panel {
  margin-top: 4px;
  padding: 8px 4px 0;
  border-top: 1px dashed var(--line, #e5e5e5);
}
.later-groups {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.later-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--tap-min, 44px);
}
.tv-today-hint {
  margin: 0 0 12px;
  font-size: 1.05rem;
}
.go-hint {
  color: var(--accent);
  font-weight: 600;
  flex-shrink: 0;
}
.done-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
</style>
