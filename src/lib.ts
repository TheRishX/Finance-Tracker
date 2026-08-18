import { createClient } from '@supabase/supabase-js'

export type Category = string
export type SpendingCategory = { id:string; name:string; color:string }
export type Expense = { id: string; amount: number; category: Category; note: string; spent_at: string; payment_method: 'cash'|'credit_card'; credit_card_id?: string|null }
export type CreditCard = { id: string; name: string; last_four?: string|null }
export type WishlistItem = { id: string; name: string; price: number; url?: string; answers: string[]; status: 'thinking' | 'buy' | 'save' }
export type FundKind = 'savings' | 'mutual_fund' | 'emergency'
export type Fund = { id: string; name: string; kind: FundKind; balance: number; hidden: boolean }
export type Profile = { display_name: string; contact_email: string; phone: string; birth_date: string; cycle_start_day: number; monthly_budget: number; currency: string; emergency_reminders: boolean }

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null

export const defaultProfile: Profile = { display_name:'', contact_email:'', phone:'', birth_date:'', cycle_start_day: 20, monthly_budget: 0, currency: 'NPR', emergency_reminders: true }

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}

export async function loadFinanceData(userId: string) {
  const client = requireClient()
  const profileFields='display_name,contact_email,phone,birth_date,cycle_start_day,monthly_budget,currency,emergency_reminders'
  let { data: profile, error: profileError } = await client.from('profiles').select(profileFields).eq('user_id', userId).maybeSingle()
  if (profileError) throw profileError
  if (!profile) {
    const created = await client.from('profiles').insert({ user_id: userId, ...defaultProfile, contact_email:null, phone:null, birth_date:null }).select(profileFields).single()
    if (created.error?.code === '23505') {
      const existing = await client.from('profiles').select(profileFields).eq('user_id', userId).single()
      if (existing.error) throw existing.error
      profile = existing.data
    } else {
      if (created.error) throw created.error
      profile = created.data
    }
  }
  const [expenseResult, wishlistResult, fundResult] = await Promise.all([
    client.from('expenses').select('id,amount,category,note,spent_at,payment_method,credit_card_id').order('spent_at', { ascending: false }),
    client.from('wishlist_items').select('id,name,price,url,reflection_answers,status').order('created_at', { ascending: false }),
    client.from('funds').select('id,name,kind,balance,hidden').order('created_at'),
  ])
  if (expenseResult.error) throw expenseResult.error
  if (wishlistResult.error) throw wishlistResult.error
  if (fundResult.error) throw fundResult.error

  let funds = (fundResult.data || []).map(f => ({ ...f, balance: Number(f.balance) })) as Fund[]
  if (!funds.length) {
    const defaults = [
      { user_id: userId, name: 'Emergency fund', kind: 'emergency', hidden: true },
      { user_id: userId, name: 'Mutual funds', kind: 'mutual_fund', hidden: true },
      { user_id: userId, name: 'Savings', kind: 'savings', hidden: true },
    ]
    const created = await client.from('funds').upsert(defaults, { onConflict: 'user_id,kind' }).select('id,name,kind,balance,hidden')
    if (created.error) throw created.error
    funds = (created.data || []).map(f => ({ ...f, balance: Number(f.balance) })) as Fund[]
  }
  return {
    profile: { ...profile, display_name:profile.display_name||'', contact_email:profile.contact_email||'', phone:profile.phone||'', birth_date:profile.birth_date||'', monthly_budget: Number(profile.monthly_budget) } as Profile,
    expenses: (expenseResult.data || []).map(e => ({ ...e, amount: Number(e.amount) })) as Expense[],
    wishlist: (wishlistResult.data || []).map(w => ({ id: w.id, name: w.name, price: Number(w.price), url: w.url || undefined, answers: w.reflection_answers as string[], status: w.status })) as WishlistItem[],
    funds,
  }
}

export async function loadCreditCards() {
  const { data, error } = await requireClient().from('credit_cards').select('id,name,last_four').order('created_at')
  if (error) throw error
  return (data || []) as CreditCard[]
}
const defaultCategories = [{name:'Food',color:'#c7e8a3'},{name:'Transport',color:'#a8d8e8'},{name:'Study',color:'#c9b8ee'},{name:'Bills',color:'#f3cb85'},{name:'Fun',color:'#f2a9b8'},{name:'Other',color:'#c8cbc5'}]
export async function loadSpendingCategories(userId:string) {
  const client=requireClient();let {data,error}=await client.from('spending_categories').select('id,name,color').order('created_at');if(error)throw error
  if(!data?.length){const made=await client.from('spending_categories').insert(defaultCategories.map(c=>({...c,user_id:userId}))).select('id,name,color');if(made.error)throw made.error;data=made.data}
  return (data||[]) as SpendingCategory[]
}
export async function createSpendingCategory(userId:string,name:string,color:string){const {data,error}=await requireClient().from('spending_categories').insert({user_id:userId,name,color}).select('id,name,color').single();if(error)throw error;return data as SpendingCategory}
export async function updateSpendingCategory(category:SpendingCategory,changes:Pick<SpendingCategory,'name'|'color'>){const client=requireClient();const oldName=category.name;const updated=await client.from('spending_categories').update(changes).eq('id',category.id);if(updated.error)throw updated.error;if(changes.name!==oldName){const moved=await client.from('expenses').update({category:changes.name}).eq('category',oldName);if(moved.error){await client.from('spending_categories').update({name:oldName,color:category.color}).eq('id',category.id);throw moved.error}}}
export async function deleteSpendingCategory(category:SpendingCategory){const client=requireClient();if(category.name!=='Other'){const moved=await client.from('expenses').update({category:'Other'}).eq('category',category.name);if(moved.error)throw moved.error}const {error}=await client.from('spending_categories').delete().eq('id',category.id);if(error)throw error}
export async function createCreditCard(userId: string, card: Omit<CreditCard,'id'>) {
  const { data, error } = await requireClient().from('credit_cards').insert({ ...card, user_id:userId }).select('id,name,last_four').single()
  if (error) throw error
  return data as CreditCard
}
export async function updateCreditCard(id: string, changes: Partial<Omit<CreditCard,'id'>>) {
  const { error } = await requireClient().from('credit_cards').update(changes).eq('id',id)
  if (error) throw error
}
export async function deleteCreditCard(id: string) {
  const { error } = await requireClient().from('credit_cards').delete().eq('id',id)
  if (error) throw error
}

