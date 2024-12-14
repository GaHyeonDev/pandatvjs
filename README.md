
# PandaLive API Interaction Node.js Script

## 소개

이 스크립트는 PandaLive 플랫폼의 다양한 API를 활용하여 방송 데이터를 가져오고, 시청자 수를 조회하며, WebSocket 연결을 통해 실시간 채팅 데이터를 처리하는 Node.js 기반의 프로그램입니다.

### 주요 기능

- **로그인**: PandaLive 사용자 계정을 통해 로그인하고 세션 쿠키를 관리합니다.
- **방송 데이터 가져오기**: 특정 방송 ID의 Media Code, Chat Token, Play Token 등을 가져옵니다.
- **시청자 수 조회**: 특정 방송의 현재 시청자, 로그인 사용자, 게스트 수를 주기적으로 조회합니다.
- **WebSocket 연결**: 실시간 채팅 데이터를 처리하며 다양한 이벤트 메시지를 처리합니다.
- **추천 전송**: 방송에 추천을 보냅니다.
- **BJ 랭킹 데이터 저장**: 상위 200명의 BJ 데이터를 JSON 파일로 저장합니다.
- **채팅 전송**: 특정 메시지를 방송 채팅창에 보냅니다.
- **하트 이미지 정보**: 방송의 하트 이미지 데이터를 조회합니다.

---

## 설치 및 실행 방법

### 1. Node.js 설치

- Node.js와 npm이 설치되어 있어야 합니다.
- [Node.js 다운로드](https://nodejs.org/)

### 2. 종속성 설치

- 프로젝트 디렉토리에서 다음 명령어를 실행하여 필요한 라이브러리를 설치합니다.

```bash
npm install axios ws fs
```

### 3. 코드 설정

- 아래 항목들을 스크립트 상단에 입력하세요:
  - `pandaID`: PandaLive 계정의 ID
  - `pandaPW`: PandaLive 계정의 비밀번호
  - `streamid`: 방송 ID
  - `streampw`: 방송 비밀번호 (없을 경우 비워둡니다)

### 4. 스크립트 실행

- start.bat 을 이용하여 스크립트를 실행합니다.

```bash
node index.js
pause
```

---

## 주요 코드 설명

### 로그인 함수

- PandaLive API에 로그인 요청을 보내 세션 키와 쿠키를 얻습니다.

```javascript
async function login(id, pw) {
    // 로그인 요청 및 세션 키 반환
}
```

### 방송 데이터 가져오기

- 특정 방송의 Media Code, Chat Token, Play Token을 가져옵니다.

```javascript
async function getPlayData(cookies) {
    // 방송 데이터 요청 및 반환
}
```

### WebSocket 연결

- 방송의 실시간 데이터를 WebSocket으로 수신하고 다양한 이벤트를 처리합니다.

```javascript
async function connectToWebSocket() {
    // WebSocket 연결 및 이벤트 처리
}
```

### 시청자 수 조회

- 주기적으로 방송 시청자 수, 로그인 사용자 수, 게스트 수를 조회합니다.

```javascript
async function fetchChannelUserCount(channelId, token, cookies) {
    // 시청자 수 조회 및 로그 출력
}
```

---

## 활용 사례

### 1. 실시간 채팅 분석

- WebSocket 연결을 통해 다양한 채팅 메시지 및 이벤트를 실시간으로 수신하고 분석할 수 있습니다.

### 2. 방송 데이터 시각화

- 방송 시청자 수 데이터를 주기적으로 수집하여 대시보드 형태로 시각화할 수 있습니다.

### 3. BJ 랭킹 데이터 활용

- 상위 BJ 데이터를 수집하여 랭킹 시스템이나 통계 분석에 활용할 수 있습니다.

---

## 참고 사항

- **API 호출 빈도**: PandaLive API 호출이 너무 빈번할 경우 서비스 제한이 발생할 수 있으니 주기적으로 호출하세요.
- **라이선스**: 본 프로젝트는 오픈소스로 제공되며, 사용 시 라이선스 정책을 준수해야 합니다.

---

## 문제 해결

### 로그인 실패

- ID 및 비밀번호가 정확한지 확인하세요.
- PandaLive 계정이 활성 상태인지 확인하세요.

### WebSocket 연결 실패

- **인터넷 연결 상태를 확인하세요.**
- WebSocket URL이 유효한지 확인하세요.

### 데이터 저장 실패

- 파일 시스템 권한을 확인하고, Rank.json 파일이 있는지 확인하세요.

---

## 기여하기

- 프로젝트에 기여하려면 깃허브를 통해 이슈를 제기하거나 풀 리퀘스트를 생성하세요.

---

## 문의

- 본 스크립트 관련 문의는 GitHub 이슈를 통해 남겨주세요.
