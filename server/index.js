import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const BASIC_AUTH_ENABLED = process.env.BASIC_AUTH_ENABLED !== 'false'
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'stream'
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'fight'
const BASIC_AUTH_TOKEN = process.env.BASIC_AUTH_TOKEN || 'stream-fight'

function isAuthorized(req) {
  if (!BASIC_AUTH_ENABLED) return true
  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const token = url.searchParams.get('token')
    if (token && token === BASIC_AUTH_TOKEN) return true
  } catch {}
  const header = req.headers.authorization || ''
  if (!header.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const [user, pass] = decoded.split(':')
  return user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS
}

function requireAuth(res) {
  res.statusCode = 401
  res.setHeader('WWW-Authenticate', 'Basic realm="fight"')
  res.end('Auth required')
}

httpServer.on('request', (req, res) => {
  if (!isAuthorized(req)) return requireAuth(res)
  if (req.url && req.url.startsWith('/socket.io/')) return
  res.statusCode = 200
  res.end('OK')
})

const io = new Server(httpServer, {
  cors: { origin: '*' },
  allowRequest: (req, cb) => {
    if (isAuthorized(req)) return cb(null, true)
    return cb('Unauthorized', false)
  },
})

const ARENA = { width: 960, height: 420, ground: 64 }
const PHYS = { speed: 12, jump: 120, gravity: 14 }
const MAX_HP = 500
const BOOST_CHANCE = 0.09
const BOOST_DURATION_MS = 5000
const SHIELD_DURATION_MS = 4500
const SPEED_MULTIPLIER = 1.6
const TICK_MS = 30
const GRAVITY_TICK = 2.6
const JUMP_V = 24

const PLATFORMS = [
  { id: 1, x: -220, y: 90, width: 160, height: 10 },
  { id: 2, x: 0, y: 140, width: 180, height: 10 },
  { id: 3, x: 220, y: 100, width: 160, height: 10 },
]

// реплики Полины: смешные/немного пошлые, но без явного фаворита
const POLINA_LINES = [
  'Так, мальчики, без синяков — только по эго бьём.',
  'Проигравший сегодня делает мне массаж ног, я предупредила.',
  'О, красиво попал… но не настолько, как я в твой вкус.',
  'Деритесь, деритесь, я потом скажу, что болела за обоих.',
  'Если кто‑то упадёт, я посмеюсь первой, подниму второй.',
  'Не спорьте, я всё равно выберу деньги.',
  'Кто победит — узнает мой настоящий любимый смайлик.',
  'Главное, чтобы драка, а не драмка — остальное обсудим после стрима.',
  'У кого HP кончится первым, тот сегодня без объятий.',
  'Вы деритесь, а я пока выбираю фильтр для сториса.',
]

function newPlayer(id) {
  return {
    id,
    x: 0,
    y: 0,
    hp: MAX_HP,
    grounded: true,
    stunned: false,
    damageBoost: false,
    speedBoost: false,
    shield: false,
  }
}

function ensureMotion(room) {
  if (!room.motion) {
    room.motion = {
      nekoglai: { vy: 0, timer: null },
      mafanya: { vy: 0, timer: null },
    }
  }
}

function platformAt(player, platforms) {
  const halfW = 20
  for (const p of platforms) {
    const left = p.x - p.width / 2
    const right = p.x + p.width / 2
    if (player.x + halfW > left && player.x - halfW < right && Math.abs(player.y - p.y) < 2) {
      return p
    }
  }
  return null
}

function landingPlatformOnFall(player, platforms, nextY) {
  const halfW = 20
  for (const p of platforms) {
    const left = p.x - p.width / 2
    const right = p.x + p.width / 2
    if (player.x + halfW <= left || player.x - halfW >= right) continue
    if (player.y >= p.y && nextY <= p.y) return p
  }
  return null
}

function startMotion(room, roomId, role, initialVy) {
  ensureMotion(room)
  const motion = room.motion[role]
  if (motion.timer) return
  motion.vy = initialVy
  motion.timer = setInterval(() => {
    const me = room.state[role]
    motion.vy -= GRAVITY_TICK
    let nextY = me.y + motion.vy

    if (motion.vy <= 0) {
      const landing = landingPlatformOnFall(me, room.state.platforms || [], nextY)
      if (landing) {
        me.y = landing.y
        me.grounded = true
        clearInterval(motion.timer)
        motion.timer = null
        io.to(roomId).emit('state', room.state)
        return
      }
    }

    if (nextY <= 0) {
      me.y = 0
      me.grounded = true
      clearInterval(motion.timer)
      motion.timer = null
      io.to(roomId).emit('state', room.state)
      return
    }

    me.y = Math.min(ARENA.height / 2 - 60, nextY)
    me.grounded = false
    io.to(roomId).emit('state', room.state)
  }, TICK_MS)
}

