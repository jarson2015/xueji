import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function walkVue(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walkVue(p, out)
    } else if (name.endsWith('.vue')) {
      out.push(p)
    }
  }
  return out
}

describe('drawer-phone 统一', () => {
  it('style.css 定义 --drawer-phone', () => {
    const css = fs.readFileSync(path.join(srcRoot, 'style.css'), 'utf8')
    expect(css).toMatch(/--drawer-phone\s*:/)
  })

  it('所有 el-drawer 在手机分支使用 var(--drawer-phone)', () => {
    const files = walkVue(srcRoot)
    const offenders: string[] = []
    let drawerCount = 0
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8')
      if (!src.includes('<el-drawer')) continue
      // 按 el-drawer 块粗切：从标签到下一个 </el-drawer> 或同文件下一处 size
      const re = /<el-drawer[\s\S]*?<\/el-drawer>/g
      const blocks = src.match(re) || []
      for (const block of blocks) {
        drawerCount += 1
        if (!/isPhone/.test(block) && !/:size=/.test(block)) {
          offenders.push(`${file}: missing size`)
          continue
        }
        if (/isPhone\s*\?\s*['"]var\(--drawer-phone\)['"]/.test(block)) continue
        // 允许多行写法：isPhone ? 'var(--drawer-phone)'
        if (
          /isPhone[\s\S]{0,40}\?\s*['"]var\(--drawer-phone\)['"]/.test(block)
        ) {
          continue
        }
        offenders.push(`${path.relative(srcRoot, file)}`)
      }
    }
    expect(drawerCount).toBeGreaterThanOrEqual(10)
    expect(offenders).toEqual([])
  })

  it('HANDTEST 关键键面：零花/打卡/约定/愿望/任务编辑组件在扫描集内', () => {
    const must = [
      'views/student/AllowanceView.vue',
      'components/CheckinDrawer.vue',
      'views/student/PactsView.vue',
      'views/parent/WishesView.vue',
      'components/ParentTaskEditDrawer.vue',
    ]
    for (const rel of must) {
      const full = path.join(srcRoot, rel)
      expect(fs.existsSync(full), rel).toBe(true)
      const src = fs.readFileSync(full, 'utf8')
      expect(src).toMatch(/var\(--drawer-phone\)/)
    }
  })
})
