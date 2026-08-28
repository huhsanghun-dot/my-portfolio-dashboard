# 자산 대시보드 백엔드 (Cloudflare Worker)

프론트엔드(정적 사이트)를 대신해 해외주식(Finnhub), 국내주식/ETF(키움증권), 암호화폐(Crypto.com)
시세를 조회하는 프록시입니다. API 키/증권사 인증정보는 전부 여기(서버)에만 보관되고, 브라우저에는
절대 노출되지 않습니다.

## 엔드포인트

- `GET /api/us-stock?symbol=AAPL` → `{ price, changePercent }`
- `GET /api/kr-stock?code=069500` → `{ price, changePercent }` (6자리 KRX 종목코드)
- `GET /api/crypto?symbol=BTC_USDT` → `{ price, changePercent }`
- `GET /health` → `{ ok: true }` (배포 확인용)

실패 시 `{ error: "..." }`와 함께 4xx/5xx 상태코드를 반환합니다.

## 배포 (Cloudflare 대시보드, 터미널 불필요)

1. [Cloudflare](https://dash.cloudflare.com) 무료 계정 생성 (이미 있으면 로그인)
2. **Workers & Pages** → **Create** → **Workers** 탭에서 **Import a repository** (Git 연동) 선택
3. 이 GitHub 저장소를 연결하고, **Root directory**를 `worker`로 지정
4. 배포되면 **Settings → Variables and Secrets**에서 아래 3개를 **Secret**으로 추가:
   - `KIWOOM_APP_KEY`
   - `KIWOOM_SECRET_KEY`
   - `FINNHUB_API_KEY`
5. 저장 후 재배포되면 `https://<워커이름>.<계정>.workers.dev/health`로 접속해 `{"ok":true}`가 뜨는지 확인

`ALLOWED_ORIGIN`, `KIWOOM_DOMAIN`은 `wrangler.toml`에 이미 값이 있어 별도 설정이 필요 없습니다
(모의투자 키로 먼저 테스트하려면 `KIWOOM_DOMAIN`을 `https://mockapi.kiwoom.com`으로 바꾸면 됩니다).

## 로컬 개발 (선택, 터미널 사용 시)

```bash
cd worker
npx wrangler dev
```