function resetPlayerEffects(player) {
  player.stunned = false
  player.damageBoost = false
  player.speedBoost = false
  player.shield = false
}

function clearMotion(room) {
  if (!room.motion) return
  Object.values(room.motion).forEach((m) => {
    if (m && m.timer) clearInterval(m.timer)
  })
  room.motion = null
}

function newState() {
  const s = {
    nekoglai: newPlayer('nekoglai'),
    mafanya: newPlayer('mafanya'),
    item: null, // { type: 'bong', x: number, y: number, id: number }
    platforms: PLATFORMS,
  }
  // spawn at opposite ends
  s.nekoglai.x = -ARENA.width / 2 + 40
  s.mafanya.x = ARENA.width / 2 - 40
  s.nekoglai.y = 0; s.nekoglai.grounded = true
  s.mafanya.y = 0; s.mafanya.grounded = true
  return s
}

function giveRandomPolinaBoost(room, roomId, role) {
  if (Math.random() > BOOST_CHANCE) return
  const target = room.state[role]
  if (!target) return
  if (!room.effectTimers) room.effectTimers = {}

  if (Math.random() < 0.5) {
    target.speedBoost = true
    io.to(roomId).emit('state', room.state)
    io.to(roomId).emit('polinaLine', { text: `${role === 'nekoglai' ? 'Некоглай' : 'Мафаня'} получила турбо‑ноги 💨` })
    const key = `${role}_speedBoost`
    if (room.effectTimers[key]) clearTimeout(room.effectTimers[key])
    room.effectTimers[key] = setTimeout(() => {
      target.speedBoost = false
      io.to(roomId).emit('state', room.state)
    }, BOOST_DURATION_MS)
  } else {
    target.shield = true
    io.to(roomId).emit('state', room.state)
    io.to(roomId).emit('polinaLine', { text: `${role === 'nekoglai' ? 'Некоглай' : 'Мафаня'} под защитой Полины 🛡️` })
    const key = `${role}_shield`
    if (room.effectTimers[key]) clearTimeout(room.effectTimers[key])
    room.effectTimers[key] = setTimeout(() => {
      target.shield = false
      io.to(roomId).emit('state', room.state)
    }, SHIELD_DURATION_MS)
  }
}

const rooms = new Map()

