# FitMate — 같이 하는 다이어트 챌린지

닉네임 + 6자리 방 코드로 로그인 없이 참여하는 그룹 다이어트 챌린지 웹앱.

## 실행

```bash
npm run dev   # http://localhost:8025
npm run build # tsc + vite build → dist/
```

## 구조

- Vite + React + TypeScript, 외부 UI 라이브러리 없음 (styles.css 하나)
- 라우팅: 해시 기반 (`src/App.tsx`) — `#/` 홈, `#/create`, `#/join?code=X`, `#/room/X`
- 데이터: `src/store.ts` — 현재 localStorage 구현. **모든 메서드 async** → 나중에 같은 시그니처의 Supabase 구현으로 교체 예정 (`supabase/schema.sql` 준비됨)
- 세션: `fitmate-session` localStorage 키에 방 코드별 `{participantId, token}` 저장 (익명 참여)
- 지표 계산: `src/utils.ts` — 달성률(체크 수/경과일×미션 수), 스트릭(전 미션 완료일 연속, 오늘 미완료 시 어제부터)

## 로드맵

- Phase 1 (현재): 로컬 데이터로 전체 UI 완성
- Phase 2: Supabase 연동(진짜 멀티유저), GitHub Pages 배포
- Phase 3: 사진 인증(Storage), PWA 푸시, 포인트·뱃지
