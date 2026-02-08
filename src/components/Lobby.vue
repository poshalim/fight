<template>
  <div class="mx-auto max-w-5xl p-6">
    <section class="rounded-xl bg-gray-800/70 backdrop-blur p-6 md:p-8 border border-gray-700/50">
      <div class="grid md:grid-cols-2 gap-6 items-center">
        <div class="space-y-3">
          <h2 class="text-2xl md:text-3xl font-black leading-tight">
            Войди в комнату и сразись за Полину <span class="text-polina">💚</span>
          </h2>
          <p class="text-sm text-gray-300">Первый вошедший — Некоглай, второй — Мафаня. Управление: A/D, Space, K, E (эмоция).</p>

          <form class="space-y-3" @submit.prevent="join">
            <input v-model="roomId" type="text" placeholder="ID комнаты (например 777)" class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-polina placeholder-gray-500"/>
            <div class="flex gap-2">
              <button :disabled="loading || !roomId" class="px-4 py-2 rounded-lg bg-polina text-gray-900 font-bold disabled:opacity-50">Войти и биться</button>
              <button type="button" class="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm" @click="roomId = String(Math.floor(Math.random()*999999))">Случайный ID</button>
            </div>
          </form>

          <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg p-3 text-center bg-gradient-to-br from-indigo-600/40 to-indigo-900/20 border border-indigo-500/30">
            <div class="text-xs opacity-80 mb-1">Некоглай</div>
            <div class="aspect-[4/5] rounded-lg bg-center bg-cover" :style="{ backgroundImage: `url(${nekoglaiCard})` }"></div>
          </div>
          <div class="rounded-lg p-3 text-center bg-gradient-to-br from-rose-600/40 to-rose-900/20 border border-rose-500/30">
            <div class="text-xs opacity-80 mb-1">Мафаня</div>
            <div class="aspect-[4/5] rounded-lg bg-center bg-cover" :style="{ backgroundImage: `url(${mafanyaCard})` }"></div>
          </div>
          <div class="col-span-2 rounded-lg p-3 text-center bg-gradient-to-br from-emerald-600/40 to-emerald-900/20 border border-emerald-500/30">
            <div class="text-xs opacity-80 mb-2">Полина ждёт победителя 👑</div>
            <div
              class="mx-auto aspect-[4/5] max-w-[180px] rounded-lg bg-center bg-cover border border-emerald-300/60 shadow-lg"
              :style="{ backgroundImage: `url(${polinaCard})` }"
            ></div>
            <div class="mt-2 text-3xl">💚💚💚</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoomStore } from '../stores/room'

const roomStore = useRoomStore()
const roomId = ref('')
const loading = ref(false)
const error = ref('')

import nekoglaiCard from '../../nekog.webp'
import mafanyaCard from '../../mafa.jpg'
import polinaCard from '../../polina.jpeg'

async function join() {
  error.value = ''
  loading.value = true
  try {
    await roomStore.joinRoom(roomId.value.trim())
  } catch (e: any) {
    error.value = e?.message || 'Ошибка входа'
  } finally {
    loading.value = false
  }
}
</script>