io.on('connection', (socket) => {
  socket.on('join', ({ roomId }, cb) => {
    if (!roomId) return cb?.({ ok: false, error: 'roomId required' })

    const room = rooms.get(roomId) || { state: newState(), members: new Set() }
    rooms.set(roomId, room)

    let role = 'nekoglai'
    if (room.members.has('nekoglai')) role = 'mafanya'

    if (room.members.size >= 2 && !room.members.has(role)) {
      return cb?.({ ok: false, error: 'Комната зан��та (2/2)' })
    }

    room.members.add(role)
    socket.data.role = role
    socket.join(roomId)
    socket.data.roomId = roomId

    // первый косяк появляется через 15 сек после старта; следующий — через 15 сек после подбора
    if (!room.nextSpawnTimer && room.members.size >= 1) {
      scheduleNextItemSpawn(room, roomId)
    }
    
    cb?.({ ok: true, role, state: room.state })
    io.to(roomId).emit('state', room.state)
  })

  socket.on('leave', ({ roomId }) => {
    leaveRoom(socket, roomId)
  })

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId
    leaveRoom(socket, roomId)
  })

  socket.on('restart', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.nextSpawnTimer) {
      clearTimeout(room.nextSpawnTimer)
      room.nextSpawnTimer = null
    }
    if (room.effectTimers) {
      Object.values(room.effectTimers).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
      room.effectTimers = {}
    }
    clearMotion(room)
    resetPlayerEffects(room.state.nekoglai)
    resetPlayerEffects(room.state.mafanya)
    room.state = newState()
    scheduleNextItemSpawn(room, roomId)
    io.to(roomId).emit('state', room.state)
  })

  socket.on('action', ({ roomId, action, payload }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const role = socket.data.role
    const me = room.state[role]
    const other = room.state[role === 'nekoglai' ? 'mafanya' : 'nekoglai']

    switch (action) {
      case 'move':
        // если некоглай в ступоре, не может двигаться
        if (role === 'nekoglai' && me.stunned) break
        // clamp with sprite half-width so character doesn't visually cross bounds
        {
          const half = ARENA.width / 2
          const pad = 20
          const halfSprite = 20 // ~40px sprite width on client
          const minX = -half + pad + halfSprite
          const maxX = half - pad - halfSprite
          const baseSpeed = role === 'nekoglai' ? PHYS.speed * 1.15 : PHYS.speed
          const step = me.speedBoost ? baseSpeed * SPEED_MULTIPLIER : baseSpeed
          if (payload?.dir === 'left') me.x = Math.max(minX, me.x - step)
          if (payload?.dir === 'right') me.x = Math.min(maxX, me.x + step)
        }
        if (me.y > 0 && me.grounded) {
          const onPlat = platformAt(me, room.state.platforms || [])
          if (!onPlat) {
            me.grounded = false
            startMotion(room, roomId, role, 0)
          }
        }
        break
      case 'jump':
        // если некоглай в ступоре, не может прыгать
        if (role === 'nekoglai' && me.stunned) break
        if (me.grounded) {
          me.grounded = false
          startMotion(room, roomId, role, JUMP_V)
        }
        break
      case 'attack':
        // если некоглай в ступоре, не может атаковать
        if (role === 'nekoglai' && me.stunned) break
        // broadcast attack for client-side animation
        io.to(roomId).emit('attack', { role })
        // simple hit detection by distance
        if (Math.abs(me.x - other.x) < 80 && Math.abs(me.y - other.y) < 60) {
          // если некоглай в ступоре — урон по нему не проходит
          if (other.id === 'nekoglai' && other.stunned) break
          // Некоглай бьёт 15, Мафаня — 10 (или 15 если есть буст урона)
          let dmg = role === 'nekoglai' ? 15 : 10
          if (role === 'mafanya' && me.damageBoost) dmg = 15
          if (other.shield) {
            dmg = Math.ceil(dmg * 0.4)
          }
          other.hp = Math.max(0, other.hp - dmg)
          io.to(roomId).emit('flash', { victim: other.id, dmg })
          // рандомная фраза Полины, одинаковая для обоих игроков
          const line = POLINA_LINES[Math.floor(Math.random() * POLINA_LINES.length)]
          io.to(roomId).emit('polinaLine', { text: line })
          giveRandomPolinaBoost(room, roomId, role)
        }
        break
      case 'pickup':
        if (room.state.item && Math.abs(me.x - room.state.item.x) < 50 && Math.abs(me.y - room.state.item.y) < 50) {
          const itemType = room.state.item.type
          room.state.item = null

          if (itemType === 'bong') {
            if (role === 'nekoglai') {
              me.stunned = true
              io.to(roomId).emit('itemPickup', { role, itemType, effect: 'stunned' })
              if (!room.effectTimers) room.effectTimers = {}
              room.effectTimers[`${role}_stunned`] = setTimeout(() => {
                me.stunned = false
                io.to(roomId).emit('state', room.state)
              }, 2000)
            } else if (role === 'mafanya') {
              me.damageBoost = true
              io.to(roomId).emit('itemPickup', { role, itemType, effect: 'damageBoost' })
              if (!room.effectTimers) room.effectTimers = {}
              room.effectTimers[`${role}_damageBoost`] = setTimeout(() => {
                me.damageBoost = false
                io.to(roomId).emit('state', room.state)
              }, 10000)
            }
          }

          io.to(roomId).emit('state', room.state)
          // следующий косяк через 15 сек
          scheduleNextItemSpawn(room, roomId)
        }
        break
      case 'emote':
        io.to(roomId).emit('emote', { role, value: payload?.value })
        break
    }

    io.to(roomId).emit('state', room.state)
  })
})

let globalItemId = 0
function scheduleNextItemSpawn(room, roomId) {
  if (room.nextSpawnTimer) return
  room.nextSpawnTimer = setTimeout(() => {
    room.nextSpawnTimer = null
    if (room.state.item) return // уже есть — не спавним
    const minX = -ARENA.width / 2 + 60
    const maxX = ARENA.width / 2 - 60
    const x = Math.random() * (maxX - minX) + minX
    let y = 0
    const platforms = room.state.platforms || []
    if (platforms.length && Math.random() < 0.5) {
      const p = platforms[Math.floor(Math.random() * platforms.length)]
      const left = p.x - p.width / 2 + 20
      const right = p.x + p.width / 2 - 20
      if (right > left) {
        y = p.y
        const px = Math.random() * (right - left) + left
        room.state.item = { type: 'bong', x: px, y, id: ++globalItemId }
      }
    }
    if (!room.state.item) {
      room.state.item = { type: 'bong', x, y, id: ++globalItemId }
    }
    io.to(roomId).emit('state', room.state)
  }, 15000)
}

function leaveRoom(socket, roomId) {
  if (!roomId) return
  const room = rooms.get(roomId)
  if (!room) return
  const role = socket.data.role
  if (role) room.members.delete(role)
  socket.leave(roomId)
  if (room.members.size === 0) {
    if (room.nextSpawnTimer) clearTimeout(room.nextSpawnTimer)
    if (room.effectTimers) {
      Object.values(room.effectTimers).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
    clearMotion(room)
    rooms.delete(roomId)
  }
}

httpServer.listen(3001, () => {
  console.log('socket.io server listening on :3001')
})
