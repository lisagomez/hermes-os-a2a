import { describe, expect, it } from 'vitest'
import { destinoCanonico } from './canonico'

const base = {
  pathname: '/login',
  search: '',
  siteUrl: 'https://meeting-copilot-pi.vercel.app',
  vercelEnv: 'production',
}

describe('destinoCanonico', () => {
  it('redirige una URL por-deployment de producción al host canónico', () => {
    expect(
      destinoCanonico({ ...base, host: 'meeting-copilot-7agvjumg6-lisagomezs-projects.vercel.app' })
    ).toBe('https://meeting-copilot-pi.vercel.app/login')
  })

  it('preserva path y query en el redirect', () => {
    expect(
      destinoCanonico({
        ...base,
        host: 'meeting-copilot-abc123.vercel.app',
        pathname: '/auth/callback',
        search: '?code=xyz&next=%2Fcitas',
      })
    ).toBe('https://meeting-copilot-pi.vercel.app/auth/callback?code=xyz&next=%2Fcitas')
  })

  it('no redirige cuando el host YA es el canónico', () => {
    expect(destinoCanonico({ ...base, host: 'meeting-copilot-pi.vercel.app' })).toBeNull()
  })

  it('compara el host sin distinguir mayúsculas', () => {
    expect(destinoCanonico({ ...base, host: 'Meeting-Copilot-PI.vercel.app' })).toBeNull()
  })

  it('no toca previews (VERCEL_ENV=preview)', () => {
    expect(
      destinoCanonico({ ...base, host: 'meeting-copilot-git-rama.vercel.app', vercelEnv: 'preview' })
    ).toBeNull()
  })

  it('no toca dev local (sin VERCEL_ENV)', () => {
    expect(destinoCanonico({ ...base, host: 'localhost:3000', vercelEnv: undefined })).toBeNull()
  })

  it('sin NEXT_PUBLIC_SITE_URL no hay canónico que imponer', () => {
    expect(
      destinoCanonico({ ...base, host: 'meeting-copilot-abc.vercel.app', siteUrl: undefined })
    ).toBeNull()
  })

  it('sin host (cliente raro) no redirige', () => {
    expect(destinoCanonico({ ...base, host: null })).toBeNull()
  })

  it('un siteUrl malformado no truena: no redirige', () => {
    expect(
      destinoCanonico({ ...base, host: 'meeting-copilot-abc.vercel.app', siteUrl: 'no-es-url' })
    ).toBeNull()
  })
})
