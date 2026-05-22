seowon-client-api — 유지보수 요약

한줄 요약
서원대학교 e-campus에 로그인하고, 과목/강의실(공지/과제/강의자료)을 추출하는 TypeScript 클라이언트 라이브러리.

빠른 시작
1. node 20+ 설치
2. npm install
3. .env 파일에 SEOWON_ID와 SEOWON_PASSWORD 설정
4. 예제
```ts
import "dotenv/config";
import { createEcampusClient, createLoginEncryptData } from "seowon-client-api";
const client = createEcampusClient({ cookieFilePath: './data/ecampus-cookie.json', loginCredentials: { userId: process.env.SEOWON_ID!, password: process.env.SEOWON_PASSWORD! } });
const encryptData = createLoginEncryptData(process.env.SEOWON_ID!, process.env.SEOWON_PASSWORD!);
await client.loginWithEncryptData({ encryptData });
const courses = await client.getCourseList();
console.log(courses);
```

빌드/테스트
- 빌드: npm run build
- 테스트(단위): npm test
- 타입 검사: npm run typecheck
- 통합 로그인 테스트 (주의): npm run test:login

핵심 모듈
- EcampusClient (src/ecampus/login.ts): 인증, 세션, 목록 조회
- createLoginEncryptData (src/ecampus/crypto.ts): 레거시 암호화 wrapper
- HTML 파서: src/ecampus/courses.ts, src/ecampus/classroom.ts
- 쿠키 utils: src/ecampus/cookies.ts

주의사항
- 쿠키 파일은 민감 정보 — git에 커밋하지 말 것
- Node 버전 제약: >=20

추천 작업
- CI 추가, 레거시 crypto 리팩토링, 파싱 견고성 향상

파일 생성: handover.txt, README.handover.md
