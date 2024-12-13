const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');

const pandaID = ''; // 아이디
const pandaPW = ''; // 비밀번호
const streamid = ''; // 방송 ID
const streampw = ''; // 방송비번 없는경우 비워둠
let mediaCode = ''; // 전역 변수로 media code를 저장
let chatToken = ''; // 전역 변수로 chat token을 저장
let playToken = ''; // 전역 변수로 play token을 저장
let heartImages = {}; // 전역 변수로 HAERT 이미지 리스트 저장
let previousCount = null; // 이전 시청자 수를 저장
let previousLuc = null; // 이전 luc를 저장
let previousGuc = null; // 이전 guc를 저장
let messageId = 1; // 메시지 ID 초기화

// 로그인 함수
async function login(id, pw) {
    try {
        const response = await axios.post(
            'https://api.pandalive.co.kr/v1/member/login',
            `id=${encodeURIComponent(id)}&pw=${encodeURIComponent(pw)}&idSave=Y`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
                }
            }
        );

        if (response.data.loginInfo && response.data.loginInfo.sessKey) {
            const cookies = response.headers['set-cookie'];
            console.log('■ 로그인 세션키:', response.data.loginInfo.sessKey);
            return cookies; // 쿠키 반환
        } else {
            throw new Error('Login failed: No session key found');
        }
    } catch (error) {
        console.error('Login error:', error.message);
        throw error;
    }
}

// 토큰 갱신 함수
async function refreshToken(ws, lastid, channelId, oldToken, cookies) {
    try {
        const response = await axios.post(
            'https://api.pandalive.co.kr/v1/chat/refresh_token',
            `channel=${channelId}&token=${oldToken}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Cookie': cookies.join('; ')
                }
            }
        );

        const newToken = response.data.token;
        console.log(`■ [토큰 갱신] 새로운 토큰: ${newToken}`);

        const refreshMessage = {
            method: lastid,
            params: { token: newToken },
            id: lastid
        };

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(refreshMessage));
			playToken = newToken;
            console.log(`■ [토큰 갱신] 새로운 토큰을 웹소켓에 전송`);
        } else {
            console.log(`■ [토큰 갱신] 웹소켓이 닫혀있습니다. 재연결을 시도합니다.`);
            connectToWebSocket(cookies, newToken);
        }
    } catch (error) {
        console.error('토큰 갱신 오류:', error.message);
    }
}

// 시청자 수 조회 함수
async function fetchChannelUserCount(channelId, token, cookies) {
    try {
        const response = await axios.get(
            `https://api.pandalive.co.kr/v1/chat/channel_user_count?channel=${channelId}&token=${token}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Cookie': cookies.join('; ') // 쿠키 추가
                }
            }
        );
        
        const { count, luc, guc } = response.data;

        // 변화가 있을 때만 로그 출력
        if (count !== previousCount || luc !== previousLuc || guc !== previousGuc) {
            previousCount = count;
            previousLuc = luc;
            previousGuc = guc;

            // 현재 시간 추가
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timestamp = `[${hours}:${minutes}]`;

            console.log(`■ ${timestamp} 시청자 수: ${count} / 게스트: ${guc} / 로그인 사용자: ${luc}`);
			console.log('────────────────────────────────────────────────────────────');
        }
    } catch (error) {
        console.error('Error fetching channel user count:', error.message);
    }
}

// 방송 데이터 가져오는 함수
async function getPlayData(cookies) {
    try {
        const response = await axios.post(
            'https://api.pandalive.co.kr/v1/live/play',
            `action=watch&userId=${streamid}&password=${streampw}&shareLinkType=`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Cookie': cookies.join('; ') // 쿠키 추가
                }
            }
        );

        // media code, chat token, play token 추출
        if (response.data.media && response.data.media.code) {
            mediaCode = response.data.media.code;
            chatToken = response.data.chatServer.token;
            playToken = response.data.token;
            console.log('■ Media code:', mediaCode);
            console.log('■ Chat token:', chatToken);
            console.log('■ Play token:', playToken);
        } else {
            throw new Error('Required data not found');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching play data:', error.message);
        throw error;
    }
}

