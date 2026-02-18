# HiPhant-Frontend (frontend)

Live demo: https://hiphant.pachylover.com/ ✅

A clean, fast Next.js frontend for viewing and sharing video highlights.

---

## 🚀 빠른 시작

```bash
# 의존성 설치
pnpm install

# 개발 서버 (Hot reload)
pnpm dev

# 빌드
pnpm build

# 프로덕션 실행
pnpm start
```

> Node + pnpm 환경을 사용합니다. (프로젝트 루트에 `pnpm-lock.yaml` 포함)

---

## 🔎 주요 기능

- 비디오 하이라이트 목록 및 개별 하이라이트 페이지
- 반응형 UI 및 라이트/다크 테마 지원
- 빠른 검색 및 목록 로딩 UX

---

## 🧩 기술 스택

- Framework: `Next.js` (React 기반)
- Language: `TypeScript`
- Styling: `Tailwind CSS` (+ tailwind-merge)
- UI primitives: `@radix-ui/*`
- Icons: `lucide-react` (inline SVG fallback available)
- Forms / Validation: `react-hook-form`, `zod`
- Charts / Visualization: `recharts`
- Notifications: `sonner`
- Build & package: `pnpm`, Vercel/静的 배포 호환

(자세한 의존성은 `package.json` 참조)

---

## 📁 레포 구조(요약)

- `app/` — 라우트 및 페이지
- `components/` — 재사용 가능한 UI 컴포넌트
- `styles/` — 전역 스타일
- `public/` — 정적 자산

---

## ⚙️ 배포

- 현재 배포: https://hiphant.pachylover.com/
- 권장 배포 플랫폼: Vercel, Netlify, 또는 정적 호스팅 (Next.js 빌드 출력 사용)

---

## 🤝 기여

Pull request 환영합니다. 간단한 변경(문구/스타일)은 바로 PR, 큰 변경은 issue로 먼저 논의해 주세요.

---

## 📬 연락처

이슈/기능 제안: GitHub 리포지토리 또는 `hiphant.contact@gmail.com`

---

If you'd like, I can:
- Add CI (GitHub Actions) for lint/build
- Add a `LICENSE` file (which license would you like?)
- Add screenshots or badges

