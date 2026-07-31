//XJS=libCommPop.xjs
(function () {
  return function (path) {
    var obj;

    // User Script
    this.registerScript(path, function () {
      /*******************************************************************************************************************************************************************************************************
         * 설명 : 공통팝업(2개이상의 context에서 요청이 필요한 팝업)
         * 작성자 : 박지성
         * 팝업 목록
        	사용자 조회 		: user
        	부서조회(트리) 		: deptTree
        	우편번호조회 		: zipc
        	공통코드조회		: code
        	파일업로드/다운로드 : fileU
        	파일다운로드		: fileD
        	이미지업로드		: fileI
         ******************************************************************************************************************************************************************************************************/
      this._commonExtendUtils.commonPopup = function () {
        var context = this,
          commonPopup = {};
        popup_setting();
        function popup_setting() {
          /* *****************************************************************************
           * Function Name: user
           * Description  : 사용자조회
           * Arguments    :
           * return     	: 사용자 정보 object
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "user",
            url: "COM_POPUP::user_pop.xfdl",
            onceUrl: "com/csys/CsysusCtr/findUserBySocpsList.do",
            onceDataSetNm: "dsCsys021",
            onceDataSetType: "json",
            title: "사용자조회",
            width: 800,
            height: 460,
            mode: "l"
          });

          /* *****************************************************************************
                 * Function Name: dept
                 * Description  : 부서(그리드)를 조회한다.
                 * Arguments    : useYn - 사용여부
                                  orgTpGbn - 조직유형구분(공통코드 A0202 참조, 추가로 campus를 입력하면 캠퍼스에 해당하는 모든 부서가 나옴)
                                  multiCheck - 여러행을 가져올 경우 사용("1","0") default "0"
        						  univCd - 해당 대학 밑의 부서 조회
        						  campCd - 해당 캠퍼스 밑의 부서 조회
        						  deptNm - 부서명
                 * return     : 부서정보(multiCheck 가 "1" 이면 array로, "0" 이면 object로 return
                 ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "dept",
            url: "COM_POPUP::dept_pop.xfdl",
            onceUrl: "com/csys/CsyscdCtr/findDeptPopList.do",
            onceDataSetNm: "dsCsys100",
            onceDataSetType: "json",
            title: "부서조회",
            width: 750,
            height: 410,
            mode: "l"
          });

          /* *****************************************************************************
                 * Function Name: emp
                 * Description  : 교직원목록을 조회한다.
                 * Arguments    :  professorYn - 교원만 조회(1)
        						  jbfmDivCd - 직종구분코드(공통코드 AHRM0020참고. 0 총장, 1교원, 2직원, 3강사, 4조교, 9시간강사)
        						  jbfmCd    - 직종코드



                 * return     :
                 ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "emp",
            url: "COM_POPUP::emp_pop.xfdl",
            onceUrl: "adm/ahrm/AhrmbsCtr/findEmpPopList.do",
            onceDataSetNm: "dsAhrm150",
            onceDataSetType: "json",
            title: "교직원조회",
            width: 800,
            height: 460,
            mode: "l"
          });

          /* *****************************************************************************
           * Function Name: address
           * Description  : 주소조회 팝업
           * Arguments    :
           * return     : 대표코드 정보 object
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "address",
            url: "COM_POPUP::address_pop.xfdl",
            title: "주소조회",
            width: 800,
            height: 650,
            mode: "l"
          });

          /* *****************************************************************************
           * Function Name: code
           * Description  : 공통코드를 조회한다.
           * Arguments    : pcode : 대표코드
           * return     : 대표코드 정보 object
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "code",
            url: "COM_CODE::code0101_pop.xfdl",
            title: "공통코드조회",
            width: 375,
            height: 470,
            onceUrl: "com/CodeCtr/findCommonCodeList.do",
            onceDataSetNm: "DS_BSNS011",
            onceDataSetType: "json",
            mode: "l"
          });

          /* *****************************************************************************
           * Function Name: sms
           * Description  : sms 전송 팝업
           * Arguments    :
           * return     	:
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "sms",
            url: "COM_POPUP::mesg0110_pop.xfdl",
            title: "통합메시지전송",
            width: 690,
            height: 571,
            mode: "l"
          });

          /* *****************************************************************************
           * Function Name: mail
           * Description  : mail 전송 팝업
           * Arguments    :
           * return     	:
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "mail",
            url: "COM_POPUP::mesg0100_pop.xfdl",
            title: "Mail전송",
            width: 800,
            height: 700,
            mode: "l"
          });

          /* *****************************************************************************
                 * Function Name: fileU
                 * Description  : 파일을 업로드/다운로드 한다.
                 * Arguments    :
        			오픈
        				fileMasterNo : 파일마스터 번호 * 필수
        			셋옵션
        				baseCond
        					tableNm : 본인업무스키마.값 저장할 테이블명 * 필수 ex) "COM.commfl01tt"
                 * callback     :
                 * sample       :
                 ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "fileU",
            url: "COM_POPUP::fileUpload_pop.xfdl",
            title: "파일업로드",
            width: 445,
            height: 438,
            callback: "",
            useX: false
          });

          /* *****************************************************************************
                 * Function Name: fileD
                 * Description  : 파일을 다운로드 한다.
                 * Arguments    :
        			오픈
        				fileMasterNo : 파일마스터 번호 * 필수
                 * callback     :
                 * sample       :
                 ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "fileD",
            url: "COM_POPUP::fileDown_pop.xfdl",
            title: "파일다운로드",
            width: 411,
            height: 438,
            callback: "",
            mode: "l"
          });

          /* *****************************************************************************
           * Function Name: fileP
           * Description  : pdf 다운로드 기능이 추가 된다.
           * Arguments    :
           * callback     :
           * sample       :
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "fileP",
            url: "COM_FILE::file0200_pop.xfdl",
            title: "파일업로드",
            width: 454,
            height: 438,
            callback: "",
            mode: "l",
            useX: false
          });

          /* *****************************************************************************
           * Function Name: fileI
           * Description  : 이미지파일을 업로드 한다.
           * Arguments    :
           * callback     :
           * sample       :
           ******************************************************************************/
          context.popup.make.call(commonPopup, {
            id: "fileI",
            url: "COM_FILE::file0400_pop.xfdl",
            title: "이미지업로드",
            width: 330,
            height: 366,
            callback: "",
            mode: "l",
            useX: false
          });
        }

        return commonPopup;
      };
    });

    this.loadIncludeScript(path);

    obj = null;
  };
})();
