<template>
  <div class="min-h-screen flex flex-col app-bg">
    <header class="p-4 border-b border-gray-700/60 flex items-center justify-between bg-gray-900/70 backdrop-blur">
      <h1 class="text-2xl font-black tracking-wide flex items-center gap-2">
        <span>🔥 Битва за Полину</span>
        <span class="text-polina">💚</span>
      </h1>
      <div class="text-sm opacity-80 hidden sm:block">Победитель получает Полину (@moneyglaichka_pr)</div>
    </header>

    <main class="flex-1">
      <Lobby v-if="!roomStore.connectedRoomId" />
      <Game v-else />
    </main>

    <footer class="p-3 text-center text-xs opacity-80 bg-gray-900/70 backdrop-blur">
      <span>⚙️ Vue 3 + Pinia + Socket.io + Tailwind</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Lobby from './components/Lobby.vue'
import Game from './components/Game.vue'
import { useRoomStore } from './stores/room'

const roomStore = useRoomStore()
</script>

<style>
.app-bg {
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(79,70,229,0.25), transparent 60%),
    radial-gradient(1200px 600px at 80% 110%, rgba(16,185,129,0.25), transparent 60%),
    linear-gradient(180deg, #0f172a, #111827);
}
.app-bg::before {
  content: '💥💚👑💸😼⭐🔥';
  position: fixed; inset: 0; pointer-events: none; opacity: 0.06;
  font-size: 140px; line-height: 1; display: flex; align-items: center; justify-content: center;
  filter: blur(1px);
}
</style>
