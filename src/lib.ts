import { createClient } from '@supabase/supabase-js'

export type Category = 'Food' | 'Transport' | 'Study' | 'Bills' | 'Fun' | 'Other'
export type Expense = { id: string; amount: number; category: Category; note: string; spent_at: string }
export type WishlistItem = { id: string; name: string; price: number; url?: string; answers: string[]; status: 'thinking' | 'buy' | 'save' }
export type FundKind = 'savings' | 'mutual_fund' | 'emergency'
export type Fund = { id: string; name: string; kind: FundKind; balance: number; hidden: boolean }
export type Profile = { cycle_start_day: number; monthly_budget: number; currency: string; emergency_reminders: boolean }

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null

export const defaultProfile: Profile = { cycle_start_day: 20, monthly_budget: 12000, currency: 'NPR', emergency_reminders: true }

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}

export async function loadFinanceData(userId: string) {
  const client = requireClient()
  let { data: profile, error: profileError } = await client.from('profiles').select('cycle_start_day,monthly_budget,currency,emergency_reminders').eq('user_id', userId).maybeSingle()
  if (profileError) throw profileError
  if (!profile) {
    const created = await client.from('profiles').insert({ user_id: userId, ...defaultProfile }).select('cycle_start_day,monthly_budget,currency,emergency_reminders').single()
    if (created.error) throw created.error
    profile = created.data
  }
  const [expenseResult, wishlistResult, fundResult] = await Promise.all([
    client.from('expenses').select('id,amount,category,note,spent_at').order('spent_at', { ascending: false }),
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
    profile: { ...profile, monthly_budget: Number(profile.monthly_budget) } as Profile,
    expenses: (expenseResult.data || []).map(e => ({ ...e, amount: Number(e.amount) })) as Expense[],
    wishlist: (wishlistResult.data || []).map(w => ({ id: w.id, name: w.name, price: Number(w.price), url: w.url || undefined, answers: w.reflection_answers as string[], status: w.status })) as WishlistItem[],
    funds,
  }
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
export async function updateWishlistStatus(id: string, status: WishlistItem['status']) {
  const { error } = await requireClient().from('wishlist_items').update({ status }).eq('id', id)
  if (error) throw error
}
export async function updateProfile(userId: string, changes: Partial<Profile>) {
  const { error } = await requireClient().from('profiles').update(changes).eq('user_id', userId)
  if (error) throw error
}
export async function addToFund(id: string, currentBalance: number, amount: number) {
  const { error } = await requireClient().from('funds').update({ balance: currentBalance + amount }).eq('id', id)
  if (error) throw error
}

export function cycleRange(day: number, date = new Date()) {
  const d = new Date(date)
  let start = new Date(d.getFullYear(), d.getMonth(), day)
  if (d < start) start = new Date(d.getFullYear(), d.getMonth() - 1, day)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1, 23, 59, 59)
  return { start, end }
}
export const money = (n: number) => `Rs ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`