export async function createExpense(userId: string, expense: Expense) {
  const { error } = await requireClient().from('expenses').insert({ ...expense, user_id: userId })
  if (error) throw error
}
export async function createWishlistItem(userId: string, item: WishlistItem) {
  const { answers, ...rest } = item
  const { error } = await requireClient().from('wishlist_items').insert({ ...rest, user_id: userId, reflection_answers: answers })
  if (error) throw error
}
export async function updateWishlistItem(id: string, changes: Partial<WishlistItem>) {
  const { answers, ...rest } = changes
  const payload = answers ? { ...rest, reflection_answers: answers } : rest
  const { error } = await requireClient().from('wishlist_items').update(payload).eq('id', id)
  if (error) throw error
}
export async function deleteWishlistItem(id: string) {
  const { error } = await requireClient().from('wishlist_items').delete().eq('id', id)
  if (error) throw error
}
export async function updateExpense(id: string, changes: Partial<Expense>) {
  const { error } = await requireClient().from('expenses').update(changes).eq('id', id)
  if (error) throw error
}
export async function deleteExpense(id: string) {
  const { error } = await requireClient().from('expenses').delete().eq('id', id)
  if (error) throw error
}
export async function updateProfile(userId: string, changes: Partial<Profile>) {
  const payload = { ...changes, ...(changes.birth_date === '' ? { birth_date: null } : {}) }
  const { error } = await requireClient().from('profiles').update(payload).eq('user_id', userId)
  if (error) throw error
}
export async function addToFund(id: string, currentBalance: number, amount: number) {
  const { error } = await requireClient().from('funds').update({ balance: currentBalance + amount }).eq('id', id)
  if (error) throw error
}
export async function updateFund(id: string, changes: Partial<Pick<Fund, 'name'|'balance'|'hidden'>>) {
  const { error } = await requireClient().from('funds').update(changes).eq('id', id)
  if (error) throw error
}
export async function deleteFund(id: string) {
  const { error } = await requireClient().from('funds').delete().eq('id', id)
  if (error) throw error
}
export async function createFund(userId: string, fund: Pick<Fund, 'name'|'kind'|'balance'|'hidden'>) {
  const { data, error } = await requireClient().from('funds').insert({ ...fund, user_id: userId }).select('id,name,kind,balance,hidden').single()
  if (error) throw error
  return { ...data, balance: Number(data.balance) } as Fund
}
export async function resetFinanceData(userId: string) {
  const client = requireClient()
  const results = await Promise.all([
    client.from('expenses').delete().eq('user_id', userId),
    client.from('wishlist_items').delete().eq('user_id', userId),
    client.from('funds').update({ balance: 0 }).eq('user_id', userId),
    client.from('profiles').update({ monthly_budget: 0 }).eq('user_id', userId),
  ])
  const failed = results.find(result => result.error)
  if (failed?.error) throw failed.error
}

export function cycleRange(day: number, date = new Date()) {
  const d = new Date(date)
  let start = new Date(d.getFullYear(), d.getMonth(), day)
  if (d < start) start = new Date(d.getFullYear(), d.getMonth() - 1, day)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1, 23, 59, 59)
  return { start, end }
}
const currencySymbols: Record<string,string> = { NPR:'Rs', USD:'$', INR:'₹', EUR:'€', GBP:'£', AUD:'A$', CAD:'C$', JPY:'¥' }
export const money = (n: number, currency = 'NPR') => `${currencySymbols[currency] || currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`

type StoredPin = { salt: string; hash: string }
const pinKey = (userId: string) => `paisa.device-pin.${userId}`
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')

async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)))
}

export function hasDevicePin(userId: string) {
  return Boolean(localStorage.getItem(pinKey(userId)))
}

export async function saveDevicePin(userId: string, pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.')
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  localStorage.setItem(pinKey(userId), JSON.stringify({ salt, hash: await hashPin(pin, salt) } satisfies StoredPin))
}

export async function verifyDevicePin(userId: string, pin: string) {
  const raw = localStorage.getItem(pinKey(userId))
  if (!raw) return true
  try {
    const saved = JSON.parse(raw) as StoredPin
    return (await hashPin(pin, saved.salt)) === saved.hash
  } catch {
    return false
  }
}

export function removeDevicePin(userId: string) {
  localStorage.removeItem(pinKey(userId))
}
