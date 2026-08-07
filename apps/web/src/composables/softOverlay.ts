/** SoftStay vs SoftPrompt Esc 归属：有 SoftPrompt 蒙层时 Stay 不抢 Esc */
export function softStayOwnsEscape(root: ParentNode = document): boolean {
  return !root.querySelector('.sp-mask')
}