// BJ 랭킹 데이터를 가져오는 함수
async function getBJRanking(cookies, offset = 0, limit = 200, type = 'rankingList') {
    try {
        const response = await axios.post(
            'https://api.pandalive.co.kr/v1/live/cache',
            `offset=${offset}&limit=${limit}&type=${type}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Cookie': cookies.join('; ') // 쿠키 추가
                }
            }
        );

        if (response.data.result && response.data.list) {
            console.log('■ BJ 랭킹을 성공적으로 불러왔습니다.');

            // 조건에 맞는 데이터를 필터링
            const filteredList = response.data.list.filter(item => {
                return item.media && item.media.type !== 'fan';
            });

            // 필터링된 데이터를 Rank.json으로 저장
            fs.writeFileSync('Rank.json', JSON.stringify(filteredList, null, 2), 'utf-8');
            console.log('■ 성공적으로 랭킹을 Rank.json 으로 저장했습니다.');
        } else {
            throw new Error('Failed to fetch BJ Ranking: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error fetching BJ Ranking:', error.message);
        throw error;
    }
}

// 추천 API 호출 함수
async function sendRecommendation(cookies) {
    try {
        const response = await axios.post(
            'https://api.pandalive.co.kr/v1/live/recom',
            `mediaCode=${encodeURIComponent(mediaCode)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Cookie': cookies.join('; ') // 쿠키 추가
                }
            }
        );

        if (response.data.result) {
            console.log('■ 추천성공: ', response.data.message);
        } else {
            throw new Error('■ 추천실패: ' + response.data.message);
        }
    } catch (error) {
        console.error('■ 추천실패:', error.message);
    }
}

// 채팅 메시지 전송 함수
async function sendChatMessage(cookies, message) {
    try {
        const response = await axios.post(
            'https://api.pandalive.co.kr/v1/chat/message',
            `message=${encodeURIComponent(message)}&roomid=${mediaCode}&chatToken=${chatToken}&t=${Date.now()}&channel=${mediaCode.split('_')[0]}&token=${playToken}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://m.pandalive.co.kr',
                    'Referer': 'https://m.pandalive.co.kr/',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Cookie': cookies.join('; ') // 쿠키 추가
                }
            }
        );

        if (response.data.result) {
            console.log('■ 메시지 전송 성공:', response.data.message);
        } else {
            throw new Error('Chat message failed: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error sending chat message:', error.message);
    }
}

// 하트 이미지 API 호출 함수
async function getHeartImages(userIdx, cookies) {
    try {
        const response = await axios.post('https://api.pandalive.co.kr/v1/heart/index', `userIdx=${userIdx}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://m.pandalive.co.kr',
                'Referer': 'https://m.pandalive.co.kr/',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
				'Cookie': cookies.join('; ')
            }
        });
        heartImages = response.data.info;
        // console.log('Heart images loaded:', heartImages);
    } catch (error) {
        console.error('Error fetching heart images:', error.message);
    }
}

