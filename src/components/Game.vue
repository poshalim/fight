<template>
  <div class="max-w-5xl mx-auto p-4">
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full" :class="youIsNekoglai ? 'bg-nekoglai' : 'bg-mafanya'"></span>
          <span class="text-sm">Вы: {{ youIsNekoglai ? 'Некоглай' : 'Мафаня' }}</span>
        </div>
        <div class="text-sm opacity-80">Комната: {{ roomStore.connectedRoomId }}</div>
        <button class="text-xs underline opacity-80" @click="roomStore.leaveRoom()">Выйти</button>
      </div>

      <!-- Health bars -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div class="flex items-baseline justify-between text-xs mb-1">
            <span>Некоглай HP: {{ state.nekoglai.hp }}</span>
            <span class="opacity-80 text-[10px]">урон за удар: 12</span>
          </div>
          <div class="w-full h-3 bg-gray-700 rounded">
            <div class="h-3 rounded bg-nekoglai transition-all" :class="{ 'hp-low': state.nekoglai.hp <= RAGE_HP }" :style="{ width: healthWidth(state.nekoglai.hp) }"></div>
          </div>
          <div class="mt-1 text-[12px] status-line">
            <span v-if="nekoglaiStunned" class="status-pill status-nekoglai">в стане 🤕</span>
            <span v-if="state.nekoglai.shield" class="status-pill status-shield glow">Полина включила купол 🛡️ (урон -60%)</span>
            <span v-if="state.nekoglai.speedBoost" class="status-pill status-speed glow">Полина дала турбо‑тапки 💨 (скорость x1.6)</span>
          </div>
        </div>
        <div>
          <div class="flex items-baseline justify-between text-xs mb-1">
            <span class="text-left sm:text-right">Мафаня HP: {{ state.mafanya.hp }}</span>
            <span class="opacity-80 text-[10px]">урон за удар: {{ state.mafanya.damageBoost ? 15 : 10 }}</span>
          </div>
          <div class="w-full h-3 bg-gray-700 rounded">
            <div class="h-3 rounded bg-mafanya transition-all" :class="{ 'hp-low': state.mafanya.hp <= RAGE_HP }" :style="{ width: healthWidth(state.mafanya.hp) }"></div>
          </div>
          <div class="mt-1 text-[12px] status-line justify-end">
            <span v-if="mafanyaStunned" class="status-pill status-mafanya">в стане 🪑</span>
            <span v-if="state.mafanya.damageBoost" class="status-pill status-boost">урон бустанулся, кулаки как кувалды 🔥</span>
            <span v-if="state.mafanya.shield" class="status-pill status-shield glow">Полина включила купол 🛡️ (урон -60%)</span>
            <span v-if="state.mafanya.speedBoost" class="status-pill status-speed glow">Полина дала турбо‑тапки 💨 (скорость x1.6)</span>
          </div>
        </div>
      </div>

      <!-- Arena -->
      <div ref="arenaRef" class="relative h-[420px] w-full max-w-[960px] mx-auto arena bg-[url('https://images.unsplash.com/photo-1581093588401-6996a6b6e1c9?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center rounded overflow-hidden select-none" :class="{ shake: shaking }">
        <!-- Polina trophy/backdrop -->
        <div class="absolute inset-x-0 top-2 text-center text-sm flex flex-col items-center gap-1">
          <span class="px-3 py-1 rounded bg-polina/80 text-gray-900 font-semibold shadow">
            Полина (@moneyglaichka_pr)
          </span>
          <div
            class="w-16 h-16 rounded-full border-2 border-polina shadow-lg bg-center bg-cover"
            :style="{ backgroundImage: `url(${polinaImg})` }"
          ></div>
          <div v-if="polinaBubble" :key="polinaBubble.id" class="mt-1 max-w-xs px-3 py-1 rounded-lg bg-black/70 text-[11px] text-gray-100 border border-polina/60 shadow-lg polina-bubble">
            {{ polinaBubble.text }}
          </div>
          <div class="hearts">
            <span>💚</span><span>💚</span><span>💚</span><span>💚</span><span>💚</span>
          </div>
        </div>

        <!-- Ground -->
        <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900/80 to-transparent"></div>

        <!-- Platforms -->
        <div
          v-for="p in state.platforms"
          :key="p.id"
          class="platform"
          :style="platformStyle(p)"
        ></div>

        <!-- Players (stick figures) using unified coord system -->
        <div
          class="fighter absolute"
          :class="[{ running: isRunningYou, jumping: isJumpingYou, attacking: youAttacking, nekoglai: youIsNekoglai, mafanya: !youIsNekoglai, sitting: state.you.stunned, enraged: youEnraged }]"
          :style="youStyle"
        >
          <div class="sprite has-face" :class="youFaceLeft ? 'face-left' : 'face-right'">
            <div class="head" :style="{ backgroundImage: `url(${youIsNekoglai ? nekoglaiImg : mafanyaImg})` }"></div>
            <div class="arm-left"></div>
            <div class="arm-right"></div>
            <div class="leg-left"></div>
            <div class="leg-right"></div>
            <div class="punch"></div>
          </div>
          <div class="label">{{ youIsNekoglai ? 'Некоглай' : 'Мафаня' }}</div>
          <div v-if="emoteYou" class="emote" :key="emoteYouKey">{{ emoteYou }}</div>
        </div>

        <div
          class="fighter absolute"
          :class="[{ running: isRunningOpp, jumping: isJumpingOpp, attacking: oppAttacking, nekoglai: !youIsNekoglai, mafanya: youIsNekoglai, sitting: state.opponent.stunned, enraged: oppEnraged }]"
          :style="oppStyle"
        >
          <div class="sprite has-face" :class="oppFaceLeft ? 'face-left' : 'face-right'">
            <div class="head" :style="{ backgroundImage: `url(${youIsNekoglai ? mafanyaImg : nekoglaiImg})` }"></div>
            <div class="arm-left"></div>
            <div class="arm-right"></div>
            <div class="leg-left"></div>
            <div class="leg-right"></div>
            <div class="punch"></div>
          </div>
          <div class="label">{{ youIsNekoglai ? 'Мафаня' : 'Некоглай' }}</div>
          <div v-if="emoteOpp" class="emote" :key="emoteOppKey">{{ emoteOpp }}</div>
        </div>

        <!-- Косяк / бонг (подбирается при приближении) -->
      <div v-if="state.item" class="pickup-bong-wrap" :style="itemStyle">
        <div class="pickup-bong">
          <img class="pickup-bong-img" src="/бульбик.png" alt="бульбик" />
        </div>
      </div>

        <!-- Damage popups -->
        <div v-for="p in pops" :key="p.id" class="damage" :class="p.who" :style="popupStyle(p.who)">{{ p.text }}</div>

        <!-- Attack sparks -->
        <div v-if="state.flash && !gameOver" class="absolute inset-0 pointer-events-none animate-pulse">
          <div class="absolute inset-0 bg-white/10"></div>
        </div>

        <!-- Game Over Banner -->
        <div v-if="gameOver" class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 text-center">
          <div class="text-xl font-bold">Победитель получает Полину (@moneyglaichka_pr)!</div>
          <button class="px-4 py-2 bg-polina text-gray-900 rounded font-semibold" @click="roomStore.restart()">Рестарт</button>
        </div>
      </div>

      <!-- Controls -->
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
        <div>Управление: A/D — движение, Space — прыжок, K — удар, Клик — удар, E — эмоция</div>
        <div class="flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2">
            <span class="opacity-80">Эффекты</span>
            <input v-model.number="masterVolume" type="range" min="0" max="100" step="1" class="w-28" />
            <span class="tabular-nums w-8 text-right">{{ masterVolume }}%</span>
          </label>
          <label class="flex items-center gap-2">
            <span class="opacity-80">Музыка</span>
            <input v-model.number="musicVolume" type="range" min="0" max="100" step="1" class="w-28" />
            <span class="tabular-nums w-8 text-right">{{ musicVolume }}%</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '../stores/room'
