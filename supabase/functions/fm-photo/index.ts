// FitMate 사진 인증 Edge Function
// - POST: participant token 검증 후 Storage에 업로드 (service role — 클라이언트에 쓰기 권한 불필요)
// - GET:  챌린지·날짜별 사진 목록 (Storage list)
// 버킷/테이블 DDL 없이 동작: 버킷은 최초 업로드 시 자동 생성, 메타데이터는 Storage 경로가 대신한다.
// 경로 규칙: {challengeId}/{date}/{participantId}.jpg
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const BUCKET = 'fitmate-photos'
const MAX_BYTES = 1_048_576 // 1MB (클라이언트에서 압축해서 보냄)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const challengeId = url.searchParams.get('challengeId') ?? ''
      const date = url.searchParams.get('date') ?? ''
      if (!/^[0-9a-f-]{36}$/.test(challengeId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json({ error: 'BAD_PARAMS' }, { status: 400, headers: cors })
      }
      const { data, error } = await admin.storage.from(BUCKET).list(`${challengeId}/${date}`, { limit: 100 })
      if (error) {
        // 버킷이 아직 없으면 빈 목록
        if (/not found/i.test(error.message)) return Response.json([], { headers: cors })
        throw error
      }
      const photos = (data ?? [])
        .filter((f) => f.name.endsWith('.jpg'))
        .map((f) => ({
          participantId: f.name.slice(0, -4),
          path: `${challengeId}/${date}/${f.name}`,
          updatedAt: f.updated_at ?? f.created_at ?? '',
        }))
      return Response.json(photos, { headers: cors })
    }

    if (req.method === 'POST') {
      const { participantId, token, date, imageBase64 } = await req.json()
      if (!participantId || !token || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !imageBase64) {
        return Response.json({ error: 'BAD_PARAMS' }, { status: 400, headers: cors })
      }
      // 본인 확인 (RPC assert_token과 동일한 규칙)
      const { data: pt } = await admin
        .from('participants')
        .select('id, challenge_id')
        .eq('id', participantId)
        .eq('token', token)
        .maybeSingle()
      if (!pt) return Response.json({ error: 'INVALID_TOKEN' }, { status: 403, headers: cors })

      const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0))
      if (bytes.length > MAX_BYTES) return Response.json({ error: 'TOO_LARGE' }, { status: 413, headers: cors })

      // 버킷 보장 (이미 있으면 에러 무시)
      await admin
        .storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ['image/jpeg'] })
        .catch(() => {})

      const path = `${pt.challenge_id}/${date}/${participantId}.jpg`
      const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
        upsert: true,
        contentType: 'image/jpeg',
      })
      if (error) throw error
      return Response.json({ path }, { headers: cors })
    }

    return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, headers: cors })
  } catch (e) {
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500, headers: cors })
  }
})
