'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteAllLogs(key: string) {
  if (!key || key !== process.env.LOG_SECRET_KEY) {
    throw new Error('Unauthorized')
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('access_logs')
    .delete()
    .gte('id', 1) // 전체 삭제
  if (error) throw error
}
