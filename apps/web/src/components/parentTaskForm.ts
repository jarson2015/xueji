export type ParentTaskFormModel = {
  title: string
  description: string
  category: string
  isInterest: boolean
  meaningNote: string
  timeSlot: string
  schedule: string
  targetType: string
  targetValue: number
  pointsReward: number
  difficultyLevel: string
  intentionCue: string
  intentionWhen: string
  isMicroHabit: boolean
  jointComplete: boolean
  requireConfirm: boolean
  sharedComplete: boolean
  rotateEnabled: boolean
  deadline: string | null
  stepsText: string
  studentIds: number[]
  sourceTemplateId?: string | null
  [k: string]: unknown
}
