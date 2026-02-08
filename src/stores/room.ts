import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'
import { reactive, ref, computed } from 'vue'

export type Player = {
  id: string
  x: number
  y: number
  hp: number
  grounded: boolean
  stunned?: boolean
  damageBoost?: boolean
  speedBoost?: boolean
  shield?: boolean
}

export type Item = {
  type: 'bong'
  x: number
  y: number
  id: number
}

export type Platform = {
  id: number
  x: number
  y: number
  width: number
  height: number
}

export type GameState = {
  nekoglai: Player
  mafanya: Player
  you: Player
  opponent: Player
  flash: boolean
  item: Item | null
  platforms: Platform[]
}

const ARENA = {
  width: 960,
  height: 420,
  ground: 64,
}

const PHYS = {
  speed: 24,
  jump: 120,
  gravity: 14,
}

const MAX_HP = 500

function newPlayer(id = ''): Player {
  return { id, x: 0, y: 0, hp: MAX_HP, grounded: true }
}

export const useRoomStore = defineStore('room', () => {
  const gameState = reactive<GameState>({
    nekoglai: newPlayer('nekoglai'),
    mafanya: newPlayer('mafanya'),
    you: newPlayer(''),
    opponent: newPlayer(''),
    flash: false,
    item: null,
    platforms: [],
  })
  const isAttacking = ref<{ you: boolean; opponent: boolean }>({ you: false, opponent: false })
  const lastHit = ref<{ victim: 'nekoglai' | 'mafanya'; dmg: number } | null>(null)
  const lastEmote = ref<{ role: 'nekoglai' | 'mafanya'; value?: string; id: number } | null>(null)
  const lastItemPickup = ref<{ role: 'nekoglai' | 'mafanya'; itemType: string; effect: string; id: number } | null>(null)
  let emoteSeq = 0
  let itemPickupSeq = 0
  const polinaLine = ref<{ text: string; id: number } | null>(null)
  let polinaSeq = 0

  let socket: Socket | null = null
  const connectedRoomId = ref<string | null>(null)
  const youRole = ref<'nekoglai' | 'mafanya'>('nekoglai')

  function connect() {
    if (!socket) {
      const token = import.meta.env.VITE_BASIC_AUTH_TOKEN || 'stream-fight'
      socket = io('http://localhost:3001', { transports: ['websocket'], query: { token } })
      // inbound events
      socket.on('state', (s: any) => applyState(s))
      socket.on('flash', (payload: { victim: 'nekoglai' | 'mafanya'; dmg: number }) => {
        lastHit.value = payload
        gameState.flash = true
        setTimeout(() => (gameState.flash = false), 120)
      })
      socket.on('attack', ({ role }: { role: 'nekoglai'|'mafanya' }) => {
        const isYou = role === (youRole.value)
        if (isYou) triggerAttack('you')
        else triggerAttack('opponent')
      })
      socket.on('emote', ({ role, value }: { role: 'nekoglai'|'mafanya'; value?: string }) => {
        emoteSeq += 1
        lastEmote.value = { role, value, id: emoteSeq }
      })
      socket.on('polinaLine', ({ text }: { text: string }) => {
        polinaSeq += 1
        polinaLine.value = { text, id: polinaSeq }
      })
      socket.on('itemPickup', ({ role, itemType, effect }: { role: 'nekoglai'|'mafanya'; itemType: string; effect: string }) => {
        itemPickupSeq += 1
        lastItemPickup.value = { role, itemType, effect, id: itemPickupSeq }
      })
      socket.on('disconnect', () => {
        connectedRoomId.value = null
      })
    }
  }

  function joinRoom(roomId: string) {
    connect()
    return new Promise<void>((resolve, reject) => {
      if (!socket) return reject(new Error('socket not ready'))
      socket.emit('join', { roomId }, (res: { ok: boolean; role?: 'nekoglai'|'mafanya'; state?: any; error?: string }) => {
        if (!res.ok) return reject(new Error(res.error || 'join failed'))
        youRole.value = res.role || 'nekoglai'
        connectedRoomId.value = roomId
        applyState(res.state)
        resolve()
      })
    })
  }

  function leaveRoom() {
    if (socket && connectedRoomId.value) socket.emit('leave', { roomId: connectedRoomId.value })
    connectedRoomId.value = null
    resetLocal()
  }

  function restart() {
    if (socket && connectedRoomId.value) socket.emit('restart', { roomId: connectedRoomId.value })
  }

  function applyState(s: any) {
    const { nekoglai, mafanya, item, platforms } = s
    Object.assign(gameState.nekoglai, nekoglai)
    Object.assign(gameState.mafanya, mafanya)
    gameState.item = item || null
    gameState.platforms = platforms || []
    const you = youRole.value === 'nekoglai' ? gameState.nekoglai : gameState.mafanya
    const opponent = youRole.value === 'nekoglai' ? gameState.mafanya : gameState.nekoglai
    Object.assign(gameState.you, you)
    Object.assign(gameState.opponent, opponent)
  }

  function resetLocal() {
    Object.assign(gameState.nekoglai, newPlayer('nekoglai'))
    Object.assign(gameState.mafanya, newPlayer('mafanya'))
    Object.assign(gameState.you, newPlayer())
    Object.assign(gameState.opponent, newPlayer())
    gameState.flash = false
    gameState.item = null
    gameState.platforms = []
  }

  function send(action: string, payload?: any) {
    if (!socket || !connectedRoomId.value) return
    socket.emit('action', { roomId: connectedRoomId.value, action, payload })
  }

  function move(dir: 'left' | 'right') {
    send('move', { dir })
  }

  function jump() {
    send('jump')
  }

  function attack() {
    send('attack')
    triggerAttack('you')
  }

  function pickup() {
    send('pickup')
  }

  function emote(value?: string) {
    send('emote', { value })
    // local immediate feedback
    gameState.flash // no-op to touch reactive tree
  }

  function triggerAttack(who: 'you'|'opponent') {
    isAttacking.value = { ...isAttacking.value, [who]: true }
    setTimeout(() => {
      isAttacking.value = { ...isAttacking.value, [who]: false }
    }, 180)
  }

  return {
    gameState,
    isAttacking,
    lastHit,
    lastEmote,
    lastItemPickup,
    polinaLine,
    connectedRoomId,
    youIsNekoglai: computed(() => youRole.value === 'nekoglai'),
    joinRoom,
    leaveRoom,
    restart,
    move,
    jump,
    attack,
    pickup,
    emote,
  }
})