// реальная Полина для трофея сверху
import polinaImg from '../../polina.jpeg'

const roomStore = useRoomStore()
const state = roomStore.gameState
const isAttacking = roomStore.isAttacking
const lastHit = computed(() => roomStore.lastHit)
const youAttacking = computed(() => roomStore.isAttacking.you)
const oppAttacking = computed(() => roomStore.isAttacking.opponent)
const { polinaLine, youIsNekoglai } = storeToRefs(roomStore)
const gameOver = computed(() => state.nekoglai.hp <= 0 || state.mafanya.hp <= 0)
const polinaBubble = ref<{ text: string; id: number } | null>(null)
const masterVolume = ref(70)
const musicVolume = ref(40)
const masterGain = computed(() => masterVolume.value / 100)
const musicGain = computed(() => musicVolume.value / 100)

// Local face images bundled by Vite (assets live in project root).
const nekoglaiImg = new URL('../../некоог.png', import.meta.url).href
const mafanyaImg = new URL('../../мафа.png', import.meta.url).href

// Hit sounds (from /audio)
const mafanyaHitTracks = [
  new URL('../../audio/мафа_за_слова.mp3', import.meta.url).href,
  new URL('../../audio/мафа_мутанты.mp3', import.meta.url).href,
  new URL('../../audio/мафа_охуел.mp3', import.meta.url).href,
]
const nekoglaiHitTracks = [
  new URL('../../audio/неког_смех.mp3', import.meta.url).href,
]
let hitAudio: HTMLAudioElement | null = null
let pickupAudio: HTMLAudioElement | null = null
let mafanyaHitIndex = 0
let nekoglaiHitIndex = 0
let lastNekoglaiLaughTime = 0
const NEKOGLAI_LAUGH_COOLDOWN_MS = 20000
const HIT_BASE_VOLUME = 0.7
const PICKUP_BASE_VOLUME = 0.7
const nekoglaiPickupSound = new URL('../../audio/неког_будь.mp3', import.meta.url).href
function playHitSound(role: 'nekoglai' | 'mafanya') {
  const list = role === 'mafanya' ? mafanyaHitTracks : nekoglaiHitTracks
  if (!list.length) return
  if (hitAudio && !hitAudio.paused) return
  if (role === 'nekoglai') {
    const now = Date.now()
    if (now - lastNekoglaiLaughTime < NEKOGLAI_LAUGH_COOLDOWN_MS) return
    lastNekoglaiLaughTime = now
  }
  const nextIndex = role === 'mafanya' ? mafanyaHitIndex : nekoglaiHitIndex
  const src = list[nextIndex % list.length]
  if (role === 'mafanya') mafanyaHitIndex = (nextIndex + 1) % list.length
  else nekoglaiHitIndex = (nextIndex + 1) % list.length
  const audio = hitAudio ?? new Audio()
  hitAudio = audio
  audio.src = src
  audio.currentTime = 0
  const hitVol = role === 'nekoglai' ? 0.5 : 1
  audio.volume = HIT_BASE_VOLUME * masterGain.value * hitVol
  if (role === 'nekoglai') {
    const stopAtHalf = () => {
      const d = audio.duration
      if (typeof d === 'number' && !isNaN(d) && d > 0) {
        setTimeout(() => {
          if (hitAudio === audio && !audio.paused) audio.pause()
        }, (d / 2) * 1000)
      }
    }
    audio.addEventListener('loadedmetadata', stopAtHalf, { once: true })
    if (audio.readyState >= 1) stopAtHalf()
  }
  audio.play().catch(() => {})
}

