# 주가 시세 서버 (pykrx + yfinance)

국내 주식/ETF는 `pykrx`, 해외 주식은 `yfinance`로 시세를 조회하는 Python 서버입니다.
두 라이브러리 모두 API 키나 고정 IP 등록이 필요 없어서, 무료 호스팅(Render.com)에서
바로 돌릴 수 있습니다 (Kiwoom API처럼 IP를 등록해야 하는 서비스가 아닙니다).

## 엔드포인트

- `GET /api/us-stock?symbol=AAPL` → `{ price, changePercent }`
- `GET /api/kr-stock?code=005930` → `{ price, changePercent }` (6자리 KRX 종목코드)
- `GET /health` → `{ ok: true }`

## 배포 (Render.com, 터미널 불필요, 카드 등록 불필요)

1. [Render](https://render.com)에서 GitHub 계정으로 가입/로그인
2. 대시보드에서 **New +** → **Blueprint** 선택
3. 이 GitHub 저장소(`my-portfolio-dashboard`)를 연결하면 이 폴더의 `render.yaml`을
   자동으로 인식해서 설정을 채워줍니다 (Root Directory, 빌드/실행 명령 전부 자동)
4. **Apply**를 누르면 자동으로 빌드·배포가 시작됩니다 (몇 분 정도 걸립니다)
5. 배포가 끝나면 대시보드에 표시되는 주소(`https://portfolio-price-server-XXXX.onrender.com`)로
   접속해서 `/health`가 `{"ok":true}`를 반환하는지 확인

무료 요금제는 15분간 요청이 없으면 서버가 잠들고, 다음 요청 때 다시 깨어나는 데 30~60초
정도 걸릴 수 있습니다. 첫 새로고침이 느려도 정상입니다.

## 로컬 개발 (선택)

```bash
cd price-server
pip install -r requirements.txt
python app.py
```
