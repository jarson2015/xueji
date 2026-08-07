import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/ritual',
      component: () => import('../views/parent/RitualTvView.vue'),
      meta: { role: 'parent' },
    },
    {
      path: '/parent',
      component: () => import('../layouts/ParentLayout.vue'),
      meta: { role: 'parent' },
      children: [
        { path: '', redirect: '/parent/monitor' },
        {
          path: 'students',
          component: () => import('../views/parent/StudentsView.vue'),
        },
        {
          path: 'tasks',
          component: () => import('../views/parent/TasksView.vue'),
        },
        {
          path: 'monitor',
          component: () => import('../views/parent/MonitorView.vue'),
        },
        {
          path: 'wishes',
          component: () => import('../views/parent/WishesView.vue'),
        },
        {
          path: 'reports',
          component: () => import('../views/parent/ReportsView.vue'),
        },
        {
          path: 'archive',
          component: () => import('../views/shared/ArchiveView.vue'),
        },
        {
          path: 'more',
          component: () => import('../views/parent/MoreView.vue'),
        },
        {
          path: 'rest-days',
          component: () => import('../views/parent/RestDaysView.vue'),
        },
        {
          path: 'family-edu',
          component: () => import('../views/parent/FamilyEduView.vue'),
        },
        {
          path: 'weekend-meeting',
          component: () => import('../views/shared/WeekendMeetingView.vue'),
        },
        {
          path: 'growth',
          component: () => import('../views/shared/GrowthView.vue'),
        },
        {
          path: 'journal',
          component: () => import('../views/shared/JournalView.vue'),
        },
        {
          path: 'covenant',
          component: () => import('../views/shared/CovenantView.vue'),
        },
        {
          path: 'allowance',
          component: () => import('../views/parent/AllowanceView.vue'),
        },
        {
          path: 'pacts',
          component: () => import('../views/parent/PactsView.vue'),
        },
      ],
    },
    {
      path: '/student',
      component: () => import('../layouts/StudentLayout.vue'),
      meta: { role: 'student' },
      children: [
        { path: '', redirect: '/student/today' },
        {
          path: 'today',
          component: () => import('../views/student/TodayView.vue'),
        },
        {
          path: 'tasks',
          component: () => import('../views/student/TasksView.vue'),
        },
        {
          path: 'rewards',
          component: () => import('../views/student/RewardsView.vue'),
        },
        {
          path: 'me',
          component: () => import('../views/student/MeView.vue'),
        },
        {
          path: 'archive',
          component: () => import('../views/shared/ArchiveView.vue'),
        },
        {
          path: 'more',
          component: () => import('../views/student/MoreView.vue'),
        },
        {
          path: 'weekend-meeting',
          component: () => import('../views/shared/WeekendMeetingView.vue'),
        },
        {
          path: 'growth',
          component: () => import('../views/shared/GrowthView.vue'),
        },
        {
          path: 'journal',
          component: () => import('../views/shared/JournalView.vue'),
        },
        {
          path: 'covenant',
          component: () => import('../views/shared/CovenantView.vue'),
        },
        {
          path: 'allowance',
          component: () => import('../views/student/AllowanceView.vue'),
        },
        {
          path: 'pacts',
          component: () => import('../views/student/PactsView.vue'),
        },
        // legacy redirects
        { path: 'plans', redirect: '/student/me' },
        { path: 'stats', redirect: '/student/me' },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.token && auth.user) {
      return auth.user.role === 'parent' ? '/parent' : '/student'
    }
    return true
  }
  if (!auth.token || !auth.user) return '/login'
  if (to.meta.role && auth.user.role !== to.meta.role) {
    return auth.user.role === 'parent' ? '/parent' : '/student'
  }
  return true
})

export default router