function playPickupSound(role: 'nekoglai' | 'mafanya') {
  if (role !== 'nekoglai') return
  if (hitAudio && !hitAudio.paused) {
    hitAudio.pause()
    hitAudio.currentTime = 0
  }
  if (pickupAudio && !pickupAudio.paused) return
  const audio = pickupAudio ?? new Audio()
  pickupAudio = audio
  audio.src = nekoglaiPickupSound
  audio.currentTime = 0
  audio.volume = PICKUP_BASE_VOLUME * masterGain.value
  audio.play().catch(() => {})
}

// ===== Background music playlist for rounds =====
const musicTracks: string[] = [
  new URL('../../music/future-fire.mp3', import.meta.url).href,
  new URL('../../music/Lil_Egorushka.mp3', import.meta.url).href,
  new URL('../../music/Roberto.mp3', import.meta.url).href,
]
let musicEl: HTMLAudioElement | null = null
let currentTrackIndex = 0
let hasStartedFirstMusic = false
const MUSIC_BASE_VOLUME = 0.4

function playCurrentTrack() {
  if (!musicTracks.length) return
  if (!musicEl) {
    musicEl = new Audio()
    musicEl.addEventListener('ended', handleMusicEnded)
  }
  musicEl.volume = MUSIC_BASE_VOLUME * musicGain.value
  musicEl.src = musicTracks[currentTrackIndex]
  musicEl.currentTime = 0
  musicEl.loop = false
  musicEl.play().catch(() => {})
}

