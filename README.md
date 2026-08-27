# 내 자산 대시보드

해외 주식(Alpha Vantage), 암호화폐(Crypto.com), 국내 상장 ETF(수동/자동 혼합)를 한 화면에서 관리하는
반응형 실시간 자산 대시보드입니다.

## 주요 기능

- **해외 주식**: Alpha Vantage `GLOBAL_QUOTE`로 60초마다 자동 시세 갱신
- **암호화폐**: Crypto.com Exchange 공개 API(키 불필요)로 60초마다 자동 시세 갱신
- **국내 ETF**: 페이지를 열 때마다 자동으로 최신가를 시도해서 가져오고, 실패하거나 원할 때는 언제든 수동으로
  가격을 입력/수정할 수 있는 필드 제공
- 모든 종목은 종목명 · 수량 · 매입가를 입력해 등록
- 총 자산가치(원화 환산)와 평가손익을 실시간으로 자동 계산
- 접속할 때마다 그날 날짜로 총 자산 스냅샷을 저장하고, 꺾은선(영역) 그래프로 시간에 따른 자산 변화를 시각화
- 모바일(휴대폰) · 아이패드 · 데스크톱에 맞춰 레이아웃이 자동으로 바뀌는 반응형 UI
- 모든 데이터(보유 종목, API 키, 스냅샷 기록)는 서버 없이 **브라우저 localStorage**에만 저장됩니다

## 시작하기 (API 키)

해외 주식 시세를 보려면 [Alpha Vantage에서 무료 API 키](https://www.alphavantage.co/support/#api-key)를
발급받아 앱 우측 상단 **⚙ 설정**에서 입력하세요. 이 키는 브라우저에만 저장되며 어디로도 전송되지 않습니다.
(무료 키는 분당 5회, 일 25회 호출 제한이 있습니다.)

암호화폐 시세는 별도 키 없이 바로 동작합니다.

## 로컬 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build   # dist/ 에 정적 파일 생성
npm run preview # 빌드 결과 미리보기
```

## 배포 (GitHub Pages)

`.github/workflows/deploy.yml`이 `main`과 `claude/asset-dashboard-realtime-65mtee` 브랜치에 push될 때마다
자동으로 빌드해서 GitHub Pages로 배포합니다. **최초 1회**, 저장소 Settings → Pages → Build and deployment →
Source를 **GitHub Actions**로 설정해야 합니다. 이후에는 push할 때마다 자동 배포됩니다.

배포 URL: `https://<github-user>.github.io/my-portfolio-dashboard/`

## 알아두면 좋은 점

- 국내 ETF 자동 조회는 공식 실시간 API가 없어 비공식 시세 조회를 시도하는 방식이라 100% 보장되지 않습니다.
  실패 시 항상 수동 입력 필드로 대체할 수 있습니다.
- Crypto.com 공개 API는 브라우저(CORS)에서 직접 호출하며, 네트워크 환경에 따라 차단될 수 있습니다.
  이 경우도 수동 입력 필드로 즉시 대체 가능합니다.
- 환율(USD/KRW)은 무료 공개 API(Frankfurter)로 조회하며, 실패 시 대략적인 기본값을 사용합니다.
