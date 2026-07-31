//XJS=libSch.xjs
(function () {
  return function (path) {
    var obj;

    // User Script
    this.registerScript(path, function () {
      this._commonExtendUtils.schUtils = function (type) {
        var context = this,
          utils;

        //학사용 공통 함수 정의(A,B,C순으로 작성해주세요. 그래야 향후 유지보수할때 용이합니다.)
        utils = {
          /******************************************************************************
           * 수업/성적용 학적정보조회
           * @param params {
           *           trgetDs      : 결과Dataset(필수)
           *          ,callback     : 콜백함수(선택)
           *        }
           * @returns void
           * @example
           *      this.schUtils.lessnGradeSchrgBassInfo({
           *			 "trgetDs"  : this.test
           *          ,"callback" : function(){
           *              console.log("callback호출");
           *          }
           *		});
           ******************************************************************************/
          lessnGradeSchrgBassInfo: function (params) {
            context.utils.transaction({
              url: "com/scom/ScomcmCtr/findLessnGradeSchrgBassInfo.do",
              inDS: "dsParam=_dsParam:A",
              outDS: params["trgetDs"].id + "=dsSsrm200",
              async: false,
              callback: function () {
                //callbcak처리
                if (!params["callback"]) return;
                if (typeof params["callback"] == "function") {
                  params["callback"].call(context);
                } else {
                  context[params["callback"]].call(context);
                }
              }
            });
          },

          /**
           * 수업교시코드를 로드한다.
           * @param params {
           *           trgetDs      : 결과Dataset(필수)
           *          ,firstRowType : 첫행(N, E:공백, T:전체, S:선택)(선택 deafult:T)
           *          ,dispType     : 표시타입(N:기본, B:코드와 텍스트를 같이 나타냄)(선택 default:N)
           *          ,callback     : 콜백함수(선택)
           *        }
           * @returns void
           * @example
           *      this.schUtils.lessnLestmCdLoad({
           *           "trgetDs"  : this.dslessnLestmCd
           *          ,"firstRowType" : "T"
           *          ,"dispType"  : "B"
           *          ,"callback" : function(){
           *              console.log("callback호출");
           *          }
           *      });
           */
          lessnLestmCdLoad: function (params) {
            //check arguments
            context.utils.checkArguments(params, ["trgetDs"], ["trgetDs@dataset"]);
            //조회조건(DS) 생성
            var _dsParam = new Dataset();
            //컬럼 추가
            _dsParam.addColumn("dispType", "string");
            //행 추가
            _dsParam.addRow();
            //조회조건 셋팅
            _dsParam.setColumn(0, "dispType", params["dispType"] ? params["dispType"] : "N");

            if (context["_dsParam"]) {
              //임시 조회조건 삭제
              context.removeChild("_dsParam");
            }
            //임시 조회조건 추가
            context.addChild("_dsParam", _dsParam);
            //조회
            context.utils.transaction({
              url: "com/scom/ScomcmCtr/findLessnLestmCdList.do",
              inDS: "dsParam=_dsParam:A",
              outDS: params["trgetDs"].id + "=dsSles116",
              async: false,
              callback: function () {
                if (params["firstRowType"]) {
                  if (["N", "E"].indexOf(["firstRowType"]) >= 0) {
                    //첫행 '빈값'추가
                    params["trgetDs"].insertRow(0);
                  } else if (params["firstRowType"] == "T") {
                    //첫행 '전체'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "전체");
                    params["trgetDs"].setColumn(0, "fullNmMark", "선택");
                  } else if (params["firstRowType"] == "S") {
                    //첫행 '선택'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "선택");
                    params["trgetDs"].setColumn(0, "fullNmMark", "선택");
                  }
                }
                //임시 조회조건 삭제
                context.removeChild("_dsParam");
                //callbcak처리
                if (!params["callback"]) return;
                if (typeof params["callback"] == "function") {
                  params["callback"].call(context);
                } else {
                  context[params["callback"]].call(context);
                }
              }
            });
          },

          /**
           * 학기를 로드한다.
           * @param params {
           *           trgetDs      : 결과Dataset(필수)
           *          ,firstRowType : 첫행(N, E:공백, T:전체, S:선택)(선택 deafult:T)
           *          ,dispType     : 표시타입(N:기본, B:명[코드], C:명 코드)(선택 default:N)
           *          ,inqryCnd     : {
           *                               syy : 학년도(필수)
           *                              ,unvfrStdrDeptCd : 학사기준부서코드(필수 default:기준값 반환), 부서코드를 넘기면 학사기준부서로 자동변환한다.
           *                              ,inqryType : 1, 2 조회타입(1:전학기 미포함, 2:전학기 포함)(선택 default : 1)
           *                          }
           *          ,callback     : 콜백함수(선택)
           *        }
           * @returns void
           * @example
           *      this.schUtils.smtCdLoad({
           *           trgetDs  : this.dsSmtCd
           *          ,firstRowType : "X"
           *          ,dispType : "C"
           *          ,inqryCnd : {
           *               syy : syy //학년도(필수)
           *              ,unvfrStdrDeptCd : unvfrStdrDeptCd//학사기준부서코드(필수 default:기준값 반환)
           *              ,inqryType : 1 //1, 2 조회타입(1:전학기 미포함, 2:전학기 포함)(선택 default : 1)
           *          }
           *          ,callback : function(){
           *              //필요에 따라 callback추가.
           *          }
           *      });
           */
          smtCdLoad: function (params) {
            //check arguments
            context.utils.checkArguments(params, ["trgetDs"], ["trgetDs@dataset"]);
            //조회조건(DS) 생성
            var _dsParam = new Dataset();
            //컬럼 추가
            _dsParam.addColumn("dispType", "string");
            _dsParam.addColumn("unvfrStdrDeptCd", "string");
            _dsParam.addColumn("inqryType", "string");
            //행 추가
            _dsParam.addRow();

            //넘어온 인자들
            var keys = Object.keys(params["inqryCnd"]);

            for (var idx in keys) {
              //인자 셋팅
              _dsParam.addColumn(keys[idx], "string");
              _dsParam.setColumn(0, keys[idx], params["inqryCnd"][keys[idx]]);
            }

            //조회조건 셋팅
            _dsParam.setColumn(0, "dispType", params["dispType"] ? params["dispType"] : "N");
            _dsParam.setColumn(
              0,
              "unvfrStdrDeptCd",
              params["inqryCnd"]["unvfrStdrDeptCd"]
                ? params["inqryCnd"]["unvfrStdrDeptCd"]
                : "99999"
            );
            _dsParam.setColumn(
              0,
              "inqryType",
              params["inqryCnd"]["inqryType"] ? params["inqryCnd"]["inqryType"] : "1"
            );

            if (context["_dsParam"]) {
              //임시 조회조건 삭제
              context.removeChild("_dsParam");
            }
            //임시 조회조건 추가
            context.addChild("_dsParam", _dsParam);
            //조회
            context.utils.transaction({
              url: "com/scom/ScomcmCtr/findApplcSmtCdList.do",
              inDS: "dsParam=_dsParam:A",
              outDS: params["trgetDs"].id + "=dsScom201",
              async: false,
              callback: function () {
                if (params["firstRowType"]) {
                  if (["N", "E"].indexOf(["firstRowType"]) >= 0) {
                    //첫행 '빈값'추가
                    params["trgetDs"].insertRow(0);
                  } else if (params["firstRowType"] == "T") {
                    //첫행 '전체'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "전체");
                  } else if (params["firstRowType"] == "S") {
                    //첫행 '선택'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "선택");
                  }
                }
                //임시 조회조건 삭제
                context.removeChild("_dsParam");
                //callbcak처리
                if (!params["callback"]) return;
                if (typeof params["callback"] == "function") {
                  params["callback"].call(context);
                } else {
                  context[params["callback"]].call(context);
                }
              }
            });
          },

          /**
           * 학사부서조회조건생성(popupDiv)
           * @param params {
           *           trget      : edt_xxxx
           *          ,callback   : 콜백함수(필수)
           *        }
           * @returns void
           * @example
           *      this.schUtils.unvfrDeptInqryCndCreat(this, {
           *           trget : this.div_search.form.edt_edt_trgetEdit
           *          ,callback : function(sData){
           *              console.log(sData);
           *          }
           *      });
           */
          unvfrDeptInqryCndCreat: function (context, params) {
            console.log("====================================================================");
            console.log("====================================================================");
            console.log("====================================================================");
            console.log("====================================================================");
            console.log("부서팝업을 활용하세요. 일정기간 후에는 해당 함수는 사라질 예정입니다.");
            console.log("====================================================================");
            console.log("====================================================================");
            console.log("====================================================================");
            console.log("====================================================================");
            //          //대상의 위치정보
            //          var top    = params["trget"].getOffsetTop()
            //             ,left   = params["trget"].getOffsetLeft()
            //             ,right  = params["trget"].getOffsetRight()
            //             ,height = params["trget"].getOffsetHeight()
            //             ,width  = params["trget"].getOffsetWidth();
            //
            //          //divId
            //          var popupDivId = params["trget"].parent.parent.id + "_";
            //              popupDivId += params["trget"].id +"PopupDiv";
            //          //div생성
            //          var objDiv = new PopupDiv(popupDivId, left, top+height, 600, 500, null, null);
            //          // set Url
            //          objDiv.set_url("SCH_SCOMCM::scomcm0110.xfdl");
            //          // Add Object to Parent Form
            //          context.addChild(popupDivId, objDiv);
            //          // Show Object
            //          objDiv.show();
            //          //context 전달
            //          objDiv.form._context = context;
            //          //trget 전달
            //          objDiv.form._trgetObj = params["trget"];
            //          //div의 id전달
            //          objDiv.form._popupDivId = popupDivId;
            //          //callback 전달
            //          objDiv.form._callback = params["callback"];
            //          //대상 oneditclick이벤트 추가
            //          context._oneditclick = function(obj,  e) {
            //              context[popupDivId].trackPopupByComponent(params["trget"], 0, height);
            //          }
            //          params["trget"].addEventHandler("oneditclick", context._oneditclick, context);
            //          //popupDiv oncloseup이벤트 추가
            //          context._oncloseup = function(obj,  e) {
            //              if(obj.returnvalue){
            //                  obj.form._callback.call(objDiv.form._context, obj.returnvalue);
            //              }
            //          }
            //          objDiv.addEventHandler("oncloseup", context._oncloseup, context);
          },

          /**
           * 학사기준조직을 로드한다.
           * @param params {
           *           trgetDs		: 결과Dataset(필수)
           *          ,useYn			: 사용여부(0:미사용, 1:사용, T:전체)(선택)
           *          ,firstRowType	: 첫행(N, E:공백, T:전체, S:선택)(선택 deafult:T)
           *          ,dispType		: 표시타입(N:기본, B:코드와 텍스트를 같이 나타냄)(선택 default:N)
           *          ,callback		: 콜백함수(선택)
           *			,findAuthGbn	: 6: 관리자      5,4,3,2,1: 그외는 관리자 아님 세션처리(default: GLIO.menuGrade)
           *			,histYn			: 1: 부서이력 포함, 0:부서이력 제외 (default: "1")
           *			,hgDeptGbn		: 데이터의 종류를 설정함 - 1: 학과만, 2 : 행정부서만, 3: 대학만        A : 모든 조직 (default: "A")
           *			,useGbn			: 1: 사용중인것만, A : 전체자료 (default: "A")
           *			,hltocYn		: 겸무(겸직)부서를 포함하여 조회(default: "0")
           *			,appntYn     	: 보직부서를 포함하여 조회 (default: "0")
           *        }
           * @returns void
           * @example
           *      this.schUtils.unvfrStdrDeptCdLoad({
           *           "trgetDs"  : this.unvfrStdrDeptCdLoad
           *          ,"useYn"    : "T"
           *          ,"firstRowType" : "T"
           *          ,"dispType"  : "B"
           *          ,"callback" : function(){
           *              console.log("callback호출");
           *          }
           *      });
           */
          unvfrStdrDeptCdLoad: function (params) {
            //check arguments
            context.utils.checkArguments(params, ["trgetDs"], ["trgetDs@dataset"]);
            //조회조건(DS) 생성
            var _dsParam = new Dataset();
            //컬럼 추가
            _dsParam.addColumn("useYn", "string");

            _dsParam.addColumn("findAuthGbn", "string");
            _dsParam.addColumn("histYn", "string");
            _dsParam.addColumn("hgDeptGbn", "string");
            _dsParam.addColumn("useGbn", "string");
            _dsParam.addColumn("hltocYn", "string");
            _dsParam.addColumn("appntYn", "string");
            //행 추가
            _dsParam.addRow();
            //조회조건 셋팅
            _dsParam.setColumn(0, "useYn", params["useYn"] ? params["useYn"] : "T");
            _dsParam.setColumn(0, "dispType", params["dispType"] ? params["dispType"] : "N");
            _dsParam.setColumn(0, "findAuthGbn", params["findAuthGbn"]); //6: 관리자      5,4,3,2,1: 그외는 관리자 아님.
            _dsParam.setColumn(0, "histYn", params["histYn"] ? params["histYn"] : "0"); //1: 부서이력 포함, 0:부서이력 제외
            _dsParam.setColumn(0, "hgDeptGbn", params["hgDeptGbn"] ? params["hgDeptGbn"] : "3"); //1: 학과만, 2 : 행정부서만, 3: 대학만        A : 모든 조직
            _dsParam.setColumn(0, "useGbn", params["useGbn"] ? params["useGbn"] : "A"); // 1: 사용중인것만, A : 전체자료
            _dsParam.setColumn(0, "hltocYn", params["hltocYn"] ? params["hltocYn"] : "0"); //겸무(겸직)부서를 포함하여 조회
            _dsParam.setColumn(0, "appntYn", params["appntYn"] ? params["appntYn"] : "0"); //보직부서를 포함하여 조회 : 추후 필요시 추가

            if (context["_dsParam"]) {
              //임시 조회조건 삭제
              context.removeChild("_dsParam");
            }
            //임시 조회조건 추가
            context.addChild("_dsParam", _dsParam);
            //조회
            context.utils.transaction({
              //url : "com/sles/SlescsCtr/findUnvfrStdrDeptCdList.do"
              //url : "com/scom/ScomcmCtr/findUnvfrStdrDeptCdList.do"
              url: "com/sapl/SaplapCtr/findUnvfrStdrDeptCdList.do",
              inDS: "dsParam=_dsParam:A",
              outDS: params["trgetDs"].id + "=dsVwCsys10010",
              async: false,
              callback: function () {
                if (params["firstRowType"]) {
                  if (["N", "E"].indexOf(["firstRowType"]) >= 0) {
                    //첫행 '빈값'추가
                    params["trgetDs"].insertRow(0);
                  } else if (params["firstRowType"] == "T") {
                    //첫행 '전체'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "전체");
                    params["trgetDs"].setColumn(0, "fullNmMark", "전체");
                  } else if (params["firstRowType"] == "S") {
                    //첫행 '선택'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "선택");
                    params["trgetDs"].setColumn(0, "fullNmMark", "선택");
                  }
                }
                //임시 조회조건 삭제
                context.removeChild("_dsParam");
                //callbcak처리
                if (!params["callback"]) return;
                if (typeof params["callback"] == "function") {
                  params["callback"].call(context);
                } else {
                  context[params["callback"]].call(context);
                }
              }
            });
          },

          unvfrStdrDeptCdLoad01: function (params) {
            //check arguments
            context.utils.checkArguments(params, ["trgetDs"], ["trgetDs@dataset"]);
            //조회조건(DS) 생성
            var _dsParam = new Dataset();
            //컬럼 추가
            _dsParam.addColumn("useYn", "string");

            _dsParam.addColumn("findAuthGbn", "string");
            _dsParam.addColumn("histYn", "string");
            _dsParam.addColumn("hgDeptGbn", "string");
            _dsParam.addColumn("useGbn", "string");
            _dsParam.addColumn("hltocYn", "string");
            _dsParam.addColumn("appntYn", "string");
            //행 추가
            _dsParam.addRow();
            //조회조건 셋팅
            _dsParam.setColumn(0, "useYn", params["useYn"] ? params["useYn"] : "T");
            _dsParam.setColumn(0, "dispType", params["dispType"] ? params["dispType"] : "N");
            _dsParam.setColumn(0, "findAuthGbn", params["findAuthGbn"]); //6: 관리자      5,4,3,2,1: 그외는 관리자 아님.
            _dsParam.setColumn(0, "histYn", params["histYn"] ? params["histYn"] : "0"); //1: 부서이력 포함, 0:부서이력 제외
            _dsParam.setColumn(0, "hgDeptGbn", params["hgDeptGbn"] ? params["hgDeptGbn"] : "3"); //1: 학과만, 2 : 행정부서만, 3: 대학만        A : 모든 조직
            _dsParam.setColumn(0, "useGbn", params["useGbn"] ? params["useGbn"] : "A"); // 1: 사용중인것만, A : 전체자료
            _dsParam.setColumn(0, "hltocYn", params["hltocYn"] ? params["hltocYn"] : "0"); //겸무(겸직)부서를 포함하여 조회
            _dsParam.setColumn(0, "appntYn", params["appntYn"] ? params["appntYn"] : "0"); //보직부서를 포함하여 조회 : 추후 필요시 추가

            if (context["_dsParam"]) {
              //임시 조회조건 삭제
              context.removeChild("_dsParam");
            }
            //임시 조회조건 추가
            context.addChild("_dsParam", _dsParam);
            //조회
            context.utils.transaction({
              //url : "com/sles/SlescsCtr/findUnvfrStdrDeptCdList.do"
              url: "com/scom/ScomcmCtr/findUnvfrStdrDeptCdList01.do",
              inDS: "dsParam=_dsParam:A",
              outDS: params["trgetDs"].id + "=dsVwCsys10010",
              async: false,
              callback: function () {
                if (params["firstRowType"]) {
                  if (["N", "E"].indexOf(["firstRowType"]) >= 0) {
                    //첫행 '빈값'추가
                    params["trgetDs"].insertRow(0);
                  } else if (params["firstRowType"] == "T") {
                    //첫행 '전체'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "전체");
                    params["trgetDs"].setColumn(0, "fullNmMark", "전체");
                  } else if (params["firstRowType"] == "S") {
                    //첫행 '선택'추가
                    params["trgetDs"].insertRow(0);
                    params["trgetDs"].setColumn(0, "fullNm", "선택");
                    params["trgetDs"].setColumn(0, "fullNmMark", "선택");
                  }
                }
                //임시 조회조건 삭제
                context.removeChild("_dsParam");
                //callbcak처리
                if (!params["callback"]) return;
                if (typeof params["callback"] == "function") {
                  params["callback"].call(context);
                } else {
                  context[params["callback"]].call(context);
                }
              }
            });
          },

          /******************************************************************************
                 * Name         : findSchrgBassInfo
                 * Description  : 학적 기본정보를 조회한다.
                 * Arguments    : 1번째인자 : 학번(빈 값으로 넘길 경우 세션값으로 대체됨)
                                  2번째인자 : 대학(원)코드(빈 값으로 넘길 경우 생략됨)
                                  3번째인자 : 받을 데이터셋                           기본값 : this.dsSchrgBassInfo
                                  4번째인자 : 사용자 callBack함수                        기본값 : NULL
                 * sample1      : this.schUtils.findSchrgBassInfo({"stuno" : "20141324", "outDs" : this.dsSchrgBassInfo); // 지정된 학번으로 조회
                 * sample2      : this.schUtils.findSchrgBassInfo({"stuno" : ""        , "outDs" : this.dsSchrgBassInfo, "callback" : function(sData){}}); // 세션정보의 persNo로 조회하고 callback함수 실행
                 ******************************************************************************/
          findSchrgBassInfo: function (params) {
            context.utils.transaction({
              id: "findSchrgBassInfo",
              url: "com/ssrm/SsrmstCtr/findSchrgBassInfo.do",
              arg:
                "stuno=" +
                params["stuno"] +
                " univCd=" +
                params["univCd"] +
                " syy=" +
                params["syy"] +
                " smtCd=" +
                params["smtCd"],
              outDS: params["outDs"].name + "=dsResult",
              async: false,
              callback: function () {
                if (!params["callback"]) return;
                if (typeof params["callback"] == "function") {
                  params["callback"].call(context);
                } else {
                  context[params["callback"]].call(context);
                }
              }
            });
          },

          /******************************************************************************
                 * Name         : findScomUnvfrSchdlInfo
                 * Description  : 학사력 정보를 조회한다.
                 * Arguments    : 1번째인자 : 구분(1:현재학년도, 2:학사일정기간, 3:입력항목값, 4:현재학년도+학사일정기간,5: 현재학년도+학사일정기간+입력항목값)
                                  2번째인자 : 학사일정코드
                                  3번째인자 : 등록부서코드
                                  4번째인자 : 적용부서코드
                                  5번째인자 : 지원과정코드
                                  6번째인자 : 학위과정코드
                                  7번째인자 : 학년
                                  8번째인자 : 학년도
                                  9번째인자 : 학기코드
                 * 리턴값 : this.dsUnvfc.get("reslt");
                 * 예시 1 (현재학년도 조회, 학부메뉴) : 학부메뉴에서 조회할 경우, 등록부서코드를 "20000"으로 고정합니다.
                                                            파라미터는 구분, 학사일정코드, 등록부서코드 3가지만 넘기면 됩니다.
                    this.schUtils.findScomUnvfrSchdlInfo("1", "SSRM00070003", "20000", "", "", "", "", "", "");

                 * 예시 2 (현재학년도 조회, 대학원메뉴, 학생조회) : 대학원메뉴에서 조회할 경우, 등록부서코드를 각 대학원별로 구해야 합니다.
                                                                        학생전용 화면의 경우 세션정보의 deptCd를 조회하면 됩니다.
                    this.schUtils.findScomUnvfrSchdlInfo("1", "SSRM00070003", this.utils.getGLIO().deptCd, "", "", "", "", "", "");

                 * 예시 3 (현재학년도 조회, 대학원메뉴, 관리자조회) : 대학원메뉴에서 조회할 경우, 등록부서코드를 각 대학원별로 구해야 합니다.
                                                                            관리자 화면의 경우 조회조건의 대학원 콤보 값을 넘겨주면 됩니다.
                    this.schUtils.findScomUnvfrSchdlInfo("1", "SSRM00070003", this.dsParam.get("univCd"), "", "", "", "", "", "");

                 * 예시 4 (학사일정기간 조회) : 학사일정기간을 조회할 경우 등록부서코드는 예시 1~3과 동일하며, 추가로 적용부서코드를 넘겨야 합니다.
                                                    나머지 파라미터는 생략 가능합니다. 생략할 경우 현재학년도를 기준으로 일정기간이 조회됩니다.
                    this.schUtils.findScomUnvfrSchdlInfo("2", "SSRM00070003", "20000", this.utils.getGLIO().deptCd, "", "", "", "", "");
                    this.schUtils.findScomUnvfrSchdlInfo("2", "SSRM00070003", "20000", this.utils.getGLIO().deptCd, "", "", "", "2017", "10");
                 ******************************************************************************/
          findScomUnvfrSchdlInfo: function (
            flag,
            univunvfrSchdlCd,
            regDeptCd,
            applcDeptCd,
            applyCrseCd,
            dgriCrseCd,
            hy,
            syy,
            smtCd
          ) {
            context.utils.transaction({
              id: "findScomUnvfrSchdlInfo",
              url: "com/SsoCtr/findScomUnvfrSchdlInfo.do",
              arg:
                "flag=" +
                flag +
                " univunvfrSchdlCd=" +
                univunvfrSchdlCd +
                " regDeptCd=" +
                regDeptCd +
                " applcDeptCd=" +
                applcDeptCd +
                " applyCrseCd=" +
                applyCrseCd +
                " dgriCrseCd=" +
                dgriCrseCd +
                " hy=" +
                hy +
                " syy=" +
                syy +
                " smtCd=" +
                smtCd,
              outDS: "dsUnvfc=dsUnvfc",
              async: false
              /*
                        ,callback : function() {
                            if(!callback) return;
                            if (typeof callback == "function") {
                                callback.call(context);
                            } else {
                                context[callback].call(context);
                            }
                        }
                        */
            });
          },

          /******************************************************************************
                 * Name         : findInsttDivCdComboList
                 * Description  : 사용자 권한에 따른 학부/대학원 정보를 조회한다.
                 * Arguments    : 1번째인자 : 구분(T:전체, S:선택, E:공란. 빈값일 경우 기본 데이터만 조회됨)
                                  2번째인자 : 교직원번호(빈값일 경우 세션정보로 처리됨)
                                  3번째인자 : 소속코드(빈값일 경우 세션정보로 처리됨)
                                  4번째인자 : 업무구분(ADM : 행정, SCH : 학사. 빈값일 경우 학사로 처리됨)
                                  5번째인자 : 역할별 프로그램 권한(6:관리자, 1:조회 등등. 빈값일 경우 세션정보로 처리됨)
                                  6번째인자 : 부서이력 포함여부(1:포함, 0:미포함. 빈값일 경우 미포함 데이터로 조회됨)
                                  7번째인자 : 데이터 종류 구분(1:학과만, 2:행정부서만, 3:대학만, A:모든조직. 빈값일 경우 대학만 조회됨)
                                  8번째인자 : 사용여부(1:사용중, A:전체. 빈값일 경우 사용중인 데이터만 조회됨)
                 * 예시 1 : this.schUtils.findInsttDivCdComboList("", "", "", "", "", "", "", "");
                 * 예시 2 : this.schUtils.findInsttDivCdComboList("T", "", "", "SCH", "", "0", "3", "1");

                 ******************************************************************************/
          findInsttDivCdComboList: function (
            gbn,
            empNo,
            deptCd,
            busnsCd,
            findAuthGbn,
            histYn,
            hgDeptGbn,
            useGbn
          ) {
            context.utils.transaction({
              id: "findInsttDivCdComboList",
              url: "com/ssrm/SsrmstCtr/findInsttDivCdComboList.do",
              arg:
                "gbn=" +
                gbn +
                " empNo=" +
                empNo +
                " deptCd=" +
                deptCd +
                " busnsCd=" +
                busnsCd +
                " findAuthGbn=" +
                findAuthGbn +
                " histYn=" +
                histYn +
                " hgDeptGbn=" +
                hgDeptGbn +
                " useGbn=" +
                useGbn,
              outDS: "dsInsttDivCdList=dsInsttDivCdList",
              async: false
            });
          },

          /******************************************************************************
                 * Name         : findUnivCdComboList
                 * Description  : 사용자 권한에 따른 대학(원) 정보를 조회한다.
                 * Arguments    : 1번째인자 : 구분(T:전체, S:선택, E:공란. 빈값일 경우 기본 데이터만 조회됨)
                                  2번째인자 : 교직원번호(빈값일 경우 세션정보로 처리됨)
                                  3번째인자 : 소속코드(빈값일 경우 세션정보로 처리됨)
                                  4번째인자 : 업무구분(ADM : 행정, SCH : 학사. 빈값일 경우 학사로 처리됨)
                                  5번째인자 : 역할별 프로그램 권한(6:관리자, 1:조회 등등. 빈값일 경우 세션정보로 처리됨)
                                  6번째인자 : 부서이력 포함여부(1:포함, 0:미포함. 빈값일 경우 미포함 데이터로 조회됨)
                                  7번째인자 : 데이터 종류 구분(1:학과만, 2:행정부서만, 3:대학만, A:모든조직. 빈값일 경우 대학만 조회됨)
                                  8번째인자 : 사용여부(1:사용중, A:전체. 빈값일 경우 사용중인 데이터만 조회됨)
                                  9번째인자 : 대학/대학원 구분(2:대학, 3:대학원. 빈값일 경우 전체 조회됨)
                 * 예시 1 : this.schUtils.findUnivCdComboList("", "", "", "", "", "", "", "");
                 * 예시 2 : this.schUtils.findUnivCdComboList("T", "", "", "SCH", "", "0", "3", "1");

                 ******************************************************************************/
          findUnivCdComboList: function (
            gbn,
            empNo,
            deptCd,
            busnsCd,
            findAuthGbn,
            histYn,
            hgDeptGbn,
            useGbn,
            insttDivCd
          ) {
            context.utils.transaction({
              id: "findUnivCdComboList",
              url: "com/ssrm/SsrmstCtr/findUnivCdComboList.do",
              arg:
                "gbn=" +
                gbn +
                " empNo=" +
                empNo +
                " deptCd=" +
                deptCd +
                " busnsCd=" +
                busnsCd +
                " findAuthGbn=" +
                findAuthGbn +
                " histYn=" +
                histYn +
                " hgDeptGbn=" +
                hgDeptGbn +
                " useGbn=" +
                useGbn +
                " insttDivCd=" +
                insttDivCd,
              outDS: "dsUnivCdList=dsUnivCdList",
              async: false
            });
          },

          /******************************************************************************
                 * Name         : findDeprtCdComboList
                 * Description  : 사용자 권한에 따른 학부(과) 정보를 조회한다.
                 * Arguments    : 1번째인자 : 구분(T:전체, S:선택, E:공란. 빈값일 경우 기본 데이터만 조회됨)
                                  2번째인자 : 교직원번호(빈값일 경우 세션정보로 처리됨)
                                  3번째인자 : 대학(원)코드(빈값일 경우 세션정보로 처리됨)
                                  4번째인자 : 업무구분(ADM : 행정, SCH : 학사. 빈값일 경우 학사로 처리됨)
                                  5번째인자 : 역할별 프로그램 권한(6:관리자, 1:조회 등등. 빈값일 경우 세션정보로 처리됨)
                                  6번째인자 : 부서이력 포함여부(1:포함, 0:미포함. 빈값일 경우 미포함 데이터로 조회됨)
                                  7번째인자 : 데이터 종류 구분(1:학과만, 2:행정부서만, 3:대학만, A:모든조직. 빈값일 경우 대학만 조회됨)
                                  8번째인자 : 사용여부(1:사용중, A:전체. 빈값일 경우 사용중인 데이터만 조회됨)
                 * 예시 1 : this.schUtils.findDeprtCdComboList("", "", "", "", "", "", "", "");
                 * 예시 2 : this.schUtils.findDeprtCdComboList("T", "", "", "SCH", "", "0", "3", "1");

                 ******************************************************************************/
          findDeprtCdComboList: function (
            gbn,
            empNo,
            deptCd,
            busnsCd,
            findAuthGbn,
            histYn,
            hgDeptGbn,
            useGbn
          ) {
            context.utils.transaction({
              id: "findDeprtCdComboList",
              url: "com/ssrm/SsrmstCtr/findDeprtCdComboList.do",
              arg:
                "gbn=" +
                gbn +
                " empNo=" +
                empNo +
                " deptCd=" +
                deptCd +
                " busnsCd=" +
                busnsCd +
                " findAuthGbn=" +
                findAuthGbn +
                " histYn=" +
                histYn +
                " hgDeptGbn=" +
                hgDeptGbn +
                " useGbn=" +
                useGbn,
              outDS: "dsDeprtCdList=dsDeprtCdList",
              async: false
            });
          },

          /******************************************************************************
                 * Name         : findMajorCdComboList
                 * Description  : 사용자 권한에 따른 전공 정보를 조회한다.
                 * Arguments    : 1번째인자 : 구분(T:전체, S:선택, E:공란. 빈값일 경우 기본 데이터만 조회됨)
                                  2번째인자 : 교직원번호(빈값일 경우 세션정보로 처리됨)
                                  3번째인자 : 학부(과)코드(빈값일 경우 세션정보로 처리됨)
                                  4번째인자 : 업무구분(ADM : 행정, SCH : 학사. 빈값일 경우 학사로 처리됨)
                                  5번째인자 : 역할별 프로그램 권한(6:관리자, 1:조회 등등. 빈값일 경우 세션정보로 처리됨)
                                  6번째인자 : 부서이력 포함여부(1:포함, 0:미포함. 빈값일 경우 미포함 데이터로 조회됨)
                                  7번째인자 : 데이터 종류 구분(1:학과만, 2:행정부서만, 3:대학만, A:모든조직. 빈값일 경우 대학만 조회됨)
                                  8번째인자 : 사용여부(1:사용중, A:전체. 빈값일 경우 사용중인 데이터만 조회됨)
                 * 예시 1 : this.schUtils.findMajorCdComboList("", "", "", "", "", "", "", "");
                 * 예시 2 : this.schUtils.findMajorCdComboList("T", "", "", "SCH", "", "0", "3", "1");

                 ******************************************************************************/
          findMajorCdComboList: function (
            gbn,
            empNo,
            deptCd,
            busnsCd,
            findAuthGbn,
            histYn,
            hgDeptGbn,
            useGbn
          ) {
            context.utils.transaction({
              id: "findMajorCdComboList",
              url: "com/ssrm/SsrmstCtr/findMajorCdComboList.do",
              arg:
                "gbn=" +
                gbn +
                " empNo=" +
                empNo +
                " deptCd=" +
                deptCd +
                " busnsCd=" +
                busnsCd +
                " findAuthGbn=" +
                findAuthGbn +
                " histYn=" +
                histYn +
                " hgDeptGbn=" +
                hgDeptGbn +
                " useGbn=" +
                useGbn,
              outDS: "dsMajorCdList=dsMajorCdList",
              async: false
            });
          }
        };

        //학사용 공통팝업 셋팅
        popup_setting();

        //학사용 공통팝업 정의
        function popup_setting() {
          /* *****************************************************************************
                 * Function Name: codecc1020_pop01
                 * Description  : 교과목검색팝업을 오픈한다.
                 * Arguments    : baseCond : {
                                     a : A컬럼(필수)
                                    ,b : B컬럼(옵션)
                                  }

                                  cond : {
                                      subjtCd : "과목코드"
                                     ,subjtNm : "과목명"
                                 }
                 * callback     : function
                 * sample       :
                            //교과목 검색 팝업
                            this.schUtils.currcr0120_pop01.setOpts({
                                baseCond : {
                                    //
                                }
                                ,callback : function(id, sData){
                                    this.dsScur012.set("codeCol", sData.subjtCd);
                                    this.dsScur012.set("nameCol", sData.subjtNm);
                                }
                            }).openEvent(e, {
                                subjtNm : "테스트"
                            });
                 ******************************************************************************/
          context.popup.make.call(utils, {
            id: "scurcr0120_pop01",
            title: "교과목검색팝업",
            url: "SCH_SCURCR::scurcr0120_pop01.xfdl",
            onceUrl: "com/scur/ScurcrCtr/findSubjtCdPopList.do",
            onceDataSetNm: "dsScur010",
            onceDataSetType: "json",
            width: 800,
            height: 450
          });

          /* *****************************************************************************
                 * Function Name: selecs0251_pop01
                 * Description  : 개설강좌조회 팝업을 오픈한다.
                 * Arguments    : cond : {
                                      syy : 학년도(필수)
                                     ,smtCd : 학기(필수)
                                     ,subjtCd : 과목코드(옵션)
                                     ,subjtNm : 과목명(옵션)
                                     ,asignDeprtCd : 배정학과
                                     ,cmpsjDivCd : 이수구분
                                     ,cmpsjHyDivCd : 이수학년
                                     ,instrEmpno : 교강사(넘겨줄 경우 해당 교강사가 담당교수로 존재하는 경우만 조회)(옵션)
                                     ,rmvlcYn : 폐강여부(옵션)
                                     ,inqryDiv : 0: 대표교수만 조회 1:교수별 조회(옵션)  (default : 0)
                                     ,multiChoicYn : 다중선택여부(0:단일, 1:다중, default:0)
                                 }
                 * callback     : function
                 * sample       :
                 ******************************************************************************/
          context.popup.make.call(utils, {
            id: "slescs0251_pop01",
            title: "개설강좌조회팝업",
            url: "SCH_SLESCS::slescs0251_pop01.xfdl",
            onceUrl: "com/sles/SlescsCtr/findEstblCorsePopList.do",
            onceDataSetNm: "dsSles131",
            onceDataSetType: "json",
            width: 1100,
            height: 660
          });

          /* *****************************************************************************
                 * Function Name: slesfm0210_pop01
                 * Description  : 강의실 조회 팝업을 오픈한다.
                 * Arguments    : cond : {
                                     buldAsstsNo : 건물자산번호(옵션)
                                    ,spaceCd : 공간코드(옵션)
                                    ,spaceNm : 공간명(옵션)
                                    ,asignDeprtCd : 전용강의실 배정학과(옵션)
                                    ,asignDeprtNm : 전용강의실 배정학과명(옵션)
                                    ,schffUseYn : 교무사용 여부(옵션)
                                    ,multiChoicYn : 다중선택여부(0:단일, 1:다중, default:0)
                                 }
                 * callback     : function
                 * sample       :
                                    return this.schUtils.slesfm0210_pop01.setOpts({
                                        baseCond : {}
                                    }).onceEvent(obj, e, {
                                         getData : trgetCd + "=spaceCd" + ( addAttrb ? " " + addAttrb : "")
                                        ,sendData : "spaceNm=" + trgetNm
                                        ,ds : trgetDs
                                    });
                 ******************************************************************************/
          context.popup.make.call(utils, {
            id: "slesfm0210_pop01",
            title: "강의실조회팝업",
            url: "SCH_SLESFM::slesfm0210_pop01.xfdl",
            onceUrl: "com/sles/SlesfmCtr/findLecrmMhrmlPopList.do",
            onceDataSetNm: "dsAfac500",
            onceDataSetType: "json",
            width: 800,
            height: 500
          });

          /* *****************************************************************************
                 * Function Name: ssrmsr0050_pop01
                 * Description  : 학적정보조회 팝업을 오픈한다.
                 * Arguments    : cond : {
                                      stuno : 학번
                                 }
                 * callback     : function
                 * sample       :
                 ******************************************************************************/
          context.popup.make.call(utils, {
            id: "ssrmsr0050_pop01",
            title: "학적정보조회팝업",
            url: "SCH_SSRMSR::ssrmsr0050_pop01.xfdl",
            onceUrl: "com/ssrm/SsrmsrCtr/findSchMasterList.do",
            onceDataSetNm: "dsSsrm200",
            onceDataSetType: "json",
            width: 900,
            height: 550
          });

          /* *****************************************************************************
                 * Function Name: dept
                 * Description  : 학사용 부서(그리드)를 조회한다.
                 * Arguments    : deptNm 		: ""										// 부서명
        			 			, multiYn		: "Y"		default : "N"					// 멀티여부 Y/N 으로 처리 기본은 N
        						, unvfrStdrDeptCd : ""		default	: ""					// 소속구분 ex) 학부/ 대학원 / 자동차공학대학원등... 코드 넘길시 기본 셋팅
        			 		    , busnsCd		: ""		default	: "SCH"					// 업무구분 : ADM - 행정용, SCH - 학사용
        			 			, findAuthGbn	: ""		default	: GLIO.menuGrade		// 6: 관리자      5,4,3,2,1: 그외는 관리자 아님 세션처리
        			 			, histYn		: ""		default	: "1"					// 1: 부서이력 포함, 0:부서이력 제외
        			 			, hgDeptGbn		: ""		default	: "A"					// 데이터의 종류를 설정함 - 1: 학과만, 2 : 행정부서만, 3: 대학만        A : 모든 조직
        			 			, useGbn		: ""		default	: "A"					// 1: 사용중인것만, A : 전체자료
        			 			, hltocYn		: ""		default	: "0"					// 겸무(겸직)부서를 포함하여 조회
        			 			, appntYn     	: ""		default	: "0"					// 보직부서를 포함하여 조회
        			 			, useYn     	: ""		default	: ""					// 부서 사용여부 1 : 'Y', 2 : 'N'
                 * 설명			: 기본 디폴트 설정되어 있는 부분은 위의 내용대로 처리가 되며
        						 필요한 파라메터에 대하여 선언후 값을 입력 해주시면 됩니다.
        		 * return     : 부서정보(multiCheck 가 "1" 이면 array로, "0" 이면 object로 return
                 ******************************************************************************/
          context.popup.make.call(utils, {
            id: "dept",
            url: "SCH_SCOMCM::scomcm_dept_pop.xfdl",
            onceUrl: "com/scom/ScomcmCtr/findSchDeptPopList.do",
            onceDataSetNm: "dsCsys100",
            onceDataSetType: "json",
            title: "학사용 부서조회",
            width: 1000,
            height: 600,
            mode: "l"
          });
        }

        //
        return utils;
      };
    });

    this.loadIncludeScript(path);

    obj = null;
  };
})();