watch(masterGain, (v) => {
  if (hitAudio) hitAudio.volume = HIT_BASE_VOLUME * v
  if (pickupAudio) pickupAudio.volume = PICKUP_BASE_VOLUME * v
})
watch(musicGain, (v) => {
  if (musicEl) musicEl.volume = MUSIC_BASE_VOLUME * v
})

function handleMusicEnded() {
  // если песня закончилась во время раунда — включаем следующую
  if (!gameOver.value) {
    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length
    playCurrentTrack()
  }
}

function startRoundMusic(advance: boolean) {
  if (!musicTracks.length) return
  if (advance) {
    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length
  }
  playCurrentTrack()
}

// старт первой песни, когда зашли в комнату и раунд ещё не закончился
watch(
  () => ({ over: gameOver.value, room: roomStore.connectedRoomId }),
  ({ over, room }) => {
    if (!over && room && !hasStartedFirstMusic) {
      hasStartedFirstMusic = true
      startRoundMusic(false)
    }
  },
  { immediate: true }
)

// при рестарте раунда (gameOver: true -> false) двигаем плейлист вперёд
let prevGameOver = gameOver.value
watch(gameOver, (now) => {
  if (prevGameOver && !now) {
    startRoundMusic(true)
  }
  if (now) {
    if (musicEl) {
      musicEl.pause()
      musicEl.currentTime = 0
    }
    if (hitAudio) {
      hitAudio.pause()
      hitAudio.currentTime = 0
    }
    if (pickupAudio) {
      pickupAudio.pause()
      pickupAudio.currentTime = 0
    }
  }
  prevGameOver = now
})

// UI state for effects
const shaking = ref(false)
const emoteYou = ref<string>('')
const emoteOpp = ref<string>('')
const emoteYouKey = ref(0)
const emoteOppKey = ref(0)
let emoteYouTimer: number | null = null
let emoteOppTimer: number | null = null
const pops = ref<{id:number; who:'you'|'opponent'; text:string}[]>([])
let popId = 0
const lastAttacker = ref<'you'|'opponent'|'none'>('none')

// track last attacker + fun opponent emote on their attack
watch(youAttacking, v => { if (v) lastAttacker.value = 'you' })
watch(oppAttacking, v => { if (v) { lastAttacker.value = 'opponent' } })

// реплики Полины из стора — показываем их как облачко над аватаркой
watch(polinaLine, (val) => {
  if (!val) return
  if (polinaBubble.value) return
  polinaBubble.value = { text: val.text, id: val.id }
  // облачко пропадает через несколько секунд; проверяем id, чтобы новый текст не стёр старый таймер
  setTimeout(() => {
    if (polinaBubble.value && polinaBubble.value.id === val.id) {
      polinaBubble.value = null
    }
  }, 3500)
})

// Sync emotes from server so both players see each other's reactions
watch(
  () => roomStore.lastEmote,
  (payload: { role: 'nekoglai'|'mafanya'; value?: string; id: number } | null) => {
    if (!payload) return
    const isYouRole = (youIsNekoglai.value ? 'nekoglai' : 'mafanya') === payload.role
    triggerEmote(isYouRole ? 'you' : 'opponent', payload.value)
  }
)

// Play pickup sound for Nekoglai bong
watch(
  () => roomStore.lastItemPickup,
  (payload: { role: 'nekoglai'|'mafanya'; itemType: string; effect: string; id: number } | null) => {
    if (!payload) return
    if (payload.itemType === 'bong') playPickupSound(payload.role)
  }
)

// Emote helpers
const emotes = ['😂','🔥','💚','👑','💸','😼','🤝','💥','⭐']
function triggerEmote(who: 'you'|'opponent', val?: string) {
  const e = val ?? emotes[Math.floor(Math.random()*emotes.length)]
  if (who === 'you') {
    emoteYou.value = e
    emoteYouKey.value++
    if (emoteYouTimer != null) clearTimeout(emoteYouTimer)
    emoteYouTimer = window.setTimeout(() => {
      emoteYou.value = ''
      emoteYouTimer = null
    }, 4000)
  } else {
    emoteOpp.value = e
    emoteOppKey.value++
    if (emoteOppTimer != null) clearTimeout(emoteOppTimer)
    emoteOppTimer = window.setTimeout(() => {
      emoteOpp.value = ''
      emoteOppTimer = null
    }, 4000)
  }
}

