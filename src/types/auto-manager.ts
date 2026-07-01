import type {
  EcampusClassroomItem,
  EcampusCourseListItem,
  EcampusLessonItem,
  EcampusScoreSummary
} from "../index.js";

/** 자동 학습 대기열 항목 */
export interface WatchQueueItem {
  course: EcampusCourseListItem; // 강의가 속한 과목
  lesson: EcampusLessonItem; // 자동 시청 대상 강의
}

/** 선택 가능한 과제 항목 */
export interface AvailableAssignmentItem {
  course: EcampusCourseListItem; // 과제가 속한 과목
  assignment: EcampusClassroomItem; // 과제 게시판 항목
}

/** 교과 과목 성적 조회 결과 */
export interface CurricularScoreResult {
  course: EcampusCourseListItem; // 성적을 조회한 교과 과목
  status: "available" | "unavailable"; // 성적 조회 가능 여부
  summary?: EcampusScoreSummary; // 조회된 성적 요약
  message?: string; // 조회 불가 또는 실패 사유
}

/** 강의자료 다운로드 진행 상태 */
export interface MaterialDownloadState {
  title: string; // 표시할 자료 제목
  percent: number; // 다운로드 진행률(0-100)
  status: "pending" | "downloading" | "completed" | "failed"; // 다운로드 상태
  detail?: string; // 실패 사유 또는 저장 경로
}
