-- ============================================================
-- FitMate Supabase 스키마 (전체를 SQL Editor에 붙여넣고 실행)
--
-- 보안 모델 (익명 참여):
--  · 참여 시 participants.token(uuid)을 발급해 클라이언트 기기에 저장
--  · 읽기: 공개 select (참가자 목록은 token을 뺀 뷰로만 노출)
--  · 체중: 본인 token 검증 RPC로만 조회 (다른 사람에게 비공개)
--  · 쓰기: 전부 token 검증 RPC (security definer) — 직접 insert/update 불가
-- ============================================================

-- ---------- 테이블 ----------
create table challenges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

create table missions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  emoji text not null default '✅',
  title text not null,
  sort_order int not null default 0
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  nickname text not null,
  token uuid not null default gen_random_uuid(),
  joined_at timestamptz default now(),
  unique (challenge_id, nickname)
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  date date not null,
  unique (participant_id, mission_id, date)
);

create table weights (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1) not null,
  unique (participant_id, date)
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  date date not null,
  from_participant_id uuid not null references participants(id) on delete cascade,
  to_participant_id uuid not null references participants(id) on delete cascade,
  emoji text not null,
  unique (date, from_participant_id, to_participant_id, emoji)
);

-- ---------- RLS ----------
alter table challenges enable row level security;
alter table missions enable row level security;
alter table participants enable row level security;
alter table checkins enable row level security;
alter table weights enable row level security;
alter table reactions enable row level security;

-- 읽기 공개 (방 코드가 사실상의 비밀키)
create policy sel_challenges on challenges for select using (true);
create policy sel_missions on missions for select using (true);
create policy sel_checkins on checkins for select using (true);
create policy sel_reactions on reactions for select using (true);
-- participants: token 노출 방지를 위해 테이블 직접 select 정책 없음 (뷰로만)
-- weights: select 정책 없음 (본인 확인 RPC로만)

-- 참가자 공개 뷰 (token 제외)
create view participants_public as
  select id, challenge_id, nickname, joined_at from participants;
grant select on participants_public to anon;

-- ---------- 내부 헬퍼 ----------
create or replace function assert_token(p_participant uuid, p_token uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from participants where id = p_participant and token = p_token) then
    raise exception 'INVALID_TOKEN';
  end if;
end;
$$;

-- ---------- RPC (클라이언트가 호출하는 API) ----------
create or replace function api_create_challenge(p_name text, p_start date, p_end date, p_missions jsonb)
returns jsonb language plpgsql security definer as $$
declare
  v_code text;
  v_ch challenges;
  m jsonb;
  i int := 0;
begin
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from challenges where code = v_code);
  end loop;
  insert into challenges (code, name, start_date, end_date)
    values (v_code, p_name, p_start, p_end) returning * into v_ch;
  for m in select * from jsonb_array_elements(p_missions) loop
    insert into missions (challenge_id, emoji, title, sort_order)
      values (v_ch.id, coalesce(m->>'emoji', '✅'), m->>'title', i);
    i := i + 1;
  end loop;
  return to_jsonb(v_ch);
end;
$$;

create or replace function api_join_challenge(p_code text, p_nickname text)
returns jsonb language plpgsql security definer as $$
declare
  v_ch challenges;
  v_pt participants;
begin
  select * into v_ch from challenges where code = upper(p_code);
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  begin
    insert into participants (challenge_id, nickname)
      values (v_ch.id, trim(p_nickname)) returning * into v_pt;
  exception when unique_violation then
    raise exception 'NICKNAME_TAKEN';
  end;
  return to_jsonb(v_pt); -- token 포함: 본인 기기에 저장
end;
$$;

create or replace function api_toggle_checkin(p_participant uuid, p_token uuid, p_mission uuid, p_date date)
returns void language plpgsql security definer as $$
declare v_ch uuid;
begin
  perform assert_token(p_participant, p_token);
  select challenge_id into v_ch from participants where id = p_participant;
  if exists (select 1 from checkins where participant_id = p_participant and mission_id = p_mission and date = p_date) then
    delete from checkins where participant_id = p_participant and mission_id = p_mission and date = p_date;
  else
    insert into checkins (challenge_id, participant_id, mission_id, date) values (v_ch, p_participant, p_mission, p_date);
  end if;
end;
$$;

create or replace function api_get_weights(p_participant uuid, p_token uuid)
returns setof weights language plpgsql security definer as $$
begin
  perform assert_token(p_participant, p_token);
  return query select * from weights where participant_id = p_participant order by date;
end;
$$;

create or replace function api_upsert_weight(p_participant uuid, p_token uuid, p_date date, p_weight numeric)
returns void language plpgsql security definer as $$
begin
  perform assert_token(p_participant, p_token);
  insert into weights (participant_id, date, weight_kg) values (p_participant, p_date, p_weight)
    on conflict (participant_id, date) do update set weight_kg = excluded.weight_kg;
end;
$$;

create or replace function api_toggle_reaction(
  p_challenge uuid, p_date date, p_from uuid, p_token uuid, p_to uuid, p_emoji text
)
returns void language plpgsql security definer as $$
begin
  perform assert_token(p_from, p_token);
  if exists (
    select 1 from reactions
    where date = p_date and from_participant_id = p_from and to_participant_id = p_to and emoji = p_emoji
  ) then
    delete from reactions
    where date = p_date and from_participant_id = p_from and to_participant_id = p_to and emoji = p_emoji;
  else
    insert into reactions (challenge_id, date, from_participant_id, to_participant_id, emoji)
      values (p_challenge, p_date, p_from, p_to, p_emoji);
  end if;
end;
$$;

-- anon 키로 RPC 실행 허용
grant execute on function api_create_challenge(text, date, date, jsonb) to anon;
grant execute on function api_join_challenge(text, text) to anon;
grant execute on function api_toggle_checkin(uuid, uuid, uuid, date) to anon;
grant execute on function api_get_weights(uuid, uuid) to anon;
grant execute on function api_upsert_weight(uuid, uuid, date, numeric) to anon;
grant execute on function api_toggle_reaction(uuid, date, uuid, uuid, uuid, text) to anon;
