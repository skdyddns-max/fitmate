import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** 환경변수가 설정된 경우에만 클라이언트 생성. 없으면 로컬 스토어로 폴백 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
