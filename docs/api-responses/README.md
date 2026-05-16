# API 응답 형식 예제

이 폴더에는 seowon-client-api의 각 기능별 JSON 응답 형식이 정리되어 있습니다.

## 📄 파일 목록

### 1. `courses.json` — 과목 목록
**메서드:** `getCourseList()`, `getCourseListJson()`

**설명:** 로그인 후 메인 홈페이지에서 추출한 과목 목록

**포함 정보:**
- `title`: 과목명
- `crsCreCd`: 강의실 고유 코드
- `crsTypeCd`: 과목 타입 (UNI=교과, CO=비교과)

**예시 데이터:** 15개 과목 (교과 7개 + 비교과 8개)

---

### 2. `assignments.json` — 과제 목록
**메서드:** `getAssignmentList()`, `parseEcampusAssignmentListFromSaz()`

**설명:** 강의실의 과제 목록

**포함 정보:**
- `id`: 과제 고유 ID
- `title`: 과제명
- `url`: 조회용 URL
- `request`: POST 요청 정보 (method, url, body)
- `period`: 제출 기간 (예: 2026.05.07 ~ 2026.05.14)
- `status`: 제출 상태 (과제를 제출하였습니다, 미제출, 진행중, 종료)

**예시 데이터:** 8개 과제 (논리회로 강의실)

---

### 3. `materials.json` — 강의자료실 목록
**메서드:** `getMaterialList()`, `parseEcampusMaterialListFromSaz()`

**설명:** 강의실의 강의자료실 목록

**포함 정보:**
- `id`: 자료 고유 ID
- `title`: 자료명
- `url`: 조회용 URL
- `request`: POST 요청 정보 (method, url, body)
- `date`: 등록 날짜 (예: 2026.05.11)
- `hasAttachment`: 첨부파일 여부

**예시 데이터:** 8개 자료 (논리회로 강의실)

---

### 4. `notices.json` — 공지사항 목록
**메서드:** `getNoticeList()`, `parseEcampusNoticeListFromSaz()`

**설명:** 강의실의 공지사항 목록

**포함 정보:**
- `id`: 공지 고유 ID
- `title`: 공지명
- `url`: 조회용 URL
- `request`: POST 요청 정보 (method, url, body)
- `date`: 작성 날짜
- `hasAttachment`: 첨부파일 여부

**예시 데이터:** 1개 공지 (논리회로 강의실)

---

### 5. `login-response.json` — 로그인 응답
**메서드:** `loginWithEncryptData()`, `parseLoginResponse()`

**설명:** 서버의 로그인 응답을 파싱한 결과

**응답 타입:**
1. **success (reload)**: 일반 로그인 성공
   - `type`: "reload"
   - `data`: 서버 응답 데이터

2. **otp_required (redirect)**: OTP 인증 필요
   - `type`: "redirect"
   - `url`: OTP 페이지 URL (userId, userNo 포함)

3. **error**: 로그인 실패
   - `type`: "error"
   - `message`: 오류 메시지

---

### 6. `classroom-resources.json` — 강의실 전체 목록
**메서드:** `getClassroomResources()`, `getClassroomResourcesJson()`

**설명:** 한 강의실의 공지사항, 과제, 강의자료를 한 번에 조회한 결과

**포함 정보:**
```json
{
  "notices": [...],    // 공지사항 배열
  "assignments": [...], // 과제 배열
  "materials": [...]   // 강의자료 배열
}
```

**예시 데이터:** 논리회로 강의실 (공지 1개 + 과제 2개 + 자료 2개)

---

## 🔗 필수 코드 값

| 값 | 예시 | 설명 |
|---|------|------|
| `crsCreCd` | `2026_1_736078_01` | 강의실 고유 코드 |
| `crsTypeCd` | `UNI` / `CO` | 과목 타입 (교과/비교과) |
| `bbsId` | `BBS_2026_1_736078_01_N` | 게시판 ID (N=공지, P=자료) |
| `asmntCd` | `ASMNT_260507T125246_87067da` | 과제 고유 코드 |
| `atclId` | `ATCL_260511T144458_33d02b9` | 공지/자료 고유 ID |

---

## 💡 사용 예시

```typescript
import { createEcampusClient } from "seowon-client-api";

const client = createEcampusClient();

// 과목 목록 조회
const courses = await client.getCourseList();
// 응답 형식: courses.json

// 과제 목록 조회
const assignments = await client.getAssignmentList({
  crsCreCd: "2026_1_736078_01",
  userNo: "202612345",
  userName: "학생이름"
});
// 응답 형식: assignments.json

// 강의실 전체 목록 조회
const resources = await client.getClassroomResources({
  crsCreCd: "2026_1_736078_01",
  userNo: "202612345"
});
// 응답 형식: classroom-resources.json
```

---

## 📌 주의사항

- 모든 JSON 파일은 테스트 데이터 기반 예제입니다.
- 실제 서버 응답은 데이터 내용이 다를 수 있지만 **구조는 동일**합니다.
- `bbsId`, `asmntCd`, `atclId` 등의 ID는 시스템 생성 값이며 강의별로 다릅니다.
