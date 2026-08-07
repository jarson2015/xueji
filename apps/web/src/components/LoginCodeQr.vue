<template>
  <div v-if="code" class="qr-wrap">
    <canvas ref="canvasRef" class="qr-canvas" :aria-label="`登录码 ${code} 的二维码`" />
    <p class="muted tiny">扫码进入学迹</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  code: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

async function render() {
  const canvas = canvasRef.value
  const code = String(props.code || '').trim()
  if (!canvas || code.length !== 6) return
  const url = `${window.location.origin}/login?code=${encodeURIComponent(code)}`
  await QRCode.toCanvas(canvas, url, {
    width: 168,
    margin: 1,
    color: { dark: '#1c2b24', light: '#ffffff' },
  })
}

onMounted(() => {
  void render()
})

watch(
  () => props.code,
  () => {
    void render()
  },
)
</script>

<style scoped>
.qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}
.qr-canvas {
  border-radius: 12px;
  border: 1px solid var(--line, #e5e5e5);
  background: #fff;
}
.tiny {
  margin: 0;
  font-size: 0.85rem;
}
</style>