// Play sound when a hit connects (flash toggles)
watch(() => state.flash, v => {
  if (v) {
    if (lastAttacker.value !== 'none') {
      const attackerRole: 'nekoglai' | 'mafanya' =
        lastAttacker.value === 'you'
          ? (youIsNekoglai.value ? 'nekoglai' : 'mafanya')
          : (youIsNekoglai.value ? 'mafanya' : 'nekoglai')
      playHitSound(attackerRole)
    }
    shaking.value = true
    setTimeout(() => (shaking.value = false), 160)
    if (!lastHit.value) return
    const victimRole = lastHit.value.victim
    const victim: 'you' | 'opponent' =
      (youIsNekoglai.value ? 'nekoglai' : 'mafanya') === victimRole ? 'you' : 'opponent'
    const dmg = lastHit.value.dmg

    const id = ++popId
    pops.value.push({ id, who: victim, text: `-${dmg}` })
    setTimeout(() => { pops.value = pops.value.filter(x => x.id !== id) }, 600)
  }
})

const nekoglaiStunned = computed(() => (youIsNekoglai.value ? state.you.stunned : state.opponent.stunned))
const mafanyaStunned = computed(() => (youIsNekoglai.value ? state.opponent.stunned : state.you.stunned))

// Arena metrics
const MAX_HP = 500
const RAGE_HP = 150
const ARENA_WIDTH = 960
const SPRITE_W = 40
// рост: Некоглай ~180, Мафаня ~200 → чуть крупнее (~1.1x)
const SCALE_NEKOGLAI = 1
const SCALE_MAFANYA = 1.22

// Responsive arena width tracking
const arenaRef = ref<HTMLElement | null>(null)
const arenaW = ref(ARENA_WIDTH)
const halfW = computed(() => arenaW.value / 2)
const scaleX = computed(() => arenaW.value / ARENA_WIDTH)
function updateArenaW() {
  if (arenaRef.value) arenaW.value = arenaRef.value.clientWidth
}

// Previous positions to derive facing and running
const prevYouX = ref(0)
const prevOppX = ref(0)

const isRunningYou = computed(() => Math.abs(state.you.x - prevYouX.value) > 3)
const isRunningOpp = computed(() => Math.abs(state.opponent.x - prevOppX.value) > 3)
const isJumpingYou = computed(() => !state.you.grounded)
const isJumpingOpp = computed(() => !state.opponent.grounded)

const youFaceLeft = ref(false)
const oppFaceLeft = ref(true)

watch(() => state.you.x, (x, old) => {
  const o = (old ?? 0)
  if (Math.abs(x - o) > 3) youFaceLeft.value = x < o
  prevYouX.value = x
})
watch(() => state.opponent.x, (x, old) => {
  const o = (old ?? 0)
  if (Math.abs(x - o) > 3) oppFaceLeft.value = x < o
  prevOppX.value = x
})

const youStyle = computed(() => {
  const scale = youIsNekoglai.value ? SCALE_NEKOGLAI : SCALE_MAFANYA
  return {
    left: '0px',
    bottom: '0px',
    transform: `translate(${halfW.value + scaleX.value * state.you.x - SPRITE_W/2}px, ${-state.you.y}px) scale(${scale})`,
    transformOrigin: 'bottom center',
  }
})
const oppStyle = computed(() => {
  const scale = youIsNekoglai.value ? SCALE_MAFANYA : SCALE_NEKOGLAI
  return {
    left: '0px',
    bottom: '0px',
    transform: `translate(${halfW.value + scaleX.value * state.opponent.x - SPRITE_W/2}px, ${-state.opponent.y}px) scale(${scale})`,
    transformOrigin: 'bottom center',
  }
})

const youEnraged = computed(() => state.you.hp <= RAGE_HP)
const oppEnraged = computed(() => state.opponent.hp <= RAGE_HP)

const itemStyle = computed(() => {
  if (!state.item) return {}
  return {
    left: '0px',
    bottom: '0px',
    transform: `translate(${halfW.value + scaleX.value * state.item!.x - 14}px, ${-state.item!.y - 8}px)`,
  }
})

