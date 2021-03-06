import Vue from 'vue'

import { base } from '@/utils/appcd'
import { normalizeReleases } from '@/utils/sdk'

const withBase = base('titanium', '1.7.0')

export const state = () => ({
  installed: [],
  installing: null,
  lastInstall: {},
  uninstalling: false,
  releases: [],
  latestRelease: null
})

export const getters = {
  updateAvailable: state => {
    if (state.latestRelease === null) {
      return false
    }

    const installedIndex = state.installed.findIndex(
      sdkInfo => sdkInfo.name === state.latestRelease
    )
    return installedIndex === -1
  }
}

export const mutations = {
  setInstalled(state, installed) {
    installed.forEach(i => i.manifest.platforms.sort())
    Vue.set(state, 'installed', installed)
  },
  setReleases(state, releases) {
    Vue.set(state, 'releases', releases)
  },
  setLatestRelease(state, releaseName) {
    state.latestRelease = releaseName
  },
  installing(state, installing) {
    state.installing = installing
  },
  lastInstall(state, payload) {
    state.lastInstall = payload
  },
  uninstalling(state, uninstalling) {
    state.uninstalling = uninstalling
  },
  uninstalled(state, sdkVersion) {
    const index = state.installed.findIndex(i => i.name === sdkVersion)
    if (index !== -1) {
      state.installed.splice(index, 1)
    }
  }
}

export const actions = {
  async fetchInstalled(context) {
    const { data } = await this.$axios.get(withBase('sdk/list'))
    context.commit('setInstalled', data.reverse())
  },
  async fetchReleases(context) {
    try {
      const { data } = await this.$axios.get(withBase('sdk/releases'))
      const latest = data.latest
      delete data.latest
      const releases = normalizeReleases(data)
      releases.sort((a, b) => b.name.localeCompare(a.name))
      context.commit('setReleases', releases)
      context.commit('setLatestRelease', latest.name)
    } catch (e) {
      context.commit('setReleases', [])
      context.commit('setLatestRelease', null)
    }
  },
  async install(context, options) {
    const { sdkVersion, overwrite } = options
    context.commit('installing', sdkVersion)
    const response = await this.$axios.post(
      withBase(`sdk/install/${sdkVersion}`),
      {
        data: {
          overwrite
        }
      }
    )
    await context.dispatch('fetchInstalled')
    context.commit('installing', null)
    context.commit('lastInstall', {
      sdkVersion,
      success: response.status === 200,
      message: response.data
    })
  },
  async uninstall(context, sdkVersion) {
    context.commit('uninstalling', true)
    await this.$axios.post(withBase(`sdk/uninstall/${sdkVersion}`), {
      data: {}
    })
    context.commit('uninstalled', sdkVersion)
    context.commit('uninstalling', false)
  }
}
