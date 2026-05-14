import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import {
  createEmptyEcampusClassroomResources,
  parseEcampusAssignmentListHtml,
  parseEcampusMaterialListHtml,
  parseEcampusNoticeListHtml,
  stringifyEcampusClassroomItems,
  stringifyEcampusClassroomResources,
  type EcampusClassroomItem,
  type EcampusClassroomResources
} from "./classroom";
import {
  parseEcampusCourseGroups,
  parseEcampusCourseList,
  parseEcampusCourseListJson,
  parseEcampusCourseNamesJson,
  type EcampusCourseListItem
} from "./courses";
import { createLoginEncryptData, type LoginEncryptOptions } from "./crypto";
import type { EcampusCourseGroups } from "./courses";

export interface EcampusClientOptions {
  baseUrl?: string;
  axios?: AxiosInstance;
}

export interface LoginCredentials extends LoginEncryptOptions {
  userId: string;
  password: string;
}

export interface LoginWithEncryptDataOptions {
  encryptData: string;
}

export interface GetClassroomResourcesOptions {
  crsCreCd: string;
  userNo: string;
  userName?: string;
  listScale?: number;
}

export interface GetClassroomBoardListOptions {
  crsCreCd: string;
  listScale?: number;
}

export interface GetClassroomAssignmentListOptions extends GetClassroomBoardListOptions {
  userNo: string;
  userName?: string;
}

export type LoginResult =
  | {
      type: "redirect";
      data: EcampusLoginResponse;
      url: string;
    }
  | {
      type: "reload";
      data: EcampusLoginResponse;
    }
  | {
      type: "error";
      data?: EcampusLoginResponse;
      message: string;
    };

export interface EcampusLoginResponse {
  redirectUrl?: string;
  otpLogin?: "Y" | "N" | string;
  otpUserYn?: "Y" | "N" | string;
  otpUserType?: string;
  userId?: string;
  userNo?: string;
  message?: string;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";
const LOGIN_PAGE_PATH = "/home/mainPop/popup/login";
const LOGIN_API_PATH = "/user/userHome/login";
const MAIN_PAGE_PATH = "/home/mainHome/Form/main";

export class EcampusClient {
  readonly baseUrl: string;
  readonly cookieJar: CookieJar;
  private readonly http: AxiosInstance;

  constructor(options: EcampusClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.cookieJar = new CookieJar();
    this.http =
      options.axios ??
      wrapper(
        axios.create({
          baseURL: this.baseUrl,
          jar: this.cookieJar,
          withCredentials: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
              "(KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
          }
        })
      );
  }

  async prepareLoginSession(): Promise<void> {
    await this.http.get(LOGIN_PAGE_PATH, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
  }

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const encryptData = createLoginEncryptData(credentials.userId, credentials.password, {
      reason: credentials.reason,
      foreigner: credentials.foreigner
    });

    return this.loginWithEncryptData({ encryptData });
  }

  async loginWithEncryptData(options: LoginWithEncryptDataOptions): Promise<LoginResult> {
    await this.prepareLoginSession();

    const params = new URLSearchParams();
    params.set("encryptData", options.encryptData);

    const response = await this.http.post<EcampusLoginResponse>(LOGIN_API_PATH, params, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: this.baseUrl.replace(/\/$/, ""),
        Referer: new URL(LOGIN_PAGE_PATH, this.baseUrl).toString(),
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    return parseLoginResponse(response.data);
  }

  async getMainPageHtml(): Promise<string> {
    const response = await this.http.get<string>(MAIN_PAGE_PATH, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    return response.data;
  }

  async getCourseGroups(): Promise<EcampusCourseGroups> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseGroups(html);
  }

  async getCourseList(): Promise<EcampusCourseListItem[]> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseList(html);
  }

  async getCourseListJson(): Promise<string> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseListJson(html);
  }

  async getCourseNamesJson(): Promise<string> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseNamesJson(html);
  }

  async getClassroomResources(
    options: GetClassroomResourcesOptions
  ): Promise<EcampusClassroomResources> {
    const resources = createEmptyEcampusClassroomResources();
    const [notices, materials, assignments] = await Promise.all([
      this.getNoticeList(options),
      this.getMaterialList(options),
      this.getAssignmentList(options)
    ]);

    resources.notices = notices;
    resources.materials = materials;
    resources.assignments = assignments;

    return resources;
  }

  async getClassroomResourcesJson(options: GetClassroomResourcesOptions): Promise<string> {
    return stringifyEcampusClassroomResources(await this.getClassroomResources(options));
  }

  async getNoticeList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "NOTICE", `BBS_${options.crsCreCd}_N`);
    return parseEcampusNoticeListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  async getNoticeListJson(options: GetClassroomBoardListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getNoticeList(options));
  }

  async getMaterialList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "PDS", `BBS_${options.crsCreCd}_P`);
    return parseEcampusMaterialListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  async getMaterialListJson(options: GetClassroomBoardListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getMaterialList(options));
  }

  async getAssignmentList(
    options: GetClassroomAssignmentListOptions
  ): Promise<EcampusClassroomItem[]> {
    const html = await this.postForm("/asmnt/asmntHome/stuAsmntGridList", {
      pageIndex: "1",
      listScale: String(options.listScale ?? 10),
      searchValue: "",
      crsCreCd: options.crsCreCd,
      userNo: options.userNo,
      userName: options.userName ?? ""
    });

    return parseEcampusAssignmentListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  async getAssignmentListJson(options: GetClassroomAssignmentListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getAssignmentList(options));
  }

  private async postBoardList(
    options: GetClassroomBoardListOptions,
    bbsCd: "NOTICE" | "PDS",
    bbsId: string
  ): Promise<string> {
    return this.postForm("/bbs/bbsLect/atclList", {
      formType: "LIST",
      bbsId,
      atclId: "",
      searchKey: "all",
      searchValue: "",
      listScale: String(options.listScale ?? 10),
      pageIndex: "1",
      headCd: "",
      bbsCd,
      crsCreCd: options.crsCreCd
    });
  }

  private async postForm(path: string, body: Record<string, string>): Promise<string> {
    const params = new URLSearchParams(body);
    const response = await this.http.post<string>(path, params, {
      headers: {
        Accept: "text/html, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: this.baseUrl.replace(/\/$/, ""),
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    return response.data;
  }
}

export function createEcampusClient(options: EcampusClientOptions = {}): EcampusClient {
  return new EcampusClient(options);
}

export function parseLoginResponse(data: EcampusLoginResponse): LoginResult {
  if (!data.redirectUrl) {
    return {
      type: "error",
      data,
      message: data.message ?? "아이디 또는 비밀번호가 맞지 않습니다."
    };
  }

  if (
    data.otpLogin === "Y" &&
    data.otpUserYn === "Y" &&
    data.otpUserType?.includes("LEARNER") &&
    data.userId &&
    data.userNo
  ) {
    const url = new URL(data.redirectUrl, DEFAULT_BASE_URL);
    url.searchParams.set("userId", data.userId);
    url.searchParams.set("userNo", data.userNo);

    return {
      type: "redirect",
      data,
      url: url.toString()
    };
  }

  return {
    type: "reload",
    data
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}