function popupStyle(who: 'you'|'opponent') {
  if (who === 'you') {
    return { left: '0px', bottom: '0px', transform: `translate(${halfW.value + scaleX.value * state.you.x}px, ${-state.you.y - 70}px)` }
  } else {
    return { left: '0px', bottom: '0px', transform: `translate(${halfW.value + scaleX.value * state.opponent.x}px, ${-state.opponent.y - 70}px)` }
  }
}

function platformStyle(p: { x: number; y: number; width: number; height: number }) {
  return {
    left: '0px',
    bottom: '0px',
    width: `${scaleX.value * p.width}px`,
    height: `${p.height}px`,
    transform: `translate(${halfW.value + scaleX.value * p.x - (scaleX.value * p.width) / 2}px, ${-p.y}px)`,
  }
}

function healthWidth(hp: number) {
  const clamped = Math.max(0, Math.min(MAX_HP, hp))
  return (clamped / MAX_HP) * 100 + '%'
}

// Smooth continuous movement: track held keys and send periodic actions
const held = reactive({ left: false, right: false })
let moveTimer: number | null = null

function tickMove() {
  if (gameOver.value) return
  if (held.left) roomStore.move('left')
  if (held.right) roomStore.move('right')
}

function startMoveLoop() {
  if (moveTimer != null) return
  moveTimer = window.setInterval(tickMove, 50) // 20 fps input tick
}

// Подбор косяка при приближении (сервер проверит дистанцию)
let pickupTimer: number | null = null
function startPickupLoop() {
  if (pickupTimer != null) return
  pickupTimer = window.setInterval(() => {
    if (gameOver.value || !state.item) return
    const dx = Math.abs(state.you.x - state.item.x)
    const dy = Math.abs(state.you.y - state.item.y)
    if (dx < 50 && dy < 50) roomStore.pickup()
  }, 200)
}
function stopPickupLoop() {
  if (pickupTimer != null) { clearInterval(pickupTimer); pickupTimer = null }
}
function stopMoveLoop() {
  if (moveTimer != null) { clearInterval(moveTimer); moveTimer = null }
}

function handleKeyDown(e: KeyboardEvent) {
  const code = e.code
  if (code === 'KeyA') { held.left = true; startMoveLoop() }
  else if (code === 'KeyD') { held.right = true; startMoveLoop() }
  else if (code === 'Space') roomStore.jump()
  else if (code === 'KeyK') roomStore.attack()
  else if (code === 'KeyE') {
    const value = emotes[Math.floor(Math.random()*emotes.length)]
    roomStore.emote(value)
  }
}
function handleKeyUp(e: KeyboardEvent) {
  const code = e.code
  if (code === 'KeyA') held.left = false
  else if (code === 'KeyD') held.right = false
  if (!held.left && !held.right) stopMoveLoop()
}

function handleClick() {
  if (!gameOver.value) roomStore.attack()
}

onMounted(() => {
  updateArenaW()
  window.addEventListener('resize', updateArenaW)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('click', handleClick)
  startPickupLoop()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateArenaW)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('click', handleClick)
  stopMoveLoop()
  stopPickupLoop()
  // остановить музыку и почистить слушатель
  if (musicEl) {
    musicEl.pause()
    musicEl.removeEventListener('ended', handleMusicEnded)
    musicEl = null
  }
})
</script>

