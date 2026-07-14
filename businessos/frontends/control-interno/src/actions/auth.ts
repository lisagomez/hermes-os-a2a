'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isEmailAllowed, getRoleForEmail } from '@/lib/auth-config'
import { checkRateLimit, recordAttempt } from '@/lib/rate-limit'

function getClientIp(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headersList.get('x-real-ip') || 'unknown'
}

export async function login(formData: FormData) {
  const headersList = await headers()
  const ip = getClientIp(headersList)

  const { allowed, retryAfterDays } = await checkRateLimit(ip)
  if (!allowed) {
    return { error: `Too many attempts. Try again in ${retryAfterDays} day${retryAfterDays !== 1 ? 's' : ''}.` }
  }

  const email = (formData.get('email') as string).toLowerCase().trim()

  if (!isEmailAllowed(email)) {
    await recordAttempt(ip, email, false)
    return { error: 'Access denied. This email is not authorized.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error) {
    await recordAttempt(ip, email, false)
    return { error: error.message }
  }

  await recordAttempt(ip, email, true)

  const next = formData.get('next') as string | null
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signup(formData: FormData) {
  const email = (formData.get('email') as string).toLowerCase().trim()

  if (!isEmailAllowed(email)) {
    return { error: 'Access denied. This email is not authorized.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  // Set role and email on profile after signup
  if (data.user) {
    const role = getRoleForEmail(email)
    await supabase
      .from('profiles')
      .update({ role, email })
      .eq('id', data.user.id)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const email = (formData.get('email') as string).toLowerCase().trim()

  if (!isEmailAllowed(email)) {
    return { error: 'Access denied. This email is not authorized.' }
  }

  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File too large. Max 2MB.' }
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return { error: 'Only JPEG, PNG, and WebP are allowed.' }
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  const avatarUrl = `${publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, avatar_url: avatarUrl }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
