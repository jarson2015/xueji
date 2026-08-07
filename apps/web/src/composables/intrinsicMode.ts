/** 纯内驱力模式 — 学生端弱化积分展示 */

import { ref } from 'vue'

export const studentIntrinsicMode = ref(false)

export function setStudentIntrinsicMode(flag: boolean) {
  studentIntrinsicMode.value = !!flag
}

export function isIntrinsicMode(flag: boolean | undefined | null): boolean {
  return !!flag
}

export function shouldHidePointsUi(intrinsicMode: boolean | undefined | null): boolean {
  return isIntrinsicMode(intrinsicMode)
}