<style scoped>
.fighter {
  width: 40px;
  height: 72px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  position: absolute;
  will-change: transform;
}
.fighter .label {
  position: absolute;
  bottom: 100px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(0,0,0,0.5);
  padding: 2px 6px;
  border-radius: 4px;
}
/* Colors by role */
.fighter.nekoglai { --accent: #4f46e5; }
.fighter.mafanya { --accent: #ef4444; }

/* Inner sprite for mirroring */
.sprite {
  width: 100%;
  height: 100%;
  position: relative;
  transform: scaleX(1);
}
/* test images inline (replace later with real photos in /public) */
.char-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; z-index: 1; }
/* Face head circle */
.head {
  position: absolute;
  top: -20px;
  left: 60%;
  width: 56px;
  height: 56px;
  margin-left: -28px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  z-index: 2;
}
/* Hide pseudo head when face image present */
.sprite.has-face::before { display: none; }

/* Punch visual */
.punch {
  position: absolute;
  top: 34px;
  left: 50%;
  width: 14px;
  height: 14px;
  margin-left: 18px; /* to the right hand */
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px rgba(255,255,255,0.7);
  z-index: 4;
  opacity: 0;
}
.fighter.attacking .punch {
  animation: punch-pop 0.35s ease-out forwards;
}
@keyframes punch-pop {
  0% { transform: translateX(0) scale(0.5); opacity: 0; }
  50% { transform: translateX(10px) scale(1.2); opacity: 1; }
  100% { transform: translateX(20px) scale(0.8); opacity: 0; }
}

/* Slight body bob on jump */
.fighter.jumping .sprite { animation: jump-bob 0.3s cubic-bezier(.2,.8,.2,1); }
@keyframes jump-bob {
  0% { transform: translateY(0); filter: brightness(1); }
  40% { transform: translateY(-4px); filter: brightness(1.06); }
  100% { transform: translateY(0); filter: brightness(1); }
}

/* Footstep hint when running */
.fighter.running .leg-left,
.fighter.running .leg-right { filter: brightness(1.1); }
/* Disable constant bobbing to avoid jitter; rely on limb swing only */
.fighter.running .sprite { animation: none; }
@keyframes run-bob {}
.sprite.face-left { transform: scaleX(-1); }

/* Build stickman */
.sprite::before { /* head */
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 18px;
  height: 18px;
  margin-left: -9px;
  border-radius: 50%;
  background: var(--accent);
}
.sprite::after { /* body */
  content: '';
  position: absolute;
  top: 24px;
  left: 50%;
  width: 6px;
  height: 26px;
  margin-left: -3px;
  background: var(--accent);
  border-radius: 3px;
}
.fighter .arm-left, .fighter .arm-right,
.fighter .leg-left, .fighter .leg-right {
  position: absolute;
  background: var(--accent);
  width: 5px;
  height: 22px;
  top: 26px;
  border-radius: 3px;
  transform-origin: top center;
  z-index: 2;
}
.fighter .arm-left { left: 50%; margin-left: -12px; }
.fighter .arm-right { left: 50%; margin-left: 7px; }
.fighter .leg-left { left: 50%; margin-left: -8px; top: 46px; height: 24px; }
.fighter .leg-right { left: 50%; margin-left: 3px; top: 46px; height: 24px; }

/* Running animation */
@keyframes swing {
  0% { transform: rotate(20deg); }
  50% { transform: rotate(-20deg); }
  100% { transform: rotate(20deg); }
}

.fighter.running .arm-left,
.fighter.running .leg-right { animation: swing 0.3s linear infinite; }
.fighter.running .arm-right,
.fighter.running .leg-left { animation: swing 0.3s linear infinite reverse; }

/* Attack pose animations */
.fighter.attacking .arm-right {
  animation: arm-punch 0.28s cubic-bezier(.2,.8,.2,1);
  will-change: transform;
}
@keyframes arm-punch {
  0% { transform: rotate(10deg) scaleY(1); }
  40% { transform: rotate(-50deg) scaleY(1.25) translateY(-1px); }
  70% { transform: rotate(-85deg) scaleY(1.6) translateY(-2px); }
  100% { transform: rotate(-20deg) scaleY(1.05); }
}

/* Jump pose */
.fighter.jumping .leg-left,
.fighter.jumping .leg-right { transform: rotate(-20deg); }

/* Arena shake */
.arena.shake { animation: shake 0.16s ease; }
@keyframes shake {
  0% { transform: translate(0,0); }
  25% { transform: translate(-2px, 2px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-1px, -1px); }
  100% { transform: translate(0,0); }
}

/* Platforms */
.platform {
  position: absolute;
  left: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.25));
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35);
}

/* Emotes (rendered inside each fighter, above the head) */
.emote {
  position: absolute;
  bottom: 124px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.6));
  animation: emote-pop 4s ease forwards;
  pointer-events: none;
  z-index: 5;
}
@keyframes emote-pop {
  0% { opacity: 0; transform: translateY(8px) scale(0.9); }
  20% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-18px) scale(0.95); }
}

