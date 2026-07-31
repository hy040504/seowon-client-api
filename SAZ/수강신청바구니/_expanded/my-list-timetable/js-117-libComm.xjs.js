//XJS=libComm.xjs
(function () {
  return function (path) {
    var obj;

    // User Script
    this.registerScript(path, function () {
      /**
       * @author jaeho, jaehokim@disc.co.kr
       */
      this.initForm = this.libComm = function ($context, e, $opts) {
        var context,
          _defaultFormOption,
          _utils,
          _utilsHome,
          btnSupportFunc,
          dataSetSupportFunc,
          gridSupportFunc,
          _popup,
          _innerUtils,
          devFlag,
          _globalUtils,
          initArgs;
        context = $context && $context instanceof nexacro.Form ? $context : this;

        var application = nexacro.getApplication();
        initArgs = Array.prototype.slice.call(arguments);
        devFlag =
          window.location.hostname == "localhost" && window.console !== undefined ? true : false;
        devFlag = true;
        application.MULTILANG = application.locale != "ko" ? true : false;
        //application.MULTILANG = true;
        _defaultFormOption = {
          eachExtend: "",
          enterEqualsFind: true,
          menuSettingAsync: false,
          devFlag: true
        };
        /**
         * 유틸 및 컴포넌트 확장한다.
         */
        function init() {
          _innerUtils.performLog();
          // 브라우저 폴리필
          _innerUtils.polyfill();
          // 프레임 체크
          _innerUtils.checkFrame();
          // KEY 할당
          context.keycode = _innerUtils.keyCodeSet();
          // utils 할당
          context.utils = _utils;
          // popup 할당
          context.popup = _popup;
          // 공통에서만 사용해야할 기능 확장
          context._globalUtils = _globalUtils;
          // 컴포넌트 확장
          _innerUtils.extendComponentAll();
          // 타 유틸 확장
          _innerUtils.extendUtils();
          // 컴포넌트 확장 후 실행
          _innerUtils.commonOnload();
          return context;
        }
        /**
         * 유틸 확장한다.
         */
        function eachExtend() {
          switch ($opts.eachExtend) {
            case 1: // 별도 1
              context.utils = _utils;
              context.popup = _popup;
              break;
            case 2: // 별도 2
              context.utils = _utils;
              context.popup = _popup;
              application.unCommonLoad = true;
              context.getOwnerFrame().arguments = {
                menuId: "etc",
                pgmId: "etc",
                menuGrade: 5
              };
              break;
            case 3: // edu 업무외 화면
              context.utils = _utils;
              context.popup = _popup;
              context.utils.selectTreeRow = gridSupportFunc.selectTreeRow;
              context.getOwnerFrame().arguments = {
                menuId: "edu",
                pgmId: "edu",
                menuGrade: 5
              };
              break;
            case 4: // edu 업무외 화면
              context.utils = _utils;
              context.popup = _popup;
              context.utils.selectTreeRow = gridSupportFunc.selectTreeRow;
              _innerUtils.extendUtils();
              context.getOwnerFrame().arguments = {
                menuId: "edu",
                pgmId: "edu",
                menuGrade: 5
              };
              break;
            case 5: // 부서DIV
              context.utils = _utils;
              context.popup = _popup;
              _innerUtils.extendComponentAll();
              break;
            default:
              break;
          }
        }
        /**
         * 개발자에게 제공될 공통메소드 본체
         */
        _utilsHome = {
          /**
           * 서버통신
           */
          transaction: function ($opts) {
            if (arguments.length == 1 || typeof $opts != "string") {
              var detOpts = {
                id: "",
                url: "",
                inDS: "",
                outDS: "",
                callback: "",
                error: "",
                async: true,
                arg: "",
                nDataType: 2,
                timeout: 0,
                stream: false,
                context: "",
                target: "",
                popup: false
              };
              var opts = _utilsHome.extend(
                detOpts,
                _utilsHome.checkArguments(
                  $opts,
                  ["url"],
                  [
                    "id@string",
                    "url@string",
                    "inDS@string, json",
                    "outDS@string, json",
                    "callback@function, string",
                    "error@function, string",
                    "async@boolean",
                    "arg@string, json",
                    "nDataType@number",
                    "timeout@number",
                    "stream@boolean",
                    "form@boolean"
                  ]
                )
              );
              function getIdFromUrl(url) {
                var _arr = url.split(".do")[0].split("/"),
                  returnVal = _arr[_arr.length - 1];
                return returnVal;
              }
              opts.id = _utilsHome.isValid(opts.id) ? opts.id : getIdFromUrl(opts.url);
              _innerUtils.performLog("서버통신 : " + opts.id + " : " + opts.url);
            } else {
              _utilsHome.error("서버통신 : " + $opts + " : JSON 형태로 변경해주세요.");
            }
            opts.inDS = _innerUtils.convertParamsToAvailableParams(opts.inDS);
            opts.outDS = _innerUtils.convertParamsToAvailableParams(opts.outDS);
            opts.arg = _innerUtils.convertParamsToAvailableParams(opts.arg);
            opts.arg += " requestTimeStr=" + new Date().getTime();

            var funcNm = "";
            if (typeof opts.callback == "function") {
              funcNm = "_commonCallbackFunc_utils_" + opts.id;
              context[funcNm] = opts.callback;
              opts.callback = funcNm;
            }

            if (typeof opts.error == "function") {
              funcNm = "_common_" + opts.id + "_error";
              context[funcNm] = opts.error;
              opts.error = funcNm;
            }
            if (opts.timeout > 0) {
              context._commonBaseTimeout = nexacro.getEnvironment().httptimeout;
              nexacro.getEnvironment().set_httptimeout(opts.timeout);
            }
            if (opts.stream) {
              return _innerUtils.streamToFile(opts.url, opts);
            } else {
              var transactionContext = opts.context != "" ? opts.context : context;

              if (transactionContext.getOwnerFrame().arguments) {
                argsObj = transactionContext.getOwnerFrame().arguments;
                if (
                  argsObj !== undefined &&
                  argsObj.menuId !== undefined &&
                  argsObj.pgmId !== undefined
                ) {
                  opts.url = opts.url + "?menuId=" + argsObj.menuId + "&pgmId=" + argsObj.pgmId;
                  if (opts.url.indexOf("/") != 0 && opts.url.indexOf("http") != 0) {
                    opts.url = "/" + opts.url;
                  }
                }
              }
              //context 확인
              if (
                location.hostname == "localhost" &&
                opts.url.substr(0, 5) in { "/adm/": 1, "/sch/": 1, "/etc/": 1, "/att/": 1 }
              ) {
                try {
                  var contextList = nexacro
                    .getApplication()
                    .gds_baseInfo.getColumn(0, "contextList");
                  var callContext = opts.url.match("^[/][a-z]{3}[/][a-z]{4}");
                  if (!callContext || contextList.indexOf(callContext[0]) < 0) {
                    opts.url = "http://devkep.igmu.ac.kr" + opts.url;
                    _innerUtils.performLog("개발서버로 호출 : " + opts.url);
                  }
                } catch (e) {
                  console.log("로컬 context 찾기 에러");
                }
              }

              // Service ID  And callBackFnc Merge
              var mergeId = opts.id + "|" + opts.callback;
              var paramArr = [
                mergeId,
                opts.url,
                opts.inDS,
                opts.outDS,
                opts.arg,
                "_commTransactionCallback",
                opts.async,
                opts.nDataType,
                false
              ];
              //application.setVariable("REQFOUNDATAION", "nexacro", "header");

              //타이머 처리
              nexacro.getApplication().logoutTime = new Date();
              return context.transaction.apply(transactionContext, paramArr);
            }
          },
          /**
                 * 공통코드 로드
                 *
                 * @params params <code>
                                    메소드인수1  : DataSet명
                                    메소드인수2  : 대표코드번호
                                    메소드인수3  : 사용여부 (T: 전부, 1:사용, 0:사용안함)
                                    메소드인수4  : 전체공란 첨부구분 배열 ("T":전체, "S":선택, "E":공란, "X":데이터시작)
                                    메서드인수5  : 텍스트모드(N: 일반,  B: 코드와 텍스트를 같이 나타냄)
                                    ex)[["DS_USE_YN_SH", "A007", "1", "S", "N"], ["DS_USE_YN", "A007", "1", "S", "N"]]
                                  </code>
                 * @param id
                 *            트랜젝션id
                 * @param callback
                 *            callback function
                 */
          comboLoad: function (params, callback) {
            _innerUtils.performLog("공통코드로드");
            _utilsHome.checkArguments(
              {
                params: params,
                callback: callback
              },
              ["params"],
              ["params@array"]
            );
            var dataSet = "",
              cmmnCd = "",
              textMode = "",
              arg = "",
              useYn = "",
              outDS = "";
            for (var i = 0; i < params.length; i++) {
              var param = params[i];
              dataSet += "|" + param[0];
              cmmnCd += "|" + param[1];
              useYn += "|" + param[2];
              textMode += "|" + param[4];
              outDS += " " + param[0] + "=" + param[0];
            }
            _utilsHome.transaction({
              id: "findCodeComboList",
              url: "com/cmsv/CodeCtr/findCodeComboList.do",
              async: false,
              outDS: outDS.substr(1),
              arg:
                "cmmnCd=" +
                cmmnCd.substr(1) +
                " useYn=" +
                useYn.substr(1) +
                " textMode=" +
                textMode.substr(1) +
                " dataSet=" +
                dataSet.substr(1),
              callback: function () {
                for (var i = 0; i < params.length; i++) {
                  var param = params[i];

                  if (!context[param[0]]) {
                    _utilsHome.error(
                      "공통그룹콤보조회 오류 : " + param[0] + " 데이터셋이 없습니다."
                    );
                    return;
                  }
                  context[param[0]].addFirstComboRow(param[3]);

                  // 첫 행이 T S X 인경우
                  if (param[3] in { S: 1, T: 1, X: 1 }) {
                    for (
                      var comboIndex = 0;
                      comboIndex < context._common_combo.length;
                      comboIndex++
                    ) {
                      var combo = context._common_combo[comboIndex];
                      if (combo.innerdataset == param[0]) {
                        combo.set_index(0);
                      }
                    }
                  }
                }
                if (!callback) return;
                if (typeof callback == "function") {
                  callback.call(context);
                } else {
                  context[callback].call(context);
                }
              }
            });
          },
          /**
                 * 공통그룹코드 로드
                 *
                 * @params params <code>
                                    메소드인수1  : DataSet명
                                    메소드인수2  : 대표그룹코드번호
                                    메소드인수3  : 그룹코드
                                    메소드인수4  : 사용여부 (T: 전부, 1:사용, 0:사용안함)
                                    메소드인수5  : 전체공란 첨부구분 배열 ("T":전체, "S":선택, "E":공란, "X":데이터시작)
                                    메서드인수6  : 텍스트모드(N: 일반,  B: 코드와 텍스트를 같이 나타냄)
                                    ex)[["DS_USE_YN_SH", "A00700", "01" , "1", "S", "N"], ["DS_USE_YN_SH", "A00700", "01", "1", "S", "N"]]
                                  </code>
                 * @param id
                 *            트랜젝션id
                 * @param callback
                 *            callback function
                 */
          comboGrpLoad: function (params, callback) {
            _innerUtils.performLog("공통그룹코드로드");
            var dataSet = "",
              cmmnCd = "",
              grpCd = "",
              textMode = "",
              arg = "",
              useYn = "",
              outDS = "";
            for (var i = 0; i < params.length; i++) {
              var param = params[i];
              dataSet += "|" + param[0];
              cmmnCd += "|" + param[1];
              grpCd += "|" + (param[2] == "" ? "@@" : param[2]);
              useYn += "|" + param[3];
              textMode += "|" + param[5];
              outDS += " " + param[0] + "=" + param[0];
            }
            _utilsHome.transaction({
              id: "findGroupCodeComboList",
              url: "com/cmsv/CodeCtr/findGroupCodeComboList.do",
              async: false,
              outDS: outDS.substr(1),
              arg:
                "cmmnCd=" +
                cmmnCd.substr(1) +
                " grpCd=" +
                grpCd.substr(1) +
                " useYn=" +
                useYn.substr(1) +
                " textMode=" +
                textMode.substr(1) +
                " dataSet=" +
                dataSet.substr(1),
              callback: function () {
                for (var i = 0; i < params.length; i++) {
                  var param = params[i];
                  if (!context[param[0]]) {
                    _utilsHome.error("공통콤보조회 오류 : " + param[0] + " 데이터셋이 없습니다.");
                    return;
                  }

                  context[param[0]].addFirstComboRow(param[4]);

                  // 첫 행이 T S X 인경우
                  if (param[4] in { S: 1, T: 1, X: 1 }) {
                    for (
                      var comboIndex = 0;
                      comboIndex < context._common_combo.length;
                      comboIndex++
                    ) {
                      var combo = context._common_combo[comboIndex];

                      if (combo.innerdataset == param[0]) {
                        combo.set_index(0);
                      }
                    }
                  }
                }
                if (!callback) return;
                if (typeof callback == "function") {
                  callback.call(context);
                } else {
                  context[callback].call(context);
                }
              }
            });
          },
          /**
           * 세션정보 조회
           *
           * @params columnList 가져올 정보 목록 - 배열타입(넘기지 않는 경우 전체조회. 가급적 필요한 정보만 쓰는 것을 권장) ex)['deptCd', ']
           */
          getGLIO: function (columnList) {
            _innerUtils.performLog("GLIO 정보 로드");
            columnList = columnList || [];
            var strColumnList = "";
            for (var i = 0; i < columnList.length; i++) {
              strColumnList += "|" + columnList[i];
            }
            context["_COMMON_TEMP_DS_GLIO"] = new Dataset();
            _utilsHome.transaction({
              id: "findMyGLIOList",
              url: "com/SsoCtr/findMyGLIOList.do",
              async: false,
              outDS: "_COMMON_TEMP_DS_GLIO=DS_GLIO",
              arg: "columnList=" + strColumnList.substr(1)
            });
            var data = {},
              ds = context["_COMMON_TEMP_DS_GLIO"];
            data = dataSetSupportFunc.getRowData.call(ds);
            return data;
          },

          /**
                 * 계좌인증
                 bankCd, accountNo, userNm, callback, msgFlag
                 */
          checkAccount: function (opts) {
            opts = _utilsHome.extend(
              {
                amt: 0,
                msgFlag: true,
                async: true,
                confirm: false
              },
              opts
            );

            // 임시처리
            /*if (typeof opts.callback === "function") {
        				opts.callback.call(context, true, {
        					bankCd : opts.bankCd
        					,accountNo : opts.accountNo
        					,userNm : opts.userNm
        					,amt : opts.amt
        					,msg : ""
        				}, "", opts.userNm);
        			}*/
            //임시처리 끝

            if (!opts.bankCd) {
              _utilsHome.alert("은행 코드가 없거나 사용할 수 없는 은행코드입니다.");
              return;
            }
            _utilsHome.checkArguments(
              opts,
              ["bankCd", "accountNo", "userNm"],
              [
                "bankCd@string",
                "accountNo@string",
                "userNm@string",
                "amt@number",
                "callback@function",
                "msgFlag@boolean",
                "async@boolean",
                "confirm@boolean"
              ]
            );
            context._accountCheckResult = "";
            _utilsHome.transaction({
              id: "findBankAccountInfoCheck",
              url: "/com/cmsv/CodeCtr/findBankAccountInfoCheck.do",
              async: opts.async,
              arg: {
                bankCd: opts.bankCd,
                accountNo: opts.accountNo,
                //,userNm : encodeURI(opts.userNm)
                amt: opts.amt
              },
              callback: function (id) {
                // 예금주 조회에 실패 한 경우 서버에서 exception처리
                // 아래 로직은 예금주 조회 성공 후
                var result = false;
                var resultMesg = "";
                var checkUserNm = context._accountCheckResult;
                if (checkUserNm != opts.userNm) {
                  resultMesg = "예금주명이 틀립니다.";
                } else {
                  result = true;
                }

                if (opts.msgFlag && !opts.confirm) {
                  if (result) {
                    context.popup.msg.open({ msg: "정상적인 계좌입니다." });
                  } else {
                    context.popup.msg.open({ msg: resultMesg });
                  }
                }
                if (typeof opts.callback === "function") {
                  if (!result && opts.confirm) {
                    var confirmMsg = "";
                    if (checkUserNm) {
                      confirmMsg = checkUserNm + "\n\n해당 예금주로 변경하시겠습니까?";
                    } else {
                      confirmMsg =
                        resultMesg + "\n\n현재 입력된 예금주명을 그대로 사용하시겠습니까?";
                    }

                    if (context.utils.confirm(confirmMsg)) {
                      result = true;
                      // 입력된 예금주명을 사용하는 경우 checkUserNm에 전달받은 파라미터로 전달
                      if (!checkUserNm) checkUserNm = opts.userNm;
                    }
                  }
                  opts.callback.call(
                    context,
                    result,
                    {
                      bankCd: opts.bankCd,
                      accountNo: opts.accountNo,
                      userNm: opts.userNm,
                      amt: opts.amt,
                      msg: resultMesg
                    },
                    result ? "" : accountInfo,
                    checkUserNm
                  );
                }
              }
            });
          },
          /**
           * 파일다운로드
           */
          fileDownload: function (fileNo, seq, params, type) {
            var menuId = context.getOwnerFrame().arguments.menuId;
            var path = "/com/cmsv/FileCtr/fileDefaultDownload.do";
            var opts = {
              hipassTicket: true,
              stream: true,
              streamParams: {
                fileNo: fileNo,
                seq: seq || 1,
                menuId: menuId
              }
            };
            if (_utilsHome.isValid(type)) {
              if (type == "popup") {
                window.open(
                  "",
                  type,
                  "location=no,toolbar=no,menubar=no,scrollbars=yes,resizable=yes"
                );
              } else {
                window.open("", type);
              }
              opts.target = type;
              opts.popup = true;
            }
            if (params) {
              _utilsHome.extend(opts.streamParams, params, false, true);
            }
            _innerUtils.streamToFile(path, opts);
          },
          /**
           * 파일미리보기
           */
          filePreview: function (fileNo, seq, params) {
            var menuId = context.getOwnerFrame().arguments.menuId;
            var path = "/com/cmsv/FileCtr/fileDefaultDownload.do";
            var opts = {
              hipassTicket: true,
              stream: true,
              popup: true,
              target: "filePreviewPop",
              streamParams: {
                fileNo: fileNo,
                seq: seq || 1,
                menuId: menuId,
                mode: "preview"
              }
            };
            window.open(
              "",
              opts.target,
              "location=no,toolbar=no,menubar=no,scrollbars=yes,resizable=yes"
            );
            if (params) {
              _utilsHome.extend(opts.streamParams, params, false, true);
            }
            _innerUtils.streamToFile(path, opts);
          },
          /**
           * 파일멀티다운로드
           */
          findMultiDownload: function (fileNoList, fileNm) {
            var path = "/com/cmsv/FileCtr/findMultiDownload.do";
            if (!fileNoList) {
              _utilsHome.error("파일UUID가 없습니다.");
              return;
            }

            if (Array.isArray(fileNoList)) {
              fileNoList = fileNoList.join(",");
            }
            var opts = {
              hipassTicket: true,
              stream: true,
              streamParams: {
                fileNoList: fileNoList,
                fileNm: fileNm
              }
            };
            _innerUtils.streamToFile(path, opts);
          },
          /**
           * 파일멀티다운로드
           */
          findChkMultiDownload: function (fileNo, seqList, fileNm) {
            var path = "/com/cmsv/FileCtr/findChkMultiDownload.do";
            if (!fileNo) {
              _utilsHome.error("파일UUID가 없습니다.");
              return;
            }

            if (Array.isArray(seqList)) {
              seqList = seqList.join(",");
            }
            var opts = {
              hipassTicket: true,
              stream: true,
              streamParams: {
                fileNo: fileNo,
                seqList: seqList,
                fileNm: fileNm
              }
            };
            _innerUtils.streamToFile(path, opts);
          },
          streamToFile: function (path, opts) {
            return _innerUtils.streamToFile(path, opts);
          },
          /**
           * 외부 처리용
           */
          streamToZipFile: function (path, opts) {
            return _innerUtils.streamToZipFile(path, opts);
          },
          /**
           * 외부시스템과 EDU시스템 연동
           */
          nextExternalPage: function (arg) {
            context.getOwnerFrame().form.utils.transaction({
              url: "/com/MenuCtr/findMenuOne.do",
              outDS: "DS_SSTM020=DS_MENUONEINFO",
              arg: "strMenuId=" + arg.menuId,
              async: false,
              callback: "fn_externalCallback",
              context: context.getOwnerFrame().form
            });
          },
          /**
           * 로케일 변경
           */
          changeLocale: function (locale, callback) {
            _utilsHome.saveBtnLog({ text: "다국어전환_" + locale });
            _utilsHome.transaction({
              url: "/com/SsoCtr/executeChangeLocale.do",
              arg: "strLocale=" + locale,
              async: false,
              callback: callback
            });
          },
          /**
           * 파라미터로 넘어온 데이터가 유효한 값인지 체크 하고 유효한 값이면 true 아니면 false를 반환한다.<br>
           * boolean형태의 값이 넘어올 경우 넘오온 값 그대로 리턴<br>
           * 유효 값 : null,undefined,빈스트링,빈객체,빈배열이 아닌경우
           *
           * @param arg
           *            필수, 체크할 데이터
           */
          isValid: function (arg, validateRuleDS, deepCheck) {
            var returnVal = true;
            if (arg === true || arg === false) {
              returnVal = arg;
            } else if (arg === null || arg === undefined) {
              returnVal = false;
            } else if (typeof arg === "string" && String.prototype.trim.call(arg) === "") {
              returnVal = false;
            } else if (Array.isArray(arg) && arg.length === 0) {
              returnVal = false;
            } else if (_innerUtils.isJsonObject(arg)) {
              if (
                (validateRuleDS instanceof nexacro.Dataset &&
                  (arg instanceof nexacro.Dataset ||
                    arg instanceof nexacro.Grid ||
                    arg instanceof nexacro.Div)) ||
                "compId" in arg
              ) {
                if ("compId" in arg) {
                  arg = arg.compId;
                }
                returnVal = _innerUtils.commonValidation.run(context, arg, validateRuleDS);
              } else {
                returnVal = false;
                if (deepCheck === true) {
                  for (var key in arg) {
                    if (Object.prototype.hasOwnProperty.call(arg, key)) {
                      if (arg[key] != "" && arg[key] != undefined && arg[key] != null) {
                        returnVal = true;
                        break;
                      }
                    }
                  }
                } else {
                  for (var key in arg) {
                    if (Object.prototype.hasOwnProperty.call(arg, key)) {
                      returnVal = true;
                      break;
                    }
                  }
                }
              }
            }
            return returnVal;
          },
          isValidRow: function (arg, validateRuleDS, row) {
            return _innerUtils.commonValidation.run(context, arg, validateRuleDS, row);
          },

          /**
           * 두개 오브젝트를 합한다, 기본적으로 원본은 오염되지 않으며 새로운 객체로 리턴한다.
           *
           * @param orgObj
           *            원조 오브젝트
           * @param newObj
           *            합처질 오브젝트
           * @param validFlag
           *            유효한 값만 복사
           * @param orgFlag
           *            원본 오브젝트에 복사
           * @returns 합처진 새 오브젝트
           */
          extend: function (orgObj, newObj, validFlag, orgFlag, insertStr) {
            var returnObj = {};
            if (orgFlag) {
              returnObj = orgObj;
            } else {
              for (var key in orgObj) {
                if (orgObj[key] != null && orgObj[key] != undefined) {
                  returnObj[key] = orgObj[key];
                }
              }
            }
            for (var key in newObj) {
              if (insertStr) {
                setKey = insertStr + key;
              } else {
                setKey = key;
              }
              if (validFlag) {
                if (_utilsHome.isValid(newObj[key]) || typeof newObj[key] === "boolean") {
                  returnObj[setKey] = newObj[key];
                }
              } else {
                returnObj[setKey] = newObj[key];
              }
            }
            return returnObj;
          },
          /**
           * 오브젝트의 파라미터를 체크한다.
           */
          checkArguments: function (args, required, type, requiredCheckOnlyProperty) {
            if (devFlag /* 개발모드 */) {
              return (
                checkRequired(args, required, requiredCheckOnlyProperty) &&
                checkType(args, type) &&
                args
              );
            } else {
              return args;
            }
            function checkRequired(args, required, requiredCheckOnlyProperty) {
              var i = 0,
                j = required.length,
                illegalArr = [],
                requiredField,
                illegalArrField;
              for (; i < j; i++) {
                if (typeof required[i] !== "string") {
                  _utilsHome.error("checkArguments : 아규먼트 필수값은 스트링으로 넣으세요");
                }
                if (
                  !(required[i] in args) ||
                  (!requiredCheckOnlyProperty && !_utilsHome.isValid(args[required[i]]))
                ) {
                  illegalArr.push([required[i]]);
                }
              }
              if (illegalArr.length != 0) {
                if (required.length > 0 && isNumber(required[0])) {
                  if (required.length == 1) {
                    requiredField = required[0] + "번째.";
                    illegalArrField = illegalArr[0] + "번째.";
                  } else {
                    requiredField = required.join("번째,") + ".";
                    illegalArrField = illegalArr.join("번째,") + ".";
                  }
                } else {
                  requiredField = required.join(",");
                  illegalArrField = illegalArr.join(",");
                }
                _utilsHome.error(
                  "다음 파라미터는 필수입니다 : " +
                    requiredField +
                    " 빠진 파라미터 : " +
                    illegalArrField
                );
              }
              return args;
            }
            function checkType(args, typeCheckRule) {
              var i = 0,
                j = typeCheckRule.length,
                eachCheckRule,
                targetAttr,
                allowType,
                eachType;
              for (; i < j; i++) {
                eachCheckRule = typeCheckRule[i].split("@");
                targetAttr = eachCheckRule[0];
                allowType = eachCheckRule[1];
                eachType = whitchType(args[targetAttr]);
                if (targetAttr in args && allowType.indexOf(eachType) < 0) {
                  _utilsHome.error(
                    "아규먼트 타입이 맞지 않습니다. " +
                      targetAttr +
                      " 허용타입 : " +
                      allowType +
                      " 들어온 타입 : " +
                      eachType
                  );
                }
              }
              function whitchType($arg) {
                var typeNm = typeof $arg;
                if ($arg == null) {
                  typeNm = "null";
                } else if (typeNm == "object") {
                  if ($arg instanceof nexacro.Grid) {
                    typeNm = "grid";
                  } else if ($arg instanceof nexacro.Dataset) {
                    typeNm = "dataset";
                  } else if (Array.isArray($arg)) {
                    typeNm = "array";
                  } else if (_innerUtils.isJsonObject($arg)) {
                    typeNm = "json";
                  } else {
                    typeNm = "date";
                  }
                }
                return typeNm;
              }
              return true;
            }
          },
          /**
           * 이미지 로드
           * 첨부 파일 이미지
           */
          showImg: function (imgComponent, fileNo, seq) {
            imgComponent.set_image("");
            if (_utilsHome.isValid(fileNo)) {
              //var strUrl = document.location.protocol + "//" + document.location.host + "/com/cmsv/FileCtr/findUploadImg.do";
              var strUrl = "/com/cmsv/FileCtr/findUploadImg.do";
              var params;
              if (_utilsHome.isValid(seq)) {
                params = "?fileNo=" + fileNo + "&seq=" + seq;
              } else {
                params = "?fileNo=" + fileNo;
              }
              //이미지 캐쉬 방지를 위한 처리
              params += "&requestTimeStr=" + new Date().getTime();
              imgComponent.set_image(strUrl + params);
            }
          },
          /**
           * lob이미지를 이미지 컴포넌트에 뿌린다.
           *
           * @param target
           *            이미지컴포넌트
           * @param data
           *            lob 데이터
           */
          showLobImage: function (imgComponent, info) {
            if (_utilsHome.isValid(info)) {
              imgComponent.set_image("data:image/*;base64," + info);
            } else {
              imgComponent.set_image("");
            }
          },
          /**
           * lob이미지를 다운로드한다..
           *
           * @param opts
           *            url : 사진을 다운로드 url
           *            param : 파라미터 object
           */
          downloadLobImage: function (opts) {
            var param = {
              hipassTicket: true,
              stream: true,
              streamParams: {
                menuId: context.getOwnerFrame().arguments.menuId,
                pgmId: context.getOwnerFrame().arguments.pgmId
              }
            };
            if (opts.param) {
              _utilsHome.extend(param.streamParams, opts.param, false, true);
            }
            _innerUtils.streamToFile(opts.url, param);
          },
          /**
           * 동적으로 만들어진 targetObj, dataset에 대한 기능을 확장한다.
           *
           * @param obj
           *            기능을 확장해야할 오브젝트
           */
          extendComponent: function (obj) {
            _innerUtils.performLog("개별컴포넌트 확장");
            _utilsHome.checkArguments(
              {
                obj: obj
              },
              ["obj"],
              ["obj@dataset, grid"]
            );
            if (!(obj instanceof nexacro.Dataset) && !(obj instanceof nexacro.Grid)) {
              _utilsHome.error("그리드 또는 데이터셋만 확장 가능합니다.");
              return false;
            }
            // 확장지점
            for (var funcNm in btnSupportFunc) {
              obj[funcNm] = new btnSupportFunc[funcNm]();
            }
            // 버튼옵션 할당
            _innerUtils.extendCommonBtnOpts(obj);
            // 버튼기능 할당
            _innerUtils.extendCommonBtnFunc(obj);
            if (obj instanceof nexacro.Dataset && obj._commonDataSetExtendFlag !== true) {
              obj._commonDataSetExtendFlag = true;
              for (var funcNm in dataSetSupportFunc) {
                obj[funcNm] = dataSetSupportFunc[funcNm];
              }
            }

            if (obj instanceof nexacro.Grid && obj._commonDataSetExtendFlag !== true) {
              obj._commonDataSetExtendFlag = true;
              for (var funcNm in gridSupportFunc) {
                obj[funcNm] = gridSupportFunc[funcNm];
              }
            }

            if (context["_common_targets"]) {
              context["_common_targets"][obj.id] = obj;
            }
            return obj;
          },
          /**
           * 팝업을 닫으면서 파라미터를 callback에 전달한다.
           *
           * @param param
           *            callback에 전달할 파라미터
           */
          popupClose: function ($param) {
            _innerUtils.performLog("팝업에서 받은 파라미터", true, $param);
            var returnVal;
            try {
              var objOpenerFrame = context.getOwnerFrame().form.opener;
              if (typeof $param != "object") {
                objOpenerFrame._rtnModal = $param;
              } else if ($param instanceof nexacro.Decimal) {
                objOpenerFrame._rtnModal = $param.hi;
              } else {
                if ($param instanceof Array) {
                  objOpenerFrame._rtnModal = JSON.parse(JSON.stringify($param));
                } else if ($param instanceof Dataset) {
                  var objTempDs = context._createOpenerParamTempDs();
                  objTempDs.set_enableevent(false);
                  objTempDs.copyData($param, true);
                  objTempDs.set_enableevent(true);
                  objOpenerFrame._rtnModal = objTempDs;
                } else {
                  objOpenerFrame._rtnModal = {};
                  for (var prop in $param) {
                    if ($param[prop] instanceof Dataset) {
                      var objTempDs = context._createOpenerParamTempDs();
                      objTempDs.set_enableevent(false);
                      objTempDs.copyData($param[prop], true);
                      objTempDs.set_enableevent(true);
                      objOpenerFrame._rtnModal[prop] = objTempDs;
                    } else if (typeof $param[prop] == "object") {
                      if (
                        $param[prop] instanceof nexacro.Decimal ||
                        $param[prop] instanceof nexacro.Date
                      ) {
                        objOpenerFrame._rtnModal[prop] = $param[prop];
                      } else {
                        objOpenerFrame._rtnModal[prop] = JSON.parse(JSON.stringify($param[prop]));
                      }
                    } else {
                      objOpenerFrame._rtnModal[prop] = $param[prop];
                    }
                  }
                }
              }
              returnVal = context.getOwnerFrame().form.close();
            } catch (e) {
              _utilsHome.log(e);
              _utilsHome.error("팝업닫는중 에러, 반드시 수정하세요.");
            }
            return returnVal;
          },
          /**
           * 팝업 오브젝트를 생성한다.
           *
           * @param targetOpts
           *            defaultOpts에서 변경해야할 값을 JSON으로 전달
           */
          popupMake: function (targetOpts) {
            var defaultOpts = {
                argArr: [
                  "id",
                  "arg",
                  "url",
                  "callback",
                  "width",
                  "height",
                  "parentObj",
                  "title",
                  "useX"
                ],
                id: "",
                arg: {},
                baseCond: {},
                url: "",
                callback: "",
                width: 0,
                height: 0,
                parentObj: context,
                title: "서원대학교",
                mode: "l",
                resize: false,
                onceUrl: "",
                onceDataSetNm: "",
                onceDataType: "json",
                onceSetDsParam: true,
                useX: true
              },
              newPopup,
              thisPopup = this;
            newPopup = thisPopup[targetOpts.id];
            if (!newPopup) {
              _innerUtils.performLog("팝업생성 : " + targetOpts.id);
              _utilsHome.popupValidateOpts(targetOpts, ["id", "url"]);
              newPopup = _utilsHome.extend(defaultOpts, targetOpts, true);
              newPopup["open"] = _utilsHome.popupOpen;
              newPopup["setOpts"] = _utilsHome.popupSetOpts;
              newPopup["onceEvent"] = function (obj, e, param) {
                if (context.keycode.checkInput(e)) return true;
                if (param.opts) {
                  newPopup.setOpts(param.opts);
                  delete param.opts;
                }
                var getDataList = param.getData.split(" ");
                var send = param.sendData ? param.sendData.split("=") : ["", ""];

                newPopup.setOpts({
                  callback: function (id, data) {
                    if (data) {
                      try {
                        //callback 데이터가 있는 경우
                        if (send[0] && data[send[0]]) {
                          param.ds.setColumn(param.ds.rowposition, send[1], data[send[0]]);
                        }
                        for (var i = 0; i < getDataList.length; i++) {
                          param.ds.setColumn(
                            param.ds.rowposition,
                            getDataList[i].split("=")[0],
                            data[getDataList[i].split("=")[1]]
                          );
                        }
                      } catch (e) {
                        _utilsHome.warn(e.message);
                      }
                    }

                    if (typeof param.callback == "function") {
                      param.callback.call(context, id, data);
                    } else if (context[param.callback]) {
                      context[param.callback].call(context, id, data);
                    }
                  }
                });

                if (e.eventid == "onclick" || e.eventid == "onexpandup") {
                  newPopup.open();
                  return true;
                }
                // 수정 중인 edit가 수정불가인 경우 key event는 적용안되도록
                if (
                  obj instanceof nexacro.Grid &&
                  (obj.getCurEditType() == "none" || obj.getCurEditType() == "readonly")
                ) {
                  return false;
                } else if (obj instanceof nexacro.Edit || obj instanceof nexacro.MaskEdit) {
                  if (obj.readonly || !obj.enable) {
                    return false;
                  }
                }
                if (e.keycode == context.keycode.enter) {
                  var sendData = {};
                  if (send[0]) {
                    sendData[send[0]] = param.ds.getColumn(param.ds.rowposition, send[1]);
                  }
                  newPopup.open(sendData);
                  return false;
                } else {
                  newPopup.callback.call(context, "popup", {});
                  return false;
                }
              };
              newPopup["openEvent"] = function (e, param) {
                if (context.keycode.checkInput(e)) return true;
                if (param.opts) {
                  newPopup.setOpts(param.opts);
                  delete param.opts;
                }

                if (e.eventid == "onclick" || e.eventid == "onexpandup") {
                  newPopup.open();
                  return true;
                } else if (e.keycode == context.keycode.enter) {
                  newPopup.open(param);
                  return false;
                } else {
                  if (typeof newPopup.callback == "function") {
                    newPopup.callback.call(context, "popup", {});
                  } else if (context[newPopup.callback]) {
                    context[newPopup.callback].call(context, "popup", {});
                  }
                  return false;
                }
              };
              thisPopup[targetOpts.id] = newPopup;
            } else {
              _utilsHome.warn(
                "이미 생성된 팝업 입니다. make는 한번만 셋팅되도록 코드를 수정하세요. \n this.popup." +
                  targetOpts.id +
                  ".setOpts({})를 사용하여 옵션을 변경하거나 새로운 아이디로 팝업을 생성하세요."
              );
            }
            return targetOpts.id;
          },
          /**
           * 팝업을 오픈한다.
           */
          popupOpen: function ($params) {
            var thisPopup = this,
              args,
              returnVal,
              ownerFrame,
              callbackFuncNm;
            if (typeof thisPopup.callback == "function") {
              callbackFuncNm = "_commonCallbackFunc_popup_" + thisPopup.id;
              context[callbackFuncNm] = thisPopup.callback;
              thisPopup.callback = callbackFuncNm;
            }
            args = _innerUtils.getActionParams(thisPopup);
            args[1] = {
              _commonPopupParams: $params,
              _commonPopupOpts: thisPopup,
              _commonPopupDirectFindData: "",
              _commonPopupDirectFindCond: ""
            };
            if (_utilsHome.isValid(thisPopup.onceUrl) && _utilsHome.isValid($params, null, true)) {
              _utilsHome.checkArguments(
                {
                  params: $params
                },
                ["params"],
                ["params@json"]
              );
              var ds_popupNm = "_DS_POPUP_POPUP_" + thisPopup.id,
                ds_condNm = "_DS_POPUP_COND_" + thisPopup.id;
              context[ds_popupNm] = new nexacro.Dataset(ds_popupNm);
              context[ds_condNm] = new nexacro.Dataset(ds_condNm);
              // baseCond 추가
              _innerUtils.setRowData(context[ds_condNm], thisPopup.baseCond, 0, true);
              // params 추가
              _innerUtils.setRowData(context[ds_condNm], $params, 0, true);
              _utilsHome.transaction({
                url: thisPopup.onceUrl,
                inDS: "dsParam=" + ds_condNm,
                outDS: ds_popupNm + "=" + thisPopup.onceDataSetNm,
                async: false
              });
              if (context[ds_popupNm].getRowCount() == 1) {
                if (typeof context[thisPopup.callback] === "function") {
                  var returnVal = null;
                  if (thisPopup.onceDataSetType == "dataset") {
                    returnVal = context[ds_popupNm];
                  } else {
                    returnVal = context[ds_popupNm];
                    for (var i = 0, _returnVal = {}; i < returnVal.colinfos.length; i++) {
                      _returnVal[returnVal.colinfos[i].id] = returnVal.getColumn(
                        0,
                        returnVal.colinfos[i].id
                      );
                    }
                    returnVal = _returnVal;
                  }
                  _innerUtils.performLog("즉시 콜백 호출 : " + thisPopup.id, true, returnVal);
                  context[thisPopup.callback](thisPopup.id, returnVal);
                }
              } else {
                _innerUtils.performLog("팝업오픈 : " + thisPopup.id);
                args[1]._commonPopupDirectFindData = context[ds_popupNm];
                args[1]._commonPopupDirectFindCond = dataSetSupportFunc.getRowData.call(
                  context[ds_condNm]
                );
                if (String.prototype.toLocaleLowerCase.call(thisPopup.mode) == "w") {
                  returnVal = context.gfn_popupOpenModless.apply(context, args);
                } else {
                  returnVal = context.gfn_popupOpen.apply(context, args);
                }
              }
            } else {
              _innerUtils.performLog("팝업오픈 : " + thisPopup.id);
              if (String.prototype.toLocaleLowerCase.call(thisPopup.mode) == "w") {
                returnVal = context.gfn_popupOpenModless.apply(context, args);
              } else {
                returnVal = context.gfn_popupOpen.apply(context, args);
              }
            }
            return returnVal;
          },
          /**
           * 옵션을 변경한다.
           *
           * @param opts
           *            변경할 키 또는 json오브젝트
           * @param value
           *            변경할 값
           */
          popupSetOpts: function (opts, value) {
            //_innerUtils.performLog("팝업옵션변경 : " + this.id);
            _utilsHome.checkArguments(
              {
                opts: opts,
                value: value
              },
              ["opts"],
              ["opts@string, json"]
            );
            var thisPopup = this,
              keyEnableFlag = true,
              disableKey = "";
            if (_innerUtils.isJsonObject(opts)) {
              var objkey;
              if (keyEnableFlag) {
                for (objKey in opts) {
                  if (!(objKey in thisPopup)) {
                    keyEnableFlag = false;
                    disableKey = objKey;
                    break;
                  }
                }
                if (keyEnableFlag) {
                  _utilsHome.popupValidateOpts(_utilsHome.extend(thisPopup, opts), ["id", "url"]);
                  thisPopup = _utilsHome.extend(thisPopup, opts, false, true);
                }
              }
            } else {
              if (opts in thisPopup) {
                var _arg = {};
                _arg[opts] = value;
                _utilsHome.popupValidateOpts(_arg, []);
                thisPopup[opts] = value;
              } else {
                keyEnableFlag = false;
                disableKey = opts;
              }
            }
            if (!keyEnableFlag) {
              _utilsHome.error("setOpts : 없는 설정정보 또는 오타입니다. : " + disableKey);
            }
            return thisPopup;
          },
          /**
           * 팝업의 옵션을 체크 한다.
           *
           * @param targetOpts
           *            팝업 옵션
           */
          popupValidateOpts: function (targetOpts, required) {
            _utilsHome.checkArguments(targetOpts, required, [
              "id@string",
              "arg@string, json",
              "url@string",
              "callback@function, string",
              "width@string, number",
              "height@string, number",
              "title@string",
              "mode@string",
              "resize@boolean",
              "baseCond@json",
              "onceUrl@string",
              "onceDataSetNm@string",
              "onceDataType@string"
            ]);
          },
          /**
           * 이 화면이 팝업인지 아닌지 구분한다.
           */
          popupIsPopup: function () {
            return context.parent && context.parent.parent && context.parent.parent.fvBPopup;
          },
          /**
           * 팝업의 파라미터를 얻어낸다
           */
          popupParam: function ($param) {
            return context.getOwnerFrame()[$param];
          },
          /**
           * 에러를 발생시킨다.
           *
           * @param msg
           *            에러메시지
           */
          error: function (msg) {
            if (devFlag) {
              _utilsHome.checkArguments(
                {
                  msg: msg
                },
                ["msg"],
                []
              );
              alert("에러가 발생하였습니다. \n개발자도구(F12)를 열어 확인하세요.");
              var error = console.error ? "error" : "log";
              console[error](msg);
              throw new Error(msg);
            }
          },
          /**
           * 경고를 발생시킨다.
           *
           * @param msg
           *            경고메시지
           */
          warn: function (msg) {
            if (devFlag) {
              _utilsHome.checkArguments(
                {
                  msg: msg
                },
                ["msg"],
                []
              );
              var warn = console.warn ? "warn" : "log";
              console[warn](msg);
            }
          },
          /**
           * confirm
           *
           * @param msg
           *            아이디 (현재는 메시지 그대로 받음)
           * @param type
           *            미정
           * @param arr
           *            미정
           * @return true/false
           */
          confirm: function (msg, type, arr) {
            _utilsHome.checkArguments(
              {
                msg: msg
              },
              ["msg"],
              []
            );
            msg = _globalUtils.multiLang(msg);
            var confirmFlag = false;
            if (_innerUtils.whoAreU("chrome")) {
              while (new Date() - arguments.callee._commonCallTime < 1050) {
                // wait
              }
              confirmFlag = confirm(msg);
              arguments.callee._commonCallTime = new Date();
            } else {
              confirmFlag = confirm(msg);
            }
            return confirmFlag;
          },
          /**
           * alert
           *
           * @param msg
           *            아이디 (현재는 메시지 그대로 받음)
           * @param type
           *            미정
           * @param arr
           *            미정
           */
          alert: function (msg, param) {
            _utilsHome.checkArguments(
              {
                msg: msg
              },
              ["msg"],
              []
            );
            msg = _globalUtils.multiLang(msg);
            if (typeof param == "object") {
              for (var key in param) {
                msg = msg.replace("#{" + key + "}", param[key]);
              }
            }
            if (_innerUtils.whoAreU("chrome")) {
              while (new Date() - arguments.callee._commonCallTime < 1050) {
                // wait
              }
              alert(msg);
              arguments.callee._commonCallTime = new Date();
            } else {
              alert(msg);
            }
          },
          /**
           * log
           */
          log: function () {
            var arg = Array.prototype.slice.call(arguments);
            if (window.console) {
              console.log.apply(console, arg);
            }
          },
          callReport: function (opts) {
            if (typeof opts == "string") {
              window.open(
                "/images/report/" + opts,
                "report",
                "location=no,toolbar=no,menubar=no,scrollbars=yes,resizable=yes"
              );
              return;
            }

            if (opts.filePath.indexOf(".") >= 0) {
              context.popup.reportImg
                .setOpts({
                  width: opts.popupSize && opts.popupSize[0] ? opts.popupSize[0] : 1000,
                  height: opts.popupSize[1] && opts.popupSize[1] ? opts.popupSize[1] : 800
                })
                .open({
                  filePath: opts.filePath
                });
              return;
            }

            opts = _utilsHome.extend(
              {
                filePath: "",
                checkSearchParam: false,
                params: "",
                useGlio: false,
                popupSize: [],
                landscape: false,
                type: "query",
                reportObj: "",
                reportBtn: "PEH"
              },
              opts
            );
            var formName = new Date().getTime();
            var popupFlag = true;

            if (opts.reportObj) {
              popupFlag = false;
            } else if (this instanceof WebBrowser) {
              popupFlag = false;
              opts.reportObj = this;
            }

            var reportContext = context;
            var reportContextNm = reportContext.getOwnerFrame().name;

            //             while(reportContextNm.indexOf("Child") < 0) {
            //                 reportContext = reportContext.parent;
            //                 reportContextNm = reportContext.getOwnerFrame().name;
            //             }

            var cnt = 0;
            var reportParams;
            if (opts.filePath.indexOf("/") == 0) {
              opts.filePath = opts.filePath.substring(1);
            }
            //var _filePath = opts.filePath + ".crf";
            var _filePath = opts.filePath;
            var paramType = opts.params instanceof nexacro.Dataset ? "dataset" : "json";
            if (paramType == "dataset" && opts.type == "xml") {
              reportParams = opts.params.saveXML();
            } else {
              if (paramType == "dataset") {
                reportParams = opts.params.getRowData();
              } else {
                reportParams = opts.params || {};
              }
              var glio = {};
              if (opts.useGlio) {
                glio = _utilsHome.getGLIO([
                  "logNo",
                  "loginIp",
                  "univCd",
                  "univNm",
                  "deptCd",
                  "deptId",
                  "deptNm",
                  "persNo",
                  "socpsCd",
                  "userNm",
                  "acntYy",
                  "budgtDeptId",
                  "menuGrade",
                  "menuId"
                ]);
              } else {
                glio = _utilsHome.getGLIO([
                  "logNo",
                  "loginIp",
                  "deptNm",
                  "userNm",
                  "persNo",
                  "menuGrade"
                ]);
              }
              glio.reportLog =
                glio.deptNm +
                " " +
                glio.userNm +
                " " +
                context.dateUtils.today("yyyy-mm-dd HH:mi:ss");
              if (_utilsHome.isValid(glio)) {
                _utilsHome.extend(reportParams, glio, true, true, "g_");
                reportParams.g_menuId = context.getOwnerFrame().arguments.menuId;
              }
              for (var key in reportParams) {
                if (!_utilsHome.isValid(reportParams[key])) {
                  reportParams[key] = "";
                }
              }
              // 파라미터 스트링 문자로 변경
              reportParams = JSON.stringify(reportParams);
            }
            // 특수문자 처리
            reportParams = reportParams.replace(/&/g, "&#38;");
            reportParams = nexacro.base64Encode(reportParams);
            // 파라미터 변경되지 않고 팝업이 아닐 경우 동일한 파라미터로 조회 못하게 막음
            if (!popupFlag) {
              if (this._commonReportParams) {
                if (
                  opts.checkSearchParam &&
                  opts.filePath + reportParams == this._commonReportParams
                ) {
                  _utilsHome.alert("이미 처리된(중) 출력물이 있습니다.");
                  return;
                } else {
                  this._commonReportParams = opts.filePath + reportParams;
                }
              } else {
                this._commonReportParams = opts.filePath + reportParams;
              }
            }
            var reportDataServerUrl = "/report/callReport.jsp";
            if (popupFlag) {
              // 팝업
              window._commonDummyReady = "1";
              var sw, sh;
              var cw = screen.availWidth,
                ch = screen.availHeight;

              if (opts.popupSize.length > 0) {
                sw = opts.popupSize[0];
                sh = opts.popupSize[1];
              } else {
                var defaultWidth, defaultHeight;
                if (opts.landscape) {
                  defaultWidth = 1300;
                  defaultHeight = 700;
                } else {
                  defaultWidth = 900;
                  defaultHeight = 800;
                }

                sw = defaultWidth > screen.availWidth ? screen.availWidth - 100 : defaultWidth;
                sh = defaultHeight > screen.availHeight ? screen.availHeight - 100 : defaultHeight;
              }
              var params = {
                reportParams: reportParams,
                paramType: opts.type,
                filePath: _filePath,
                reportBtn: opts.reportBtn,
                useGlio: opts.useGlio
              };
              var url = "/callReport.html";
              var openOps =
                "width=" +
                sw +
                ",height=" +
                sh +
                ",left=" +
                (cw - sw) / 2 +
                ",top=" +
                (ch - sh) / 2 +
                ", location=no,toolbar=no,menubar=no,scrollbars=yes,resizable=yes";
              function objToQuery(obj) {
                var parts = [];
                for (var key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
                  }
                }
                return "?" + parts.join("&");
              }
              var reportWinPopup = window.open(url, formName, openOps);
              var interval = setInterval(function () {
                cnt++;
                if (
                  typeof reportWinPopup.callReport === "function" ||
                  typeof reportWinPopup.callReport === "object"
                ) {
                  clearInterval(interval);
                  reportWinPopup.callReport(reportDataServerUrl, params);
                } else if (cnt > 1000) {
                  clearInterval(interval);
                }
              }, 50);
            } else {
              //임베디드
              window._commonDummyReady = "0";
              formName = "_common_report_viewer_" + opts.reportObj.name + reportContextNm;
              opts.reportObj._ifrm_elem.dest_handle.name = formName;
              opts.reportObj.set_url(nexacro.getApplication().url + "/frameDummy.html?formName=");
              var interval = setInterval(function () {
                cnt++;
                if (window._commonDummyReady === "1") {
                  clearInterval(interval);
                  var reportContext =
                    application.gv_AppWorkFrameSet[reportContextNm].form.components.div_Work.form;
                  reportContext.utils.transaction({
                    url: reportDataServerUrl,
                    stream: true,
                    external: true,
                    target: formName,
                    popup: popupFlag,
                    streamParams: {
                      reportParams: reportParams,
                      paramType: opts.type,
                      reportBtn: opts.reportBtn,
                      filePath: _filePath,
                      useGlio: opts.useGlio
                    }
                  });
                } else if (cnt > 1000) {
                  clearInterval(interval);
                }
              }, 50);
            }
          },
          callPdfReport: function (opts) {
            opts = _utilsHome.extend(
              {
                filePath: "",
                checkSearchParam: true,
                params: "",
                useGlio: false,
                popupSize: [],
                type: "query",
                reportObj: "",
                fileNm: ""
              },
              opts
            );
            var formName = new Date().getTime();
            var popupFlag = true;

            if (opts.reportObj) {
              popupFlag = false;
            } else if (this instanceof WebBrowser) {
              popupFlag = false;
              opts.reportObj = this;
            }

            var reportContext = context;
            var reportContextNm = reportContext.getOwnerFrame().name;
            while (reportContextNm.indexOf("Child") < 0) {
              reportContext = reportContext.parent;
              reportContextNm = reportContext.getOwnerFrame().name;
            }
            var cnt = 0;
            var reportParams;
            if (opts.filePath.indexOf("/") == 0) {
              opts.filePath = opts.filePath.substring(1);
            }
            var _filePath = opts.filePath + ".crf";
            var paramType = opts.params instanceof nexacro.Dataset ? "dataset" : "json";
            if (paramType == "dataset" && opts.type == "xml") {
              reportParams = opts.params.saveXML();
            } else {
              if (paramType == "dataset") {
                reportParams = opts.params.getRowData(0);
              } else {
                reportParams = opts.params || {};
              }
              var glio = {};
              if (opts.useGlio) {
                glio = _utilsHome.getGLIO([
                  "logNo",
                  "loginIp",
                  "compusCd",
                  "colgCd",
                  "deptCd",
                  "deptId",
                  "deptTtNm",
                  "persNo",
                  "sttsgbn",
                  "userGbn",
                  "userNm",
                  "uuid"
                ]);
              } else {
                glio = _utilsHome.getGLIO(["logNo", "persNo", "userNm", "deptTtNm", "loginIp"]);
              }
              glio.reportLog =
                glio.deptTtNm +
                " " +
                glio.userNm +
                " " +
                context.dateUtils.today("yyyy-mm-dd HH:mi:ss");
              if (_utilsHome.isValid(glio)) {
                _utilsHome.extend(reportParams, glio, true, true, "g_");
                reportParams.g_menuId = context.getOwnerFrame().arguments.menuId;
              }
              for (var key in reportParams) {
                if (!_utilsHome.isValid(reportParams[key])) {
                  reportParams[key] = "";
                }
              }

              // params 다건인 경우
              if (paramType == "dataset" && opts.params.getRowCount() > 1) {
                var mReportParams = [];
                mReportParams.push(reportParams);
                for (var i = 1; i < opts.params.getRowCount(); i++) {
                  var temp = opts.params.getRowData(i);
                  for (var key in temp) {
                    if (!_utilsHome.isValid(temp[key])) {
                      temp[key] = "";
                    }
                  }
                  _utilsHome.extend(reportParams, temp, true, false);
                  mReportParams.push(temp);
                }
                reportParams = mReportParams;
              }

              // 파라미터 스트링 문자로 변경
              reportParams = JSON.stringify(reportParams);
            }
            reportParams = reportParams.replace(/&/g, "&#38;");
            reportParams = nexacro.base64Encode(reportParams);

            var fileNm = "report";
            if (_utilsHome.isValid(opts.fileNm)) {
              fileNm = opts.fileNm;
            }
            fileNm = nexacro.base64Encode(fileNm);
            var form = null,
              input = [];
            var submitCnt =
              context.dateUtils.today("yyyymmddHHmiss") + new Date().getMilliseconds();
            var interval = setInterval(function () {
              //submitCnt+=1;
              var $document = document;
              form = $document.createElement("form");
              form.id = "_edu_common_form" + submitCnt;
              form.action = application.gds_baseInfo.getColumn(0, "reportDataPdfServerUrl");
              form.method = "post";
              form.style.display = "none";
              input.push($document.createElement("input"));
              input[0].name = "stream";
              input[0].value = "true";

              input.push($document.createElement("input"));
              input[input.length - 1].name = "reportParams";
              input[input.length - 1].value = reportParams;
              form.appendChild(input[input.length - 1]);

              input.push($document.createElement("input"));
              input[input.length - 1].name = "paramType";
              input[input.length - 1].value = opts.type;
              form.appendChild(input[input.length - 1]);

              input.push($document.createElement("input"));
              input[input.length - 1].name = "filePath";
              input[input.length - 1].value = _filePath;
              form.appendChild(input[input.length - 1]);

              input.push($document.createElement("input"));
              input[input.length - 1].name = "useGlio";
              input[input.length - 1].value = opts.useGlio;
              form.appendChild(input[input.length - 1]);

              input.push($document.createElement("input"));
              input[input.length - 1].name = "fileNm";
              input[input.length - 1].value = fileNm;
              form.appendChild(input[input.length - 1]);
              form.target = "_edu_stream" + submitCnt;
              $document.getElementsByTagName("body")[0].appendChild(form);
              _innerUtils.getMStreamIframe(submitCnt);

              form.submit();
              var formElement = document.getElementById("_edu_common_form" + submitCnt);
              formElement.parentNode.removeChild(formElement);
              clearInterval(interval);
            }, 1000);
          },

          callSign: function (opts) {
            if (opts.filePath.indexOf(".") >= 0) {
              context.popup.reportImg
                .setOpts({
                  width: opts.popupSize && opts.popupSize[0] ? opts.popupSize[0] : 1000,
                  height: opts.popupSize[1] && opts.popupSize[1] ? opts.popupSize[1] : 800
                })
                .open({
                  filePath: opts.filePath
                });
              return;
            }

            opts = _utilsHome.extend(
              {
                filePath: "",
                fileNm: "",
                table: "",
                checkSearchParam: false,
                params: "",
                useGlio: false,
                popupSize: [],
                landscape: false,
                type: "query",
                reportObj: "",
                reportBtn: "PS",
                scrollView: false,
                persInfo: false,
                toolbar: true,
                callback: ""
              },
              opts
            );
            var formName = new Date().getTime();
            var popupFlag = true;

            if (opts.reportObj) {
              popupFlag = false;
            } else if (this instanceof WebBrowser) {
              popupFlag = false;
              opts.reportObj = this;
            }

            var reportContext = context;
            var reportContextNm = reportContext.getOwnerFrame().name;
            while (reportContextNm.indexOf("Child") < 0) {
              reportContext = reportContext.parent;
              reportContextNm = reportContext.getOwnerFrame().name;
            }
            var cnt = 0;
            var reportParams;
            if (opts.filePath.indexOf("/") == 0) {
              opts.filePath = opts.filePath.substring(1);
            }
            //var _filePath = opts.filePath + ".crf";
            var _filePath = opts.filePath;
            var paramType = opts.params instanceof nexacro.Dataset ? "dataset" : "json";
            if (paramType == "dataset" && opts.type == "xml") {
              reportParams = opts.params.saveXML();
            } else {
              if (paramType == "dataset") {
                reportParams = opts.params.getRowData();
              } else {
                reportParams = opts.params || {};
              }
              var glio = {};
              if (opts.useGlio) {
                glio = _utilsHome.getGLIO([
                  "logNo",
                  "loginIp",
                  "univCd",
                  "univNm",
                  "deptCd",
                  "deptId",
                  "deptNm",
                  "persNo",
                  "socpsCd",
                  "userNm",
                  "acntYy",
                  "budgtDeptId"
                ]);
              } else {
                glio = _utilsHome.getGLIO(["logNo", "loginIp", "deptNm", "userNm", "persNo"]);
              }
              glio.reportLog =
                glio.deptNm +
                " " +
                glio.userNm +
                " " +
                context.dateUtils.today("yyyy-mm-dd HH:mi:ss");
              if (_utilsHome.isValid(glio)) {
                _utilsHome.extend(reportParams, glio, true, true, "g_");
                reportParams.g_menuId = context.getOwnerFrame().arguments.menuId;
                reportParams.g_menuGrade = "" + context.getOwnerFrame().arguments.menuGrade;
              }
              for (var key in reportParams) {
                if (!_utilsHome.isValid(reportParams[key])) {
                  reportParams[key] = "";
                }
              }
              // 파라미터 스트링 문자로 변경
              reportParams = JSON.stringify(reportParams);
            }
            // 특수문자 처리
            reportParams = reportParams.replace(/&/g, "&#38;");
            reportParams = nexacro.base64Encode(reportParams);
            // 파라미터 변경되지 않고 팝업이 아닐 경우 동일한 파라미터로 조회 못하게 막음
            if (!popupFlag) {
              if (this._commonReportParams) {
                if (
                  opts.checkSearchParam &&
                  opts.filePath + reportParams == this._commonReportParams
                ) {
                  _utilsHome.alert("이미 처리된(중) 출력물이 있습니다.");
                  return;
                } else {
                  this._commonReportParams = opts.filePath + reportParams;
                }
              } else {
                this._commonReportParams = opts.filePath + reportParams;
              }
            }
            var reportDataServerUrl = "/sign/callSign.jsp";

            if (!context["dsResult"]) {
              var result = new Dataset();
              result.set_name("dsResult");
              context.addChild(result.name, result);

              result.addColumn("fileNo", "String");
            }
            _utilsHome.transaction({
              id: "findApurSignInfo",
              url: "/com/cmsv/FileCtr/findApurSignInfo.do",
              async: false,
              arg: "fileNm=" + opts.fileNm + " table=" + opts.table,
              outDS: "dsResult=dsResult",
              callback: function () {
                var returnVal = context["dsResult"];

                var data = {
                  fileNo: returnVal.getColumn(0, "fileNo"),
                  fileNm: opts.fileNm
                };

                var params = {
                  reportParams: reportParams,
                  table: opts.table,
                  paramType: opts.type,
                  filePath: _filePath,
                  fileNo: returnVal.getColumn(0, "fileNo"),
                  fileNm: opts.fileNm,
                  reportBtn: opts.reportBtn,
                  useGlio: opts.useGlio,
                  scrollView: opts.scrollView ? "1" : "0",
                  persInfo: opts.persInfo ? "1" : "0",
                  toolbar: opts.toolbar ? "1" : "0"
                };
                if (opts.ratio) params.ratio = opts.ratio;

                if (opts.pageMove) {
                  //페이지 이동 처리
                  var form = _utilsHome.createForm(params);
                  form.action = reportDataServerUrl;
                  document.body.appendChild(form);
                  form.submit();
                  document.body.removeChild(form);
                } else if (popupFlag) {
                  // 팝업
                  window._commonDummyReady = "1";
                  var sw, sh;
                  var cw = screen.availWidth,
                    ch = screen.availHeight;

                  if (opts.popupSize.length > 0) {
                    sw = opts.popupSize[0];
                    sh = opts.popupSize[1];
                  } else {
                    var defaultWidth, defaultHeight;
                    if (opts.landscape) {
                      defaultWidth = 1300;
                      defaultHeight = 700;
                    } else {
                      defaultWidth = 900;
                      defaultHeight = 800;
                    }

                    sw = defaultWidth > screen.availWidth ? screen.availWidth - 100 : defaultWidth;
                    sh =
                      defaultHeight > screen.availHeight ? screen.availHeight - 100 : defaultHeight;
                  }
                  var url = "/callReport.html";
                  var openOps =
                    "width=" +
                    sw +
                    ",height=" +
                    sh +
                    ",left=" +
                    (cw - sw) / 2 +
                    ",top=" +
                    (ch - sh) / 2 +
                    ", location=no,toolbar=no,menubar=no,scrollbars=yes,resizable=yes";
                  function objToQuery(obj) {
                    var parts = [];
                    for (var key in obj) {
                      if (obj.hasOwnProperty(key)) {
                        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
                      }
                    }
                    return "?" + parts.join("&");
                  }

                  var reportWinPopup = window.open(url, formName, openOps);

                  var interval = setInterval(function () {
                    cnt++;
                    if (
                      typeof reportWinPopup.callReport === "function" ||
                      typeof reportWinPopup.callReport === "object"
                    ) {
                      clearInterval(interval);
                      reportWinPopup.callReport(reportDataServerUrl, params);
                    } else if (cnt > 1000) {
                      clearInterval(interval);
                    }
                  }, 50);
                  var timer = setInterval(function () {
                    if (reportWinPopup.closed) {
                      clearInterval(timer);

                      if (!opts.callback) return;

                      if (typeof opts.callback == "function") {
                        opts.callback.call(context, data);
                      } else {
                        context[opts.callback].call(context);
                      }
                    }
                  }, 50);
                } else {
                  //임베디드
                  window._commonDummyReady = "0";
                  formName = "_common_report_viewer_" + opts.reportObj.name + reportContextNm;
                  opts.reportObj._ifrm_elem.dest_handle.name = formName;
                  opts.reportObj.set_url(
                    nexacro.getApplication().url + "/frameDummy.html?formName="
                  );
                  var reportContext = context;
                  var interval = setInterval(function () {
                    cnt++;
                    if (window._commonDummyReady === "1") {
                      clearInterval(interval);
                      //var reportContext = application.gv_AppWorkFrameSet[reportContextNm].form.components.div_Work.form;
                      reportContext.utils.transaction({
                        url: reportDataServerUrl,
                        stream: true,
                        external: true,
                        target: formName,
                        popup: popupFlag,
                        streamParams: params
                      });
                    } else if (cnt > 1000) {
                      clearInterval(interval);
                    }
                  }, 50);
                }
              }
            });
          },
          /**
           * webEdt - 웹 에디터 관련 함수
           *
           */
          webEdt: {
            /*
             * 웹에디터 초기화 및 확장 param obj : 웹에디터 component ex) this.wb_edt - init 후 웹에디터에 관련된 함수 사용가능 ex) this.wb_edt.getValue();
             *
             * getValue : 웹에디터의 값을 가져오는 함수 - param : n/a;
             *
             * setValue : 웹에디터에 값을 셋팅 - param : val (셋팅할 값) readonly : 웹에디터의 편집상태를 변경 - param : val ( true - 수정불가 false - 수정가능)
             *
             */
            init: function (obj, $params) {
              // 기존 소스를 고치지 않기 위한 처리
              if (typeof $params != "object") {
                $params = {};
              }
              $params = _utilsHome.extend(
                {
                  titlebar: "0",
                  toolbar: "1",
                  menubar: "1",
                  readonly: false,
                  mode: "",
                  width: 0,
                  height: 0,
                  menuId: context.getOwnerFrame().arguments.menuId,
                  pgmId: context.getOwnerFrame().arguments.pgmId
                },
                $params
              );
              var url = "/tinymce/editor.html?";

              if ($params.height == 0) {
                $params.height = obj.getOffsetHeight();
              }

              for (var i in $params) {
                url += i + "=" + $params[i] + "&";
              }
              // 끝에 & 삭제
              url = url.substring(0, url.length - 1);
              obj._type = "webEdt";
              obj._context = context;
              obj.set_url(application.url + url);
              obj.getValue = function () {
                obj.callMethod("nexGetData");
                var val = obj
                  .getProperty("document")
                  .callMethod("getElementById", "edt_retData")
                  .getProperty("value");
                return val;
              };
              obj.setValue = function (val) {
                var valStr = val || "";
                var edtSetCnt = 0;
                try {
                  if (edtSetCnt < 10) {
                    edtSetCnt++;
                    obj.callMethod("nexSetData", valStr);
                  }
                } catch (e) {
                  setTimeout(function () {
                    obj.setValue(val);
                  }, 300);
                }
              };
              obj.readonly = function (val) {
                obj.callMethod("nexSetReadonly", val);
              };
              obj.isReady = function () {
                var editorFlag = false;
                try {
                  obj.callMethod("nexGetData");
                  editorFlag = true;
                } catch (a) {}
                if (!editorFlag) {
                  _utilsHome.alert("에디터를 로딩중입니다.");
                }
                return editorFlag;
              };
            }
          },

          /**
           * webViewer - 웹 뷰어 함수 (용도 : 웹에디터로 작성된 내용을 출력만 할 경우 또는 내용이 html으로 되어있는 경우 사용)
           *
           */
          webViewer: {
            /*
             * 웹뷰어 초기화 및 확장 param obj : 웹브라우저 component ex) this.wb_viewer text : - init 후 뷰어에 관련된 함수 사용가능 ex) this.wb_edt.setValue("123123");
             *
             *
             * setValue : 웹뷰어에 값을 셋팅 - param : val (셋팅할 값)
             *
             */
            init: function (obj, text, opts) {
              if (text) {
                if (!obj.getEventHandler("onloadcompleted", 0)) {
                  obj.setEventHandler(
                    "onloadcompleted",
                    function () {
                      obj.setValue(text);
                    },
                    context
                  );
                }
              }
              var url = application.url + "/tinymce/";
              if (opts == "notice" && context.MENU_GRADE == 6) {
                obj._type = "notice";
                url += "notice.html";
                obj.setEventHandler(
                  "onusernotify",
                  function (id) {
                    if (id == "noticeEdit") {
                      obj.editNotice();
                    }
                  },
                  context
                );

                context.popup.make({
                  id: "noticeEdit",
                  url: "COM_CSYSMN::csysmn0220_pop01.xfdl"
                });
              } else {
                obj._type = "webViewer";
                url += "viewer.html";
              }
              obj.set_url(url);
              obj.setValue = function (val) {
                var valStr = val || "";
                var viewSetCnt = 0;
                try {
                  if (viewSetCnt < 10) {
                    viewSetCnt++;
                    obj.callMethod("setValue", val || "");
                  }
                } catch (e) {
                  setTimeout(function () {
                    obj.setValue(val);
                  }, 300);
                }
              };
              obj.print = function (val) {
                obj.callMethod("printViewer");
              };
            }
          },
          /**
           * persInfo - 이용동의서 함수
           *
           */
          persInfo: {
            /*
                     * check : 입력된 약관에 대한 동의가 필요한지 확인
                     * param wrtcnId : 약관 동의ID
                     *
                     * return boolean : true - 약관동의가 필요,
                                        false - 약관동의 불필요
                     */
            check: function (params) {
              params = params || {};
              context._persInfoAgreeYn = "";
              _utilsHome.transaction({
                url: "/com/csys/CsyspiCtr/findCheckWrtcnAgree.do",
                arg: {
                  wrtcnId: params.wrtcnId
                },
                async: false
              });

              // 필수인데 동의하지 않은 약관 목록
              if (context._persInfoAgreeYn == "0") {
                _innerUtils.performLog("동의하지않은 필수 약관이 존재");
                return true;
              } else {
                _innerUtils.performLog("추가적으로 동의해야할 내용이 없음");
                return false;
              }
            },
            /*
             * popup : 약관에 대한 동의가 필요한지 확인 후 약관 동의 팝업을 실행
             * param utilizStplatId : 약관 동의Id
             *       userId : 사용자ID(세션으로 체크하는 빈값 입력)
             *       callback : 약관동의 팝업이 닫힌 후 실행될 함수
             *                 ex) function(result){  }
             *                     result - true 약관 동의가 완료되었거나 할 필요가 없는 경우
             *                              false 약관 동의가 완료되지 않은 경우
             */
            popup: function (params) {
              params = params || {};

              if (_utilsHome.persInfo.check(params)) {
                if (!context.popup.persInfo_pop) {
                  context.popup.make({
                    id: "persInfo_pop",
                    url: "COM_POPUP::persInfo_pop.xfdl",
                    title: "이용동의서"
                  });
                }
                context.popup.persInfo_pop
                  .setOpts({
                    callback: function (id, data) {
                      if (typeof params.callback == "function") {
                        if (_utilsHome.isValid(data)) {
                          params.callback.call(context, data.agree);
                        } else {
                          params.callback.call(context, false);
                        }
                      } else {
                        _innerUtils.performLog("이용동의서 콜백함수 없음");
                      }
                    }
                  })
                  .open(params);
              } else {
                if (typeof params.callback == "function") {
                  params.callback.call(context, true);
                } else {
                  _innerUtils.performLog("이용동의서 콜백함수 없음");
                }
              }
            }
          },
          /**
           * sendSmsAuth - sms 인증번호를 보낸다.
           *
           */
          sendSmsAuth: function ($params) {
            $params = _utilsHome.extend(
              {
                persNo: "",
                hpNo: "",
                sendHpNo: "",
                resultMsg: "인증 메세지를 발송하였습니다.",
                callback: null
              },
              $params
            );

            if (!$params.persNo || !$params.hpNo) {
              _innerUtils.performLog("필수파라미터가 없습니다.");
              return;
            }
            if (context._DS_SENDSMSAUTH == undefined) {
              context._DS_SENDSMSAUTH = new Dataset();
            }
            _utilsHome.transaction({
              url: "/com/MesgCtr/saveSmsAuth.do",
              arg: $params,
              async: false,
              outDS: "_DS_SENDSMSAUTH=DS_RESULT",
              callback: function () {
                var result = false;
                if (_utilsHome.isValid(context._DS_SENDSMSAUTH.getColumn(0, "sendSmsGroupNo"))) {
                  result = true;
                  if ($params.resultMsg != false) {
                    _utilsHome.alert($params.resultMsg);
                  }
                }
                if (typeof $params.callback == "function") {
                  $params.callback.call(context, result);
                }
              }
            });
          },
          /*  excelImport : 엑셀을 임포트한다.
                    @param 1(key type default(*은 필수))
                    param Object *
                    {
                        colList [String] *
                            : 컬럼 목록
                              import되는 엑셀의 열의 순서대로 입력한 컬럼명으로 데이터를 변경하여 return
                              target이 지정된 경우 데이터셋에 일치하는 컬럼의 값을 셋팅
                              지정된 컬럼이 없으면 "Column열번호"로 지정
                        target component(Grid,Dataset) null
                            : 데이터가 입력될 대상 컴포넌트
                              공통처리를 안하고 excel 데이터만 받아서 처리하는 경우 입력하지않고 callback으로 처리
                              지정하는 경우 가급적 그리드를 지정(enableredraw 속성 변경의 이유)
                        headRow int 1
                            : head 데이터가 있는 row의 숫자(엑셀 행은 1부터 시작)
                        clearData boolean true
                            : target이 있는 경우 해당 데이터셋을 클리어할지 결정
                        returnType string("json","dataset") "json"
                            : callback에 return할 데이터형식
                        callback function null
                            : 콜백함수
                            function(엑셀Data)
                    }
                    ex)
                    this.utils.excelImport({
                        target : this.grd_contextTest
                        , headRow : 1
                        , colList : ["code", "codeNm","remrk","useYn"]
                        , callback : function(data){
                            console.log(data);
                        }
                    });
                */
          excelImport: function (arg) {
            arg = _utilsHome.extend(
              {
                colList: [],
                clearData: "1",
                headRow: 1,
                returnType: "json"
              },
              arg
            );

            try {
              var dsNm = "_commonExcelDs";
              if (!(context[dsNm] instanceof nexacro.NormalDataset)) {
                var ds = new nexacro.NormalDataset(dsNm);
                context.addChild(ds.id, ds);
                context.utils.extendComponent(ds);
              }
              var objNm = "_common_excel_import";
              if (context[objNm]) {
                context.removeChild(objNm);
              }
              var importObj = new nexacro.ExcelImportObject(objNm, context);
              context.addChild(importObj.id, importObj);
              var importUrl = application.url + "/excel/XImport";
              if (location.hostname == "localhost") {
                importUrl = application.url + "/com/XImport";
              }
              importObj.set_importurl(importUrl);
              importObj.user_context = context;
              importObj.user_callback = null;

              // 타겟 DS 처리
              var objTargetDs = null;
              if (arg.target) {
                if (arg.target instanceof nexacro.NormalDataset) {
                  objTargetDs = arg.target;
                } else if (arg.target instanceof nexacro.Grid) {
                  objTargetDs = arg.target.getBindDataset();
                  importObj.user_grid = arg.target;
                }
              }

              importObj.set_importtype(nexacro.ImportTypes.EXCEL);
              importObj.addEventHandler(
                "onsuccess",
                function (obj, e) {
                  var ds = context[dsNm];
                  //결과데이터셋 컬럼 변경
                  for (var i = 0; i < ds.colinfos.length; i++) {
                    if (arg.colList[i]) {
                      ds.updateColID(i, arg.colList[i]);
                    }
                  }

                  if (objTargetDs) {
                    if (importObj.user_grid) {
                      importObj.user_grid.set_enableredraw(false);
                    }
                    if (arg.clearData == "1") {
                      objTargetDs.clearData();
                    }

                    for (var i = 0; i < ds.rowcount; i++) {
                      var row = objTargetDs.addRow();
                      var data = ds.getRowData(i);
                      for (var j = 0; j < objTargetDs.colinfos.length; j++) {
                        var info = objTargetDs.colinfos[j];
                        var excelVal = data[info.id];
                        if (excelVal || excelVal === 0) {
                          switch (info.type.toUpperCase()) {
                            case "STRING":
                              break;
                            // String 이외엔 숫자만 입력
                            case "BIGDECIMAL":
                              excelVal = parseFloat(excelVal.replace(/[^0-9.-]/g, ""));
                              break;
                            case "DATE":
                              excelVal = excelVal.replace(/[^0-9]/g, "");
                              if (excelVal.length != 8) {
                                excelVal = "";
                              }
                              break;
                            default:
                              excelVal = excelVal.replace(/[^0-9]/g, "");
                              break;
                          }
                          objTargetDs.setColumn(row, info.id, excelVal);
                        }
                      }
                    }
                    if (importObj.user_grid) {
                      importObj.user_grid.set_enableredraw(true);
                    }
                  }
                  form.setWaitCursor(false);
                  if (typeof arg.callback == "function") {
                    if (arg.returnType == "json") {
                      arg.callback.call(context, ds.getAllRowData());
                    } else {
                      arg.callback.call(context, ds);
                    }
                  }
                },
                context
              );
              importObj.addEventHandler(
                "onerror",
                function (obj, e) {
                  var time = setTimeout(function () {
                    var form = obj.user_context;
                    if (importObj.user_grid) {
                      importObj.user_grid.set_enableredraw(true);
                    }
                    form.setWaitCursor(false);
                    form._common_excel_import.destroy();
                    clearTimeout(time);
                    form.utils.alert("엑셀 임포트중 문제가 발생하였습니다.");
                    form.utils.error(e.errormsg, e);
                  }, 300);
                },
                context
              );

              if (typeof arg.callback == "function") {
                importObj.user_callback = arg.callback;
              }
              // waitcursor
              var form = context;
              var ifr = document.getElementById("edu_base_iframe"),
                inputs,
                form,
                input;
              if (ifr != null) {
                inputs = ifr.contentWindow.document.getElementsByName("upfile");
                if (inputs.length > 0) {
                  for (var i = 0, j = inputs.length; i < j; i++) {
                    if (inputs[i].parentNode.id.indexOf(objNm) > -1) {
                      input = inputs[i];
                      break;
                    }
                  }
                  if (input != undefined && input.onsubmit == undefined) {
                    input.addEventListener("change", waitCursor);
                    input.addEventListener("select", waitCursor);
                    function waitCursor(e) {
                      if (e.target.files.length > 0) {
                        form.setWaitCursor();
                      }
                    }
                  }
                }
              }
              return importObj.importData(
                "",
                "[Body=" + "!A" + (arg.headRow + 1) + ":;]",
                "[_commonExcelDs=output1]",
                ""
              );
              //return importObj.importData("", "[Command=getsheetlist;Output=sheetlist]"
              //                              +"[command=getsheetdata;output=outDs;" + range + "]", "[_commonExcelDs=outDs]", "");
              //return importObj.importData("", "[command=getsheetdata;output=outDs;body=!A1:]", "[_commonExcelDs=outDs]", "");
            } catch (e) {
              _utilsHome.log(e);
              context.setWaitCursor(false);
            }
          },
          excelDownload: function (url, paramObj, password) {
            _utilsHome.checkArguments(
              {
                url: url,
                paramObj: paramObj
              },
              ["url"],
              ["url@string", "paramObj@undefined,json"],
              true
            );

            paramObj = paramObj || {};

            var input = "";
            if (password === true) {
              input = window.prompt(
                "개인정보(주민번호)가 포함되어 비밀번호를 설정하여야합니다.\n비밀번호를 입력해주세요.",
                ""
              );
              if (!input) {
                _utilsHome.alert("비밀번호를 입력해주세요.");
                return;
              }

              paramObj._excelPassword = input;
            }

            context.setWaitCursor(true);
            /*
                    setTimeout(function(){
                        context.setWaitCursor(false);
                    }, time);
                    */

            var i = 0;
            var checkFunc = function () {
              context.fileDownChk = "";

              var contextRoot = new RegExp("com|adm|uni").exec(url)[0];
              context.utils.transaction({
                url: "/" + contextRoot + "/ContextTestCtr/findFileDownloadCompCheck.do",
                callback: function () {
                  if (context.fileDownChk == "true") {
                    /*
                                    if(context.getOwnerFrame().form.stc_excel && context.getOwnerFrame().form.stc_excel.visible){
                                        context.getOwnerFrame().form.stc_excel.set_text("");
                                    }
                                    */
                    context.setWaitCursor(false);
                  } else {
                    /*
                                    if(context.getOwnerFrame().form.stc_excel && context.getOwnerFrame().form.stc_excel.visible){
                                        context.getOwnerFrame().form.stc_excel.set_text(context.fileDownChk);
                                    }
                                    */
                    setTimeout(checkFunc, 3000);
                  }
                }
              });
            };
            //setTimeout(checkFunc, 2000);

            _utilsHome.transaction({
              url: url,
              stream: true,
              streamParams: paramObj || {}
            });
          },

          /*  openMenu : 메뉴호출(메뉴를 열거나 열려있는 탭으로 이동)
                    @param 1(key type default)
                    menuId string *
                        :메뉴ID
                    OR
                    param Object *
                    {
                        menuId string *
                            :메뉴ID
                        callback string null
                            :메뉴가 열린 후 실행될 함수 지정(다른 메뉴에 파라미터를 넘겨서 사용하는 경우)
                             (호출되는 쪽에서 실행되는 callback이므로 string으로 지정.
                              해당 함수는 열리는 메뉴에 존재해야함
                              open :메뉴가 열린 상태에 따라 처리해야하는 경우 사용
                                    new - 메뉴가 새로 열린경우
                                    reload - 이미 열린 상태에서 다시 호출된경우
                              param : param으로 준것을 전달
                              ex) this.openMenuCallback = function(open, param) { }
                        param {} null
                            : callback에 전달할 파라미터
                    }
                 */
          openMenu: function (param) {
            if (typeof param == "string") {
              param = {
                menuId: param
              };
            }
            if (!param && !param.menuId) return;
            // 앱ID로 mdi인지 판단.
            var isMdi = nexacro.getApplication().app == "biz" ? true : false;

            //childframe 명칭
            var childFrameName = isMdi ? "Child_" + param.menuId : "ChildFrame";
            if (!isMdi) {
              //포털은 mdi가 아니므로 기존 화면 삭제 후 진행
              application.gv_AppWorkFrameSet.removeChild(childFrameName);
            }
            var objChildFrame = application.gv_AppWorkFrameSet[childFrameName];
            // 열려 있는 화면이 존재 할경우 처리
            if (objChildFrame != null) {
              for (var i = 0; i < application.gv_AppWorkFrameSet.all.length; i++) {
                application.gv_AppWorkFrameSet.all[i].set_visible(false);
              }
              objChildFrame.set_visible(true);
              if (isMdi) {
                nexacro.getApplication().gv_AppTabPath.form.setTabIndex(param.menuId);
              }

              if (param.callback) {
                var form = objChildFrame.form.components.div_Work.form;
                if (typeof form[param.callback] == "function") {
                  form[param.callback].call(form, "reload", param.param);
                }
              }
            } else {
              // 열려있는 메뉴 개수 확인
              if (isMdi) {
                var objTabForm = nexacro.getApplication().gv_AppTabPath.form;
                if (objTabForm.tab_openList.getTabpageCount() >= objTabForm.tabCount) {
                  context.utils.alert("업무화면은 #{count}개를 초과하여 열수 없습니다.", {
                    count: objTabForm.tabCount
                  });
                  return;
                }
              }

              if (!context._dsMenuInfo) {
                var ds = new nexacro.NormalDataset("_dsMenuInfo");
                context.addChild(ds.id, ds);
                _utilsHome.extendComponent(context._dsMenuInfo);
              }
              context._dsMenuInfo.clearData();
              _utilsHome.transaction({
                url: "/com/cmsv/MenuCtr/findMenu.do",
                arg: "strMenuId=" + param.menuId,
                async: false,
                outDS: "_dsMenuInfo=dsMenuInfo"
              });
              // 메시지는 서버에서 처리
              if (context._dsMenuInfo.getRowCount() == 0) {
                return false;
              }
              var data = context._dsMenuInfo.getRowData();
              //메뉴공지 확인
              if (data.menuNotcCtnt) {
                //메뉴실행여부가 0이면 공지만 띄우고 메뉴를 열지않음
                context.popup.webViewer.open({
                  contents: data.menuNotcCtnt
                });

                if (data.menuExecYn == "0") {
                  return;
                }
              }
              data.frameYn = param.frameYn || "1";
              var objNewWin = new ChildFrame();
              objNewWin.init(
                childFrameName,
                0,
                0,
                nexacro.getApplication().gv_AppWorkFrameSet.getOffsetWidth() - 0,
                nexacro.getApplication().gv_AppWorkFrameSet.getOffsetHeight() - 0
              );

              param.pvWorkGb = "MAIN";
              objNewWin.arguments = data;

              nexacro.getApplication().gv_AppWorkFrameSet.addChild(childFrameName, objNewWin);
              if (typeof param.afterOnload == "object") {
                objNewWin.afterOnload = param.afterOnload;
              }
              if (nexacro.getApplication().app == "portal") {
                objNewWin.set_formurl("COM_FRAME::portalFrame.xfdl");
              } else {
                objNewWin.set_formurl("COM_FRAME::workFrame.xfdl");
              }
              objNewWin.set_dragmovetype("none");
              objNewWin.set_showtitlebar(false);
              objNewWin.set_resizable(true);
              objNewWin.set_openstatus("maximize");
              objNewWin.show();

              //개발자 모드인 경우 마지막 연 메뉴를 저장
              if (devFlag && window.sessionStorage) {
                //window.sessionStorage.setItem("lastMenuId", param.menuId);
              }
              //메뉴 열린 후 처리
              if (param.callback) {
                objNewWin.openCallback = param.callback;
                objNewWin.openCallbackParam = param.param;
              }
            }
          },
          /*  closeMenu : 메뉴닫기
                                기간계의 경우 현재 메뉴를 닫고 입력받은 파라미터가 있는 경우 후처리
                                포털의 경우엔 현재 메뉴를 닫음
                    @param 1(key type default)
                    arg Object null
                    {
                        menuId string ""
                            메뉴를 닫은 후 표시할 메뉴ID
                        param object null
                            표시할 메뉴가 있는 경우 해당 메뉴의 callback 함수에 전달할 파라미터
                            callback함수는 따로 파라미터로 받지않고
                            이동할 메뉴에 _common_openMainTabMenu_callback_닫힌메뉴ID 로 만들어두면 호출이 됨
                    }
                 */
          closeMenu: function (arg) {
            var menuId = context.getOwnerFrame().arguments.menuId;
            if (nexacro.getApplication().app == "portal") {
              context.getOwnerFrame().destroyComponent();
            } else {
              var closeFg = nexacro
                .getApplication()
                .gv_AppTabPath.form.fn_delTab(context.getOwnerFrame().name, true);
              if (closeFg && _utilsHome.isValid(arg)) {
                var targetMenu = _innerUtils.refWorkFrame(arg.menuId);
                if (targetMenu != undefined) {
                  targetMenu.setFocus();
                  if (
                    typeof targetMenu["_common_openMainTabMenu_callback_" + menuId] == "function"
                  ) {
                    targetMenu["_common_openMainTabMenu_callback_" + menuId].call(
                      targetMenu,
                      arg.param
                    );
                  }
                }
              }
            }
          },
          getOpenMenuInfo: function (param) {
            var workframe = nexacro.getApplication().gv_AppWorkFrameSet;
            if (param == "length") {
              return workframe ? workframe.all.length : 0;
            } else if (param == "list") {
              return workframe ? workframe.all : null;
            }
            return null;
          },
          dynamicPos: function (workObj) {
            if (Number(workObj.val) < 0) {
              _utilsHome.error("지원하지 않는 기능입니다.");
            }
            /*var workObj  = {
                        id : id
                        ,mode : mode
                        ,target : target
                        ,val : Number(val)
                        ,move : move
                    }*/
            if (context[workObj.id + "_chageFlag"] === undefined) {
              context[workObj.id + "_chageFlag"] = true;
            } else if (context[workObj.id + "_chageFlag"]) {
              workObj.val = Number("-" + workObj.val);
              context[workObj.id + "_chageFlag"] = false;
            } else {
              context[workObj.id + "_chageFlag"] = true;
            }
            var sizeMethodNm = workObj.mode === "h" ? "OffsetHeight" : "OffsetWidth";
            var posMethodNm = workObj.mode === "h" ? "OffsetTop" : "OffsetLeft";
            for (var i = 0; i < workObj.target.length; i++) {
              var comp = workObj.target[i];
              comp["set" + sizeMethodNm].call(
                comp,
                comp["get" + sizeMethodNm].call(comp) + workObj.val
              );
            }
            for (var i = 0; i < workObj.move.length; i++) {
              var comp = workObj.move[i];
              comp.bottom = undefined;
              comp.top = undefined;
              comp.width = undefined;
              comp.height = undefined;
              comp["set" + sizeMethodNm].call(comp, comp["get" + sizeMethodNm].call(comp));
              comp["set" + posMethodNm].call(
                comp,
                comp["get" + posMethodNm].call(comp) + workObj.val
              );
            }
            var workForm = context.getOwnerFrame().form;
            var changeVal =
              workForm.div_Work["get" + sizeMethodNm].call(workForm.div_Work) + workObj.val;
            workForm.div_Work["set" + sizeMethodNm].call(workForm.div_Work, changeVal);
            workForm.resetScroll();
          },
          saveBtnLog: function (btnObj) {
            /*
                    _utilsHome.transaction({
                        url : "com/SlogCtr/saveBtnLog.do"
                        ,arg : "btnNm=" +  btnObj.text.replace(/\s/g,"_")
                        ,async : false
                    });
                    */
          },
          isAdmin: function () {
            return _utilsHome.getGLIO(["roleGroup"]).roleGroup.R00001 != undefined;
          },
          /*
                openMonthPopup : 월력 컴포넌트를 호출한다.(Grid를 제외한 컴포넌트는 initMonthPopup으로 사용)
                    @param
                        * target : 대상 컴포넌트 (Edit, MaskEdit, Grid)
                        callback : 콜백함수 function(컴포넌트, 입력된 날짜)

                    ex)
                    this.utils.openMonthPopup({
                        target : obj
                        , callback : function(comp, data){
                            console.log(comp, data);
                        }
                    });

                initMonthPopup : 월력 컴포넌트로 변경한다.
                    @param
                        * target : 대상 컴포넌트 (Edit, MaskEdit, Grid)
                        columnNm : 적용될 컬럼명(Grid인 경우 필수)
                        callback : 콜백함수 function(컴포넌트, 입력된 날짜)

                        ex)
                        this.utils.initMonthPopup({
                            target : this.edt_month
                            , callback : function(comp,data){
                                console.log(comp,data);
                            }
                        });

                        this.utils.initMonthPopup({
                            target : this.grd_list
                            , columnNm : "month"
                        });
                */
          monthPopup: {
            open: function (param) {
              _utilsHome.checkArguments(
                param,
                ["target"],
                ["columnNm@string", "callback@function"]
              );

              var comp = param.target;
              if (!comp) {
                this.utils.error("대상 Component를 입력 하여 주십시요.");
                return false;
              }

              var sPopupDivNm = "_commonPdvMonth";
              var objPopupDiv = context.all[sPopupDivNm];

              if (!objPopupDiv) {
                objPopupDiv = new PopupDiv();
                objPopupDiv.init(sPopupDivNm, 0, 0, 168, 181, null, null);
                var retVal = context.addChild(sPopupDivNm, objPopupDiv);
                objPopupDiv.set_name(sPopupDivNm);
                objPopupDiv.set_async(false);
                objPopupDiv.set_url("COM_DIV::monthCalendar.xfdl");
                objPopupDiv.show();
              }

              var sMonth = "";
              if (comp instanceof nexacro.Grid) {
                var ds = comp.getBindDataset();
                if (param.columnNm) {
                  objPopupDiv.user_column = param.columnNm;
                } else {
                  objPopupDiv.user_column = comp
                    .getCellProperty("body", comp.currentcell, "text")
                    .replace(/bind:/, "");
                }
                sMonth = ds.getColumn(ds.rowposition, objPopupDiv.user_column);
              } else {
                sMonth = comp.value;
              }

              if (!sMonth || sMonth.length != 6) sMonth = context.dateUtils.today("yyyymm");

              objPopupDiv.user_context = context;
              objPopupDiv.user_target = comp;

              objPopupDiv.user_callback = param.callback;
              objPopupDiv.form.initCalendar(sMonth);
              //그리드 일경우 처리
              if (comp instanceof Grid) {
                var objRect = comp.getCellRect(comp.currentrow, comp.currentcell);
                objPopupDiv.trackPopupByComponent(
                  comp,
                  objRect.right - objPopupDiv.getOffsetWidth(),
                  objRect.bottom
                );
              } else {
                objPopupDiv.trackPopupByComponent(comp, 1, comp.getOffsetHeight() + 1);
              }
            },
            init: function (param) {
              _utilsHome.checkArguments(
                param,
                ["target"],
                ["columnNm@string", "callback@function"]
              );

              var comp = param.target;
              if (
                (!comp) instanceof nexacro.Edit &&
                (!comp) instanceof nexacro.MaskEdit &&
                (!comp) instanceof nexacro.Grid
              ) {
                this.utils.error("Edit 컴포넌트 또는 MaskEdit를 사용해주세요.");
                return false;
              }

              if (comp instanceof nexacro.Grid) {
                _utilsHome.monthPopup.initGrid(param);
              } else {
                _utilsHome.monthPopup.initEdit(param);
              }
            },
            initEdit: function (param) {
              var comp = param.target;
              var div = comp.parent;

              // 달력 버튼 생성
              var left = null,
                right = null;
              if (comp.left) {
                left = _utilsHome.position.add(comp.left, comp.getOffsetWidth() - 22);
                //comp.getOffsetLeft() + comp.getOffsetWidth() - 22;
              } else {
                //right = comp.getOffsetRight();
                right = comp.right;
              }
              var btn = new Button(
                comp.id + "_monthPop",
                left,
                comp.getPixelTop(),
                22,
                comp.getPixelHeight(),
                right,
                comp.getPixelBottom()
              );

              btn.set_cssclass("btn_calendar");
              div.addChild(btn.id, btn);
              btn.show();
              btn.addEventHandler(
                "onclick",
                function (obj, e) {
                  context.utils.openMonthPopup(param);
                },
                context
              );
              comp._commonType = "monthPop";
              comp.btnMonth = btn;

              comp.setEnable = function (flag) {
                comp.setBtnEnable(flag);
                comp.set_enable(flag);
              };

              comp.setBtnEnable = function (flag) {
                if (comp.btnMonth instanceof nexacro.Button) {
                  comp.btnMonth.set_enable(flag);
                }
              };

              comp.setVisible = function (flag) {
                comp.setBtnEnable(flag);
                comp.set_visible(flag);
              };

              comp.setBtnVisible = function (flag) {
                if (comp.btnMonth instanceof nexacro.Button) {
                  comp.btnMonth.set_visible(flag);
                }
              };
            },
            initGrid: function (param) {
              var grid = param.target;
              if (!param.columnNm) {
                this.utils.error("컬럼명(columnNm)을 지정해주세요.");
                return;
              }
              var idx = grid.getBindCellIndex("body", param.columnNm);
              if (idx < 0) {
                this.utils.error(param.columnNm + " 컬럼이 없습니다.");
                return;
              }
              var cssclass = grid.getCellProperty("body", idx, "cssclass");
              cssclass = cssclass ? cssclass + " " : "";
              cssclass += "calendar";
              grid.setCellProperty("body", idx, "cssclass", cssclass);
              grid.setCellProperty(
                "body",
                idx,
                "displaytype",
                "expr:(" + param.columnNm + ') ? "maskeditcontrol" : "editcontrol"'
              );
              grid.setCellProperty("body", idx, "edittype", "mask");
              grid.setCellProperty("body", idx, "expandshow", "show");
              grid.setCellProperty("body", idx, "editmaxlength", "6");
              grid.setCellProperty("body", idx, "editinputtype", "digit");
              grid.setCellProperty("body", idx, "maskeditformat", "####-##");
              grid.setCellProperty("body", idx, "maskedittype", "string");
              grid.setCellProperty("body", idx, "maskedittype", "string");
            }
          },
          /*
                메뉴 정보를 가져오는 함수
                기존 getOwnerFrame().arguments 대신 사용

                파라미터 col을 넘기면 해당 컬럼만. 파라미터를 넘기지 않으면 obj로 전체 정보 리턴
                */
          getMenuInfo: function (col) {
            if (col) {
              return context.getOwnerFrame() ? context.getOwnerFrame().arguments[col] : "";
            } else {
              return context.getOwnerFrame() ? context.getOwnerFrame().arguments : {};
            }
          },
          isMobile: function () {
            var filter = "win16|win32|win64|mac";
            var platform = navigator.platform || "";
            return 0 > filter.indexOf(platform.toLowerCase());
          },
          /*
                 * 대상 객체 또는 객체의 하위 모든 컴포넌트의 상태를 변경한다.(ReadOnly / Disable & Enable)
                 * @param obj 대상 객체
                 * @param {Boolean}      booleanVal 컴포넌트 활성/비활성 여부
                 * @param {Object}
                        readonly {boolean} default : true
                                           - true : readonly가 가능한 컴포넌트는 readonly 처리, 나머지는 enable/disable 처리
                                           - false : enable/disable 처리
                        deep    {boolean}  default : false
                                           - 하위 컴포넌트가 container 컴포넌트인 경우(div, tab, form등)
                                             해당 컴포넌트의 하위 컴포넌트 적용여부
                        list    {string array}    default : []
                                           - 해당 id를 가진 컴포넌트에만 적용
                        exList    {string array}    default : []
                                           - 해당 id를 가진 컴포넌트는 적용에서 제외
                 * exList는 list값을 입력하지않아야 전체 컴포넌트 중 예외만 빼고 적용이 가능
                 * @example
                       this.utils.setEnable(this.div_main, false, {deep : true, readonly : false});
                 */
          setEnable: function (obj, flag, params) {
            if (!obj) return;
            params = _utilsHome.extend(
              {
                deep: false,
                exList: [],
                list: [],
                readonly: true
              },
              params
            );

            var componentList = [
              nexacro.Edit,
              nexacro.MaskEdit,
              nexacro.Spin,
              nexacro.Button,
              nexacro.Calendar,
              nexacro.Combo,
              nexacro.TextArea,
              nexacro.Radio,
              nexacro.CheckBox,
              nexacro.Grid
            ];

            var setEnable = function (component, flag) {
              // 적용 리스트가 있는 경우 체크
              if (params.list.length > 0 && params.list.indexOf(component.id) < 0) return;
              // 예외 리스트가 있는 경우 체크
              if (params.exList.length > 0 && params.exList.indexOf(component.id) >= 0) return;

              if (component.form) {
                if (params.deep) {
                  _utilsHome.setEnable(component.form, flag, params);
                }
                return;
              }
              for (var i = 0; i < componentList.length; i++) {
                if (component instanceof componentList[i]) {
                  if (params.readonly && component.set_readonly) {
                    component.set_readonly(!flag);
                  } else if (component.set_enable) {
                    component.set_enable(flag);
                  }
                  //월력 컴포넌트의 경우
                  if (component._commonType == "monthPop") {
                    component.setBtnEnable(flag);
                  }
                  break;
                }
              }
            };
            // 상태 처리 할 목록을 호출
            var components = [];
            if (obj instanceof nexacro.Form) {
              components = obj.components;
            } else if (obj instanceof nexacro.Tab) {
              // 탭
              for (var i = 0; i < obj.tabpages.length; i++) {
                _utilsHome.setEnable(obj.tabpages[i], flag, params);
              }
              return;
            } else if (obj instanceof nexacro.Div || obj instanceof nexacro.Tabpage) {
              components = obj.form.components;
            } else {
              setEnable(obj, flag);
              return;
            }
            for (var i = 0; i < components.length; i++) {
              setEnable(components[i], flag);
            }
          },
          /*
                 * 멀티콤보
                 * openMultiCombo
                 * @param {Object}
                        obj     {component} 콤보가 표시될 기준이 되는 컴포넌트
                        comboDs {dataset} 콤보를 표시할 데이터 셋
                        comboCd {string}  default : code
                                           - 콤보의 code 컬럼명
                        comboNm {string}  default : fullNm
                                           - 콤보의 명칭 컬럼명
                        bindDs {dataset} 결과 데이터를 setting할 데이터 셋
                                         (bindDs가 없으면 결과 setting처리 안함)
                        bindCd {string}  setting할 code 컬럼명
                        bindNm {string}  setting할 명칭 컬럼명
                        preValue {string} 기존에 선택된 값이 있는 경우 콤보에 체크표시를 하기 위한 파라미터
                                          (preValue가 없으면 bindDs의 bindCd컬럼값으로 처리)
                        callback {function} 콜백 function
                                          callback : function(data){
                                            this.dsCsys010.set("code", data.strCode);
                                          }

                                          - data에 담기는 값
                                            codeList : 선택된 code배열
                                            nmList : 선택된 명칭배열
                                            strCode : code목록을 구분자를 추가하여 값으로 생성한 데이터
                                            strNm : 명칭목록을 구분자를 추가하여 값으로 생성한 데이터
                        separator   {string}    default : ,
                                           - 데이터를 연결할때 사용하는 구분자

                 * @example
                       this.utils.openMultiCombo({
                            target : obj
                            ,comboDs : this.dsCombo
                            ,bindDs : this.dsTest
                            ,bindCd : "multiCd"
                            ,bindNm : "multiNm"
                        });

                 * convertMultiCombo
                   여러 코드로 이루어진 값을 명칭으로 변경하여 반환
                   @param {object}
                        code    {string}  코드가
                        comboDs {dataset} 콤보를 표시할 데이터 셋
                        comboCd {string}  default : code
                                           - 콤보의 code 컬럼명
                        comboNm {string}  default : fullNm
                                           - 콤보의 명칭 컬럼명
                        separator {string}  default : ,
                                           - 데이터를 연결할때 사용하는 구분자
                    @return {string} 코드명
                 */
          multiCombo: {
            open: function (param) {
              _utilsHome.checkArguments(
                param,
                ["target", "comboDs"],
                [
                  "comboDs@dataset",
                  "comboCd@string",
                  "comboNm@string",
                  "bindDs@dataset",
                  "bindCd@string",
                  "bindNm@string"
                ]
              );

              var div = _utilsHome.multiCombo.make();
              param = _utilsHome.extend(
                {
                  comboCd: "code",
                  comboNm: "fullNm",
                  separator: ","
                },
                param
              );

              var grid = div._grid;
              var ds = div._ds;

              // 파라미터로 받은 데이터셋
              var comboDs = param.comboDs;
              //성능개선
              grid.set_enableredraw(false);

              //선택되어있던 코드를 체크처리하기 위한 값
              // 우선순위 : preValue 파라미터, 데이터셋의 코드
              if (!param.preValue && param.bindDs && param.bindCd) {
                param.preValue = param.bindDs.getColumn(param.bindDs.rowposition, param.bindCd);
              }
              ds.clearData();
              for (var i = 0; i < comboDs.rowcount; i++) {
                ds.addRow();
                var code = comboDs.getColumn(i, param.comboCd);
                ds.setColumn(i, "code", code);
                ds.setColumn(i, "nm", comboDs.getColumn(i, param.comboNm));
                ds.setColumn(
                  i,
                  "chk",
                  param.preValue && param.preValue.indexOf(code) >= 0 ? "1" : "0"
                );
              }
              ds.set_rowposition(0);

              // 그리드인경우의 처리를 위해 object 생성
              var position =
                param.target instanceof nexacro.Grid
                  ? param.target.getCellRect(param.target.currentrow, param.target.currentcol)
                  : {
                      width: param.target.getOffsetWidth(),
                      left: 0,
                      bottom: param.target.getOffsetHeight()
                    };
              var maxWidth = position.width;

              for (var i = 0; i < ds.rowcount; i++) {
                var width =
                  nexacro.getTextSize(
                    ds.getColumn(i, param.comboCd),
                    'normal 100 13px/normal "basefont"'
                  ).nx + 10;
                maxWidth = width > maxWidth ? width : maxWidth;
              }
              div.set_width(maxWidth);
              grid.set_enableredraw(true);
              div.param = param;
              div.callback = function (data) {
                if (div.param.bindDs) {
                  if (div.param.bindCd) {
                    div.param.bindDs.setColumn(
                      div.param.bindDs.rowposition,
                      div.param.bindCd,
                      data.strCode
                    );
                  }

                  if (div.param.bindNm) {
                    div.param.bindDs.setColumn(
                      div.param.bindDs.rowposition,
                      div.param.bindNm,
                      data.strNm
                    );
                  }
                }
                if (typeof div.param.callback == "function") {
                  div.param.callback.call(context, data);
                }
              };
              div.trackPopupByComponent(param.target, position.left, position.bottom + 2);
            },
            convertData: function (param) {
              if (!param || !param.code) return;
              _utilsHome.checkArguments(
                param,
                ["comboDs"],
                ["comboDs@dataset", "comboCd@string", "comboNm@string", "strCode@string"]
              );
              param = _utilsHome.extend(
                {
                  comboCd: "code",
                  comboNm: "fullNm",
                  separator: ","
                },
                param
              );
              var list = param.code.split(param.separator);
              var dataList = [];
              for (var i = 0; i < list.length; i++) {
                var findRow = param.comboDs.findRow(param.comboCd, list[i]);
                if (findRow < 0) continue;
                dataList.push(param.comboDs.getColumn(findRow, param.comboNm));
              }
              return dataList.join(param.separator);
            },
            make: function () {
              var divNm = "_commonMultiComboDiv";
              if (context[divNm] && context[divNm]._common_onload) {
                return context[divNm];
              }

              // 팝업div생성
              var div = _utilsHome.multiCombo.makeDiv("_commonMultiComboDiv");
              // 데이터셋 생성
              div._ds = _utilsHome.multiCombo.makeDs("_commonMultiDs");
              // 그리드 생성
              div._grid = _utilsHome.multiCombo.makeGrid(div, div._ds);

              // 확인버튼 생성
              div._btnConfirm = _utilsHome.multiCombo.makeButton(div);
              div._btnConfirm.addEventHandler("onclick", function (obj, e) {
                var codeList = [];
                var nmList = [];
                for (var i = 0; i < div._ds.rowcount; i++) {
                  if (div._ds.getColumn(i, "chk") != "1") continue;

                  codeList.push(div._ds.getColumn(i, "code"));
                  nmList.push(div._ds.getColumn(i, "nm"));
                }
                div.callback.call(context, {
                  codeList: codeList,
                  nmList: nmList,
                  strCode: codeList.join(div.param.separator || ","),
                  strNm: nmList.join(div.param.separator || ",")
                });
                div.closePopup();
              });
              div._common_onload = true;
              return div;
            },
            // 팝업div 생성
            makeDiv: function (divNm) {
              context.removeChild(divNm);
              var div = new nexacro.PopupDiv(divNm, 0, 0, 400, 300);
              context.addChild(div.id, div);
              div.set_cssclass("multiCombo");
              div.show();
              return div;
            },
            makeDs: function (dsNm) {
              //데이터셋 생성
              context.removeChild(dsNm);
              var ds = new nexacro.NormalDataset(dsNm, context);
              context.addChild(ds.id, ds);
              ds.addColumn("chk", "string");
              ds.addColumn("code", "string");
              ds.addColumn("nm", "string");

              return ds;
            },
            makeGrid: function (div, ds) {
              var grid = new nexacro.Grid("grd_code", 0, 0, null, null, 0, 30);
              grid.set_initvalueid("base");
              grid.set_cssclass("multiCombo");

              div.addChild(grid.id, grid);
              grid.show();

              // 그리드 설정
              grid.set_autofittype("col");
              grid.appendContentsRow("head");
              grid.appendContentsRow("body");

              grid.insertContentsCol("left", 0);
              grid.setRealColSize("left", 0, 30);

              //체크박스 생성
              grid.setCellProperty("head", 0, "displaytype", "checkboxcontrol");
              grid.setCellProperty("head", 0, "edittype", "checkbox");
              grid.setCellProperty("head", 1, "text", "코드명");

              grid.setCellProperty("body", 0, "displaytype", "checkboxcontrol");
              grid.setCellProperty("body", 0, "edittype", "checkbox");
              grid.setCellProperty("body", 0, "text", "bind:chk");
              // 코드명 바인드
              grid.setCellProperty("body", 1, "text", "bind:nm");

              grid.addEventHandler("onheadclick", function (obj, e) {
                if (e.cell == 0) {
                  var chk = e.fromobject.checked ? "0" : "1";
                  var ds = obj.getBindDataset();
                  for (var i = 0; i < ds.rowcount; i++) {
                    ds.setColumn(i, "chk", chk);
                  }
                  obj.setCellProperty("head", 0, "text", chk);
                }
                return true;
              });
              grid.set_binddataset(ds.id);
              return grid;
            },
            makeButton: function (div) {
              var btnConfirm = new nexacro.Button("btn_confirm", null, null, 60, 21, 10, 5);
              btnConfirm.set_text("확인");
              div.addChild(btnConfirm.id, btnConfirm);
              btnConfirm.show();
              return btnConfirm;
            }
          },
          /*
                  * 출력물관련
                  * findReportList
                  * @param {Object}
                        *ds     {dataset}   결과가 담길 데이터 셋
                        menuId  {string}    default : 현재 메뉴ID
                        callback {function} 콜백함수

                  * @example
                       this.utils.findReportList({
                            ds : this.dsReport
                        });
                 */
          report: {
            getList: function (param) {
              _utilsHome.checkArguments(param, ["ds"], ["ds@dataset", "menuId@string"]);
              param = _utilsHome.extend(
                {
                  menuId: context.getOwnerFrame().arguments["menuId"]
                },
                param
              );

              _utilsHome.transaction({
                url: "com/cmsv/MenuCtr/findReportList.do",
                outDS: param.ds.id + "=dsReport",
                arg: "strMenuId=" + param.menuId,
                callback: function () {}
              });
            }
          },
          position: {
            add: function (strPos, val) {
              if (isNaN(strPos)) {
                var pos = strPos.split(":");
                return pos[0] + ":" + (parseInt(pos[1]) + val);
              } else {
                return parseInt(strPos) + val;
              }
            }
          },
          upload: {
            makeComp: function (arg) {
              arg = _utilsHome.extend(
                {
                  type: "all",
                  maxFileCnt: 1
                },
                arg
              );

              try {
                var fileUploadCompNm = "_common_file_upload";
                if (context[fileUploadCompNm] && context[fileUploadCompNm].destroy)
                  context[fileUploadCompNm].destroy();
                context.removeChild(fileUploadCompNm);

                var fileObj = new nexacro.FileUpload(fileUploadCompNm);
                context.addChild(fileObj.id, fileObj);
                fileObj.createComponent();
                fileObj.show();
                if (arg.maxFileCnt == 1) {
                  fileObj.set_multiselect(false);
                }

                // event 추가 - 파일 선택
                fileObj.addEventHandler(
                  "onitemchanged",
                  function (obj, e) {
                    if (!fileObj.hasValue(0)) {
                      _innerUtils.performLog("파일 선택안됨");
                      context.setWaitCursor(false);
                      return;
                    }
                    _innerUtils.performLog("파일 선택. 파일 형식 체크");
                    context.setWaitCursor(true);
                    var filePath = e.newvalue;
                    if (filePath && filePath.length > 0) {
                      var logicFileNm = filePath[0].substring(filePath[0].lastIndexOf("\\") + 1);
                      if (logicFileNm.indexOf(".") >= 0) {
                        var fileExt = logicFileNm
                          .substring(logicFileNm.lastIndexOf(".") + 1)
                          .toLowerCase();
                        // 예외 확장자 처리
                        var fileAllowType =
                          arg.ext || nexacro.getApplication().gds_baseInfo.getColumn(0, arg.type);

                        if (fileAllowType.indexOf(fileExt) < 0) {
                          _utilsHome.alert(
                            "허용하지 않는 파일 형식입니다.\n\n허용하는 형식은 아래와 같습니다.\n#{type}",
                            { type: fileAllowType.replace(/\s/g, "").replace(/@@/g, ",") }
                          );
                          context.setWaitCursor(false);
                          return;
                        }
                      }
                    }

                    //event 생성
                    fileObj.addEventHandler(
                      "onsuccess",
                      function (obj, e) {
                        var ds = e.datasets[0];
                        var returnData = {};
                        for (var i = 0; i < ds.colinfos.length; i++) {
                          returnData[ds.colinfos[i].id] = ds.getColumn(0, ds.colinfos[i].id);
                        }

                        if (arg.callback) {
                          arg.callback.call(context, "fileUpload", returnData);
                        }
                        context.setWaitCursor(false);
                        context.removeChild(fileUploadCompNm);
                        fileObj.destroy();
                      },
                      context
                    );

                    //event 생성
                    fileObj.addEventHandler(
                      "onerror",
                      function (obj, e) {
                        var maxSize = Number(
                          application.gds_baseInfo.getColumn(0, arg.type + "MaxSize")
                        );
                        maxSize = (maxSize / 1024).toFixed(1) + "MB";
                        _utilsHome.alert(
                          "#{size} 이하의 허용하는 확장자 파일만 업로드 가능합니다.",
                          { size: maxSize }
                        );

                        if (arg.error) {
                          arg.error.call(context, "fileUpload");
                        }
                        context.setWaitCursor(false);
                        context.removeChild(fileUploadCompNm);
                        fileObj.destroy();
                      },
                      context
                    );

                    _innerUtils.performLog("파일 업로드 준비");
                    var strUrl =
                      document.location.protocol + "//" + document.location.host + arg.fileUrl;
                    fileObj.upload(strUrl + arg.strParam);
                    _innerUtils.performLog("파일 업로드 실행");
                    return fileObj;
                  },
                  context
                );
                fileObj.filefindbuttons[0].click();
                return;
              } catch (e) {
                _utilsHome.log(e);
                context.setWaitCursor(false);
              }
            },
            lob: function (arg) {
              _innerUtils.performLog("LOB 이미지업로드 실행");
              arg = _utilsHome.extend(
                {
                  menuId: context.getOwnerFrame().arguments["menuId"],
                  pgmId: context.getOwnerFrame().arguments["pgmId"]
                },
                arg
              );

              arg.fileUrl = "/com/cmsv/FileCtr/fileLobImgUpload.do";
              arg.strParam = "?menuId=" + arg.menuId + "&pgmId=" + arg.pgmId;
              var callback = arg.callback;

              arg.callback = function (id, returnData) {
                if (arg.target) {
                  _utilsHome.showLobImage(arg.target, returnData.imageData);
                }
                if (callback) {
                  callback.call(context, "fileUpload", returnData);
                }
              };
              _utilsHome.upload.makeComp(arg);
            },
            file: function (arg) {
              /*  fileUpload : 첨부파일 업로드. (팝업없이 파일을 한개만 바로 업로드할때 사용)
                            @param 1(key type default)

                            param Object *
                            {
                                table string *
                                    : 해당 파일을 사용하는 테이블명(COM.CSYS400)
                                fileNo string null
                                    : 첨부파일 번호
                                menuId string 현재메뉴ID
                                    : 파일을 사용하는 메뉴ID(강제 지정이 필요할 경우 사용)
                                sessionYn boolean true
                                    : 다운로드 시 세션체크 여부
                                type string "all"
                                    : 업로드를 허용할 파일의 종류(카테고리, 기본적으로 설정파일에 허용된 확장자만 가능)
                                      all : 모든 파일 중 허용하는 확장자만 업로드
                                      text : 텍스트파일
                                      image : 이미지파일
                                      imagePdf : 이미지파일 + PDF
                                      big : 대용량 업로드
                                ext string null
                                    : 위의 type 안에서 ext의 확장자만 가능
                                fileSize int type별 사이즈
                                    : 업로드 가능한 파일사이즈
                                callback function null
                                    : 콜백함수
                                        function(호출ID, data)
                                            data {
                                                fileNo : 첨부파일번호
                                                fileSmryNm : 파일요약명
                                            }
                                error function null
                                    : 에러가 난 경우의 처리가 필요할 때 사용
                            }

                            ex)
                                this.utils.fileDownload({
                                    table : "COM.CSYS400"
                                    ,callback : function(id, data){
                                        if(data && data.fileNo){
                                            this.dsTest.set("fileNo", data.fileNo);
                                            this.dsTest.set("fileSmryNm", data.fileSmryNm);
                                        }
                                    }
                                });
                         */
              _utilsHome.checkArguments(
                arg,
                ["table"],
                [
                  "fileNo@string, null, undefined",
                  "table@string",
                  "menuId@string",
                  "sessionYn@boolean",
                  "type@string",
                  "ext@string",
                  "fileSize@number"
                ],
                true
              );
              arg = _utilsHome.extend(
                {
                  table: "",
                  ext: "",
                  sessionYn: true,
                  fileNo: "",
                  saveMsg: true,
                  maxFileCnt: 1,
                  type: "all",
                  menuId: context.getOwnerFrame().arguments["menuId"],
                  pgmId: context.getOwnerFrame().arguments["pgmId"]
                },
                arg
              );
              _innerUtils.performLog("파일업로드 실행");
              arg.sessionYn = arg.sessionYn ? "1" : "0";

              arg.fileUrl = "/com/cmsv/FileCtr/fileOneUpload.do";
              arg.strParam =
                "?fileNo=" +
                arg.fileNo +
                "&table=" +
                arg.table +
                "&menuId=" +
                arg.menuId +
                "&pgmId=" +
                arg.pgmId +
                "&fileSize=" +
                arg.fileSize +
                "&sessionYn=" +
                arg.sessionYn;
              var callback = arg.callback;

              arg.callback = function (id, returnData) {
                if (callback) {
                  callback.call(context, "fileUpload", returnData);
                }
              };
              _utilsHome.upload.makeComp(arg);
            }
          },
          /*
                   openTermPopup : 기간달력
                            @param 1(key type default)

                            param Object *
                            {
                                target {component} *
                                    : 달력이 표시되기 위한 기준점이 되는 컴포넌트
                                      (grid를 지정하면 현재 선택된 셀을 기준으로 표시)
                                fromDate {string} ""
                                    : 시작일자
                                endDate {string} ""
                                    : 종료일자
                                clickObj {string} "from"
                                    : 선택된 컴포넌트가 from인지 end인지
                                callback {function} null
                                    : callback 함수
                                      return
                                        comp : target으로 지정된 컴포넌트
                                        data : {
                                            fromDate {string} 시작일자
                                            endDate {string} 종료일자
                                        }
                            }
                        적용 시 컴포넌트에 설정
                            - calendar 컴포넌트
                                properties - popuptype : none 설정
                                이벤트 : 기간달력 오픈함수를 컴포넌트의 ondropdown 이벤트에 적용
                            - 그리드 Calendar
                                그리드 셀 : calendarpopuptype : none 설정
                                이벤트 : 기간달력 오픈함수를 그리드의 ondropdown 이벤트에서 해당컬럼들에만 적용
                            - 그 외.
                                버튼 또는 그리드의 확장버튼을 이용하여 click 이벤트에 적용
                   ex)
                   this.utils.openTermPopup({
                        target : obj
                        ,fromDate : this.dsTest.get("fromDt")
                        ,endDate : this.dsTest.get("endDt")
                        ,callback : function(comp, data){
                            console.log(data);
                            this.dsTest.set("fromDt", data.fromDate);
                            this.dsTest.set("endDt", data.endDate);
                        }
                    });
                 */
          termPopup: {
            open: function (param) {
              if (!param.target) {
                this.utils.error("대상 Component를 입력 하여 주십시요.");
                return false;
              }

              var sPopupDivNm = "_commonPdvFromTo";
              var objPopupDiv = context.all[sPopupDivNm];

              if (!objPopupDiv) {
                objPopupDiv = new PopupDiv();
                objPopupDiv.init(sPopupDivNm, 0, 0, 420, 210, null, null);
                var retVal = context.addChild(sPopupDivNm, objPopupDiv);
                objPopupDiv.set_name(sPopupDivNm);
                objPopupDiv.set_async(false);
                objPopupDiv.set_url("COM_DIV::termCalendar.xfdl");
                objPopupDiv.show();
              }
              objPopupDiv.user_context = context;
              if (!param.clickObj && param.fromDate) {
                var column = "";
                if (param.target instanceof nexacro.Grid) {
                  column = param.target.getCellProperty("body", param.target.currentcell, "text");
                } else {
                  var compId = param.target._unique_id.replace(context._unique_id + ".", "");
                  for (var i = 0; i < context.binds.length; i++) {
                    var bind = context.binds[i];
                    if (bind.compid == compId) {
                      column = bind.columnid;
                      break;
                    }
                  }
                }
                column = column.toLowerCase();
                if (
                  column.indexOf("end") >= 0 ||
                  column.indexOf("stop") >= 0 ||
                  column.indexOf("tod") >= 0
                ) {
                  param.clickObj = "end";
                }
              }
              var position =
                param.target instanceof nexacro.Grid
                  ? param.target.getCellRect(param.target.currentrow, param.target.currentcol)
                  : {
                      width: param.target.getOffsetWidth(),
                      left: 0,
                      bottom: param.target.getOffsetHeight()
                    };
              objPopupDiv.trackPopupByComponent(param.target, position.left, position.bottom + 2);
              objPopupDiv.form.init(param);
            }
          },
          /*  getNotice : 메뉴 안내문 조회
                                메뉴ID는 현재 메뉴의 ID 자동 설정
                    @param 1(key type default)

                    param Object *
                        {
                            seq string|number 0
                                : 안내문순번
                            target WebBrowser컴포넌트 null
                                : 안내문이 보여질 웹브라우저 컴포넌트
                                  (따로 webViewer로 init안해도 됨)
                            callback function null
                                : callback 함수
                        }

                    ex)
                        this.utils.getNotice({
                            target : this.tab_report.tabpage4.form.web_notice
                            ,seq : 2
                            ,callback : function(data){
                                console.log(data);
                            }
                        });
                 */
          getNotice: function (arg) {
            _utilsHome.checkArguments(arg, ["seq"], ["seq@string, number"], true);
            arg = _utilsHome.extend(
              {
                seq: 0,
                target: null,
                callback: null
              },
              arg
            );
            if (arg.seq <= 0) {
              _utilsHome.error("메뉴안내문 순번이 없습니다.");
              return;
            }

            context["_dsNotice"] = new Dataset();
            var ds = context["_dsNotice"];
            _utilsHome.transaction({
              url: "/com/cmsv/MenuCtr/findMenuByNotice.do",
              arg: "seq=" + arg.seq,
              outDS: "_dsNotice=dsCsys224",
              async: false,
              callback: function () {
                if (ds.rowcount == 1) {
                  var data = {
                    menuId: ds.getColumn(0, "menuId"),
                    menuGdccSeqno: ds.getColumn(0, "menuGdccSeqno"),
                    menuGdccCtnt: ds.getColumn(0, "menuGdccCtnt"),
                    menuGdccTitle: ds.getColumn(0, "menuGdccTitle")
                  };
                  if (arg.target instanceof nexacro.WebBrowser) {
                    if (arg.target._type != "notice") {
                      _utilsHome.webViewer.init(arg.target, data.menuGdccCtnt, "notice");
                      arg.target.editNotice = function () {
                        context.popup.noticeEdit
                          .setOpts({
                            callback: function () {
                              context.utils.getNotice(arg);
                            }
                          })
                          .open({
                            menuId: data.menuId,
                            menuGdccSeqno: data.menuGdccSeqno
                          });
                      };
                    } else {
                      arg.target.setValue(data.menuGdccCtnt);
                    }
                  }

                  if (typeof arg.callback == "function") {
                    arg.callback.call(context, data);
                  }
                  return data;
                } else {
                  _utilsHome.error("메뉴안내문 데이터가 없습니다.");
                }
              }
            });
          },

          getNotices: function (arg) {
            _utilsHome.checkArguments(
              arg,
              ["seq", "menuId"],
              ["seq@string, number", "menuId@string, number"],
              true
            );
            arg = _utilsHome.extend(
              {
                seq: 0,
                menuId: null,
                target: null,
                callback: null
              },
              arg
            );
            if (arg.seq <= 0) {
              _utilsHome.error("메뉴안내문 순번이 없습니다.");
              return;
            }

            context["_dsNotice"] = new Dataset();
            var ds = context["_dsNotice"];
            _utilsHome.transaction({
              url: "/adm/apur/ApurdeCtr/findMenuByNotice.do",
              arg: "seq=" + arg.seq + "," + arg.menuId,
              outDS: "_dsNotice=dsCsys224",
              async: false,
              callback: function () {
                if (ds.rowcount == 1) {
                  var data = {
                    menuId: ds.getColumn(0, "menuId"),
                    menuGdccSeqno: ds.getColumn(0, "menuGdccSeqno"),
                    menuGdccCtnt: ds.getColumn(0, "menuGdccCtnt"),
                    menuGdccTitle: ds.getColumn(0, "menuGdccTitle")
                  };
                  if (arg.target instanceof nexacro.WebBrowser) {
                    if (arg.target._type != "notice") {
                      _utilsHome.webViewer.init(arg.target, data.menuGdccCtnt, "notice");
                      arg.target.editNotice = function () {
                        context.popup.noticeEdit
                          .setOpts({
                            callback: function () {
                              context.utils.getNotices(arg);
                            }
                          })
                          .open({
                            menuId: data.menuId,
                            menuGdccSeqno: data.menuGdccSeqno
                          });
                      };
                    } else {
                      arg.target.setValue(data.menuGdccCtnt);
                    }
                  }

                  if (typeof arg.callback == "function") {
                    arg.callback.call(context, data);
                  }
                  return data;
                } else {
                  _utilsHome.error("메뉴안내문 데이터가 없습니다.");
                }
              }
            });
          },

          /*
                   createAprv : 업무결재문서 생성
                            @param 1(key type default)

                            param Object *
                            {
                                url {string} *
                                    : 서버호출 URL
                                inDS {string}
                                    : 파라미터(데이터셋)
                                formID {string} *
                                    : 업무결재양식ID
                                title {string} *
                                    : 제목
                                deptCd {string, array}
                                    : 결재부서를 지정해야하는 경우 입력.
                                      파라미터로 받은
                                callback {function} null
                                    : callback 함수
                            }
                   ex)
                   this.utils.createAprv({
                        url : "com/ContextTestCtr/saveAprvTest.do"
                        ,inDS : "dsTest=dsTest:U"
                        ,formId : "B000002"
                        ,title : "공통업무결재 테스트"
                        ,deptCd : "10152"
                        ,callback : function(){
                        }
                    });

                    openAprv : 업무결재문서 팝업호출
                            @param 1(key type default)

                            busnsSanctNo string *
                                : 업무결재번호
                    ex)
                   this.utils.openAprv("20200707101530001");
                 */
          aprv: {
            getKey: function () {
              context._busnsSanctNo = "";
              _utilsHome.transaction({
                url: "/com/csys/CsysbsCtr/findBusnsSanctNo.do",
                async: false
              });
              var key = context._busnsSanctNo;
              context._busnsSanctNo = "";
              return key;
            },
            create: function (args) {
              _utilsHome.checkArguments(
                args,
                ["formId", "url"],
                [
                  "formId@string",
                  "title@string",
                  "url@string",
                  "inDS@string",
                  "callback@function",
                  "deptCd@string,array",
                  "connNo@string",
                  "attflUuid@string,array"
                ],
                true
              );
              context._busnsSanctNo = "";
              _utilsHome.transaction({
                url: args.url,
                inDS: args.inDS || "",
                callback: function () {
                  if (context._busnsSanctNo) {
                    args.key = context._busnsSanctNo;
                    if (args.callback) {
                      context.commonPopup.aprv.setOpts({
                        callback: args.callback
                      });
                    }
                    context.commonPopup.aprv.open(args);
                  }
                }
              });
            },
            open: function (args) {
              if (typeof args == "string") {
                args = {
                  key: args
                };
              }
              context._busnsSanctStatus = "";
              _utilsHome.transaction({
                url: "/com/csys/CsysbsCtr/findBusnsSanctStatus.do",
                arg: {
                  busnsSanctNo: args.key
                },
                callback: function () {
                  if (context._busnsSanctStatus == "drft") {
                    if (!context.popup.drft) {
                      context.popup.make({
                        id: "drft",
                        url: "COM_CSYSBS::csysbs0200_pop03.xfdl",
                        title: "업무결재",
                        width: 1000,
                        height: 800,
                        useX: false,
                        mode: "l",
                        callback: function () {}
                      });
                    }
                    context.popup.drft
                      .setOpts({
                        callback: function (id, data) {
                          if (typeof args.callback == "function") {
                            args.callback.call(context, args.key, data);
                          }
                        }
                      })
                      .open({
                        key: args.key
                      });
                  } else {
                    if (!context.popup.aprv) {
                      context.popup.make({
                        id: "aprv",
                        url: "COM_CSYSBS::csysbs0200_pop02.xfdl",
                        title: "업무결재",
                        width: 1000,
                        height: 800,
                        useX: false,
                        mode: "l"
                      });
                    }
                    context.popup.aprv
                      .setOpts({
                        callback: function (id, data) {
                          if (typeof args.callback == "function") {
                            args.callback.call(context, args.key, data);
                          }
                        }
                      })
                      .open({
                        key: args.key
                      });
                  }
                }
              });
            }
          },
          //결의서 팝업 호출
          fnResdcMdiPop: function (ResdcNoParam) {
            var param = {};
            if (_utilsHome.isValid(ResdcNoParam)) {
              try {
                param = JSON.parse('{"resdcNo":"' + ResdcNoParam + '"}');
              } catch (e) {
                // 파라미터 데이터가 잘못들어간 경우에 대한 처리
                _utilsHome.alert(" 결의서번호를 확인하십시요.");
                return false;
              }
            } else {
              _utilsHome.alert(" 결의서번호가 없습니다.\n결의서번호를 확인하십시요.");
              return false;
            }

            // 동적 데이터셋 생성
            var objRestnDivCd = new Dataset();
            objRestnDivCd.set_name("_dsDynmRestnDivCd");
            context.addChild(objRestnDivCd.name, objRestnDivCd);

            objRestnDivCd.addColumn("restnDivCd", "String");
            objRestnDivCd.addRow();
            objRestnDivCd.setColumn(objRestnDivCd.rowposition, "restnDivCd", "");

            var objParams = new Dataset();
            objParams.set_name("_dsParamResdcNo");
            context.addChild(objParams.name, objParams);
            objParams.addColumn("resdcNo", "String");
            objParams.addRow();
            objParams.setColumn(objParams.rowposition, "resdcNo", ResdcNoParam);

            //결의구분 확인
            _utilsHome.transaction({
              url: "adm/aact/AactrdCtr/findRestnDivCdOne.do",
              inDS: "dsParamResdcNo=" + objParams.name + ":A",
              outDS: objRestnDivCd.name + "=dsDynmRestnDivCd",
              callback: function () {
                var nRestnDivCd = objRestnDivCd.getColumn(0, "restnDivCd");
                var nMenuId = "";
                if (_utilsHome.isValid(nRestnDivCd)) {
                  switch (nRestnDivCd) {
                    case "E": //지출결의서
                      nMenuId = "M102452";
                      break;
                    case "I": //수입결의서
                      nMenuId = "M102455";
                      break;
                    case "L": //징수결의서
                      nMenuId = "M102457";
                      break;
                    case "C": //정정결의서
                      nMenuId = "M102459";
                      break;
                    case "A": //대체결의서
                      nMenuId = "M102458";
                      break;
                    default:
                      nMenuId = "M102452"; //지출결의서
                      break;
                  }
                }

                objRestnDivCd.destroy(); //동적 데이터 삭제
                objParams.destroy(); //동적 데이터 삭제

                _utilsHome.openMenu({
                  menuId: nMenuId,
                  callback: "resdcCtntCallback",
                  param: param
                });
              }
            });
          },
          // 비교과 API호출
          /*
                    ex)
                    this.utils.extcrApiCall({
                        baseCond : {
                            useYn : "1"                 //url 뒤에 붙여서 보낼 client data
                            etc..
                        }
                        ,url : 'eco/program'            //호출 url id(업무마다 다름) -필수
                        ,trgetDs : this.dsExtcr         //결과 데이터가 담길 데이터 셋 -필수
                        ,resultMsg : "api호출 성공" //결과 msg 처리
                        ,callback : function(result, ds){
                            //result : true, false
                            //ds : baseCond ds info.
                            console.log(result, ds);
                        }
                    });
                */
          extcrApiCall: function (params) {
            _utilsHome.checkArguments(
              params,
              ["url", "trgetDs"],
              ["url@string", "trgetDs@dataset"]
            );
            params = _utilsHome.extend(
              {
                baseCond: {},
                url: "",
                trgetDs: "",
                resultMsg: "",
                callback: null
              },
              params
            );

            if (!params.url || !params.trgetDs) {
              //essential value check
              _innerUtils.performLog("필수 파라미터값이 없습니다.");
              return;
            }

            //arg
            var urlId = params.url;

            //input
            context["_dsExtcr"] = new Dataset();
            if (_utilsHome.isValid(params.baseCond)) {
              _innerUtils.setRowData(context["_dsExtcr"], params.baseCond, 0, true);
            }
            var ds = context["_dsExtcr"];

            _utilsHome.transaction({
              url: "com/cmsv/CodeCtr/findExtcrList.do",
              inDS: "dsParam=_dsExtcr:A",
              arg: "url=" + urlId,
              outDS: params.trgetDs.id + "=dsExtcr",
              async: false,
              callback: function () {
                var result = false;
                if (_utilsHome.isValid(params.trgetDs.id)) {
                  result = true;
                  if (_utilsHome.isValid(params.resultMsg)) {
                    _utilsHome.alert(params.resultMsg);
                  }
                }
                if (typeof params.callback === "function") {
                  params.callback.call(context, result, ds);
                }
              }
            });
          },
          sign: {
            createDoc: function (args) {
              _utilsHome.checkArguments(
                args,
                ["docId", "title", "rcverList", "emailCd"],
                ["title@string", "docId@string", "emailCd@string", "rcverList@array", "param@json"]
              );
              if (args.rcverList.length == 0) {
                _utilsHome.alert("수신자가 없습니다.");
                return;
              }

              args = _utilsHome.extend(
                {
                  param: null,
                  callback: null
                },
                args
              );
              // 전자계약 문서정보 생성
              for (var i = 0; i < args.rcverList.length; i++) {
                args.rcverList[i].field_owner = "" + (i + 1);
              }

              var body = {
                workflow_name: args.title,
                player_list: args.rcverList
              };
              if (args.param) {
                var fieldList = [];
                for (var key in args.param) {
                  fieldList.push({
                    field_name: key,
                    field_value: args.param[key]
                  });
                }
                body.field_list = fieldList;
              }

              context.removeChild("_dsSign");
              var ds = new nexacro.NormalDataset("_dsSign");
              context.addChild(ds.id, ds);
              ds.addRow();
              _innerUtils.setRowData(
                ds,
                {
                  emailCd: args.emailCd,
                  docId: args.docId,
                  requestBody: JSON.stringify(body)
                },
                0,
                true
              );
              context._signWorkflowId = "";
              _utilsHome.transaction({
                url: "com/cmsv/CodeCtr/saveElctrContr.do",
                inDS: "dsParam=" + ds.id,
                callback: function () {
                  if (typeof args.callback == "function") {
                    args.callback.call(context, context._signWorkflowId);
                  }
                }
              });
            },
            download: function (workflowId) {
              context._signDownload = "";
              _utilsHome.transaction({
                url: "com/cmsv/CodeCtr/findElctrContrDownloadUrl.do",
                arg: {
                  workflowId: workflowId
                },
                callback: function () {
                  if (context._signDownload) {
                    window.open(context._signDownload);
                  }
                }
              });
            }
          },
          sendMail: function (args) {
            args = _utilsHome.extend(
              {
                title: "",
                content: "",
                list: []
              },
              args
            );

            var targetString = "";
            var list = args.list;
            if (list.length == 0) return;

            for (var i = 0; i < list.length; i++) {
              targetString +=
                list[i].email +
                "," +
                list[i].name +
                "," +
                list[i].etc1 +
                "," +
                list[i].etc2 +
                "," +
                list[i].etc3 +
                "Æ";
            }
            var data = {
              onetooneInfos:
                "1:이메일:1^email,2:이름:3^name,3:추가속성값1:5^etc1,4:추가속성값2:6^etc2,5:추가속성값3:7^etc3",
              targetString: targetString,
              mailTitle: args.title,
              mailContent: args.content
            };
            var form = document.createElement("form");

            for (var attr in data) {
              var input = document.createElement("input");
              input.name = attr;
              input.value = data[attr];
              form.appendChild(input);
            }
            form.method = "post";
            form.action = nexacro.getApplication().gds_baseInfo.getColumn(0, "mailPopup");
            form.target = "ThunderMail";
            window.open(
              "",
              "ThunderMail",
              "width=1200, height=900, toolbar=no, menubar=no,scrollbars=yes, resizable=yes"
            );
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
          },

          createForm: function (data) {
            var form = document.createElement("form");

            for (var attr in data) {
              var input = document.createElement("input");
              input.type = "hidden";
              input.name = attr;
              input.value = data[attr];
              form.appendChild(input);
            }
            form.method = "post";
            return form;
          }
        };

        /*
         * 개발자에게 제공될 공통메소드
         */
        _utils = {
          transaction: _utilsHome.transaction,
          comboLoad: _utilsHome.comboLoad,
          comboGrpLoad: _utilsHome.comboGrpLoad,
          getGLIO: _utilsHome.getGLIO,
          showImg: _utilsHome.showImg,
          showLobImage: _utilsHome.showLobImage,
          checkAccount: _utilsHome.checkAccount,
          fileDownload: _utilsHome.fileDownload,
          filePreview: _utilsHome.filePreview,
          findMultiDownload: _utilsHome.findMultiDownload,
          findChkMultiDownload: _utilsHome.findChkMultiDownload,
          nextExternalPage: _utilsHome.nextExternalPage,
          changeLocale: _utilsHome.changeLocale,
          isValid: _utilsHome.isValid,
          isValidRow: _utilsHome.isValidRow,
          extend: _utilsHome.extend,
          checkArguments: _utilsHome.checkArguments,
          extendComponent: _utilsHome.extendComponent,
          error: _utilsHome.error,
          warn: _utilsHome.warn,
          log: _utilsHome.log,
          confirm: _utilsHome.confirm,
          alert: _utilsHome.alert,
          callReport: _utilsHome.callReport,
          callPdfReport: _utilsHome.callPdfReport,
          callSign: _utilsHome.callSign,
          initWebEdt: _utilsHome.webEdt.init,
          initWebViewer: _utilsHome.webViewer.init,
          getAgreeYn: _utilsHome.persInfo.check,
          openAgreePopup: _utilsHome.persInfo.popup,
          excelImport: _utilsHome.excelImport,
          excelDownload: _utilsHome.excelDownload,
          openMenu: _utilsHome.openMenu,
          closeMenu: _utilsHome.closeMenu,
          openMainTabMenu: _utilsHome.openMenu,
          closeMainTabMenu: _utilsHome.closeMainTabMenu,
          getOpenMenuInfo: _utilsHome.getOpenMenuInfo,
          dynamicPos: _utilsHome.dynamicPos,
          saveBtnLog: _utilsHome.saveBtnLog,
          fileUpload: _utilsHome.upload.file,
          isAdmin: _utilsHome.isAdmin,
          openMonthPopup: _utilsHome.monthPopup.open,
          initMonthPopup: _utilsHome.monthPopup.init,
          getMenuInfo: _utilsHome.getMenuInfo,
          downloadLobImage: _utilsHome.downloadLobImage,
          isMobile: _utilsHome.isMobile,
          streamToZipFile: _utilsHome.streamToZipFile,
          setEnable: _utilsHome.setEnable,
          openMultiCombo: _utilsHome.multiCombo.open,
          convertMultiCombo: _utilsHome.multiCombo.convertData,
          isDevMode: function () {
            return devFlag;
          },
          findReportList: _utilsHome.report.getList,
          uploadLobImage: _utilsHome.upload.lob,
          openTermPopup: _utilsHome.termPopup.open,
          getNotice: _utilsHome.getNotice,
          getNotices: _utilsHome.getNotices,
          getAprvKey: _utilsHome.aprv.getKey,
          createAprv: _utilsHome.aprv.create,
          openAprv: _utilsHome.aprv.open,
          fnResdcMdiPop: _utilsHome.fnResdcMdiPop,
          extcrApiCall: _utilsHome.extcrApiCall,
          createSign: _utilsHome.sign.createDoc,
          downloadSign: _utilsHome.sign.download,
          sendMail: _utilsHome.sendMail,
          createForm: _utilsHome.createForm
        };
        /*
         * 개발자에게 제공될 팝업기능
         */
        _popup = {
          make: _utilsHome.popupMake,
          close: _utilsHome.popupClose,
          params: {},
          isPopup: _utilsHome.popupIsPopup,
          getParam: _utilsHome.popupParam
        };
        /*
         * 공통버튼 기능 확장
         */
        btnSupportFunc = {
          /**
           * 조회버튼 클릭동작
           */
          commonFind: function () {
            function commonPre(targetObj, ds) {
              // 조회전 최종 선택 로우
              var opts = targetObj._commonBtnDefaultOpts.commonFind;
              if (opts.findLastRow && !targetObj.commonSave._findLastRowIng) {
                if (typeof opts.findLastRow == "boolean" && ds.rowposition > -1) {
                  targetObj.commonFind._findLastRow = ds.rowposition;
                } else if (
                  typeof opts.findLastRow == "number" ||
                  typeof opts.findLastRow == "object"
                ) {
                  targetObj.commonFind._findLastRow = opts.findLastRow;
                }
              }
            }
            function action(targetObj) {
              var callFlag,
                ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
              var opts = targetObj._commonBtnDefaultOpts.commonFind;
              var _msg = opts.changeCheckMsg,
                msg;
              if (typeof _msg == "string") {
                msg = _msg;
              } else {
                opts.chageCheck = false;
              }
              if (opts.changeCheck === false) {
                callFlag = true;
              } else {
                if (opts.changeCheck === true) {
                  callFlag =
                    targetObj.commonFind._changeCheckFlag !== false && ds.isUpdate()
                      ? _utilsHome.confirm(msg)
                      : true;
                } else if (context[opts.changeCheck] instanceof nexacro.Dataset) {
                  callFlag =
                    context[opts.changeCheck].isUpdate() &&
                    targetObj.commonFind._changeCheckFlag !== false
                      ? _utilsHome.confirm(msg)
                      : true;
                } else {
                  _utilsHome.error("changeCheck에 잘못된 값이 설정 되었습니다.");
                }
              }
              // 서버호출
              if (callFlag) {
                if (ds.enableevent) {
                  ds.set_enableevent(false);
                  ds.clearData();
                  ds.set_enableevent(true);
                } else {
                  ds.clearData();
                }
                // 조회전 최종 선택 로우
                if (
                  opts.findLastRow &&
                  !targetObj.commonSave._findLastRowIng &&
                  (targetObj.commonFind._findLastRow > -1 ||
                    typeof targetObj.commonFind._findLastRow == "object")
                ) {
                  ds.set_enableevent(false);
                }
                targetObj.commonFind._changeCheckFlag = true;
                /* _utilsHome.saveBtnLog({text : "조회"}); */
                _utilsHome.transaction.call(context, targetObj.commonFind.getOpts());
              }
              // 서버에러에 대비
              context["_commonErrorCallback"] = _commonErrorCallback;
              function _commonErrorCallback() {
                _innerUtils.emptySetting(targetObj, ds);
              }
              return callFlag;
            }
            // 포스트 실행 하기전 공통 작업
            function commonCallback(targetObj, post, paramArr) {
              var postFlag = true,
                ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj,
                opts = targetObj._commonBtnDefaultOpts.commonFind;
              if (targetObj instanceof nexacro.Dataset) {
                // 정의
              } else {
                // 첫번째 행 체크박스 인경우 체크 해제
                if (targetObj.getCellProperty("head", 0, "displaytype") == "checkbox") {
                  targetObj.setCellProperty("head", 0, "text", "0");
                }
                var dsCnt = ds.getRowCount();
                // 페이징 처리
                if (_utilsHome.isValid(opts.paging)) {
                  var totalPage = Math.ceil(Number(ds.getColumn(0, "totalCnt")) / opts.maxRows);
                  opts.paging.set_max(totalPage);
                  opts.paging.set_min(1);
                  opts.paging.set_enable(true);
                  targetObj.commonFind._pagingFirstPage = true;
                } else if (devFlag) {
                  if (ds.getRowCount() > 1000) {
                    _utilsHome.warn(
                      "1000행 이상이 조회되었습니다. 조회조건을 추가하기를 권장합니다."
                    );
                  }
                }

                if (opts.noDataMsg && ds.rowcount == 0) {
                  if (typeof opts.noDataMsg == "boolean") {
                    context.utils.alert("조회된 데이터가 없습니다.");
                  } else if (typeof opts.noDataMsg == "string") {
                    context.utils.alert(opts.noDataMsg);
                  }
                }
                targetObj.commonFind.setOpts({ noDataMsg: false });

                try {
                  // 저장전 선택행 찾기
                  if (
                    targetObj.commonSave._findLastRowIng &&
                    targetObj.commonSave._findLastRowData
                  ) {
                    _innerUtils.performLog("저장전 선택행 찾기 실행 : " + targetObj.id);
                    /*
                     * 저장전 최종 선택행을 찾는다.
                     */
                    function findSameRow(targetObj) {
                      var findedIdx = 0,
                        ds = targetObj.getBindDataset(),
                        columnList = targetObj.commonFind.getOpts("findSavedRow"),
                        lastData = targetObj.commonSave._findLastRowData,
                        lastRowType = targetObj.commonSave._findLastRowType;
                      if (ds.rowcount == 0) {
                        // 설정값을 비운다.
                        _innerUtils.emptySetting(targetObj, ds);
                        return false;
                      }
                      // 마지막 저장행이 insert인 경우
                      if (lastRowType == Dataset.ROWTYPE_INSERT) {
                        _innerUtils.performLog("입력된 행 데이터 체크");
                        var insertData = {};
                        for (var i = 0; i < columnList.length; i++) {
                          if (context["_" + columnList[i]] || context[columnList[i]] == 0) {
                            insertData[columnList[i]] = context["_" + columnList[i]];
                          } else {
                            insertData = null;
                            break;
                          }
                        }
                        if (insertData) lastData = insertData;
                      }
                      var findStr = "";
                      for (var col in lastData) {
                        findStr += "&&" + col + "=='" + lastData[col] + "'";
                      }
                      findedIdx = ds.findRowExpr(findStr.substr(2));

                      if (findedIdx == -1) {
                        for (var i = 0; i < ds.rowcount; i++) {
                          var chk = true;
                          for (var col in lastData) {
                            var val =
                              typeof ds.get == "function" ? ds.get(i, col) : ds.getColumn(i, col);

                            if (lastData[col] != val) {
                              chk = false;
                              break;
                            }
                          }
                          if (chk) {
                            findedIdx = i;
                            break;
                          }
                        }
                      }
                      // 포지션 빼기
                      ds.set_rowposition(-1);
                      // 이벤트 활성화
                      ds.set_enableevent(true);
                      findedIdx = findedIdx < 0 ? 0 : findedIdx;
                      ds.set_rowposition(findedIdx);

                      if (devFlag) {
                        // 로그 처리
                        if (findedIdx < 0) {
                          _innerUtils.performLog(
                            "행 찾기 실패 : " + targetObj.id,
                            true,
                            targetObj.commonSave._findLastRowData
                          );
                          _innerUtils.performLog(
                            "행 찾기 실패 : this." +
                              targetObj.id +
                              '.commonFind.setOpts로 findSavedRow : ["pk1", "pk2"] 지정'
                          );
                        } else {
                          _innerUtils.performLog(
                            "행 찾기 성공 [" +
                              findedIdx +
                              "][" +
                              targetObj.commonSave._findLastRowData +
                              "] : " +
                              targetObj.id
                          );
                        }
                      }
                    }
                    findSameRow(targetObj);
                  } else if (
                    opts.findLastRow &&
                    (targetObj.commonFind._findLastRow > -1 ||
                      typeof targetObj.commonFind._findLastRow == "object")
                  ) {
                    if (targetObj.getCellProperty("body", 0, "edittype") == "tree") {
                      // 트리 행 찾기
                      _innerUtils.performLog("트리 행 찾기 실행 : " + targetObj.id);
                      targetObj.selectTreeRow(targetObj.commonFind._findLastRow);
                    } else {
                      // 조회전 선택행 찾기
                      _innerUtils.performLog("조회 선택행 찾기 실행 : " + targetObj.id);

                      // 이벤트 활성화
                      ds.set_enableevent(true);
                      var idx = targetObj.commonFind._findLastRow;
                      if (typeof idx != "number") {
                        idx = ds.findRow(idx.key, idx.value);
                      }
                      // 포지션 이동
                      if (ds.getRowCount() > idx) {
                        ds.set_rowposition(idx);
                      } else {
                        // 포지션 빼기
                        ds.set_rowposition(-1);
                        ds.set_rowposition(0);
                      }
                    }
                  }
                } catch (e) {
                  _utilsHome.error(
                    "최종행 찾기 버그 : findSavedRow 확인후 문제가 해결되지 않으면 공통팀에 문의 해주세요"
                  );
                } finally {
                  // 설정값을 비운다.
                  _innerUtils.emptySetting(targetObj, ds);
                }
              }
              if (_utilsHome.isValid(post) && postFlag) {
                _innerUtils.performLog("post 호출");
                post.apply(context, paramArr);
              }
            }
            return function () {
              _innerUtils.performLog(
                "공통 조회 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              _innerUtils.validateOption(this, arguments.callee._thisFuncKey);
              var targetObj = this;
              var argArr = [
                targetObj,
                arguments,
                true,
                action,
                context,
                _innerUtils,
                _utils,
                commonPre,
                commonCallback
              ];
              _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
            };
          },
          /**
           * 추가버튼 클릭 동작
           */
          commonAdd: function () {
            function action(targetObj) {
              if (targetObj instanceof nexacro.Grid) {
                var ds = targetObj.getBindDataset(),
                  returnVal = null;
                targetObj.commonDelete._preRowPos = ds.rowposition;
                if (ds.getRowCount() > 0) {
                  returnVal = ds.insertRow(0);
                } else {
                  returnVal = ds.addRow();
                }
                // 첫번째 행 체크박스 인경우 체크 해제
                if (
                  returnVal > -1 &&
                  targetObj.getCellProperty("head", 0, "displaytype") == "checkbox"
                ) {
                  targetObj.setCellProperty("head", 0, "text", "0");
                }
              } else {
                var opts = targetObj._commonBtnDefaultOpts.commonAdd;
                var _msg = opts.changeCheckMsg,
                  msg;
                if (typeof _msg == "string") {
                  msg = _msg;
                } else {
                  opts.chageCheck = false;
                }
                if (targetObj.getRowCount() == 0) {
                  returnVal = targetObj.addRow();
                } else if (!opts.changeCheck || !targetObj.isUpdate() || _utilsHome.confirm(msg)) {
                  // 클리어 하고 신규 추가
                  targetObj.clearData();
                  returnVal = targetObj.addRow();
                } else {
                  returnVal = false;
                }
              }
              return returnVal;
            }
            /*
             * 포스트 실행 하기전 공통 작업
             */
            function commonCallback(targetObj, post, paramArr) {
              var ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
              if (targetObj instanceof nexacro.Dataset) {
                // 정의
              } else {
                if (targetObj.commonAdd.getOpts("forceFireRPCEvent")) {
                  // 행추가 후 강제로 포지션 이동 이벤트를 호출한다.
                  if (
                    targetObj.commonDelete._preRowPos == 0 &&
                    ds.getRowType(ds.rowposition) == Dataset.ROWTYPE_INSERT
                  ) {
                    var vOnrowposchanged = ds.getEventHandler("onrowposchanged", 0);
                    if (_utilsHome.isValid(vOnrowposchanged)) {
                      vOnrowposchanged.call(
                        context,
                        ds,
                        new nexacro.DSRowPosChangeEventInfo(
                          ds,
                          ds.id,
                          ds.rowposition,
                          ds.rowposition
                        )
                      );
                    }
                  }
                }

                setTimeout(function () {
                  var row = targetObj.currentrow;
                  for (var i = 0; i < targetObj.getCellCount("body"); i++) {
                    var editType = targetObj._getBodyCellInfo(i)._getEdittype(row);
                    if (
                      editType in
                      { normal: 1, text: 1, textarea: 1, date: 1, mask: 1, masknumber: 1 }
                    ) {
                      targetObj.setFocus();
                      targetObj.setCellPos(i);
                      break;
                    }
                  }
                }, 1);
              }
            }
            return function () {
              _innerUtils.performLog(
                "공통 행추가 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              _innerUtils.validateOption(this, arguments.callee._thisFuncKey);
              var targetObj = this;
              var argArr = [
                targetObj,
                arguments,
                false,
                action,
                context,
                _innerUtils,
                _utils,
                null,
                commonCallback
              ];
              var returnVal = _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
              return returnVal;
            };
          },
          /**
           * 삭제버튼 클릭 동작
           */
          commonDelete: function () {
            function action(targetObj) {
              var params, returnVal, ds, opts, flagColumn;
              opts = targetObj.commonDelete.getOpts();
              flagColumn = "chk";
              ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
              if (targetObj instanceof nexacro.Grid) {
                if (ds.findRow(flagColumn, "1") > -1) {
                  if (opts.deleteCheck === false || _utilsHome.confirm(opts.deleteCheckMsg)) {
                    targetObj.set_enableevent(false);
                    ds.set_enableevent(false);
                    ds.set_updatecontrol(false);
                    for (var i = ds.getRowCount() - 1; i > -1; i--) {
                      if (ds.getColumn(i, flagColumn) == "1") {
                        if (
                          ds.getRowType(i) == Dataset.ROWTYPE_INSERT ||
                          opts.onceDelete === true
                        ) {
                          returnVal = ds.deleteRow(i);
                          if (targetObj.commonDelete.getOpts("forceFireRPCEvent")) {
                            targetObj.commonDelete._rowCntChangeYn = true;
                          }
                        } else if (ds.getRowType(i) == Dataset.ROWTYPE_UPDATE) {
                          // 삭제 요청 시 전체 해당 로우의 데이타를 초기화 한다.
                          for (var j = 0; j < ds.getColCount(); j++) {
                            var sColId = ds.getColID(j);
                            if (sColId == flagColumn) {
                              continue;
                            }
                            var sOrgColData = ds.getOrgColumn(i, sColId);
                            var sColData = ds.getColumn(i, sColId);
                            ds.setColumn(i, sColId, sOrgColData);
                          }
                          ds.setRowType(i, Dataset.ROWTYPE_DELETE);
                          returnVal++;
                        } else {
                          ds.setRowType(i, Dataset.ROWTYPE_DELETE);
                          returnVal++;
                        }
                      }
                    }
                    ds.set_updatecontrol(true);
                    ds.set_enableevent(true);
                    targetObj.set_enableevent(true);
                  } else {
                    returnVal = false;
                  }
                } else {
                  _utilsHome.alert("체크박스에 선택된 행이 없습니다.");
                  returnVal = false;
                }
              } else {
                if (opts.deleteCheck === false || _utilsHome.confirm(opts.deleteCheckMsg)) {
                  if (
                    targetObj.getRowType() == Dataset.ROWTYPE_UPDATE ||
                    targetObj.getRowType() == Dataset.ROWTYPE_NORMAL
                  ) {
                    if (targetObj.updatecontrol) {
                      targetObj.set_updatecontrol(false);
                      targetObj.setRowType(0, Dataset.ROWTYPE_DELETE);
                      targetObj.set_updatecontrol(true);
                    } else {
                      targetObj.setRowType(0, Dataset.ROWTYPE_DELETE);
                    }
                    targetObj.commonSave._saveCheckFlag = false;
                    targetObj.commonSave();
                  } else {
                    if (targetObj.updatecontrol) {
                      targetObj.set_updatecontrol(false);
                      targetObj.deleteRow(0);
                      targetObj.set_updatecontrol(true);
                    } else {
                      targetObj.deleteRow(0);
                    }
                    _innerUtils.performLog("삭제후 새로운 행 추가 : " + targetObj.id);
                    targetObj.commonAdd();
                  }
                } else {
                  returnVal = false;
                }
              }
              return returnVal;
            }
            /*
             * 포스트 실행 하기전 공통 작업
             */
            function commonCallback(targetObj, post, paramArr) {
              var ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
              if (targetObj instanceof nexacro.Dataset) {
                // 정의
              } else {
                if (targetObj.commonDelete.getOpts("forceFireRPCEvent")) {
                  // 행삭제 후 강제로 포지션 이동 이벤트를 호출한다.
                  var rowPos = ds.rowposition;
                  if (rowPos > -1 && targetObj.commonDelete._rowCntChangeYn) {
                    var vOnrowposchanged = ds.getEventHandler("onrowposchanged", 0);
                    if (_utilsHome.isValid(vOnrowposchanged)) {
                      vOnrowposchanged.call(
                        context,
                        ds,
                        new nexacro.DSRowPosChangeEventInfo(
                          ds,
                          ds.id,
                          ds.rowposition,
                          ds.rowposition
                        )
                      );
                    }
                  }
                  targetObj.commonDelete._rowCntChangeYn = false;
                }
              }
            }
            return function () {
              _innerUtils.performLog(
                "공통 삭제 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              if (_innerUtils.validateOption(this, arguments.callee._thisFuncKey)) {
                var targetObj = this;
                var argArr = [
                  targetObj,
                  arguments,
                  false,
                  action,
                  context,
                  _innerUtils,
                  _utils,
                  null,
                  commonCallback
                ];
                returnVal = _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
                return returnVal;
              }
            };
          },
          /**
           * 저장버튼 클릭 동작
           */
          commonSave: function () {
            function action(targetObj) {
              var opts, ds;
              ((opts = targetObj.commonSave.getOpts()),
                (ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj));
              if (typeof opts.saveCheckMsg != "string" || opts.saveCheckMsg.trim() == "") {
                opts.saveCheck = false;
              }
              if (targetObj instanceof nexacro.Grid) {
                if (opts.changeCheck && !ds.isUpdate()) {
                  _utilsHome.alert("변경된 데이터가 없습니다.");
                } else if (
                  (context.dsValidation == undefined ||
                    _utilsHome.isValid(targetObj, context.dsValidation)) &&
                  (opts.saveCheck === false || _utilsHome.confirm(opts.saveCheckMsg))
                ) {
                  targetObj.commonFind._changeCheckFlag = false;
                  if (
                    targetObj.commonFind.getOpts("findSavedRow").length > 0 &&
                    targetObj.commonFind.getOpts("url") != ""
                  ) {
                    targetObj.commonSave._findLastRowIng = setFindLastRowData(targetObj, ds);
                    /*
                     * 최종행 찾기를 위한 데이터 셋팅
                     */
                    function setFindLastRowData(targetObj, ds) {
                      var lastRowData = [],
                        idx = ds.rowposition,
                        findSavedRow = targetObj.commonFind.getOpts("findSavedRow");
                      // 최종선택 행이 삭제행일 경우 수행 하지 않음
                      if (idx < 0 || ds._viewRecords[idx]._rtype == Dataset.ROWTYPE_DELETE) {
                        return false;
                      }
                      // 기존이벤트 활성화 여부 저장 후 비활성화 -> commoncallback으로 이동
                      // setDSEnableEvent(targetObj, ds);

                      // 체크 데이터 셋팅
                      targetObj.commonSave._findLastRowType = ds._viewRecords[idx]._rtype;

                      var lastRowData = null;
                      if (findSavedRow) {
                        targetObj.commonSave._findLastRowData = {};
                        findSavedRow.forEach(function (col) {
                          if (typeof ds.get == "function") {
                            targetObj.commonSave._findLastRowData[col] = ds.get(idx, col);
                          } else {
                            targetObj.commonSave._findLastRowData[col] = ds.getColumn(idx, col);
                          }
                        });
                      }
                      if (targetObj.commonSave._findLastRowType == Dataset.ROWTYPE_INSERT) {
                        // 저장시 선택되어있던 row가 insert인 경우 처리
                        // 1. 선택된 row의 rowposition을 넘김(수정된 데이터 중의 position)
                        var arg = opts.arg;
                        var saveIndex = -1;
                        for (var i = 0; i < ds.rowcount; i++) {
                          if (ds.getRowType(i) != Dataset.ROWTYPE_NORMAL) {
                            saveIndex++;
                          }
                          if (i == idx) {
                            break;
                          }
                        }
                        var strFindSavedRow = saveIndex;

                        // 값을 변수 셋팅
                        findSavedRow.forEach(function (col) {
                          context["_" + col] = "";
                          strFindSavedRow += "@@" + col;
                        });

                        opts.arg = arg + (arg ? " " : "") + "_findSavedRow=" + strFindSavedRow;

                        // 값을 변수 셋팅
                        findSavedRow.forEach(function (col) {
                          context["_" + col] = "";
                        });
                      }
                      return true;
                    }
                  }
                  _utilsHome.transaction.call(context, opts);
                }
              } else {
                if (opts.changeCheck && !targetObj.isUpdate()) {
                  _utilsHome.alert("변경된 데이터가 없습니다.");
                } else if (
                  targetObj.commonSave._saveCheckFlag === false ||
                  ((context.dsValidation == undefined ||
                    _utilsHome.isValid(targetObj, context.dsValidation)) &&
                    (opts.saveCheck === false || _utilsHome.confirm(opts.saveCheckMsg)))
                ) {
                  targetObj.commonSave._saveCheckFlag = true;
                  targetObj.commonFind._changeCheckFlag = false;
                  _utilsHome.transaction.call(context, targetObj.commonSave.getOpts());
                }
              }
            }
            /*
             * 포스트 실행 하기전 공통 작업
             */
            function commonCallback(targetObj, post, paramArr) {
              var ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
              if (targetObj instanceof nexacro.Dataset) {
                // 정의
              } else {
                if (
                  targetObj.commonFind.getOpts("findSavedRow").length > 0 &&
                  targetObj.commonSave._findLastRowIng
                ) {
                  setDSEnableEvent(targetObj, ds);
                }
                if (_utilsHome.isValid(targetObj.commonFind.getOpts("paging"))) {
                  targetObj.commonFind._pagingFirstPage = false;
                }
              }
              if (_utilsHome.isValid(post)) {
                _innerUtils.performLog("post 호출");
                post.apply(context, paramArr);
              }
            }
            /*
             * 기존이벤트 활성화 여부 저장 후 비활성화
             */
            function setDSEnableEvent(targetObj, ds) {
              if (ds.enableevent) {
                targetObj.commonSave._findLastRowOrgEvent = ds.enableevent;
                ds.set_enableevent(false);
              }
            }
            return function () {
              _innerUtils.performLog(
                "공통 저장 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              _innerUtils.validateOption(this, arguments.callee._thisFuncKey);
              var targetObj = this;
              var argArr = [
                targetObj,
                arguments,
                true,
                action,
                context,
                _innerUtils,
                _utils,
                null,
                commonCallback
              ];
              _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
            };
          },

          /**
           * 엑셀버튼 클릭 동작
           */
          commonExcel: function (arg) {
            function action(targetObj) {
              var dToday = new Date();
              var sFileName;
              var sSvcUrl = application.url + "/excel/XExportImport";
              if (location.hostname == "localhost") {
                sSvcUrl = application.url + "/com/XImport";
              }
              // 타임아웃 설정했을시 복원
              var time = Math.ceil(targetObj.getBindDataset().getRowCount() / 40);
              if (time > nexacro.getEnvironment().httptimeout) {
                context._commonBaseTimeout = nexacro.getEnvironment().httptimeout;
                nexacro.getEnvironment().set_httptimeout(time);
              }
              sFileName = dToday.getTime() + "_" + targetObj.commonExcel.getOpts("fileNm");

              if (context.isValidObject("ExportOBJ")) context.removeChild("ExportOBJ");
              var objExportObject = new ExcelExportObject("ExportOBJ", context);
              objExportObject.addEventHandler(
                "onsuccess",
                function (obj, e) {
                  // 타임아웃 설정했을시 복원
                  if (
                    context._commonBaseTimeout &&
                    nexacro.getEnvironment().httptimeout != context._commonBaseTimeout
                  ) {
                    application.set_httptimeout(context._commonBaseTimeout);
                  }
                },
                context
              );
              objExportObject.addEventHandler(
                "onerror",
                function (obj, e) {
                  // 타임아웃 설정했을시 복원
                  if (
                    context._commonBaseTimeout &&
                    nexacro.getEnvironment().httptimeout != context._commonBaseTimeout
                  ) {
                    application.set_httptimeout(context._commonBaseTimeout);
                  }
                },
                context
              );
              context.addChild("ExportOBJ", objExportObject);
              context.ExportOBJ.clearExportItems(nexacro.ExportItemTypes.GRID);

              var ret = context.ExportOBJ.addExportItem(
                nexacro.ExportItemTypes.GRID,
                targetObj,
                "sheet1!A1",
                "allband",
                "allrecord",
                "suppress",
                "onlyvalue",
                "none",
                "",
                "both"
              );
              var objExportItem;
              if (ret > -1) {
                objExportItem = context.ExportOBJ.getExportItem(nexacro.ExportItemTypes.GRID, ret);

                context.ExportOBJ.set_exportmessageprocess("%d [ %d / %d ]");
                context.ExportOBJ.set_exportuitype("exportprogress");
                context.ExportOBJ.set_exporteventtype("itemrecord");
                if (
                  targetObj.commonExcel.getOpts("exportType") &&
                  targetObj.commonExcel.getOpts("exportType") == "CSV"
                ) {
                  context.ExportOBJ.set_exporttype(nexacro.ExportTypes.CSV);
                } else if (
                  targetObj.commonExcel.getOpts("exportType") &&
                  targetObj.commonExcel.getOpts("exportType") == "EXCEL97"
                ) {
                  context.ExportOBJ.set_exporttype(nexacro.ExportTypes.EXCEL97);
                } else if (
                  targetObj.commonExcel.getOpts("exportType") &&
                  targetObj.commonExcel.getOpts("exportType") == "HANCELL2010"
                ) {
                  context.ExportOBJ.set_exporttype(nexacro.ExportTypes.HANCELL2010);
                } else if (
                  targetObj.commonExcel.getOpts("exportType") &&
                  targetObj.commonExcel.getOpts("exportType") == "HANCELL2014"
                ) {
                  context.ExportOBJ.set_exporttype(nexacro.ExportTypes.HANCELL2014);
                } else {
                  context.ExportOBJ.set_exporttype(nexacro.ExportTypes.EXCEL2007);
                }
                context.ExportOBJ.set_exportfilename(sFileName);
                context.ExportOBJ.set_exporturl(sSvcUrl);
                objExportItem.set_exportvalue("allstyle");
                objExportItem.set_exportselect("allrecord");
                objExportItem.set_exporthead("allband");
                objExportItem.set_exportmerge("nosuppress");
                objExportItem.set_exportimage("image");
                var addOption = "";

                if (targetObj.commonExcel.getOpts("password")) {
                  var input = window.prompt(
                    "개인정보(주민번호)가 포함되어 비밀번호를 설정하여야합니다.\n비밀번호를 입력해주세요.",
                    ""
                  );
                  if (!input) {
                    _utilsHome.alert("비밀번호를 입력해주세요.");
                    return;
                  }
                  context.ExportOBJ.set_exportfilepassword(input);
                }

                context.ExportOBJ.exportData(addOption);
              }
            }
            return function (arg) {
              _innerUtils.performLog(
                "공통 엑셀 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              _innerUtils.validateOption(this, arguments.callee._thisFuncKey);
              var targetObj = this,
                returnVal = false;
              var argArr = [targetObj, arguments, true, action, context, _innerUtils, _utils];
              _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
            };
          },
          /**
           * 출력버튼 클릭 동작
           */
          commonPrint: function (arg) {
            function action(targetObj) {
              var opts = targetObj.commonPrint.getOpts();
              if (opts.filePath.indexOf(".") >= 0) {
                context.popup.reportImg
                  .setOpts({
                    width: opts.popupSize && opts.popupSize[0] ? opts.popupSize[0] : 1000,
                    height: opts.popupSize[1] && opts.popupSize[1] ? opts.popupSize[1] : 800
                  })
                  .open({
                    filePath: opts.filePath
                  });
              } else {
                // 리포트 실행
                _utilsHome.callReport.call(targetObj, opts);
              }
            }
            return function (arg) {
              _innerUtils.performLog(
                "공통 프린트 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              _innerUtils.validateOption(this, arguments.callee._thisFuncKey);
              var targetObj = this,
                returnVal = false;
              var argArr = [targetObj, arguments, false, action, context, _innerUtils, _utils];
              _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
            };
          },
          commonMail: function () {
            function action(targetObj) {
              if (targetObj instanceof nexacro.Grid) {
                var ds = targetObj.getBindDataset();
                var list = [];
                var colInfo = targetObj.commonMail.getOpts("rcverColInfo");

                ds.checkEach(function (i, ds) {
                  var data = {
                    email: "",
                    name: "",
                    etc1: "",
                    etc2: "",
                    etc3: ""
                  };
                  for (var attr in colInfo) {
                    data[attr] = ds.getColumn(i, colInfo[attr]);
                  }
                  list.push(data);
                });
                if (list.length == 0) {
                  _utilsHome.alert("체크된 행이 없습니다.");
                }
                _utilsHome.sendMail({
                  list: list,
                  title: targetObj.commonMail.getOpts("title"),
                  content: targetObj.commonMail.getOpts("content")
                });
              } else {
              }
              return "";
            }
            /*
             * 포스트 실행 하기전 공통 작업
             */
            function commonCallback(targetObj, post, paramArr) {
              var ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
              if (targetObj instanceof nexacro.Dataset) {
                // 정의
              } else {
              }
            }
            return function () {
              _innerUtils.performLog(
                "공통 메일발송 : " + this.id + "." + arguments.callee._thisFuncKey
              );
              _innerUtils.validateOption(this, arguments.callee._thisFuncKey);
              var targetObj = this;
              var argArr = [
                targetObj,
                arguments,
                false,
                action,
                context,
                _innerUtils,
                _utils,
                null,
                commonCallback
              ];
              var returnVal = _innerUtils.commonBtnDirectControl.apply(targetObj, argArr);
              return returnVal;
            };
          }
        };
        /*
         * 데이터셋 확장될 기능
         */
        dataSetSupportFunc = {
          /**
           * 데이터셋이 변경된 내용이 있는지 체크
           */
          isUpdate: function () {
            _innerUtils.performLog("데이터변경유무 체크 : " + this.id);
            var ds = this,
              returnVal = false;
            if (
              ds._viewRecords != null &&
              (ds.getDeletedRowCount() > 0 ||
                ds.findRowExpr(
                  "dataset.getRowType(rowidx)==4||dataset.getRowType(rowidx)==2||dataset.getRowType(rowidx)==8"
                ) > -1)
            ) {
              returnVal = true;
            }
            return returnVal;
          },
          /*
           * 체크된 행이 있는지 체크
           */
          isChecked: function () {
            _innerUtils.performLog("체크된 행 있는지 체크 : " + this.id);
            var ds = this,
              returnVal = false;
            if (ds._viewRecords != null && ds.getRowCount() > 0 && ds.findRow("chk", 1) > -1) {
              returnVal = true;
            }
            return returnVal;
          },
          /**
           * json데이터를 ds에 바로 셋팅한다.
           *
           * @param ds
           *            데이터셋
           * @param obj
           *            데이터셋에 셋팅할 json 데이터
           * @param idx
           *            인덱스
           * @param addColumn
           *            컬럼을 추가 할지 여부
           */
          setRowData: function (idx, obj) {
            var ds = this;
            for (key in obj) {
              ds.setColumn(idx, key, obj[key]);
            }
          },
          /**
           * 클로즈함수에서 체크할 데이터셋 등록
           */
          enrollCloseCheck: function () {
            _innerUtils.performLog("폼닫을때 체크할 데이터셋 등록 : " + this.id);
            var dsList = context.getOwnerFrame().form["_commonCloseCheckDataList"],
              ds = this;
            if (dsList == undefined) {
              context.getOwnerFrame().form["_commonCloseCheckDataList"] = dsList = [];
            }
            dsList.push(ds);
            var popupFlag = context.popup.isPopup();
            var targetFrame, targetForm, targetDs;
            targetFrame = context.getOwnerFrame();
            while (popupFlag) {
              targetForm = targetFrame.parent.form;
              targetDs = targetFrame.parent.form["_commonCloseCheckDataList"];
              if ((popupFlag = targetForm.div_Work.form.popup.isPopup())) {
                targetFrame = targetFrame.parent;
              } else {
                if (targetDs == undefined) {
                  targetForm["_commonCloseCheckDataList"] = targetDs = [];
                }
                targetDs.push(ds);
              }
            }
            return ds;
          },
          /**
           * 콤보 첫번째 선택,전체 글자 추가
           *
           * @param type
           *            "T":전체, "S":선택, "E":공란
           */
          addFirstComboRow: function ($type, code, data) {
            _innerUtils.performLog("콤보 첫번째 데이터 추가 : " + this.id);
            var ds = this,
              idx = 0,
              type = String.prototype.toLocaleLowerCase.call($type);
            if (type == "x") return;
            if (ds.getRowCount() == 0) {
              ds.addRow();
            } else {
              ds.insertRow(idx);
            }

            var getValue = function () {
              if (!application.locale) application.locale = "ko";
              var text = {
                ko: { t: "전체", s: "선택", e: "" },
                en: { t: "All", s: "Select", e: "" }
              };
              return text[application.locale][type];
            };
            ds.setColumn(idx, code || "code", null);
            ds.setColumn(idx, data || "fullNm", getValue());
            ds.setColumn(idx, "useYn", "1");
            // 언어설정에 맞는 값 불러오기

            return ds;
          },
          /**
           * 로우에 대한 반복문
           *
           * @param type
           *            1 : chk 체크된 행
           * @param func
           *            check된 로우에 대한 반복문에서 실행할 함수
           */
          checkEach: function (checkedFunc, unCheckedFunc) {
            var ds = this,
              i = 0,
              j = ds.getRowCount(),
              k,
              _updatecontrol;
            _updatecontrol = ds.updatecontrol;
            if (_updatecontrol) {
              ds.set_updatecontrol(false);
            }
            try {
              for (; i < j; i++) {
                if (ds.getColumn(i, "chk") == "1") {
                  if (checkedFunc.call(context, i, ds) === false) {
                    break;
                  }
                } else if (typeof unCheckedFunc == "function" && ds.getColumn(i, "chk") == "0") {
                  if (unCheckedFunc.call(context, i, ds) === false) {
                    break;
                  }
                }
              }
            } catch (e) {
              throw e;
            } finally {
              if (_updatecontrol) {
                ds.set_updatecontrol(_updatecontrol);
              }
            }
            return ds;
          },
          /**
           * 로우에 대한 반복문
           *
           * @param type
           *            1 : chkNm 체크값 컬럼명
           * @param func
           *            check된 로우에 대한 반복문에서 실행할 함수
           */
          checkEachCustom: function (chkNm, checkedFunc, unCheckedFunc) {
            var ds = this,
              i = 0,
              j = ds.getRowCount(),
              k,
              _updatecontrol;
            _updatecontrol = ds.updatecontrol;
            if (_updatecontrol) {
              ds.set_updatecontrol(false);
            }
            try {
              for (; i < j; i++) {
                if (ds.getColumn(i, chkNm) == "1") {
                  if (checkedFunc.call(context, i, ds) === false) {
                    break;
                  }
                } else if (typeof unCheckedFunc == "function" && ds.getColumn(i, chkNm) == "0") {
                  if (unCheckedFunc.call(context, i, ds) === false) {
                    break;
                  }
                }
              }
            } catch (e) {
              throw e;
            } finally {
              if (_updatecontrol) {
                ds.set_updatecontrol(_updatecontrol);
              }
            }
            return ds;
          },
          /**
           * 로우의 상태이미지를 가져오기 위한 함수
           * @param idx : row인덱스
           */
          getRowTypeImg: function (idx) {
            var ds = this,
              rowType = ds.getRowType(idx);
            if (rowType == Dataset.ROWTYPE_INSERT) {
              return "theme://workframe/bullet_add.png";
            } else if (rowType == Dataset.ROWTYPE_UPDATE) {
              return "theme://workframe/bullet_fix.png";
            } else if (rowType == Dataset.ROWTYPE_DELETE) {
              return "theme://workframe/bullet_delete.png";
            } else {
              return "";
            }
          },
          /**
           * 첨부파일 아이콘 이미지를 가져오는 함수
           * @param fileNm : 파일명
           */
          getFileTypeImg: function (fileNm) {
            var result = fileNm.match(/[.]([a-zA-Z0-9]+)$/);
            var ext = result ? result[1].toUpperCase() : "";
            var imagePath = "theme://workframe/";
            if (ext == "PDF") {
              imagePath += "file_pdf.png";
            } else if (ext in { DOC: 1, DOCX: 1 }) {
              imagePath += "file_doc.png";
            } else if (ext in { XLS: 1, XLSX: 1 }) {
              imagePath += "file_xls.png";
            } else if (ext in { PPT: 1, PPTX: 1 }) {
              imagePath += "file_ppt.png";
            } else if (ext == "HWP") {
              imagePath += "file_hwp.png";
            } else if (ext == "TXT") {
              imagePath += "file_txt.png";
            } else if (ext in { ZIP: 1, ALZ: 1 }) {
              imagePath += "file_zip.png";
            } else {
              imagePath += "file_ets.png";
            }
            return imagePath;
          },

          /**
           * 데이터셋의 특정행의 데이터를 object로 받아오는 함수
           *
           * @param type
           *            idx : row인덱스 (안넘길 경우 현재 데이터셋의 rowposition)
           */
          getRowData: function (idx) {
            var ds = this,
              returnData = {},
              idx = idx || idx === 0 || idx === -1 ? idx : ds.rowposition;
            for (var i = 0; i < ds.colinfos.length; i++) {
              if (idx != -1) {
                returnData[ds.colinfos[i].id] = ds.getColumn(idx, ds.colinfos[i].id);
              } else {
                returnData[ds.colinfos[i].id] = "";
              }
            }
            return returnData;
          },

          /**
           * 데이터셋의 전체 데이터를 object로 받아오는 함수
           */
          getAllRowData: function () {
            var ds = this;
            var list = [];
            for (var i = 0; i < ds.rowcount; i++) {
              list.push(ds.getRowData(i));
            }
            return list;
          },

          /**
           * 그리드의 합계부분에 표시될 조회된 건 수를 가져오는 함수
           *
           */
          footerRowCount: function () {
            var ds = this;
            return (
              "총건수 : [" +
              String(ds.getRowCount()).replace(/(\d)(?=(?:\d{3})+(?!\d))/g, "$1,") +
              "]"
            );
          },

          /**
           * 그리드의 컬럼합계 가져오기
           *
           */
          sum: function (colNm, type, nullText) {
            var ds = this;
            nullText = nullText || "";
            type = type || "f"; // n - 숫자, f - 포맷된 문자(콤마표시)

            var check = false; // 데이터에 숫자가 있었을 경우 null처리 안함
            var result = 0;
            for (var i = 0; i < ds.rowcount; i++) {
              var val = ds.getColumn(i, colNm);
              if (isNaN(val)) {
                continue;
              }
              if (typeof val == "number") {
                result += val;
              } else {
                result += parseFloat(val);
              }
              check = true;
            }
            if (result == 0) {
              if (check) {
                return 0;
              } else {
                return nullText == undefined ? "" : nullText;
              }
            }
            return type == "n"
              ? result
              : String(result).replace(/(\d)(?=(?:\d{3})+(?!\d))/g, "$1,");
          },
          get: function (arg1, arg2) {
            var val = "";
            if (isNaN(arg1)) {
              val = this.getColumn(this.rowposition, arg1);
            } else {
              val = this.getColumn(arg1, arg2);
            }
            return val || "";
          },
          set: function () {
            var row, columnId, val;
            if (arguments.length == 2) {
              row = this.rowposition;
              columnId = arguments[0];
              val = arguments[1];
            } else {
              row = arguments[0];
              columnId = arguments[1];
              val = arguments[2];
            }

            if (val instanceof nexacro.WebBrowser && val._type == "webEdt") {
              // web에디터인 경우
              var newVal = val.getValue() || "";
              newVal = newVal.replace(/\&lt;/g, "<");
              newVal = newVal.replace(/\&gt;/g, ">");
              var oldVal = this.getColumn(row, columnId) || "";
              oldVal = oldVal.replace(/\&lt;/g, "<");
              oldVal = oldVal.replace(/\&gt;/g, ">");
              if (oldVal != newVal) {
                return this.setColumn(row, columnId, val.getValue());
              }
              return true;
            } else if (
              this.getColumnInfo(columnId) &&
              this.getColumnInfo(columnId).type == "DATETIME"
            ) {
              if (typeof val == "string" && val) {
                val = val.length == 8 ? val + "0000000" : val;
              }
              // 컬럼타입이 DATETIME인경우..
              return this.setColumn(row, columnId, val);
            } else {
              return this.setColumn(row, columnId, val);
            }
          },
          isInsertRow: function (row) {
            row = row || row == 0 ? row : this.rowposition;
            return this.getRowType(row) == Dataset.ROWTYPE_INSERT;
          },
          isDeleteRow: function (row) {
            row = row || row == 0 ? row : this.rowposition;
            return this.getRowType(row) == Dataset.ROWTYPE_DELETE;
          },
          isUpdateRow: function (row) {
            row = row || row == 0 ? row : this.rowposition;
            return this.getRowType(row) == Dataset.ROWTYPE_UPDATE;
          }
        };
        /*
         * 그리드에 확장될 기능
         */
        gridSupportFunc = {
          /*
           * 트리 레벨별 확장
           */
          setTreeOpen: function (lv) {
            this.set_enableredraw(false);
            var i = 0,
              ds = this.getBindDataset(),
              j = ds.getRowCount();
            if (j > 0) {
              if (lv == 99) {
                this.set_treeinitstatus("expand,null");
              } else {
                this.set_treeinitstatus("collapse,null");
                this.set_enableevent(false);
                var colIdx = ds.colinfos[this._treeCellinfo.treelevel._bindexpr]._index;
                for (i; i < j; i++) {
                  var lvl = ds.getColumn(i, colIdx);
                  lvl = typeof lvl == "string" ? Number(lvl) : lvl.hi;
                  if (lvl < lv) {
                    this.setTreeStatus(this.getTreeRow(i), true);
                  }
                }
                this.set_enableevent(true);
              }
            }
            this.set_enableredraw(true);
          },
          /*
           * 트리의 원하는 데이터를 확장한후 선택한다.
           */
          selectTreeRow: function (idx, childOpenObj) {
            var treeStack = [],
              parentIdx = 1,
              ds = this.getBindDataset(),
              i = 0,
              j = 0,
              k = 0;
            var returnVal = -1;
            try {
              if (
                typeof ds.getEventHandler("canrowposchange", 0) == "function" ||
                typeof ds.getEventHandler("onrowposchanged", 0) == "function"
              ) {
                ds.set_enableevent(false);
                ds.set_rowposition(-1);
                ds.set_enableevent(true);
              }
              if (ds.getRowCount() > 0) {
                if (typeof idx != "number") {
                  idx = ds.findRow(idx.key, idx.value);
                }
                if (idx > -1) {
                  k = idx;
                  while (parentIdx > -1) {
                    parentIdx = this.getTreeParentRow(k);
                    if (childOpenObj && ds.getColumn(k, childOpenObj.key) == childOpenObj.value) {
                      treeStack.unshift(k);
                    }
                    treeStack.unshift(parentIdx);
                    k = parentIdx;
                  }
                  if (treeStack.length > 0) {
                    this.set_enableevent(false);
                    for (i, j = treeStack.length; i < j; i++) {
                      this.setTreeStatus(this.getTreeRow(treeStack[i]), true);
                    }
                    this.set_enableevent(true);
                  }
                  ds.set_enableevent(true);
                  returnVal = ds.set_rowposition(idx);
                }
              }
            } catch (e) {
              _utilsHome.log(e);
            } finally {
              this.set_enableevent(true);
              ds.set_enableevent(true);
            }
            return returnVal;
          },
          /*
           * 입력받은 컬럼이 현재 수정 중인 컬럼이 맞는지 체크
           */
          isEditCell: function (event, colNm) {
            if (typeof event == "string") {
              colNm = event;
              return this.getBindCellIndex("body", colNm) == this._focused_cell;
            }

            if (event instanceof nexacro.KeyEventInfo) {
              return this.getCellPos() == this.getBindCellIndex("body", colNm);
            } else {
              return event.cell == this.getBindCellIndex("body", colNm);
            }
          }
        };
        /*
         * 내부적으로 사용할 객체
         */
        _innerUtils = {
          /**
           * 다른 워크 프레임 참조
           */
          refWorkFrame: function (menuId) {
            if (application.gv_AppWorkFrameSet["Child_" + menuId] != undefined) {
              return application.gv_AppWorkFrameSet["Child_" + menuId].form.components.div_Work;
            }
          },

          /**
           * 브라우저명을 확인한다.
           */
          whoAreU: function (name) {
            if (!!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0) {
              return name === "opera" ? true : false;
            } else if (typeof InstallTrigger !== "undefined") {
              return name === "firefox" ? true : false;
            } else if (
              Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") > 0
            ) {
              return name === "safari" ? true : false;
            } else if (
              !!window.chrome &&
              !(!!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0)
            ) {
              return name === "chrome" ? true : false;
            } else if (nexacro.Browser == "IE") {
              return name === "ie" ? true : false;
            }
            return false;
          },
          /**
           * 서버에서 생성한 파일을 다운로드 한다.
           */
          streamToFile: function (path, opts) {
            var form = null,
              input = [],
              argsObj;
            //var realurl = opts.external ? path : application._getServiceLocation("svcurl::" + path, context._base_url);
            var realurl = path;
            if (realurl.charAt(0) != "/" && realurl.indexOf("http") != 0) realurl = "/" + realurl;
            if (context.getOwnerFrame().arguments && opts.hipassTicket !== true) {
              argsObj = context.getOwnerFrame().arguments;
              if (
                argsObj !== undefined &&
                argsObj.menuId !== undefined &&
                argsObj.pgmId !== undefined
              ) {
                realurl += "?menuId=" + argsObj.menuId + "&pgmId=" + argsObj.pgmId;
              }
            }
            var $document;
            if (opts.target && !opts.popup) {
              $document = document.getElementsByName(opts.target)[0].contentDocument;
            } else {
              $document = document;
            }
            form = $document.createElement("form");
            form.id = "_edu_common_form";
            form.action = realurl;
            form.method = opts.method || "post";
            form.style.display = "none";
            input.push($document.createElement("input"));
            input[0].value = "true";
            input[0].name = "stream";
            for (key in opts.streamParams) {
              input.push($document.createElement("input"));
              input[input.length - 1].value = opts.streamParams[key];
              input[input.length - 1].name = key;
              form.appendChild(input[input.length - 1]);
            }
            if (!opts.target) {
              form.target = "_edu_stream";
              $document.getElementsByTagName("body")[0].appendChild(form);
              _innerUtils.getStreamIframe();
              form.submit();
              var formElement = document.getElementById("_edu_common_form");
              formElement.parentNode.removeChild(formElement);
            } else {
              if (opts.popup) {
                form.target = opts.target;
              }
              $document.getElementsByTagName("body")[0].appendChild(form);
              form.submit();
              var formElement = document.getElementById("_edu_common_form");
              formElement.parentNode.removeChild(formElement);
            }
          },
          /**
           * 서버에서 생성한 압축파일을 다운로드 한다.
           */
          streamToZipFile: function (path, opts) {
            var form = null,
              input = [],
              argsObj;
            var realurl = opts.external
              ? path
              : application._getServiceLocation("svcurl::" + path, context._base_url);
            if (context.getOwnerFrame().arguments && opts.hipassTicket !== true) {
              argsObj = context.getOwnerFrame().arguments;
              if (
                argsObj !== undefined &&
                argsObj.menuId !== undefined &&
                argsObj.pgmId !== undefined
              ) {
                realurl += "?menuId=" + argsObj.menuId + "&pgmId=" + argsObj.pgmId;
              }
            }
            var attachNoArr = opts.attachList;
            var fileNmArr = _utilsHome.isValid(opts.streamParams.fileNmArr)
              ? opts.streamParams.fileNmArr
              : [];
            var submitCnt = 0;
            var multiDownloadInterval = setInterval(function () {
              try {
                var attachNo = attachNoArr.shift();
                var fileNm = _utilsHome.isValid(fileNmArr) ? fileNmArr.shift() : "";
                if (attachNo === undefined) {
                  clearInterval(multiDownloadInterval);
                } else {
                  var $document = document;
                  form = $document.createElement("form");
                  form.id = "_edu_common_form" + submitCnt;
                  form.action = realurl;
                  form.method = "post";
                  form.style.display = "none";
                  input.push($document.createElement("input"));
                  input[0].value = "true";
                  input[0].name = "stream";
                  if (typeof attachNo == "object") {
                    input[input.length - 1].value = encodeURIComponent(JSON.stringify(attachNo));
                  } else {
                    input[input.length - 1].value = attachNo;
                  }
                  input[input.length - 1].name = "attachList";
                  form.appendChild(input[input.length - 1]);
                  input.push($document.createElement("input"));
                  input[input.length - 1].name = "fileNm";
                  input[input.length - 1].value = fileNm;
                  form.appendChild(input[input.length - 1]);
                  form.target = "_edu_stream" + submitCnt;
                  $document.getElementsByTagName("body")[0].appendChild(form);
                  _innerUtils.getMStreamIframe(submitCnt);

                  form.submit();

                  var formElement = document.getElementById("_edu_common_form" + submitCnt);
                  formElement.parentNode.removeChild(formElement);
                  submitCnt++;
                }
              } catch (e) {
                _utilsHome.error(e);
                clearInterval(multiDownloadInterval);
              }
            }, 500);
          },
          /**
           * 스트림용 아이프래임 생성
           */
          getStreamIframe: function () {
            if (!document.getElementById("_edu_stream_frame")) {
              var streamFrame = document.createElement("iframe");
              streamFrame.name = "_edu_stream";
              streamFrame.id = "_edu_stream_frame";
              streamFrame.style.visibility = "hidden";
              document.getElementsByTagName("body")[0].appendChild(streamFrame);
            }
          },
          /**
           * 다중 아이프래임 생성
           */
          getMStreamIframe: function (subFix) {
            if (typeof subFix === "undefined") {
              subFix = "";
            }

            if (!document.getElementById("_edu_stream_frame" + subFix)) {
              var streamFrame = document.createElement("iframe");
              streamFrame.name = "_edu_stream" + subFix;
              streamFrame.id = "_edu_stream_frame" + subFix;
              streamFrame.style.visibility = "hidden";
              document.getElementsByTagName("body")[0].appendChild(streamFrame);
            }
          },
          /**
           * 파라미터로 넘어온 데이터가 유효한 값인지 체크 하고 유효한 값이면 true 아니면 false를 반환한다.<br>
           * boolean형태의 값이 넘어올 경우 넘오온 값 그대로 리턴<br>
           * 유효 값 : null,undefined,빈스트링,빈객체,빈배열이 아닌경우
           *
           * @param arg
           *            필수, 체크할 데이터
           */
          commonValidation: {
            // 체크
            run: function (context, obj, checkRule, row) {
              try {
                var result = true;
                if (row || row == 0) {
                  result = this.checkRow(obj, checkRule, row);
                } else if (obj instanceof Grid) result = this.checkGrid(obj, checkRule);
                else if (obj instanceof Div || obj instanceof Form)
                  result = this.checkDiv(obj, checkRule);
                else if (obj instanceof Dataset) result = this.checkDs(obj, checkRule);
                return result;
              } catch (e) {
                if (e.message.match(/요\.$/) === null) {
                  _utilsHome.log(e);
                  _utilsHome.error("유효성 체크 로직에 문제가 있습니다. 공통팀에 알려주세요.");
                }
              } finally {
                checkRule.filter("");
              }
            },
            // 그리드 체크
            checkGrid: function (grid, checkRule) {
              var ds = grid.getBindDataset();
              // 체크할 행이 없거나 변경된 데이터가 없으면 true
              if (ds.getRowCount() == 0 || !dataSetSupportFunc.isUpdate.call(ds)) {
                return true;
              } else {
                var roleSet = [
                  "isNull",
                  "isUniq",
                  "correctLength",
                  "isNomalDate",
                  "userExpr",
                  "userFunc"
                ];
                checkRule.filter("compId=='" + grid.name + "'");
                var result = this.check(roleSet, ds, checkRule, 1);
                if (!result.flag) {
                  ds.set_rowposition(result.row);
                  var cellIdx = this.findGridFocusTargetCell(grid, result.cell);
                  var findCompFlag = true;
                  if (cellIdx > -1) {
                    if (
                      !(
                        grid.getCellProperty("body", cellIdx, "edittype") in
                        { none: 1, readonly: 1 }
                      )
                    ) {
                      grid.setFocus();
                      grid.setCellPos(cellIdx);
                      findCompFlag = false;
                    }
                  }
                  if (findCompFlag) {
                    var comp = this.findBindCompTarget(context, ds, result.cell);
                    if (_utilsHome.isValid(comp) && typeof comp.setFocus == "function") {
                      comp.setFocus();
                    }
                  }
                }
                return result.flag;
              }
            },
            // 데이터셋 체크
            checkDs: function (ds, checkRule) {
              if (ds.getRowCount() == 0 || !dataSetSupportFunc.isUpdate.call(ds)) {
                return true;
              } else {
                var roleSet = [
                  "isNull",
                  "isUniq",
                  "correctLength",
                  "isNomalDate",
                  "userExpr",
                  "userFunc"
                ];
                checkRule.filter("compId=='" + ds.name + "'");
                var result = this.check(roleSet, ds, checkRule, 1);
                if (!result.flag) {
                  ds.set_rowposition(result.row);
                  var comp = this.findBindCompTarget(context, ds, result.cell);
                  if (_utilsHome.isValid(comp) && typeof comp.setFocus == "function") {
                    comp.setFocus();
                  }
                }
                return result.flag;
              }
            },
            // div 체크
            checkDiv: function (div, checkRule) {
              var result = true;
              var roleSet = ["isNull", "correctLength", "isNomalDate", "userExpr", "userFunc"];
              checkRule.filter("compId=='" + div.name + "'");
              var result = this.check(roleSet, div, checkRule, 2);
              if (!result.flag) {
                if (result.cell && typeof result.cell.setFocus == "function") {
                  result.cell.setFocus();
                }
              }
              return result.flag;
            },
            // 특정 Row 체크
            checkRow: function (obj, checkRule, row) {
              var result = true;
              var roleSet = [
                "isNull",
                "isUniq",
                "correctLength",
                "isNomalDate",
                "userExpr",
                "userFunc"
              ];
              checkRule.filter("compId=='" + obj.name + "'");
              var result = this.check(roleSet, obj, checkRule, 3, row);
              if (!result.flag) {
                if (obj instanceof nexacro.Grid) {
                  var grid = obj;
                  var ds = grid.getBindDataset();

                  ds.set_rowposition(result.row);
                  var cellIdx = this.findGridFocusTargetCell(grid, result.cell);
                  var findCompFlag = true;
                  if (cellIdx > -1) {
                    if (
                      !(
                        grid.getCellProperty("body", cellIdx, "edittype") in
                        { none: 1, readonly: 1 }
                      )
                    ) {
                      grid.setFocus();
                      grid.setCellPos(cellIdx);
                      findCompFlag = false;
                    }
                  }
                  if (findCompFlag) {
                    var comp = this.findBindCompTarget(context, ds, result.cell);
                    if (_utilsHome.isValid(comp) && typeof comp.setFocus == "function") {
                      comp.setFocus();
                    }
                  }
                } else {
                  var ds = obj;
                  ds.set_rowposition(result.row);
                  var comp = this.findBindCompTarget(context, ds, result.cell);
                  if (_utilsHome.isValid(comp) && typeof comp.setFocus == "function") {
                    comp.setFocus();
                  }
                }
              }
              return result.flag;
            },

            // 룰셋에 정의된 순서대로 데이터를 체크 하고 결과를 리턴한다.
            check: function (roleSet, obj, checkRule, type, row) {
              var result;
              for (var i = 0; i < roleSet.length; i++) {
                result = this.checkSet[roleSet[i]].call(this, context, obj, checkRule, type, row);
                if (!result.flag) {
                  break;
                }
              }
              return result;
            },
            // 체크규칙
            checkSet: {
              // 유일한 레코드의 값이 맞는지 체크 한다.
              isUniq: function (context, ds, checkRule) {
                var result = true;
                var sDuplication = "";
                var nextIdx = 0;
                var colarr = [];
                var loopFlag = true;
                var i = 0;
                do {
                  var pkIdx = checkRule.findRow("PK", "Y", nextIdx);
                  if (pkIdx > -1) {
                    var colId = checkRule.getColumn(pkIdx, "colId");
                    colarr.push(colId);
                    sDuplication += "+String(" + colId + ")";
                    nextIdx = pkIdx + 1;
                  } else if (nextIdx > 0) {
                    sDuplication = sDuplication.substr(1);
                    loopFlag = false;
                  } else {
                    loopFlag = false;
                  }
                } while (loopFlag);

                if (sDuplication != "") {
                  for (; i < ds.getRowCount(); i++) {
                    if (
                      ds.getRowType(i) == Dataset.ROWTYPE_INSERT ||
                      ds.getRowType(i) == Dataset.ROWTYPE_UPDATE
                    ) {
                      var sChkVal = "";
                      for (var j = 0; j < colarr.length; j++) {
                        var columnVal = ds.getColumn(i, colarr[j]);
                        if (columnVal instanceof nexacro.Date) {
                          var columnValStr = String(columnVal);
                          while (columnValStr.length < 17) {
                            columnValStr += "0";
                          }
                          columnVal = columnValStr;
                        }
                        sChkVal += columnVal;
                      }

                      var nDupFindRow = ds.findRowExpr(
                        "rowidx!=" + i + " && " + sDuplication + "=='" + sChkVal + "'"
                      );

                      if (nDupFindRow != -1) {
                        _utilsHome.alert(
                          i + 1 + "행과" + (nDupFindRow + 1) + "행이 중복되었습니다."
                        );
                        result = false;
                        break;
                      }
                    }
                  }
                }
                return {
                  flag: result,
                  row: i,
                  cell: null
                };
              },
              // 넘어온 값이 유효한 값이 체워졌는지 확인한다.
              isNull: function (context, obj, checkRule, type, row) {
                var result = true;
                var colId = "";
                var nullRow = -1;
                var comp = null;
                for (var i = 0; i < checkRule.getRowCount(); i++) {
                  if (checkRule.getColumn(i, "notNull") == "Y") {
                    colId = checkRule.getColumn(i, "colId");

                    switch (type) {
                      case 1:
                        var exprStr =
                          "(dataset.getRowType(rowidx)==Dataset.ROWTYPE_INSERT || dataset.getRowType(rowidx)==Dataset.ROWTYPE_UPDATE) && !dataset.parent.utils.isValid(" +
                          colId +
                          ")";
                        nullRow = obj.findRowExpr(exprStr);
                        if (nullRow > -1) {
                          result = false;
                        }
                        break;
                      case 2:
                        comp = this.findComp(obj, colId);
                        if (
                          comp &&
                          (!_utilsHome.isValid(comp.value) ||
                            (comp instanceof nexacro.Spin &&
                              comp.value == 0 &&
                              comp.user_zero != "Y"))
                        ) {
                          colId = comp;
                          result = false;
                        }
                        break;
                      case 3:
                        if (obj instanceof nexacro.Grid) {
                          obj = obj.getBindDataset();
                        }
                        result = context.utils.isValid(obj.getColumn(row, colId));
                        nullRow = row;
                        break;
                    }
                    if (!result) {
                      var nMsg = checkRule.getColumn(i, "msgId");
                      _utilsHome.alert(nMsg + "은(는) 필수 항목입니다.");
                      break;
                    }
                  }
                }
                return {
                  flag: result,
                  row: nullRow,
                  cell: colId
                };
              },
              // 길이가 맞는지 체크 한다.
              correctLength: function (context, obj, checkRule, type, row) {
                var result = true;
                var colId = "";
                var nLengthRow = -1;
                var comp = null;
                for (var i = 0; i < checkRule.getRowCount(); i++) {
                  var nLength = Number(checkRule.getColumn(i, "nLength"));
                  if (!isNaN(nLength) && nLength > 0) {
                    colId = checkRule.getColumn(i, "colId");
                    switch (type) {
                      case 1:
                        var exprStr =
                          "(dataset.getRowType(rowidx)==Dataset.ROWTYPE_INSERT || dataset.getRowType(rowidx)==Dataset.ROWTYPE_UPDATE) && " +
                          colId +
                          " && String(" +
                          colId +
                          ").length!=" +
                          nLength;
                        nLengthRow = obj.findRowExpr(exprStr);
                        if (nLengthRow != -1) {
                          result = false;
                        }
                        break;
                      case 2:
                        comp = this.findComp(obj, colId);
                        if (
                          comp &&
                          _utilsHome.isValid(comp.value) &&
                          String(comp.value).length != nLength
                        ) {
                          colId = comp;
                          result = false;
                        }
                        break;
                      case 3:
                        if (obj instanceof nexacro.Grid) {
                          comp = obj.getBindDataset();
                        } else {
                          comp = obj;
                        }
                        var val = comp.getColumn(row, colId) || "";
                        result = val.length == nLength;
                        nLengthRow = row;
                        break;
                    }
                    if (!result) {
                      var nMsg = checkRule.getColumn(i, "msgId");
                      _utilsHome.alert(nMsg + "의 길이를 " + nLength + " 자로 입력하십시오.");
                      break;
                    }
                  }
                }
                return {
                  flag: result,
                  row: nLengthRow,
                  cell: colId
                };
              },
              // 시작날짜가 끝나는 날짜보다 뒤인지 체크 한다.
              isNomalDate: function (context, obj, checkRule, type, row) {
                var result = true;
                var nDateRow = -1;
                var colId = "";
                for (var i = 0; i < checkRule.getRowCount(); i++) {
                  var fromCal = checkRule.getColumn(i, "from");
                  var toCal = checkRule.getColumn(i, "to");
                  if (fromCal && toCal) {
                    switch (type) {
                      case 1:
                        var exprStr =
                          "(dataset.getRowType(rowidx)==Dataset.ROWTYPE_INSERT || dataset.getRowType(rowidx)==Dataset.ROWTYPE_UPDATE)" +
                          "&& dataset.getColumn(rowidx, '" +
                          fromCal +
                          "') && dataset.getColumn(rowidx, '" +
                          toCal +
                          "')" +
                          "&& (dataset.parent.dateUtils.between(dataset.getColumn(rowidx, '" +
                          fromCal +
                          "'), dataset.getColumn(rowidx, '" +
                          toCal +
                          "')) < 1)";
                        nDateRow = obj.findRowExpr(exprStr);
                        if (nDateRow != -1) {
                          result = false;
                        }
                        break;
                      case 2:
                        fromCal = this.findComp(obj, fromCal);
                        toCal = this.findComp(obj, toCal);
                        if (!_utilsHome.isValid(fromCal) || !_utilsHome.isValid(toCal)) {
                          _utilsHome.error(
                            "달력 컴포넌트를 찾을수 없네요. 설정 아이디 확인 하세요."
                          );
                        }

                        if (!fromCal.value || !toCal.value) {
                          result = true;
                        } else if (context.dateUtils.between(fromCal.value, toCal.value) < 1) {
                          result = false;
                        }
                        break;
                      case 3:
                        if (obj instanceof nexacro.Grid) {
                          comp = obj.getBindDataset();
                        } else {
                          comp = obj;
                        }
                        var frVal = comp.getColumn(row, fromCal) || "";
                        var toVal = comp.getColumn(row, toCal) || "";

                        if (frVal && toVal && context.dateUtils.between(frVal, toVal) < 1) {
                          result = false;
                        } else {
                          result = true;
                        }
                        nDateRow = row;
                        break;
                    }
                    if (!result) {
                      var nMsg = checkRule.getColumn(i, "msgId");
                      _utilsHome.alert(nMsg + "의 기간 설정을 확인해주십시오.");
                      break;
                    }
                  }
                }
                return {
                  flag: result,
                  row: nDateRow,
                  cell: fromCal
                };
              },
              // 유저가 입력한 정규식을 통해 유효성을 체크 한다.
              userExpr: function (context, obj, checkRule, type, row) {
                var result = true;
                var nExprFindRow = -1;
                var cell = null;
                for (var i = 0; i < checkRule.getRowCount(); i++) {
                  var exprStr = checkRule.getColumn(i, "expr");
                  if (_utilsHome.isValid(exprStr)) {
                    cell = checkRule.getColumn(i, "colId");
                    switch (type) {
                      case 1:
                        nExprFindRow = obj.findRowExpr(exprStr);
                        if (nExprFindRow != -1) {
                          result = false;
                        }
                        break;
                      case 2:
                        _utilsHome.error("div는 expr기능을 지원하지 않아요.");
                        break;
                      case 3:
                        _utilsHome.error("expr기능을 지원하지 않아요.");
                        break;
                    }
                    if (!result) {
                      var nMsg = checkRule.getColumn(i, "msgId");
                      if (nMsg.indexOf("$row") >= 0) {
                        nMsg = nMsg.replace("$row", nExprFindRow + 1);
                      }
                      _utilsHome.alert(nMsg);
                      break;
                    }
                  }
                }
                return {
                  flag: result,
                  row: nExprFindRow,
                  cell: null
                };
              },
              // 유저가 입력한 메소드를 통해 유효성을 체크 한다.
              userFunc: function (context, obj, checkRule, type, row) {
                var result = true;
                var funcNm = "";
                for (var i = 0; i < checkRule.getRowCount(); i++) {
                  funcNm = checkRule.getColumn(i, "func");
                  if (typeof context[funcNm] == "function") {
                    result = context[funcNm].call(context, obj, row);
                    break;
                  }
                }
                return {
                  flag: result,
                  row: -1,
                  cell: null
                };
              }
            },
            // 그리드 안에서 포커스할 셀을 찾는다.
            findGridFocusTargetCell: function (grid, colId) {
              var result = colId ? grid.getBindCellIndex("body", colId) : null;
              return result == null || result < 0 ? -1 : result;
            },
            // 데이터 셋에 바인드 된 컴포넌트의 위치를 찾는다.
            findBindCompTarget: function (context, ds, colId) {
              var bindComponent;
              context._common_binds.unshift(context);

              for (var i = 0; i < context._common_binds.length; i++) {
                var parentComp = context._common_binds[i];
                for (var j = 0; j < parentComp.binds.length; j++) {
                  var objBindItem = parentComp.binds[j];
                  if (
                    objBindItem.columnid == colId &&
                    objBindItem.datasetid == ds.name &&
                    objBindItem.propid == "value"
                  ) {
                    bindComponent = parentComp;
                    bindComponent = this.findComp(bindComponent, objBindItem.compid);
                    if (_utilsHome.isValid(bindComponent)) {
                      break;
                    }
                  }
                }
              }
              return bindComponent;
            },
            // 아이디로 컴포넌트 객체를 찾는다.
            findComp: function (parentCompIdStr, compIdStr) {
              var comp = null;
              var compIdArr = compIdStr.split(".");
              var parentComp =
                typeof parentCompIdStr == "string"
                  ? context.components[parentCompIdStr]
                  : parentCompIdStr;

              for (var i = 0; i < compIdArr.length; i++) {
                //2019.12.18. SG. 수정.
                comp = parentComp[compIdArr[i]];
                comp =
                  parentComp instanceof nexacro.Div
                    ? parentComp.form[compIdArr[i]]
                    : parentComp[compIdArr[i]];
                if (!_utilsHome.isValid(comp)) {
                  comp = null;
                  break;
                } else {
                  parentComp = comp;
                }
              }
              return comp;
            }
          },
          /**
           * 그리드에 기본으로 셋팅해 놓은 내용을 초기화 한다.
           */
          /**
           * 설정값을 비운다.
           */
          emptySetting: function (targetObj, ds) {
            // 값 초기화
            targetObj.commonSave._findLastRowRange = [];
            targetObj.commonSave._findLastRowData = [];
            targetObj.commonSave._findLastRowIng = false;
            targetObj.commonFind._findLastRow = -1;
            targetObj.commonFind.setOpts("findLastRow", false);
            // 이벤트 초기화
            ds.set_enableevent(targetObj.commonSave._findLastRowOrgEvent);
          },
          /**
           * 공통에서 개발자들에게 공지할 내용을 공지한다.
           *
           * @param msg
           *            공지 메시지
           */
          notice: function (msg, until) {
            if (devFlag && until >= today()) {
              msg = "공통공지 :: " + msg;
              _utilsHome.warn(msg);
            }
            /*
             * 오늘 날짜
             */
            function today() {
              var a = new Date();
              return Number(
                String(a.getFullYear()) + String(a.getMonth() + 1) + String(a.getDate())
              );
            }
          },
          /**
           * 공통버튼의 옵션설정
           */
          extendCommonBtnOpts: function (targetObj) {
            var commonOpts, targetOpts, ds;
            ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
            commonOpts = {
              pre: "",
              post: "",
              user: ""
            };
            targetOpts = targetObj._commonBtnDefaultOpts = {};
            targetOpts["commonFind"] = _utilsHome.extend(commonOpts, {
              id: targetObj.id + "_commonFind",
              url: "",
              inDS: "dsParam=",
              outDS: ds != null ? ds.id + "=" + ds.id : "",
              arg: "",
              callback: "",
              error: "",
              async: true,
              nDataType: 2,
              timeout: 0,
              changeCheckMsg: "저장하지 않은 변경내용이 있습니다.\n계속 진행하시겠습니까?",
              changeCheck: true,
              findLastRow: false,
              findSavedRow: [],
              paging: "",
              skipRows: 0,
              maxRows: 100,
              noDataMsg: false
            });

            // 추가
            targetOpts["commonAdd"] = _utilsHome.extend(commonOpts, {
              id: targetObj.id + "commonAdd",
              changeCheckMsg: "저장하지 않은 변경내용이 있습니다.\n계속 진행하시겠습니까?",
              changeCheck: true,
              forceFireRPCEvent: true
            });
            // 저장
            targetOpts["commonSave"] = _utilsHome.extend(commonOpts, {
              id: targetObj.id + "_commonSave",
              url: "",
              inDS: ds != null ? ds.id + "=" + ds.id + ":U" : "",
              outDS: "",
              arg: "",
              callback: "",
              error: "",
              async: true,
              timeout: 0,
              nDataType: 2,
              changeCheck: true,
              saveCheck: true,
              saveCheckMsg: "저장하시겠습니까?"
            });
            // 삭제
            targetOpts["commonDelete"] = _utilsHome.extend(commonOpts, {
              id: targetObj.id + "commonDelete",
              deleteCheck: targetObj instanceof nexacro.Grid ? false : true,
              deleteCheckMsg:
                targetObj instanceof nexacro.Grid
                  ? "선택하신 행을 삭제하시겠습니까?"
                  : "삭제하시겠습니까? \n바로 저장됩니다.",
              forceFireRPCEvent: true,
              onceDelete: false
            });
            // 엑셀
            var excelNm = "";
            excelNm = context.MENU_INFO ? context.MENU_INFO.menuNm : "";
            excelNm = excelNm || context.titletext || "excel";
            excelNm = excelNm.replace(/[^a-zA-Z0-9-가-힣 ]/g, "");
            targetOpts["commonExcel"] = _utilsHome.extend(commonOpts, {
              id: targetObj.id + "commonExcel",
              fileNm: excelNm,
              password: false
            });
            // 프린트
            targetOpts["commonPrint"] = _utilsHome.extend(commonOpts, {
              filePath: context.getOwnerFrame().arguments
                ? context.getOwnerFrame().arguments.fileNm
                : "",
              checkSearchParam: true,
              params: ds,
              reportObj: "",
              useGlio: false,
              hideItem: [],
              popupSize: [],
              type: "query"
            });

            // 프린트
            targetOpts["commonMail"] = _utilsHome.extend(commonOpts, {
              id: targetObj.id + "commonMail",
              title: "",
              content: "",
              rcverColInfo: {}
            });

            // 내부적으로 업무흐름에 사용할 값
            targetObj["commonFind"]._changeCheckFlag = true; // 폼 저장후 재조회의 경우 체인지 체크 하지 않도록 하는 플래그
            targetObj["commonFind"]._pagingSettingFlag = false; // 페이징 이벤트 셋팅을 했는지 체크하는 플래그
            targetObj["commonFind"]._pagingFirstPage = true; // 페이징 첫번째로 이동 플래그
            targetObj["commonFind"]._findLastRow = -1; // 조회전 최종 선택 로우 포지션
            targetObj["commonSave"]._saveCheckFlag = true; // 폼 삭제시 저장 메시지 나오지 않게 하는 플래그
            targetObj["commonSave"]._findLastRowData = []; // 최종선택 데이터를 찾아가기 위한 복사된 데이터
            targetObj["commonSave"]._findLastRowChkYn = false; // 최종선택 데이터의 첫번째 컬럼이 의미없는 체크 데이터 인지 여부
            targetObj["commonSave"]._findLastRowOrgEvent = true; // 최종선택 데이터의 이벤트 관리 원본값
            targetObj["commonSave"]._findLastRowRange = []; // 최종선택 데이터의 우선 검색범위
            targetObj["commonSave"]._findLastRowIng = false; // 최종선택 데이터 찾기를 실행했는지 여부
            targetObj["commonDelete"]._rowCntChangeYn = false; // 최근에 삭제동작에 카운트가 변경됐는지 여부
            targetObj["commonAdd"]._preRowPos = -1; // 추가 하기전 행의 위치
            return targetObj;
          },
          /**
           * 공통버튼의 기능할당
           */
          extendCommonBtnFunc: function (targetObj) {
            var commonBtnArr = [
              "commonFind",
              "commonAdd",
              "commonSave",
              "commonDelete",
              "commonExcel",
              "commonPrint",
              "commonMail"
            ];
            for (var i = 0; i < commonBtnArr.length; i++) {
              targetObj[commonBtnArr[i]]._thisFuncKey = commonBtnArr[i];
              targetObj[commonBtnArr[i]]["getOpts"] = function (key) {
                return getOpts.call(this, key, targetObj);
              };
              targetObj[commonBtnArr[i]]["setOpts"] = function (key, value) {
                return setOpts.call(this, key, value, targetObj);
              };
            }
            /**
             * 옵션정보를 보여준다. 개발자도구용;
             */
            function getOpts(key, targetObj) {
              var buttonFunc = this,
                returnObj;
              returnObj =
                _utilsHome.extend({}, targetObj._commonBtnDefaultOpts[buttonFunc._thisFuncKey]) ||
                {};
              return key === undefined ? returnObj : returnObj[key];
            }
            /**
             * 옵션을 수정한다.
             *
             * @param 첫번째
             *            key 또는 key-value 쌍의 object
             * @param 두번째
             *            arg0이 string일 경우 arg1은 셋팅할 값이 된다.
             */
            function setOpts() {
              _innerUtils.performLog("옵션 셋팅 : " + arguments[2].id + "_" + this._thisFuncKey);
              var buttonFunc = this,
                keyEnableFlag = true,
                disableKey = "",
                targetObj = arguments[2];

              if (_innerUtils.isJsonObject(arguments[0])) {
                var objkey,
                  opts = arguments[0];
                if (keyEnableFlag) {
                  for (objKey in opts) {
                    if (!(objKey in targetObj._commonBtnDefaultOpts[buttonFunc._thisFuncKey])) {
                      keyEnableFlag = false;
                      disableKey = objKey;
                      break;
                    }
                  }
                  var changedOpts = _utilsHome.extend(
                    targetObj._commonBtnDefaultOpts[buttonFunc._thisFuncKey],
                    opts
                  );
                  if (
                    keyEnableFlag &&
                    _innerUtils.validateOption(changedOpts, buttonFunc._thisFuncKey)
                  ) {
                    targetObj._commonBtnDefaultOpts[buttonFunc._thisFuncKey] = changedOpts;
                  }
                }
              } else {
                var key = arguments[0],
                  value = arguments[1];
                if (key in targetObj._commonBtnDefaultOpts[buttonFunc._thisFuncKey]) {
                  var _arg = {};
                  _arg[key] = value;
                  _innerUtils.validateOption(_arg, buttonFunc._thisFuncKey, [key]);
                  targetObj._commonBtnDefaultOpts[buttonFunc._thisFuncKey][key] = value;
                } else {
                  keyEnableFlag = false;
                  disableKey = key;
                }
              }
              if (!keyEnableFlag) {
                _utilsHome.error("setOpts : 없는 설정정보 또는 오타입니다. : " + disableKey);
              }
              return targetObj;
            }
          },
          /**
           * commonXXXX 기능 옵션 필수값 체크
           */
          validateOption: function ($checkArg, key, extRequired) {
            var requiredInfo = {
                commonFind: ["url", "outDS"],
                commonAdd: [],
                commonSave: ["url", "inDS"],
                commonDelete: [],
                commonExcel: ["fileNm"],
                commonPrint: ["filePath"],
                commonMail: []
              },
              required = extRequired || requiredInfo[key];
            var typeInfo = {
                commonFind: [
                  "id@string",
                  "url@string",
                  "arg@string, json",
                  "inDS@string, json",
                  "outDS@string json",
                  "async@boolean",
                  "nDataType@number",
                  "pre@string, function",
                  "user@string, function",
                  "post@string, function",
                  "changeCheck@boolean",
                  "changeCheckMsg@string",
                  "findSavedRow@array",
                  "findLastRow@boolean, number, json",
                  "timeout@number",
                  "noDataMsg@string, boolean"
                ],
                commonAdd: [
                  "changeCheck@boolean",
                  "changeCheckMsg@string",
                  "forceFireRPCEvent@boolean"
                ],
                commonSave: [
                  "id@string",
                  "url@string",
                  "arg@string, json",
                  "inDS@string, json",
                  "outDS@string json",
                  "async@boolean",
                  "nDataType@number",
                  "pre@string, function",
                  "user@string, function",
                  "post@string, function",
                  "changeCheck@boolean",
                  "saveCheck@boolean",
                  "saveCheckMsg@string",
                  "timeout@number"
                ],
                commonDelete: [
                  "deleteCheck@boolean",
                  "deleteCheckMsg@string",
                  "forceFireRPCEvent@boolean",
                  "onceDelete@boolean"
                ],
                commonExcel: ["fileNm@string", "password@boolean"],
                commonPrint: [
                  "filePath@string",
                  "params@dataset, json",
                  "useGlio@boolean",
                  "hideItem@array",
                  "popupSize@array",
                  "checkSearchParam@boolean"
                ],
                commonMail: ["rcverColInfo@json", "content@string", "title@string"]
              },
              type = typeInfo[key];
            // 별도 셋팅일 경우 값 유효성 체크 안
            var valuePass = extRequired ? true : false;
            var checkArg = $checkArg._commonBtnDefaultOpts
              ? $checkArg._commonBtnDefaultOpts[key]
              : $checkArg;
            if (typeof checkArg["user"] != "function") {
              _utilsHome.checkArguments(checkArg, required, type, valuePass);
            }
            return true;
          },
          /**
           * 컴포넌트에 맞게 기능을 등록
           */
          extendComponentAll: function () {
            // 공통기능 확장
            extentObj(
              lookForObj(context, {
                target: [],
                commonBtn: [],
                calendar: [],
                checkbox: [],
                webBrowser: [],
                divSearch: [],
                divBinds: [],
                combo: [],
                staLine: [],
                authButton: [],
                all: []
              })
            );
            //form의 기본 설정
            context.set_scrollbarsize("10");

            // 데이터셋 확장
            extendDataSet(context);
            /**
             * 데이터셋 확장
             */
            function extendDataSet(context) {
              _innerUtils.performLog("데이터셋 기능확장 시작");
              var dataSets = context.objects,
                i = 0;
              for (; i < dataSets.length; i++) {
                if (dataSets[i]._commonDataSetExtendFlag !== true) {
                  dataSets[i]._commonDataSetExtendFlag = true;
                  for (var funcNm in dataSetSupportFunc) {
                    dataSets[i][funcNm] = dataSetSupportFunc[funcNm];
                  }
                }
              }
              _innerUtils.performLog("데이터셋 기능확장 완료");
              return dataSets;
            }
            /**
             * 기능 확장할 컴포넌트 찾기
             */
            function lookForObj(obj, returnTarget) {
              var comps = obj.components,
                i = 0;
              if (!comps || !comps.length) return returnTarget;
              for (; i < comps.length; i++) {
                if (application.MULTILANG) {
                  // 다국어 처리를 위한 저장
                  returnTarget.all.push(comps[i]);
                }

                if (
                  comps[i] instanceof nexacro.Div &&
                  comps[i].cssclass in { div_WFSA_Bg: 1, div_WFSA_portal: 1 }
                ) {
                  // 조회영역
                  returnTarget.divSearch.push(comps[i]);
                }
                if (comps[i] instanceof nexacro.Div && comps[i].user_binds == "Y") {
                  // 조회영역
                  returnTarget.divBinds.push(comps[i]);
                }

                if (comps[i] instanceof nexacro.Grid) {
                  // 그리드
                  if (comps[i]._commonGridExtendFlag !== true) {
                    comps[i]._commonGridExtendFlag = true;
                    returnTarget.target.push(comps[i]);
                  }
                } else if (
                  comps[i] instanceof nexacro.Div &&
                  comps[i].url == "COM_DIV::commonGridButton.xfdl"
                ) {
                  var targetNm = comps[i].user_target;
                  if (_utilsHome.isValid(context.objects[targetNm])) {
                    // 데이터셋
                    returnTarget.target.push(context.objects[targetNm]);
                  }
                  // 공통버튼
                  returnTarget.commonBtn.push(comps[i]);
                } else if (comps[i] instanceof Calendar) {
                  // 캘린더
                  returnTarget.calendar.push(comps[i]);
                } else if (comps[i] instanceof CheckBox) {
                  // 캘린더
                  returnTarget.checkbox.push(comps[i]);
                } else if (comps[i] instanceof WebBrowser) {
                  // 웹모듈
                  returnTarget.webBrowser.push(comps[i]);
                } else if (comps[i] instanceof Combo) {
                  // 콤보
                  returnTarget.combo.push(comps[i]);
                } else if (comps[i] instanceof Button && comps[i].user_auth) {
                  // 권한버튼
                  returnTarget.authButton.push(comps[i]);
                } else if (comps[i] instanceof nexacro.Tab && !_utilsHome.isValid(comps[i].url)) {
                  // 탭
                  for (var j = 0; j < comps[i].tabpages.length; j++) {
                    arguments.callee(comps[i].tabpages[j].form, returnTarget);
                  }
                } else if (
                  (comps[i] instanceof nexacro.Div || comps[i] instanceof nexacro.PopupDiv) &&
                  !_utilsHome.isValid(comps[i].url)
                ) {
                  // Div
                  if (comps[i].form) {
                    arguments.callee(comps[i].form, returnTarget);
                  } else {
                    arguments.callee(comps[i], returnTarget);
                  }
                }
              }
              return returnTarget;
            }
            /**
             * 기능 확장
             */
            function extentObj($targetObjs) {
              _innerUtils.performLog("기능확장 시작");
              var targetObjs, i, j, k, l, m, n;
              context["_common_targets"] = targetObjs = {};
              context["_common_webBrowser"] = {};
              context["_common_binds"] = [];
              context["_common_combo"] = $targetObjs.combo;
              context["_common_allTargets"] = $targetObjs;

              // 그리드와 target으로 잡힌 데이터셋
              for (i = 0, j = $targetObjs.target.length; i < j; i++) {
                _innerUtils.performLog($targetObjs.target[i].id);
                // 공통 commonXXX메소드 할당
                for (var funcNm in btnSupportFunc) {
                  $targetObjs.target[i][funcNm] = btnSupportFunc[funcNm]();
                }
                // 각각 버튼옵션 할당
                _innerUtils.extendCommonBtnOpts($targetObjs.target[i]);
                // 공통버튼에 메소드 할당 setOpts, getOpts
                _innerUtils.extendCommonBtnFunc($targetObjs.target[i]);
                // context영역에 타겟 오브젝트 할당
                targetObjs[$targetObjs.target[i].id] = $targetObjs.target[i];
                // 그리드
                if ($targetObjs.target[i] instanceof Grid) {
                  for (var funcNm in gridSupportFunc) {
                    $targetObjs.target[i][funcNm] = gridSupportFunc[funcNm];
                  }
                  _innerUtils.setGridEvent.call($targetObjs.target[i]);
                }
              }
              // 캘린더
              for (i = 0, j = $targetObjs.calendar.length; i < j; i++) {
                _innerUtils.setCalendarEvent.call($targetObjs.calendar[i]);
              }

              //체크박스
              for (i = 0, j = $targetObjs.checkbox.length; i < j; i++) {
                $targetObjs.checkbox[i].set_falsevalue("0");
                $targetObjs.checkbox[i].set_truevalue("1");
              }

              // 콤보
              for (i = 0, j = $targetObjs.combo.length; i < j; i++) {
                if ($targetObjs.combo[i].displayrowcount < 0) {
                  $targetObjs.combo[i].set_displayrowcount(10);
                }

                // bind 되어있는 데이터셋에 데이터가 있는 경우 해당 값의 index로 셋팅.
                $targetObjs.combo[i].setDefault = function (idx) {
                  idx = idx ? idx : 0;
                  this.set_index(idx);
                };
              }

              // 권한 버튼
              for (i = 0, j = $targetObjs.authButton.length; i < j; i++) {
                if (!isNaN($targetObjs.authButton[i].user_auth)) {
                  var menuGrade = parseInt($targetObjs.authButton[i].user_auth);
                  if (menuGrade > context.MENU_GRADE) {
                    $targetObjs.authButton[i].set_enable(false);
                  }
                }
              }

              // 브라우저
              for (i = 0, j = $targetObjs.webBrowser.length; i < j; i++) {
                $targetObjs.webBrowser[i].commonPrint = function () {
                  var opts = this.commonPrint.getOpts();
                  // pre 함수 실행, return이 false면 로직수행 종료
                  if (typeof opts.pre == "function" && !opts.pre.call(context)) {
                    return;
                  }
                  //이미지 처리
                  if (opts.filePath.indexOf(".") >= 0) {
                    _utilsHome.callReport.call(this, opts.filePath);
                  } else {
                    // 리포트 실행
                    _utilsHome.callReport.call(this, opts);
                  }

                  // post 함수 실행
                  if (typeof opts.post == "function") {
                    opts.post.call(context);
                  }
                };
                $targetObjs.webBrowser[i].commonPrint.opts = {};
                $targetObjs.webBrowser[i].commonPrint.setOpts = function (opts) {
                  for (var attr in opts) {
                    this.opts[attr] = opts[attr];
                  }
                };
                $targetObjs.webBrowser[i].commonPrint.getOpts = function (key) {
                  if (key) {
                    return this.opts[key];
                  } else {
                    return this.opts;
                  }
                };
                context._common_webBrowser[$targetObjs.webBrowser[i].id] =
                  $targetObjs.webBrowser[i];
              }
              // 공통버튼 div
              _innerUtils.performLog("공통버튼 div");
              for (i = 0, j = $targetObjs.commonBtn.length; i < j; i++) {
                $targetObjs.commonBtn[i].form.fn_setButton(context);
              }

              for (i = 0, j = $targetObjs.divSearch.length; i < j; i++) {
                var edt = [],
                  btnFind = "",
                  btnInit = "";
                m = $targetObjs.divSearch[i].form.components;

                if (m) {
                  for (l = 0; l < m.length; l++) {
                    if ($opts.enterEqualsFind) {
                      // 엔터이벤트
                      if (m[l] instanceof nexacro.Edit) {
                        if (
                          !m[l].getEventHandler("onkeyup", 0) &&
                          !m[l].getEventHandler("onkeydown", 0)
                        ) {
                          edt.push(m[l]);
                        }
                      } else if (
                        m[l] instanceof nexacro.Button &&
                        m[l].cssclass == "btn_WFSA_Search"
                      ) {
                        btnFind = m[l];
                      }
                    }
                  }
                }

                // 조회버튼 클릭 시 조회조건의 파라미터를 쿠키에 저장
                if (btnFind) {
                  // 조회버튼을 맨 앞으로 가져옴
                  btnFind.bringToFront();
                  for (var q = 0; q < edt.length; q++) {
                    edt[q].addEventHandler("onkeyup", function (obj, e) {
                      if (e.keycode == "13") {
                        btnFind.click();
                        return false;
                      }
                      return true;
                    });
                  }
                }
              }
              // 임포트한 화면 바인드 정보 div
              if ($targetObjs.divBinds.length > 0) {
                context._common_binds = $targetObjs.divBinds;
              }

              if (application.MULTILANG) {
                _innerUtils.performLog("다국어 처리 시작");
                context.gfn_setLanguage($targetObjs.all);
                _innerUtils.performLog("다국어 처리 완료");
              }
              _innerUtils.performLog("기능확장 완료");
              return $targetObjs;
            }
          },
          /**
           * 엑션에서 필요한 옵션을 gfn함수 파라미터로 보내기 위해 추출
           */
          getActionParams: function (obj) {
            var arr = obj.argArr,
              i = 0,
              j = arr.length,
              returnArr = [];
            for (; i < j; i++) {
              returnArr.push(obj[arr[i]]);
            }
            return returnArr;
          },
          /**
           * obj to array
           */
          convertObjToArray: function (obj) {
            var returnArr = [],
              key;
            for (key in obj) {
              if (obj.hasOwnProperty(key)) {
                returnArr.push(obj[key]);
              }
            }
            return returnArr;
          },
          /**
           * list to array
           */
          convertListToArray: function (obj) {
            var returnArr = [],
              i = 0;
            for (; i < obj.length; i++) {
              returnArr.push(obj[i]);
            }
            return returnArr;
          },
          /**
           * array to List
           */
          convertArrayToList: function (arr) {
            var returnObj = {},
              i = 0;
            for (; i < arr.length; i++) {
              returnObj[i] = arr[i];
            }
            returnObj["length"] = arr.length;
            return returnObj;
          },
          /**
           * 파라미터를 유효한 데이터로 바꿔서 리턴한다.
           *
           * @param orgParam
           *            변경할 파라미터
           * @return 유효한 파라미터
           */
          convertParamsToAvailableParams: function (orgParam) {
            var stringParam = "",
              returnVal = null;
            if (orgParam && typeof orgParam == "object") {
              for (var key in orgParam) {
                if (Object.prototype[key] === undefined) {
                  stringParam += key + "=" + orgParam[key] + " ";
                }
              }
              returnVal = stringParam.trim();
            } else {
              returnVal = orgParam;
            }
            return returnVal;
          },
          /**
           * 호출할 버튼 만들어서 리턴
           */
          getCommonBtn: function (obj, target) {
            var _action = obj.id.split("_")[1],
              action = _action.substr(0, 1).toUpperCase() + _action.substr(1);
            return target["common" + action];
          },
          /**
           * 공통버튼 기능을 바로 호출 했을 경우 pre메소드 호출 여부와 callback메소드 제어
           *
           * @param targetObj
           *            타겟 그리드
           * @param argObj
           *            호출한 함수의arguments
           * @param transactionFlag
           *            서버통신이 이루어지는 여부
           */
          commonBtnDirectControl: function (
            targetObj,
            argObj,
            transactionFlag,
            action,
            context,
            _innerUtils,
            _utils,
            commonPre,
            commonCallback
          ) {
            var key = argObj.callee._thisFuncKey;
            var returnVal = true,
              preReturn = true;
            var activeSetOptsFlag = typeof argObj[0] == "boolean" ? false : true;
            var roundCall = argObj[0] === false ? false : true;
            var postFlag = _utilsHome.isValid(targetObj[key].getOpts("post"));
            var ds = targetObj instanceof nexacro.Grid ? targetObj.getBindDataset() : targetObj;
            if (!_utilsHome.isValid(ds)) {
              _utilsHome.error("처리할 데이터셋 정보가 없습니다." + targetObj.id);
            }
            // 동적 setOpts 처리
            if (activeSetOptsFlag && argObj.length > 0) {
              targetObj[key].setOpts.apply(targetObj[key], argObj);
            }
            // post 처리
            var callbackFuncNm = "_commonCallbackFunc_btn_" + targetObj.id + "_" + key;
            var systemCallbackFuncNm = callbackFuncNm + "_system";
            if (transactionFlag) {
              if (typeof targetObj[key].getOpts("post") == "function") {
                context[callbackFuncNm] = targetObj._commonBtnDefaultOpts[key]["post"];
                targetObj._commonBtnDefaultOpts[key]["post"] = callbackFuncNm;
              }
            }
            // systemPost 처리
            if (_utilsHome.isValid(commonCallback) && !(systemCallbackFuncNm in context)) {
              context[systemCallbackFuncNm] = function (strSvcId, nErrorCode, strErrorMsg) {
                commonCallback.call(context, targetObj, context[callbackFuncNm], [
                  targetObj,
                  strSvcId,
                  nErrorCode,
                  strErrorMsg
                ]);
              };
            }
            // callback 처리
            if (transactionFlag) {
              var callbackNm = callbackFuncNm;
              if (!roundCall) {
                callbackNm = "";
              } else if (systemCallbackFuncNm in context) {
                callbackNm = systemCallbackFuncNm;
              }
              targetObj._commonBtnDefaultOpts[key]["callback"] = callbackNm;
            }
            // user 있을경우 user만 호출
            if (typeof targetObj[key].getOpts("user") == "function") {
              _innerUtils.performLog("user 호출(설정한 pre, post함수는 무시됩니다.)");
              if (key == "commonSave") {
                targetObj.commonFind._changeCheckFlag = false;
              }
              returnVal = targetObj._commonBtnDefaultOpts[key]["user"].call(context, targetObj);
            } else {
              // system commonPre 동작
              if (roundCall && typeof commonPre == "function") {
                commonPre(targetObj, ds);
              }
              // pre 동작
              if (roundCall && typeof targetObj[key].getOpts("pre") == "function") {
                _innerUtils.performLog("pre 호출");
                preReturn = targetObj._commonBtnDefaultOpts[key]["pre"].call(context, targetObj);
              }
              // 본동작 실행
              if (preReturn !== false) {
                returnVal = action.call(context, targetObj, key);
              }
              // 서버통신이 없을경우 post 동작 (추가,삭제,프린트)
              if (!transactionFlag && roundCall && preReturn !== false && returnVal !== false) {
                if (_utilsHome.isValid(commonCallback)) {
                  commonCallback.call(context, targetObj, ds, returnVal);
                }
                if (postFlag) {
                  _innerUtils.performLog("post 호출");
                  targetObj._commonBtnDefaultOpts[key]["post"].call(
                    context,
                    targetObj,
                    ds,
                    returnVal
                  );
                }
              }
            }
            return returnVal;
          },
          /**
           * 타라이브러리 확장
           */
          extendUtils: function () {
            extend("listAlways");
            var extendArr = extend("list");
            _innerUtils.performLog(
              "라이브러리 확장 : " + extendArr.join(","),
              extendArr.length > 0
            );
            /**
             * 확장기능
             */
            function extend(listNm) {
              var i,
                j,
                utils,
                list,
                target,
                extendArr = [];
              for (
                i = 0, utils = context._commonExtendUtils, list = utils[listNm], j = list.length;
                i < j;
                i++
              ) {
                target = utils[list[i]];
                if (typeof target == "function") {
                  extendArr.push(list[i]);
                  context[list[i]] = target.call(context);
                }
              }
              return extendArr;
            }
          },
          /**
           * 라이브러리 동작로그
           */
          group: function (msg, flag, $arg) {
            if (devFlag && false) {
              msg = msg || "";
              var group = console.group ? (flag ? "groupCollapsed" : "groupEnd") : "log";
              $arg == undefined
                ? console[group]("##########" + msg)
                : console[group]("##########" + msg, $arg);
            }
          },
          /**
           * 라이브러리 동작로그
           */
          performLog: function (msg, flag, $arg) {
            if (devFlag && flag !== false) {
              msg = msg || "";
              var debug = console.debug ? "debug" : "log";
              !$arg ? console[debug]("##########" + msg) : console[debug]("##########" + msg, $arg);
            }
          },
          /**
           * 브라우저에 부족한 기능이 있으면 체운다.
           */
          polyfill: function () {
            if (application._commonPolyfillFlag == undefined) {
              if (!Array.isArray) {
                Array.isArray = function (arg) {
                  return Object.prototype.toString.call(arg) === "[object Array]";
                };
              }
              if (!JSON) {
                JSON = {
                  parse: function (v) {
                    return eval("(" + v + ")");
                  },
                  stringify: (function () {
                    var r = /["]/g,
                      f = function (o) {
                        // "
                        var t0, i, j;
                        switch ((t0 = typeof o)) {
                          case "string":
                            return '"' + o.replace(r, '\\"') + '"';
                          case "number":
                          case "boolean":
                            return o.toString();
                          case "undefined":
                            return t0;
                          case "object":
                            if (!o) return "null";
                            t0 = "";
                            if (o.splice) {
                              for (i = 0, j = o.length; i < j; i++) t0 += "," + f(o[i]);
                              return "[" + t0.substr(1) + "]";
                            } else {
                              for (i in o)
                                if (
                                  o.hasOwnProperty(i) &&
                                  o[i] !== undefined &&
                                  typeof o[i] != "function"
                                )
                                  t0 += ',"' + i + '":' + f(o[i]);
                              return "{" + t0.substr(1) + "}";
                            }
                        }
                      };
                    return f;
                  })()
                };
              }
              if (!document.addEventListener) {
                document.addEventListener = document.attachEvent;
              }
            }
            if (!String.prototype.endsWith) {
              String.prototype.endsWith = function (searchString, position) {
                var subjectString = this.toString();
                if (
                  typeof position !== "number" ||
                  !isFinite(position) ||
                  Math.floor(position) !== position ||
                  position > subjectString.length
                ) {
                  position = subjectString.length;
                }
                position -= searchString.length;
                var lastIndex = subjectString.indexOf(searchString, position);
                return lastIndex !== -1 && lastIndex === position;
              };
            }
            application._commonPolyfillFlag = true;
          },
          /**
           * 이벤트의 keycode를 문자와 매칭된 정보를 contex에 할당
           */
          keyCodeSet: function () {
            if (!_utilsHome.isValid(context["keycode"])) {
              var key =
                "a,65,b,66,c,67,d,68,e,69,f,70,g,71,h,72,i,73,j,74,k,75,l,76,m,77,n,78,o,79,p,80,q,81,r,82,s,83,t,84,u,85,v,86,w,87,x,88,y,88,z,90,back,8,tab,9,enter,13,shift,16,ctrt,17,ctrl,17,alt,18,pause,19,caps,20,esc,27,space,32,pageup,33,pagedown,34,end,35,home,36,left,37,up,38,right,39,down,40,insert,45,del,46,numlock,144,scrolllock,145,0,48,1,49,2,50,3,51,4,52,5,53,6,54,7,55,8,56,9,57".split(
                  ","
                );
              var keyObj = {},
                i = 0,
                j = key.length;
              for (; i < j; i++) {
                keyObj[key[i]] = key[++i];
              }
              // 입력이 아닌 키
              keyObj.notInput = {};
              "9 16 17 18 19 20 21 25 27 33 34 35 36 37 38 39 40 144 154 112 113 114 115 116 117 118 119 120 121 122 123"
                .split(" ")
                .forEach(function (key) {
                  keyObj.notInput[key] = 1;
                });

              // 입력이 아닌 키를 체크한다.
              keyObj.checkInput = function (e) {
                if (e.keycode in this.notInput) return true;

                // ctrl + c(67) 인 경우
                if (e.ctrlkey) return true;
                return false;
              };
            }
            return keyObj;
          },
          /**
           * libComm을 실행한 프레임에 따라서 해야할 일을 한다.
           */
          checkFrame: function () {
            // 메뉴 권한 할당
            context.MENU_GRADE = context.getOwnerFrame().form.MENU_GRADE;
            /*
             * 팝업일 경우 작동
             */
            if (_popup.isPopup()) {
              // 팝업일 경우 파라미터 설정
              _popup.params = _utilsHome.popupParam("_commonPopupParams") || {};
              _innerUtils.performLog("팝업!! 부모창에서 전달받은 파라미터", true, _popup.params);

              var popOpts = _utilsHome.popupParam("_commonPopupOpts");
              var addWidth = 50,
                addHeight = 50;
              if (_utilsHome.isValid(popOpts)) {
                /*
                            // 팝업인데 윈도우팝업이고 resize true일 경우 창크기 리사이즈
                            if (popOpts.resize && String.prototype.toLocaleLowerCase.call(popOpts.mode) == "w") {
                                window.resizeTo(context._default_layout.width + addWidth, context._default_layout.height + addHeight)
                            }
                            */
                // baseCond 처리
                if (_utilsHome.isValid(popOpts.baseCond)) {
                  _innerUtils.setRowData(context.dsParam, popOpts.baseCond, 0);
                  _utilsHome.extend(_popup.params, popOpts.baseCond, false, true);
                }
              }
              // 팝업 레이아웃 처리
              /*
                        if (context.getOwnerFrame().arguments.naturalSize) {
                            window.resizeTo(context._default_layout.width + 30, context._default_layout.height + 150);
                        } else if (_popup.isPopup() && context.parent.fvPopupGb == "MODELESS") {
                            context.getOwnerFrame().arguments["base_width"] = context._default_layout.width;
                            context.getOwnerFrame().arguments["base_height"] = context._default_layout.height;
                        }
                        */
            } else {
              if (application.pageZoom && application.pageZoom != 100) {
                context.getOwnerFrame().form.setZoom(application.pageZoom);
              }
            }
          },
          /**
           * 파라미터로 넘어온 데이터가 JSON형태의 object인지 판단한다.
           *
           * @param obj
           *            판단해야할 오브젝트
           */
          isJsonObject: function (obj) {
            return obj != null && typeof obj == "object" && !Array.isArray(obj);
          },
          /**
           * json데이터를 ds에 바로 셋팅한다.
           *
           * @param ds
           *            데이터셋
           * @param obj
           *            데이터셋에 셋팅할 json 데이터
           * @param idx
           *            인덱스
           * @param addColumn
           *            컬럼을 추가 할지 여부
           */
          setRowData: function (ds, obj, idx, addColumn) {
            if (_utilsHome.isValid(ds)) {
              idx = idx || 0;
              for (key in obj) {
                if (addColumn) {
                  ds.addColumn(key);
                  if (ds.getRowCount() == 0) {
                    ds.addRow();
                  }
                }
                ds.setColumn(idx, key, obj[key]);
              }
            }
          },
          /**
           * 공통 라이브러리가 로드되어 화면이 완성된 후 실행
           */
          commonOnload: function () {
            // 메뉴정보 할당
            var parentFrame = context.getOwnerFrame();
            context.MENU_INFO = parentFrame.arguments;

            // indie 프레임 설정
            if (typeof parentFrame.afterOnload == "object") {
              parentFrame.afterOnload.resolve({
                parent: parentFrame,
                child: context
              });
            }

            // 팝업 다이렉트 셀렉트 다건일 경우 처리
            if (_popup.isPopup()) {
              var data = _utilsHome.popupParam("_commonPopupDirectFindData"),
                cond = _utilsHome.popupParam("_commonPopupDirectFindCond");
              if (_utilsHome.isValid(data) && _utilsHome.isValid(cond)) {
                if (_utilsHome.popupParam("_commonPopupOpts").onceSetDsParam) {
                  _innerUtils.setRowData(context.dsParam, cond, 0);
                }
                if (data.getRowCount() > 0) {
                  context[_utilsHome.popupParam("_commonPopupOpts").onceDataSetNm].copyData(data);
                }
              }
              // 스크롤 나오도록 수정
              document.getElementById(parentFrame._unique_id).parentNode.style.overflow = "auto";
            }
            // 팝업이 아닌 경우만 동작
            if (
              !_popup.isPopup() &&
              !application.unCommonLoad &&
              !(context instanceof nexacro.Tabpage)
            ) {
              /*
                        context._common_DS_PERINFO_MENU = new nexacro.Dataset("_common_DS_PERINFO_MENU");
                        parentFrame.form.set_visible(false);
                        _utilsHome.transaction({
                            url : "com/MenuCtr/findPerinfoMenu.do",
                            outDS : "_common_DS_PERINFO_MENU=DS_PERINFO_MENU",
                            callback : function() {
                                if(this._common_DS_PERINFO_MENU.getColumn(0, "perinfoUseYn") == 1) {
                                    if(!_utilsHome.isValid(parentFrame.form.lgin0100_pop03)) {
                                        parentFrame.form.popup.make({
                                            id : "lgin0100_pop03"
                                            ,url : "COM_POPUP::lgin0100_pop03.xfdl"
                                            ,title : "개인정보 추가인증"
                                            ,width : 352
                                            ,height : 97
                                            ,useX: false
                                            ,callback : function(sid,sdata) {
                                                if(_utilsHome.isValid(sdata.gbn)) {
                                                    if(sdata.gbn == 1) {
                                                        parentFrame.form.set_visible(true);
                                                    } else if(sdata.gbn == 2) {
                                                        // 메인화면에 열려있던 팝업이 있다면 전부 close
                                                        try {
                                                            for (var i=0; i < application.popupframes.length; i++){
                                                                application.popupframes[i].form.popup.close();
                                                            }
                                                        }catch(e) {}
                                                        _utilsHome.closeMainTabMenu();
                                                    }
                                                }
                                            }
                                        });
                                    }
                                    parentFrame.form.popup.lgin0100_pop03.open({});
                                } else {
                                    parentFrame.form.set_visible(true);
                                }
                            }
                        });
                        */
            }
          },
          /**
           * 캘린더 이벤트 셋팅
           */
          setCalendarEvent: function () {
            // 휴일 관련 Inner dataset 적용
            _innerUtils.performLog(this.name + " 캘린더 이벤트 셋팅");
            this.set_innerdataset("gds_holiday"); // inner dataset
            this.set_datecolumn("hldyDt"); // date column
            this.set_textcolorcolumn("textColor"); // text Color - 휴일 #fa434bff
          },
          /**
           * 그리드 이벤트
           */
          setGridEvent: function () {
            var grid = this,
              ds = grid.getBindDataset();
            grid.set_nodatatext("");
            if (
              (grid.getBindCellIndex("body", "chk") > -1 ||
                (grid.treeusecheckbox &&
                  grid.getCellProperty("body", "0", "displaytype") == "tree")) &&
              _utilsHome.isValid(ds)
            ) {
              // update 로 변경 방지 위한 이벤트
              ds.addEventHandler(
                "cancolumnchange",
                context.gfn_gridBindDs_cancolumnchange,
                context
              );
              ds.addEventHandler(
                "oncolumnchanged",
                context.gfn_gridBindDs_oncolumnchanged,
                context
              );
            }
            // 헤더 클릭 이벤트 발생 keystring 가 설정 되어 있는 경우 발생 시키지 않음
            if (_utilsHome.isValid(ds)) {
              ds.gridObject = grid;
              if (!_utilsHome.isValid(ds.keystring) && grid.user_autoSort != "N") {
                grid.user_sort = "Y"; // 공통 버튼 소트 처리 함
              }
            }
            if (grid.user_autoSort != "N") {
              grid.addEventHandler("onheadclick", context.gfn_grid_onheadclick, context);
            }

            //그리드 콤보, 캘린더 한번에 펼치도록
            grid.addEventHandler(
              "oncellclick",
              function (obj, e) {
                if (grid.getCurEditType() == "combo") {
                  grid.dropdownCombo();
                } else if (grid.getCurEditType() == "date") {
                  grid.dropdownCalendar();
                }

                // 멀티체크 처리(shift key 클릭 후 체크)
                if (grid.user_multicheck != "N") {
                  if (
                    e.cell == grid.getBindCellIndex("body", "chk") &&
                    e.shiftkey &&
                    ds.getColumn(e.row, "chk") == "1"
                  ) {
                    if (e.row > e.oldrow) {
                      for (var i = e.oldrow; i <= e.row; i++) {
                        var editType = grid._getBodyCellInfo(e.cell)._getEdittype(i);
                        if (editType == "checkbox") {
                          ds.setColumn(i, "chk", 1);
                        }
                      }
                    } else if (e.row < e.oldrow) {
                      for (var i = e.oldrow; i >= e.row; i--) {
                        var editType = grid._getBodyCellInfo(e.cell)._getEdittype(i);
                        if (editType == "checkbox") {
                          ds.setColumn(i, "chk", 1);
                        }
                      }
                    }
                  }
                }
              },
              context
            );

            // 콤보, 캘린더 선택 시 데이터셋 바로 반영
            grid.addEventHandler(
              "oncloseup",
              function (obj, e) {
                obj.updateToDataset();
              },
              context
            );
          }
        };
        /*
         * 공통에서만 쓰지만 외부에 노출해야 하는 기능
         */
        _globalUtils = {
          /**
           * 메시지 다국어 처리
           */
          multiLang: function (msg) {
            if (application.locale != "ko") {
              var ds = context.getOwnerFrame().form.ds_multiLangData;
              if (!_utilsHome.isValid(ds)) {
                return msg;
              }
              var key = msg.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/g, "");
              var _msg = ds.getColumn(ds.findRow("msgId", key), "msgVal");
              if (_utilsHome.isValid(_msg)) {
                msg = _msg;
              } else if (application.gv_topFrame) {
                _msg = application.gv_topFrame.form.ds_multiLangData.lookup("msgId", key, "msgVal");
                msg = _utilsHome.isValid(_msg) ? _msg : msg;
              } else if (application._multiLangEnrollTerm && application.locale != "ko") {
                context.gfn_enrollMultiLang.call(context, msg);
              }
            }
            return msg;
          },
          /**
           * 공통버튼에서 호출
           *
           * @param button
           *            버튼정보
           * @param event
           *            이벤트 정보
           */
          commonBtnAction: function (button, event) {
            if (typeof button.parent.parent.user_target != "string") {
              _utilsHome.error("공통버튼 : target 정보가 없습니다.");
            }
            var returnVal = null,
              arrArr,
              funcNmArr,
              i = 0;
            var targetNm = button.parent.parent.user_target,
              target = context._common_targets[targetNm];

            if (target) {
              var ds = target.getBindDataset ? target.getBindDataset() : target;
              if (_utilsHome.isValid(ds)) {
                _innerUtils.performLog("공통버튼 호출" + targetNm);
                argArr = Array.prototype.slice.call(arguments, 0);
                argArr.unshift(true);
                console.log(arguments, argArr);
                funcNmArr = _innerUtils.getCommonBtn(button, target);
                funcNmArr.apply(target, argArr);
              } else {
                _utilsHome.error("공통버튼 : 컨트롤 할 수 있는 데이터셋이 없습니다.");
              }
            } else {
              if (
                button.id == "btn_print" &&
                _utilsHome.isValid(context._common_webBrowser) &&
                _utilsHome.isValid(context._common_webBrowser[targetNm])
              ) {
                var report = context._common_webBrowser[targetNm];
                report.commonPrint();
              }
            }
          }
        };

        /**
         * 폼 기본 설정 옵션
         */
        if ($opts !== undefined) {
          $opts = _utilsHome.extend(_defaultFormOption, $opts, false, false);
        } else {
          $opts = _defaultFormOption;
        }
        /**
         * 시스템 기본 로드
         */
        function defaultLoad() {
          // 에러팝업 생성
          context.popup.make({
            id: "error",
            url: "COM_POPUP::commonErrorMsgPop.xfdl",
            title: "오류 메시지",
            width: 500,
            height: 300
          });
          // 메시지팝업 생성
          context.popup.make({
            id: "msg",
            url: "COM_POPUP::commonMsgPop.xfdl",
            title: "안내 메시지",
            width: 433,
            height: 227
          });
          context.popup.make({
            id: "webViewer",
            url: "COM_POPUP::htmlViewer_pop.xfdl",
            title: "Viewer",
            width: 800,
            height: 600
          });
          // 레포트 이미지 팝업 생성
          context.popup.make({
            id: "reportImg",
            url: "COM_POPUP::reportImgPop.xfdl",
            title: "레포트",
            width: 433,
            height: 227
          });
          // 공통 콜백 메소드 생성
          context._commTransactionCallback = function (strSvcId, nErrorCode, strErrorMsg) {
            var strArrSvcID = strSvcId.split("|"),
              serviceID = strArrSvcID[0],
              _callbackFunc = strArrSvcID[1];
            var context = this;
            // 타임아웃 설정했을시 복원
            if (
              this._commonBaseTimeout &&
              nexacro.getEnvironment().httptimeout != context._commonBaseTimeout
            ) {
              nexacro.getEnvironment().set_httptimeout(context._commonBaseTimeout);
            }
            if (nErrorCode < 0) {
              if (nErrorCode == -600) {
                // 세션 값 없음 (로그인 안되어 있음)
                if (application.G_USER_NM != "") {
                  //application.gv_loginFrame.form.againLogin();
                  this.alert("세션정보가 없습니다.");
                }
              } else {
                if (nErrorCode == -2) {
                  strErrorMsg = "해당문제는 파악중입니다.";
                } else if (nErrorCode == -3) {
                  // 요청 URL에 대한 접근 권한 없음
                  strErrorMsg = "권한이 없습니다.";
                } else if (nErrorCode == -5) {
                  // 프로그램 요청url이 등록되지 않음
                  strErrorMsg = "승인되지 않은 요청입니다.";
                } else if (nErrorCode == -6) {
                  location.href = location.href.replace("http", "https").replace("8881", "8445");
                } else if (strErrorMsg == "FAILED") {
                  strErrorMsg = "요청중 문제가 발생하였습니다.";
                }
                context.setWaitCursor(false, true);
                if (
                  nErrorCode < -1000 &&
                  typeof context["_common_" + serviceID + "_error"] == "function"
                ) {
                  // 유저가 에러를 처리하도록 함
                  context["_common_" + serviceID + "_error"].call(
                    context,
                    serviceID,
                    nErrorCode,
                    strErrorMsg
                  );
                } else {
                  function showError(id, msg, nErrorCode) {
                    if (typeof this._commonErrorCallback === "function") {
                      // 서버에러 방어코드
                      context._commonErrorCallback();
                    }
                    var menuNm = "",
                      menuId = "";
                    try {
                      menuNm = context.getOwnerFrame().form.stc_title.text;
                      menuId = context.getOwnerFrame().arguments["menuId"];
                    } catch (e) {}

                    if (id == "isLogin" || id == "findMesgList") {
                      msg = "서버 환경 체크 중입니다. \n잠시후 이용해주세요.";
                    }

                    if (context.popup) {
                      if (msg.indexOf("JDBC-10007") >= 0) {
                        context.popup.msg.open({
                          msg: "입력하신 정보가 이미 존재하여 저장할 수 없습니다."
                        });
                      } else if (msg.indexOf("JDBC-10005") >= 0) {
                        context.popup.msg.open({
                          msg: "필수 정보가 입력되지않아 저장할 수 없습니다."
                        });
                      } else {
                        context.popup.error.open({
                          id: id,
                          menuNm: menuNm,
                          menuId: menuId,
                          errorMsg: msg,
                          errorCode: nErrorCode
                        });
                      }
                    } else {
                      alert(msg);
                    }
                  }
                  showError.call(context, serviceID, strErrorMsg, nErrorCode);
                }
              }
            } else {
              if (typeof context[_callbackFunc] == "function") {
                context[_callbackFunc].call(context, serviceID, nErrorCode, strErrorMsg);
              }
            }
          };
          // 기능 셋팅완료 플래그
          context._libCommDone = true;
        }
        /**
         * 개발모드 일경우 개발자 편의 사항 추가
         */
        function devSupport() {
          if (devFlag /* 개발모드 */) {
            var _name, name;
            if (context.url != undefined) {
              ((_name = context.url.split(".")[0].split("/")), (name = _name[_name.length - 1]));
            } else {
              _name = context.name;
              name = _name.indexOf("form") > -1 ? context.id : _name;
            }
            if (name.indexOf(":") > -1) {
              name = name.substr(name.lastIndexOf(":") + 1);
            }
            if (window["_form"] == undefined) {
              window["_form"] = {};
            }
            if (context instanceof nexacro.Form) {
              window._d = window.asdf = context;
            }
            window["_form"][name] = context;
          }
        }
        // dev 모드 조절
        devFlag = $opts.devFlag ? devFlag : false;
        _innerUtils.group("공통 초기화 " + context.name, true);
        // libcomm 확장 시작
        if ($opts.eachExtend != "") {
          eachExtend.apply(context, initArgs);
        } else {
          init.apply(context, initArgs);
        }
        // 기본 기능 로드
        defaultLoad();
        // 개발 모드 확장
        devSupport();
        _innerUtils.group("공통 초기화 끝", false);
      };
      this._commonExtendUtils = {
        listAlways: ["dateUtils"],
        list: ["commonPopup", "checkUtils", "admUtils", "schUtils", "attUtils", "examUtils"],
        dateUtils: 1,
        commonPopup: 1,
        admUtils: 1,
        schUtils: 1,
        attUtils: 1,
        examUtils: 1,
        checkUtils: 1
      };
    });

    this.loadIncludeScript(path);

    obj = null;
  };
})();