// WebSocket 연결 함수
async function connectToWebSocket() {
    try {
        const cookies = await login(pandaID, pandaPW); // 로그인하여 쿠키를 얻음
        console.log(`\n\n■ 쿠키: ${cookies}\n\n`);
        const data = await getPlayData(cookies); // 방송 데이터 요청
        const token = data.token;
        const channelId = data.media.userIdx; // 채널 ID
        const chatServerUrl = 'wss://chat-ws.neolive.kr/connection/websocket';
        const reconnectInterval = 5000; // 5초마다 재연결 시도
        let reconnectTimeout;

        if (!token || !chatServerUrl || !channelId) {
            throw new Error('Chat server URL, token, or channel ID not found');
        }
		
		// 하트 이미지정보 수신
		await getHeartImages(channelId, cookies);
		
		// BJ랭킹 200위 Rank.json 으로 저장
        // await getBJRanking(cookies);
		
        // 추천 API 호출
        // await sendRecommendation(cookies);
		
		// 토큰 리프레쉬
		// await refreshToken(ws, messageId, channelId, token, cookies);
		
		// 채팅 보내기
		// await sendChatMessage(cookies, '버거형 ㅎㅇㅎㅇ');
		
		// 채널 사용자 수 조회 (3.0초 간격)
        setInterval(() => {
            fetchChannelUserCount(channelId, playToken, cookies);
        }, 3000); // 3.0초마다 호출
        function setupWebSocket() {
            const ws = new WebSocket(chatServerUrl, {
                headers: {
                    'Origin': 'https://m.pandalive.co.kr',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                }
            });
		
			// 채널 사용자 수 조회 (30분 간격)
			setInterval(() => {
				refreshToken(ws, messageId, channelId, token, cookies);
			}, 30 * 60 * 1000); // 30분마다 호출

            ws.on('open', async function open() {
                console.log('■ Connected to WebSocket');

                // 초기 메시지 전송
                const initMessage = {
                    params: { token: token, name: "js" },
                    id: messageId++
                };
                ws.send(JSON.stringify(initMessage));

                // 채널 구독 메시지 전송
                const subscribeMessage = {
                    method: 1,
                    params: { channel: `${channelId}` },
                    id: messageId++
                };
                ws.send(JSON.stringify(subscribeMessage));

                // 주기적인 ping 메시지 전송
                setInterval(() => {
                    const keepAliveMessage = {
                        method: 7,
                        id: messageId++
                    };
                    ws.send(JSON.stringify(keepAliveMessage));
                }, 1000); // 1초마다 메시지 전송
				
            });

            ws.on('message', function incoming(data) {
                // 현재 시간 추가
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0'); 
                const minutes = String(now.getMinutes()).padStart(2, '0'); 
                const timestamp = `[${hours}:${minutes}]`;

                try {
                    const message = JSON.parse(data);

                    // id만 있는 메시지는 로그에서 제외
                    if (message.id && Object.keys(message).length === 1) {
                        return;
                    }
                    // 메시지 타입에 따른 출력
                    if (message.result && message.result.data && message.result.data.data) {
                        const msgData = message.result.data.data;

                        switch (msgData.type) {
                            case 'chatter':  // 일반 채팅
								console.log(`${timestamp} [일반 채팅] 닉네임: ${msgData.nk}[${msgData.id}] / 메시지: "${msgData.message}" / 성별: ${msgData.sex} / 디바이스: ${msgData.dt}`);
								break;
							
							case 'VipIn':  // 일반 입장
								const vipIn = JSON.parse(msgData.message);
								console.log(`${timestamp} [일반 입장] 닉네임: ${vipIn.nick} / ID: ${vipIn.id}`);
								break;
							
							case 'ManagerIn':  // 매니저 입장
								const managerIn = JSON.parse(msgData.message);
								console.log(`${timestamp} [매니저 입장] 닉네임: ${managerIn.nick} / ID: ${managerIn.id}`);
								break;

							case 'MemberKickOut':  // 강퇴 메시지
								const kickOut = JSON.parse(msgData.message);
								console.log(`${timestamp} [강퇴] 유형: ${kickOut.type} / 이름: ${kickOut.name} / ID: ${kickOut.id}`);
								break;

							case 'BlindOn':  // 방송 블라인드 처리
								const blindOn = JSON.parse(msgData.message);
								console.log(`${timestamp} [블라인드 처리] 이름: ${blindOn.name}`);
								break;

							case 'BlindOff':  // 방송 블라인드 해제 처리
								const blindOff = JSON.parse(msgData.message);
								console.log(`${timestamp} [블라인드 해제] 이름: ${blindOff.name}`);
								break;

							case 'police':  // 운영팀 채팅
								console.log(`${timestamp} [운영팀 채팅] 닉네임: ${msgData.nk}[${msgData.id}] / 메시지: "${msgData.message}"`);
								break;

							case 'manager':  // 매니저 채팅
								console.log(`${timestamp} [매니저 채팅] 닉네임: ${msgData.nk}[${msgData.id}] / 메시지: "${msgData.message}" / 레벨: ${msgData.lev} / 성별: ${msgData.sex} / 디바이스: ${msgData.dt}`);
								break;

							case 'Recommend':  // 추천 메시지
								const recommend = JSON.parse(msgData.message);
								console.log(`${timestamp} [추천] 닉네임: ${recommend.nick} / ID: ${recommend.id}`);
								break;

							case 'SponCoin':  // 일반 하트
								const sponCoin = JSON.parse(msgData.message);
								const heartRange = sponCoin.heartRange || sponCoin.coin.toString();  // 코인 수를 기본 값으로 사용
								const heartCount = sponCoin.heartCount || 'N/A';
								
								// 하트 이미지를 range 또는 coin 값으로 매핑
								const heartImage = heartImages.one?.[heartRange]?.image || '이미지 없음';
								
								console.log(`${timestamp} [일반 하트] 닉네임: ${sponCoin.nick} / 코인: ${sponCoin.coin} / 하트 범위: ${heartRange} / 하트 횟수: ${heartCount} / 이미지: ${heartImage}`);
								break;

							case 'MediaUpdate':  // 미디어 업데이트
								const mediaUpdate = JSON.parse(msgData.message);
								console.log(`${timestamp} [미디어 업데이트] 좋아요: ${mediaUpdate.likeCnt} / 북마크: ${mediaUpdate.bookmarkCnt} / 총 점수: ${mediaUpdate.totalScoreCnt}`);
								break;

							case 'RoomEnd':  // 방송 종료
								const roomEnd = JSON.parse(msgData.message);
								console.log(`${timestamp} [방송 종료] 메시지: ${roomEnd.message}`);
								break;
								
							case 'MuteOn':  // MuteOn 메시지 처리
								const muteOn = JSON.parse(msgData.message);
								console.log(`${timestamp} [음소거 처리] 닉네임: ${muteOn.name} / ID: ${muteOn.id} / 음소거 시간: ${muteOn.muteTime} / 권한: ${muteOn.type}`);
								break;
								
							case 'Info':  // 등급 업 메시지 처리
								const infoMessage = JSON.parse(msgData.message);
								console.log(`${timestamp} [등급 정보] 닉네임: ${infoMessage.nick} / 등급: ${infoMessage.name} (${infoMessage.name_en} / ${infoMessage.name_ja})`);
								break;
								
							case 'helper':  // helper 타입 메시지 처리
								try {
									// If msgData.message is an object, log it directly
									if (typeof msgData.message === 'object') {
										console.log(`${timestamp} [헬퍼 메시지] 내용: ${JSON.stringify(msgData.message, null, 2)}`);
									} else {
										// If msgData.message is a string, parse and log it
										const helperMessage = JSON.parse(msgData.message);
										console.log(`${timestamp} [헬퍼 메시지] 내용: ${JSON.stringify(helperMessage, null, 2)}`);
									}
								} catch (e) {
									console.log(`${timestamp} [헬퍼 메시지] 메시지: ${msgData.message}`);
								}
								break;
								
							case 'ExcelBroadcast':  // ExcelBroadcast 메시지 처리
								const excelBroadcast = JSON.parse(msgData.message);
								const bjList = excelBroadcast.bjList.map(bj => `${bj.n} (ID: ${bj.i})`).join(', ');
								console.log(`${timestamp} [ExcelBroadcast] 상태: ${excelBroadcast.stat} / BJ 리스트: ${bjList} / 최소 코인: ${excelBroadcast.minCoin}`);
								break;
							case 'bj':  // BJ 메시지 처리
								//console.log(JSON.stringify(message, null, 2));
								try {
									console.log(`${timestamp} [BJ 채팅] [${msgData.nk}][${msgData.id}]: ${msgData.message}`);
								} catch (e) {
									console.log(`${timestamp} [BJ 채팅] 메시지 처리 중 오류: ${msgData.message}`);
								}
								break;
							case 'ModifyRoom':  // 방 정보 수정
								const modifyRoom = JSON.parse(msgData.message);
								console.log(`${timestamp} [방 정보 수정]
								제목: ${modifyRoom.title}
								성인 방송 여부: ${modifyRoom.isAdult ? '성인 방송' : '일반 방송'}
								비밀번호 설정 여부: ${modifyRoom.isPw ? '비밀번호 있음' : '비밀번호 없음'}
								시청자 제한: ${modifyRoom.watchLimit}명
								카테고리: ${modifyRoom.category}
								방송 타입: ${modifyRoom.onAirType}`);
								break;
								
							case 'personal':  // 개인 메시지 처리
								const personalMessage = JSON.parse(msgData.message);
								console.log(`${timestamp} [개인 메시지] 이름: ${personalMessage.name} / 메시지: ${personalMessage.message} / 채널: ${personalMessage.channel}`);
								break;
							case 'FanIn':  // 팬 입장 메시지 처리
								const fanIn = JSON.parse(msgData.message);
								console.log(`${timestamp} [팬 입장] 닉네임: ${fanIn.nick} / ID: ${fanIn.id}`);
								break;

                            default:  
                                console.log(`${timestamp} [기타 메시지] 타입: ${msgData.type} / 메시지: ${msgData.message}`, JSON.stringify(message, null, 2));
                        }
                        console.log('────────────────────────────────────────────────────────────');
                    } else {
                        console.log(`${timestamp} 알 수 없는 메시지 형식:`, JSON.stringify(message, null, 2));
                    }
                } catch (error) {
                    console.error(`${timestamp} Error parsing message:`, error.message);
                    console.log(`${timestamp} Raw message:`, data); 
                }
            });

            ws.on('pong', () => {
                console.log('■ Received pong');
            });

            ws.on('close', function close() {
                console.log('■ 5초 후 재연결을 시도합니다.');
                reconnectTimeout = setTimeout(setupWebSocket, reconnectInterval); // 5초 후 재연결 시도
            });

            ws.on('error', function error(err) {
                console.error('WebSocket error:', err);
                ws.close(); // 에러 발생 시 연결 종료
            });
        }

        setupWebSocket(); // 최초 연결 시도

    } catch (error) {
        console.error('Error during WebSocket connection:', error);
    }
}

// 실행
connectToWebSocket();