/* Damage popups */
.damage {
  position: absolute;
  left: 0; bottom: 0;
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  text-shadow: 0 1px 0 #000, 0 0 8px rgba(255,255,255,0.6);
  animation: dmg-float 0.6s ease-out forwards;
  pointer-events: none;
  z-index: 6;
}

/* HP status line */
.status-line {
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 20px;
  height: 20px;
  flex-wrap: nowrap;
  overflow: visible;
  opacity: 0.95;
}
.status-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  white-space: nowrap;
}
.status-nekoglai { border-color: rgba(79,70,229,0.6); }
.status-mafanya { border-color: rgba(239,68,68,0.6); }
.status-boost { border-color: rgba(34,197,94,0.6); }
.status-shield { border-color: rgba(59,130,246,0.9); background: rgba(59,130,246,0.18); }
.status-speed { border-color: rgba(236,72,153,0.9); background: rgba(236,72,153,0.18); }
.status-pill.glow { animation: boost-glow 0.9s ease-in-out infinite; }
@keyframes boost-glow {
  0% { box-shadow: 0 0 6px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 0 14px rgba(255,255,255,0.8); }
  100% { box-shadow: 0 0 6px rgba(255,255,255,0.3); }
}

/* Rage mode */
.fighter.enraged .sprite {
  animation: rage-glow 0.8s ease-in-out infinite;
  filter: drop-shadow(0 0 6px rgba(255,80,80,0.5));
}
.fighter.enraged .head {
  box-shadow: none;
}
@keyframes rage-glow {
  0% { filter: drop-shadow(0 0 6px rgba(255,80,80,0.45)); }
  50% { filter: drop-shadow(0 0 14px rgba(255,60,60,0.85)); }
  100% { filter: drop-shadow(0 0 6px rgba(255,80,80,0.45)); }
}

/* Low HP bar pulse */
.hp-low {
  animation: hp-pulse 0.9s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(255,80,80,0.6);
}
@keyframes hp-pulse {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.5); }
  100% { filter: brightness(1); }
}
@keyframes dmg-float {
  0% { opacity: 0; transform: translateY(0) scale(0.9); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-24px) scale(1); }
}

/* Hearts near Polina */
.hearts {
  position: relative;
  height: 0;
  width: 120px;
  margin-top: 2px;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
}
.hearts span {
  position: absolute;
  top: 10px;
  font-size: 14px;
  animation: heart-up 2.6s ease-in-out infinite;
  opacity: 0.85;
}
.hearts span:nth-child(1) { left: 10%; animation-delay: 0s; }
.hearts span:nth-child(2) { left: 30%; animation-delay: 0.5s; }
.hearts span:nth-child(3) { left: 50%; animation-delay: 1s; }
.hearts span:nth-child(4) { left: 70%; animation-delay: 1.5s; }
.hearts span:nth-child(5) { left: 90%; animation-delay: 2s; }
@keyframes heart-up {
  0% { transform: translateY(0) scale(0.7) rotate(-6deg); opacity: 0; }
  15% { opacity: 1; }
  60% { transform: translateY(-18px) scale(1) rotate(4deg); }
  100% { transform: translateY(-34px) scale(1.08) rotate(-2deg); opacity: 0; }
}

/* Polina speech bubble */
.polina-bubble {
  animation: polina-pop 0.3s ease-out, polina-fade 3.5s ease-out forwards;
}
@keyframes polina-pop {
  0% { opacity: 0; transform: translateY(4px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes polina-fade {
  0% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

/* Prevent mouse hit */
.fighter { pointer-events: none; }

/* Косяк на земле */
.pickup-bong-wrap {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 40px;
  height: 40px;
  pointer-events: none;
  z-index: 3;
}
.pickup-bong {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  animation: bong-bob 1.2s ease-in-out infinite;
}
.pickup-bong-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
}
@keyframes bong-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Некоглай в ступоре — визуально сидит */
.fighter.sitting .sprite {
  transform-origin: bottom center;
}
.fighter.sitting .sprite.face-right {
  transform: scale(0.75) translateY(12px);
}
.fighter.sitting .sprite.face-left {
  transform: scaleX(-1) scale(0.75) translateY(12px);
}
.fighter.sitting .leg-left,
.fighter.sitting .leg-right {
  transform: rotate(45deg);
}
.fighter.sitting.running .leg-left,
.fighter.sitting.running .leg-right { animation: none; }
</style>
