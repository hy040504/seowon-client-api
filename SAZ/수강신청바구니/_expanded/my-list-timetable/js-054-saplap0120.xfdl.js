(function () {
  return function () {
    if (!this._is_form) return;

    var obj = null;

    this.on_create = function () {
      this.set_initvalueid("base");
      this.set_name("saplap0120");
      this.set_titletext("[학생]수강신청 로그인");
      if (Form == this.constructor) {
        this._setFormPosition(1440, 906);
      }

      // Object(Dataset, ExcelExportObject) Initialize
      obj = new Dataset("dsLangCd", this);
      obj._setContents(
        '<ColumnInfo><Column id="code" type="STRING" size="256"/><Column id="fullNm" type="STRING" size="256"/></ColumnInfo><Rows><Row><Col id="code">ko</Col><Col id="fullNm">Korean</Col></Row><Row><Col id="code">en</Col><Col id="fullNm">English</Col></Row><Row><Col id="code">zh</Col><Col id="fullNm">Chinese</Col></Row></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl011", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="atnlcNotcClCd" type="STRING" size="256"/><Column id="atnlcNotcNo" type="BigDecimal" size="256"/><Column id="atnlcNotcTitle" type="STRING" size="256"/><Column id="atnlcNotcCtnt" type="STRING" size="256"/><Column id="atnlcNotcEngTitle" type="STRING" size="256"/><Column id="atnlcNotcEngCtnt" type="STRING" size="256"/><Column id="atnlcNotcChnTitle" type="STRING" size="256"/><Column id="atnlcNotcChnCtnt" type="STRING" size="256"/><Column id="nlognNotcYn" type="STRING" size="256"/><Column id="notcBeginDttm" type="STRING" size="256"/><Column id="notcEndDttm" type="STRING" size="256"/><Column id="attflUuid" type="STRING" size="256"/><Column id="attflUuidNm" type="STRING" size="256"/><Column id="atnlcNotcOrd" type="BigDecimal" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="emrgyNotcTrgetYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsParam", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/><Column id="password" type="STRING" size="256"/><Column id="hy" type="STRING" size="256"/><Column id="deptCd" type="STRING" size="256"/><Column id="notcClCd" type="STRING" size="256"/><Column id="appcsKindCd" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsUnvfc", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsFlag", this);
      obj._setContents(
        '<ColumnInfo><Column id="flag" type="STRING" size="256"/><Column id="initPswdYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("DS_LOGINCONFIRM", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl121", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="appcsSchdlCd" type="STRING" size="256"/><Column id="appcsSchdlNm" type="STRING" size="256"/><Column id="beginDt" type="DATE" size="256"/><Column id="endDt" type="DATE" size="256"/><Column id="beginTm" type="STRING" size="256"/><Column id="endTm" type="STRING" size="256"/><Column id="endDate" type="STRING" size="256"/><Column id="aplyFlag" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsAppcs", this);
      obj._setContents(
        '<ColumnInfo><Column id="Column0" type="STRING" size="256"/><Column id="extCd" type="STRING" size="256"/><Column id="recruYy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="smtNm" type="STRING" size="256"/><Column id="regjbYn" type="STRING" size="256"/><Column id="recruOdr" type="STRING" size="256"/><Column id="stafRecruFldCd" type="STRING" size="256"/><Column id="recanTitle" type="STRING" size="256"/><Column id="applyFldNm" type="STRING" size="256"/><Column id="email" type="STRING" size="256"/><Column id="pswd" type="STRING" size="256"/><Column id="appcaNm" type="STRING" size="256"/><Column id="birdt" type="STRING" size="256"/><Column id="pswdCfm" type="STRING" size="256"/><Column id="lctrrRecruPerdDivCd" type="STRING" size="256"/><Column id="stafRecruPerdDivCd" type="STRING" size="256"/><Column id="tcherRecruPerdDivCd" type="STRING" size="256"/><Column id="recruTrackDivCd" type="STRING" size="256"/><Column id="nltyCd" type="STRING" size="256"/><Column id="ptmsvRecruPerdDivCd" type="STRING" size="256"/><Column id="comsrInsttCd" type="STRING" size="256"/><Column id="prscgTelno" type="STRING" size="256"/><Column id="mgmtDeptCd" type="STRING" size="256"/><Column id="lctrrRecruPerdDivNm" type="STRING" size="256"/><Column id="recruFldCd" type="STRING" size="256"/><Column id="recruFldNm" type="STRING" size="256"/><Column id="deptCd" type="STRING" size="256"/><Column id="jgrdCd" type="STRING" size="256"/><Column id="deptRecruFldNm" type="STRING" size="256"/><Column id="recruTrackDivNm" type="STRING" size="256"/><Column id="deprtNm" type="STRING" size="256"/><Column id="ivstFldNm" type="STRING" size="256"/><Column id="deprtCd" type="STRING" size="256"/><Column id="ivstFldCd" type="STRING" size="256"/><Column id="deprtIvstFldNm" type="STRING" size="256"/><Column id="empno" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsLoginInfoChk", this);
      obj._setContents(
        '<ColumnInfo><Column id="appcsSchdlCd" type="STRING" size="256"/><Column id="appcsSchdlSeqno" type="STRING" size="256"/><Column id="possYn" type="STRING" size="256"/><Column id="appcsTrgetTypeCnt" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsStunoInfo", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/><Column id="stdntNm" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="hy" type="STRING" size="256"/><Column id="cmpsjSecnt" type="STRING" size="256"/><Column id="schrgSttusCd" type="STRING" size="256"/><Column id="schrgSttusNm" type="STRING" size="256"/><Column id="schrgVartnDivCd" type="STRING" size="256"/><Column id="schrgVartnTypeCd" type="STRING" size="256"/><Column id="schrgSttusVartnDt" type="STRING" size="256"/><Column id="deprtNm" type="STRING" size="256"/><Column id="applyCrseCd" type="STRING" size="256"/><Column id="dgriCrseCd" type="STRING" size="256"/><Column id="deptCd" type="STRING" size="256"/><Column id="univCd" type="STRING" size="256"/><Column id="deprtCd" type="STRING" size="256"/><Column id="majorCd" type="STRING" size="256"/><Column id="dghtDivCd" type="STRING" size="256"/><Column id="maxCdtNum" type="STRING" size="256"/><Column id="minCdtNum" type="STRING" size="256"/><Column id="entnsDt" type="STRING" size="256"/><Column id="mngtYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      // UI Components Initialize
      obj = new WebBrowser(
        "web_atnlcNotcCtnt",
        "10",
        "380",
        null,
        null,
        "10",
        "70",
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_accessibilityrole("webbrowser");
      obj.set_border("1px solid");
      obj.set_enable("false");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_next",
        "1380",
        "340",
        "24",
        null,
        null,
        "web_atnlcNotcCtnt:14",
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_cssclass("btn_next2");
      this.addChild(obj.name, obj);

      obj = new Static(
        "sta_topTitle",
        "1295",
        "338",
        "35",
        null,
        null,
        "web_atnlcNotcCtnt:12",
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("4");
      obj.set_font('normal 16px/normal "basefont"');
      obj.set_color("#222222");
      obj.set_text("이전");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_prev",
        "1260",
        "340",
        null,
        "26",
        "sta_topTitle:11",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_cssclass("btn_prev2");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Static(
        "sta_topTitle00",
        "1340",
        "338",
        null,
        "30",
        "btn_next:5",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("5");
      obj.set_font('normal 16px/normal "basefont"');
      obj.set_color("#222222");
      obj.set_text("다음");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static06_00_00",
        "10",
        "345",
        "217",
        null,
        null,
        "web_atnlcNotcCtnt:5",
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("6");
      obj.set_text("공지사항");
      obj.set_cssclass("sta_PF_Title01");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_fileDown",
        "670",
        "web_atnlcNotcCtnt:16",
        "101",
        "30",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("7");
      obj.set_text("안내문 파일 보기");
      obj.set_cssclass("btn_save");
      this.addChild(obj.name, obj);

      obj = new ImageViewer(
        "img_logo",
        "91",
        "0",
        "132",
        "50",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("8");
      obj.set_border("0px none");
      obj.set_image("url(\'theme::edu/logo/logo-seowon.png\')");
      obj.set_background("transparent");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static00",
        "245",
        "14",
        "190",
        "20",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("9");
      obj.set_usedecorate("true");
      obj.set_text("<b v=\'true>수강신청 시스템</b>");
      this.addChild(obj.name, obj);

      obj = new ImageViewer(
        "ImageViewer00",
        "0",
        "46",
        null,
        "230",
        "0",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("10");
      obj.set_image("url(\'theme::edu/login/bg-edit.png\')");
      obj.set_stretch("fit");
      obj.set_border("0px none");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static00_01",
        "95",
        "60",
        "525",
        "50",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("11");
      obj.set_text("<b v=\'true>수강신청 로그인</b>");
      obj.set_usedecorate("true");
      obj.set_cssclass("sta_bid_title5");
      obj.set_color("#ffffff");
      this.addChild(obj.name, obj);

      obj = new Div(
        "div_main",
        "480",
        "86",
        "480",
        "249",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Edit(
        "edt_stuno",
        "40",
        "30",
        null,
        "40",
        "40",
        null,
        null,
        null,
        null,
        null,
        this.div_main.form
      );
      obj.set_initvalueid("base");
      obj.set_maxlength("20");
      obj.set_taborder("0");
      obj.set_font('normal 12pt/normal "basefont"');
      obj.set_cssclass("essential ext_login");
      obj.set_autoselect("true");
      obj.set_displaynulltext("학번");
      obj.set_text("4");
      this.div_main.addChild(obj.name, obj);

      obj = new Edit(
        "edt_pswd",
        "40",
        "100",
        null,
        "40",
        "40",
        null,
        null,
        null,
        null,
        null,
        this.div_main.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_font('normal 12pt/normal "basefont"');
      obj.set_cssclass("essential ext_login");
      obj.set_autoselect("true");
      obj.set_displaynulltext("비밀번호");
      obj.set_password("true");
      obj.set_text("비밀번호");
      this.div_main.addChild(obj.name, obj);

      obj = new Button(
        "btn_login",
        "40",
        "176",
        null,
        "52",
        "40",
        null,
        null,
        null,
        null,
        null,
        this.div_main.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_text("로그인");
      obj.set_cssclass("ext_confirm");
      obj.set_background("#004f9f");
      obj.set_borderRadius("10px");
      obj.set_color("#ffffff");
      obj.set_font('normal 16px/normal "basefont"');
      this.div_main.addChild(obj.name, obj);

      obj = new Combo(
        "cbo_langCd",
        "10",
        "220",
        "20",
        "20",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_main.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_codecolumn("code");
      obj.set_datacolumn("fullNm");
      obj.set_innerdataset("dsLangCd");
      obj.set_cssclass("essential ext_login");
      obj.set_visible("false");
      obj.set_enable("false");
      obj.set_value("0");
      obj.set_index("0");
      this.div_main.addChild(obj.name, obj);

      obj = new Radio(
        "rdo_langCd",
        "984",
        "335",
        null,
        "37",
        "btn_prev:20",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("12");
      obj.set_innerdataset("dsLangCd");
      obj.set_codecolumn("code");
      obj.set_datacolumn("fullNm");
      obj.set_direction("vertical");
      obj.set_fittocontents("none");
      obj.set_cssclass("essential");
      obj.set_text("동의");
      obj.set_index("0");
      this.addChild(obj.name, obj);

      obj = new Div(
        "div_atnlcNotcCtnt",
        "50",
        "130",
        "1340",
        "772",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("13");
      obj.set_text("Div00");
      obj.set_border("1px solid");
      obj.set_visible("false");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static07",
        "10",
        "8",
        "217",
        "28",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_atnlcNotcCtnt.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("공지사항");
      obj.set_cssclass("sta_WF_Title01");
      this.div_atnlcNotcCtnt.addChild(obj.name, obj);

      obj = new WebBrowser(
        "web_atnlcNotcCtnt",
        "7",
        "45",
        null,
        null,
        "9",
        "52",
        null,
        null,
        null,
        null,
        this.div_atnlcNotcCtnt.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_accessibilityrole("webbrowser");
      obj.set_border("1px solid");
      obj.set_enable("false");
      this.div_atnlcNotcCtnt.addChild(obj.name, obj);

      obj = new Button(
        "btn_close",
        "677",
        null,
        "47",
        "30",
        null,
        "12",
        null,
        null,
        null,
        null,
        this.div_atnlcNotcCtnt.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_text("닫기");
      obj.set_cssclass("btn_POP_Control");
      this.div_atnlcNotcCtnt.addChild(obj.name, obj);

      obj = new Button(
        "btn_fileDown",
        "570",
        "728",
        "101",
        "30",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_atnlcNotcCtnt.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_text("안내문 파일 보기");
      obj.set_cssclass("btn_save");
      obj.set_visible("true");
      this.div_atnlcNotcCtnt.addChild(obj.name, obj);
      // Layout Functions
      //-- Default Layout : this
      obj = new Layout("default", "", 1440, 906, this, function (p) {});
      this.addLayout(obj.name, obj);

      // BindItem Information
      obj = new BindItem("item0", "div_main.form.edt_menuId", "value", "dsCsys220", "menuId");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item1", "div_main.form.edt_korMenuNm", "value", "dsCsys220", "menuNm");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item2", "div_main.form.edt_engMenuNm", "value", "dsCsys220", "menuEngNm");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item3", "div_main.form.edt_pmenuNm00", "value", "dsCsys220", "menuChnNm");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item4", "div_main.form.edt_stuno", "value", "dsParam", "stuno");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item5", "div_main.form.edt_pswd", "value", "dsParam", "password");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item7", "div_main00.form.edt_menuId", "value", "dsCsys220", "menuId");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item8", "div_main00.form.edt_korMenuNm", "value", "dsCsys220", "menuNm");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem(
        "item9",
        "div_main00.form.edt_engMenuNm",
        "value",
        "dsCsys220",
        "menuEngNm"
      );
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem(
        "item10",
        "div_main00.form.edt_pmenuNm00",
        "value",
        "dsCsys220",
        "menuChnNm"
      );
      this.addChild(obj.name, obj);
      obj.bind();

      // TriggerItem Information
    };

    this.loadPreloadList = function () {};

    // User Script
    this.addIncludeScript("saplap0120.xfdl", "LIB::libInclude.xjs");
    this.registerScript("saplap0120.xfdl", function () {
      /***************************************************************************************************
       * 화면(명)   : saplap0120 ( [학생]수강신청 로그인 )
       * 화면 설명  : [학생]수강신청 로그인
       * 작성자     : LEESANGGEUN
       ***************************************************************************************************/
      this.executeIncludeScript("LIB::libInclude.xjs"); /*include "LIB::libInclude.xjs"*/

      // 최초 화면 Load시 처리 할 사항
      this.form_onload = function (obj, e) {
        // 화면 초기화 (필수)
        this.initForm(obj, e);

        this.titleSetting();

        this.componentSetting();

        this.dsAppcs.copyData(this.parent.parent.dsApplyGLIO);

        this.utils.initWebViewer(this.web_atnlcNotcCtnt);
        this.utils.initWebViewer(this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt);

        //학사력 조회
        this.findScomUnvfrSchdlInfo("1", "SAPL00010001", "20000", "", "", "", "", "", ""); // 20000:학부

        //수강신청일정 조회
        //this.findRecanList2();

        this.isLogin();
      };

      this.titleSetting = function () {};

      this.componentSetting = function () {
        //     this.utils.comboLoad([
        //         [ "dsLangCd", "CSYS0120", "1", "X", "N" ]
        //     ]);

        this.div_main.form.cbo_langCd.set_index(0);
      };

      //학사력 조회
      this.findScomUnvfrSchdlInfo = function (
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
        this.utils.transaction({
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
          async: false,
          callback: function () {
            //학사력 셋팅
            this.dsParam.set("syy", this.dsUnvfc.get("reslt").substr(0, 4));
            this.dsParam.set("smtCd", this.dsUnvfc.get("reslt").substr(4, 2));
            this.dsParam.set("unvfrStdrDeptCd", "20000"); // 20000:학부
            //수강신청공지사항 조회
            this.findAppcsNotcList();
          }
        });
      };

      //공지사항 조회
      this.findAppcsNotcList = function () {
        this.dsParam.set("notcClCd", "L");

        this.utils.transaction({
          url: "com/SsoCtr/findAppcsNotcList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsSapl011=dsSapl011",
          callback: function () {
            // 안내문 표시
            if (this.rdo_langCd.value == "ko") {
              this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(0, "atnlcNotcCtnt"));
            } else if (this.rdo_langCd.value == "en") {
              this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(0, "atnlcNotcEngCtnt"));
            } else if (this.rdo_langCd.value == "zh") {
              this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(0, "atnlcNotcChnCtnt"));
            }

            if (this.dsSapl011.getColumn(0, "emrgyNotcTrgetYn") == "1") {
              this.div_atnlcNotcCtnt.set_visible(true);
              // 안내문 표시
              if (this.rdo_langCd.value == "ko") {
                this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt.setValue(
                  this.dsSapl011.getColumn(0, "atnlcNotcCtnt")
                );
              } else if (this.rdo_langCd.value == "en") {
                this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt.setValue(
                  this.dsSapl011.getColumn(0, "atnlcNotcEngCtnt")
                );
              } else if (this.rdo_langCd.value == "zh") {
                this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt.setValue(
                  this.dsSapl011.getColumn(0, "atnlcNotcChnCtnt")
                );
              }
            }
          }
        });
      };

      //수강신청일정 조회
      this.findRecanList = function () {
        this.utils.transaction({
          url: "com/SsoCtr/findAppcsSchdlList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsSapl121=dsSapl121",
          async: false,
          callback: function () {}
        });
      };

      this.findRecanList2 = function () {
        this.utils.transaction({
          url: "com/SsoCtr/findAppcsLoginChk.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsLoginInfoChk=dsLoginInfoChk",
          async: false,
          callback: function () {
            var menuId = "";
            var param = "";

            if (this.dsLoginInfoChk.findRowExpr("appcsSchdlCd== '220' && possYn == '1'") > -1) {
              menuId = "M100779"; //장바구니
            } else if (
              this.dsLoginInfoChk.findRowExpr("(appcsSchdlCd == '310' && possYn == '1')") > -1
            ) {
              //신입생,편입생 수강신청 대상 여부
              if (this.dsLoginInfoChk.findRowExpr("appcsTrgetTypeCnt == '1'") > -1) {
                var smtCd = this.dsParam.get("smtCd");
                var entnsDt = this.dsStunoInfo.get("entnsDt");

                if (smtCd == "10" && entnsDt.substr(4, 2) != "02") {
                  this.utils.alert("신·편입생 수강신청 대상자가 아닙니다.");
                  return;
                } else if (smtCd == "20" && entnsDt.substr(4, 2) != "08") {
                  this.utils.alert("신·편입생 수강신청 대상자가 아닙니다.");
                  return;
                }
              }
              menuId = "M100780"; //수강신청
            } else if (
              this.dsLoginInfoChk.findRowExpr("(appcsSchdlCd == '320' && possYn == '1')") > -1
            ) {
              menuId = "M105312"; //학부생 대학원 수강신청
            } else if (
              this.dsLoginInfoChk.findRowExpr("appcsSchdlCd == '330' && possYn == '1'") > -1
            ) {
              menuId = "M100781"; //기타(과정)수강신청
            } else if (
              this.dsLoginInfoChk.findRowExpr("(appcsSchdlCd == '340' && possYn == '1')") > -1
            ) {
              //신입생,편입생 수강신청 대상 여부
              if (this.dsLoginInfoChk.findRowExpr("appcsTrgetTypeCnt == '1'") > -1) {
                var smtCd = this.dsParam.get("smtCd");
                var entnsDt = this.dsStunoInfo.get("entnsDt");

                if (smtCd == "10" && entnsDt.substr(4, 2) != "02") {
                  this.utils.alert("신·편입생 수강신청 대상자가 아닙니다.");
                  return;
                } else if (smtCd == "20" && entnsDt.substr(4, 2) != "08") {
                  this.utils.alert("신·편입생 수강신청 대상자가 아닙니다.");
                  return;
                }
              }
              menuId = "M100780"; //수강신청
            } else {
              this.utils.alert("수강신청 로그인 기간이 아닙니다.");
              return;
            }
            this.parent.parent.dsStdInfo.setColumn(0, "stuno", this.dsStunoInfo.get("stuno"));
            this.parent.parent.dsStdInfo.setColumn(0, "stdNm", this.dsStunoInfo.get("stdntNm"));
            this.parent.parent.dsStdInfo.setColumn(
              0,
              "stdStat",
              this.dsStunoInfo.get("schrgSttusNm")
            );
            this.parent.parent.dsStdInfo.setColumn(
              0,
              "asignDeprtCd",
              this.dsStunoInfo.get("deprtNm")
            );
            this.parent.parent.dsStdInfo.setColumn(0, "hy", this.dsStunoInfo.get("hy"));

            this.parent.parent.openMain({
              menuId: menuId,
              callback: "openMenuCallBack",
              param: this.dsStunoInfo,
              topMenuYn: "0"
            });
          }
        });
      };

      // 로그인 확인
      this.isLogin = function () {
        var param = "";

        var application = nexacro.getApplication();

        this.utils.transaction({
          url: "com/SsoCtr/isLogin.do",
          outDS: "DS_LOGINCONFIRM=DS_LOGINCONFIRM gds_viewSession=DS_SESSIONINFO",
          callback: function () {
            var loginContext = this;
            if (loginContext.DS_LOGINCONFIRM.getColumn(0, "isLogin") == "1") {
              //this.findRecanList2();
              this.findStunoInfo();
            }
            //
            // 			var onloadVal = setInterval(function(){
            // 				if (application._doneOnload) {
            // 					try {
            // 						clearInterval(onloadVal);
            // 						if(loginContext.DS_LOGINCONFIRM.getColumn(0,"isLogin") == "1") {
            // 							this.findRecanList2();
            // // 							loginContext.parent.parent.openMain({
            // // 								menuId : menuId
            // // 								,callback : "openMenuCallBack"
            // // 								,param : param
            // // 								,topMenuYn : "0"
            // // 							});
            // 						}
            // 					} catch (e) {}
            // 				}
            // 			}, 70);
          }
        });
      };

      this.div_main_btn_login_onclick = function (obj, e) {
        var param = "";

        if (!this.utils.isValid(this.dsParam, this.dsValidation)) return false;

        // 	this.dsParam.set("syy", "2021");
        // 	this.dsParam.set("smtCd", "10");
        // 	this.dsParam.set("stuno", "20165065");
        // 	this.dsParam.set("password", "erp2022!");
        // 	this.dsParam.set("unvfrStdrDeptCd", "20000");

        this.dsParam.set("appcsKindCd", "100");

        this.utils.transaction({
          url: "com/SsoCtr/findAppcsLogin.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsFlag=dsFlag gds_viewSession=dsSession",
          callback: function () {
            if (this.dsFlag.get("initPswdYn") == "1") {
              this.utils.alert(
                "현재 비밀번호가 최초 생성된 비밀번호입니다.\n비밀번호 변경 후 이용 부탁드립니다.\n(팝업 차단을 확인해주세요.)"
              );
              //var url = "https://info.seowon.ac.kr/nx/index.html?page=findpw";
              var url = "https://info.seowon.ac.kr/por/pg?pgmId=P002424";
              window.open(url);
            } else {
              if (this.dsFlag.get("flag") == "1") {
                //수강신청일정 조회
                //this.findRecanList2();
                //학생정보 조회
                this.findStunoInfo();
              } else {
                this.utils.alert("비밀번호가 올바르지 않습니다.");
              }
            }
          }
        });
      };

      this.div_main_edt_pswd_onkeyup = function (obj, e) {
        if (e.keycode == "13") {
          this.div_main_btn_login_onclick();
        }
      };

      this.btn_next_onclick = function (obj, e) {
        var rCnt = this.dsSapl011.rowposition + 1;

        if (this.dsSapl011.rowcount > rCnt) {
          this.dsSapl011.set_rowposition(rCnt);
          //if(this.dsSapl011.getColumn(rCnt, "nlognNotcYn") == "1"){
          // 안내문 표시
          if (this.rdo_langCd.value == "ko") {
            this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(rCnt, "atnlcNotcCtnt"));
          } else if (this.rdo_langCd.value == "en") {
            this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(rCnt, "atnlcNotcEngCtnt"));
          } else if (this.rdo_langCd.value == "zh") {
            this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(rCnt, "atnlcNotcChnCtnt"));
          }
          //}
        }
      };

      this.btn_prev_onclick = function (obj, e) {
        var rCnt = this.dsSapl011.rowposition - 1;

        if (0 <= rCnt) {
          this.dsSapl011.set_rowposition(rCnt);
          //if(this.dsSapl011.getColumn(rCnt, "nlognNotcYn") == "1"){
          // 안내문 표시
          if (this.rdo_langCd.value == "ko") {
            this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(rCnt, "atnlcNotcCtnt"));
          } else if (this.rdo_langCd.value == "en") {
            this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(rCnt, "atnlcNotcEngCtnt"));
          } else if (this.rdo_langCd.value == "zh") {
            this.web_atnlcNotcCtnt.setValue(this.dsSapl011.getColumn(rCnt, "atnlcNotcChnCtnt"));
          }
          //}
        }
      };

      this.btn_fileDown_onclick = function (obj, e) {
        this.commonPopup.fileD.open({
          table: "SCH.SAPL011",
          fileNo: this.dsSapl011.getColumn(this.dsSapl011.rowposition, "attflUuid"),
          callback: function (id, data) {
            if (data && data.fileNo) {
            }
          }
        });
      };

      this.btn_close_onclick = function (obj, e) {
        this.div_atnlcNotcCtnt.set_visible(false);
      };

      this.findStunoInfo = function () {
        if (!this.utils.isValid(this.dsParam.get("stuno"))) {
          this.dsParam.set("stuno", this.utils.getGLIO(["loginId"]).loginId);
        }

        this.utils.transaction({
          url: "com/SsoCtr/findStunoInfo.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsStunoInfo=dsStunoInfo",
          async: false,
          callback: function () {
            if (this.dsStunoInfo.rowcount > 0) {
              this.dsParam.set("deptCd", this.dsStunoInfo.get("deptCd"));
              this.dsParam.set("hy", this.dsStunoInfo.get("hy"));
              this.dsParam.set("unvfrStdrDeptCd", this.dsStunoInfo.get("unvfrStdrDeptCd"));

              this.parent.parent.dsStdInfo.setColumn(0, "stuno", this.dsStunoInfo.get("stuno"));
              this.parent.parent.dsStdInfo.setColumn(0, "stdNm", this.dsStunoInfo.get("stdntNm"));
              this.parent.parent.dsStdInfo.setColumn(
                0,
                "stdStat",
                this.dsStunoInfo.get("schrgSttusNm")
              );
              this.parent.parent.dsStdInfo.setColumn(
                0,
                "asignDeprtCd",
                this.dsStunoInfo.get("deprtNm")
              );
              this.parent.parent.dsStdInfo.setColumn(0, "hy", this.dsStunoInfo.get("hy"));

              this.findRecanList2();
            } else {
              this.utils.alert("수강신청 대상자 정보를 확인하시기 바랍니다.");
            }
          }
        });
      };
      this.rdo_langCd_onitemchanged = function (obj, e) {
        //this.findAppcsNotcList();
        if (this.rdo_langCd.value == "ko") {
          this.web_atnlcNotcCtnt.setValue(
            this.dsSapl011.getColumn(this.dsSapl011.rowposition, "atnlcNotcCtnt")
          );
        } else if (this.rdo_langCd.value == "en") {
          this.web_atnlcNotcCtnt.setValue(
            this.dsSapl011.getColumn(this.dsSapl011.rowposition, "atnlcNotcEngCtnt")
          );
        } else if (this.rdo_langCd.value == "zh") {
          this.web_atnlcNotcCtnt.setValue(
            this.dsSapl011.getColumn(this.dsSapl011.rowposition, "atnlcNotcChnCtnt")
          );
        }
      };
    });

    // Regist UI Components Event
    this.on_initEvent = function () {
      this.addEventHandler("onload", this.form_onload, this);
      this.btn_next.addEventHandler("onclick", this.btn_next_onclick, this);
      this.btn_prev.addEventHandler("onclick", this.btn_prev_onclick, this);
      this.btn_fileDown.addEventHandler("onclick", this.btn_fileDown_onclick, this);
      this.div_main.form.edt_pswd.addEventHandler("onkeyup", this.div_main_edt_pswd_onkeyup, this);
      this.div_main.form.btn_login.addEventHandler(
        "onclick",
        this.div_main_btn_login_onclick,
        this
      );
      this.rdo_langCd.addEventHandler("onitemchanged", this.rdo_langCd_onitemchanged, this);
      this.div_atnlcNotcCtnt.form.btn_close.addEventHandler(
        "onclick",
        this.btn_close_onclick,
        this
      );
      this.div_atnlcNotcCtnt.form.btn_fileDown.addEventHandler(
        "onclick",
        this.btn_fileDown_onclick,
        this
      );
      this.dsSapl011.addEventHandler("canrowposchange", this.dsSapl011_canrowposchange, this);
      this.dsSapl011.addEventHandler("onrowposchanged", this.dsSapl011_onrowposchanged, this);
      this.dsSapl011.addEventHandler("oncolumnchanged", this.dsSapl011_oncolumnchanged, this);
      this.dsParam.addEventHandler("oncolumnchanged", this.dsParam_oncolumnchanged, this);
      this.dsSapl121.addEventHandler("onrowposchanged", this.dsSapl121_onrowposchanged, this);
      this.dsSapl121.addEventHandler("canrowposchange", this.dsSapl121_canrowposchange, this);
    };
    this.loadIncludeScript("saplap0120.xfdl");
    this.loadPreloadList();

    // Remove Reference
    obj = null;
  };
})();
