# 국내 주식/ETF 시세 서버 (키움증권)

키움증권 REST API는 사전에 등록한 고정 IP에서만 호출을 허용합니다. Cloudflare Workers처럼
매 요청마다 나가는 IP가 바뀌는 서버리스 플랫폼은 이 요구사항과 맞지 않아서, 이 부분만 고정
공인 IP를 주는 소형 서버(Oracle Cloud 무료 VM)에서 따로 운영합니다.

(해외 주식·암호화폐는 계속 `worker/` 의 Cloudflare Worker가 담당합니다 — 그쪽은 고정 IP가
필요 없는 서비스라 그대로 둡니다.)

## 구성

- `server.js` — 의존성 없는 순수 Node.js 서버. `GET /api/kr-stock?code=005930` → `{ price, changePercent }`
- `setup.sh` — Ubuntu VM에서 한 번 실행하면 Node.js·Caddy 설치, 서비스 등록, HTTPS까지 자동 설정

## 배포 절차 요약

1. Oracle Cloud "Always Free" VM 생성 (Ubuntu, 고정 공인 IP)
2. VM의 보안 목록(Security List)에서 80, 443 포트를 인바운드로 허용
3. SSH로 접속 후:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/huhsanghun-dot/my-portfolio-dashboard/claude/asset-dashboard-realtime-65mtee/kr-stock-server/setup.sh -o setup.sh
   bash setup.sh
   ```
4. 안내에 따라 키움 APP KEY / SECRET KEY 입력
5. 스크립트가 마지막에 알려주는 `https://<ip>.nip.io` 주소를 프론트엔드 설정에 등록
6. VM의 공인 IP를 키움 Open API 포털의 "IP 주소등록"에 추가

## 유지보수

- 로그 확인: `sudo journalctl -u kr-stock-server -f`
- 재시작: `sudo systemctl restart kr-stock-server`
- 코드 업데이트 후 재배포:
  ```bash
  sudo curl -fsSL https://raw.githubusercontent.com/huhsanghun-dot/my-portfolio-dashboard/claude/asset-dashboard-realtime-65mtee/kr-stock-server/server.js -o /opt/kr-stock-server/server.js
  sudo systemctl restart kr-stock-server
  ```
