(function () {
  return function () {
    if (!this._is_form) return;

    var obj = null;

    this.on_create = function () {
      this.set_name("workFrame");
      this.set_background("#fafafa");
      this.set_scrollbarsize("0");
      if (Form == this.constructor) {
        this._setFormPosition(1400, 807);
      }

      // Object(Dataset, ExcelExportObject) Initialize
      obj = new Dataset("ds_multiLangData", this);
      obj._setContents(
        '<ColumnInfo><Column id="msgId" type="STRING" size="256"/><Column id="pgmId" type="STRING" size="256"/><Column id="msgVal" type="STRING" size="256"/><Column id="langGbn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("ds_multiLangSaveTarget", this);
      obj._setContents(
        '<ColumnInfo><Column id="msgId" type="STRING" size="256"/><Column id="pgmId" type="STRING" size="256"/><Column id="msgVal" type="STRING" size="256"/><Column id="orginlMsgVal" type="STRING" size="256"/><Column id="langGbn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsParam", this);
      obj._setContents(
        '<ColumnInfo><Column id="menuId" type="STRING" size="256"/><Column id="authYn" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsStdInfo", this);
      obj._setContents(
        '<ColumnInfo><Column id="stuno" type="STRING" size="256"/><Column id="stdNm" type="STRING" size="256"/><Column id="stdStat" type="STRING" size="256"/><Column id="asignDeprtCd" type="STRING" size="256"/><Column id="hy" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      // UI Components Initialize
      obj = new ImageViewer(
        "ImageViewer00",
        "0",
        "-20",
        null,
        "220",
        "0",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("3");
      obj.set_image("url(\'theme::edu/login/bg-edit.png\')");
      obj.set_border("0px none");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Div("Div00", "30", "60", null, null, "30", "0", null, null, null, null, this);
      obj.set_taborder("2");
      obj.set_text("Div00");
      obj.set_borderRadius("5px 5px");
      this.addChild(obj.name, obj);

      obj = new Div(
        "Div00",
        "600",
        "10",
        null,
        "81",
        "1",
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("");
      obj.set_visible("false");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static04",
        "16",
        "6",
        "70",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("학번");
      obj.set_cssclass("portal");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static04_00",
        "298",
        "6",
        "40",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_text("성명");
      obj.set_cssclass("portal");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static04_01",
        "16",
        "43",
        "70",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_text("학과/전공");
      obj.set_cssclass("portal");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static04_00_00",
        "539",
        "43",
        "40",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_text("학년");
      obj.set_cssclass("portal");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Edit(
        "edt_asignDeprtCd",
        "104",
        "43",
        "419",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("4");
      obj.set_cssclass("portal");
      obj.set_readonly("true");
      obj.set_value("경영학과");
      obj.set_text("경영학과");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Edit(
        "edt_stdno",
        "104",
        "6",
        "187",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("5");
      obj.set_cssclass("portal");
      obj.set_readonly("true");
      obj.set_value("1234");
      obj.set_text("1234");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Edit(
        "edt_hy",
        "Static04_00_00:37",
        "43",
        "107",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("6");
      obj.set_cssclass("portal");
      obj.set_readonly("true");
      obj.set_value("1");
      obj.set_text("1");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Edit(
        "edt_stdNm",
        "Static04_00:18",
        "6",
        "167",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("7");
      obj.set_cssclass("portal");
      obj.set_readonly("true");
      obj.set_value("홍길동");
      obj.set_text("홍길동");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static04_00_01",
        "539",
        "6",
        "60",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("8");
      obj.set_text("학적상태");
      obj.set_cssclass("portal");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Edit(
        "edt_stdStat",
        "616",
        "6",
        "107",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("9");
      obj.set_cssclass("portal");
      obj.set_readonly("true");
      obj.set_value("홍길동");
      obj.set_text("홍길동");
      this.Div00.form.Div00.addChild(obj.name, obj);

      obj = new Div("div_Work", "80", "150", null, null, "80", "0", null, null, null, null, this);
      obj.set_taborder("1");
      obj.set_async("false");
      obj.set_cssclass("workFrame");
      obj.set_formscrollbarsize("10");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Static(
        "stc_title",
        "80",
        "90",
        "580",
        "40",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_taborder("0");
      obj.set_cssclass("ext_sta_WF_title");
      obj.set_fittocontents("width");
      obj.set_font('normal 500 30px/normal "basefont"');
      obj.set_text("");
      this.addChild(obj.name, obj);
      // Layout Functions
      //-- Default Layout : this
      obj = new Layout("default", "", 1400, 807, this, function (p) {});
      this.addLayout(obj.name, obj);

      // BindItem Information

      // TriggerItem Information
    };

    this.loadPreloadList = function () {};

    // User Script
    this.addIncludeScript("portalFrame.xfdl", "LIB::libForm.xjs");
    this.addIncludeScript("portalFrame.xfdl", "LIB::libComm.xjs");
    this.addIncludeScript("portalFrame.xfdl", "LIB::libDate.xjs");
    this.addIncludeScript("portalFrame.xfdl", "LIB::libCheck.xjs");
    this.registerScript("portalFrame.xfdl", function () {
      /***************************************************************************************************
       * 화면(명)   :
       * 화면 설명  :
       * 작성자     :
       ***************************************************************************************************/
      this.executeIncludeScript("LIB::libForm.xjs"); /*include "LIB::libForm.xjs"*/
      this.executeIncludeScript("LIB::libComm.xjs"); /*include "LIB::libComm.xjs"*/
      this.executeIncludeScript("LIB::libDate.xjs"); /*include "LIB::libDate.xjs"*/
      this.executeIncludeScript("LIB::libCheck.xjs"); /*include "LIB::libCheck.xjs"*/

      // 최초 화면 Load시 처리 할 사항
      this.form_onload = function (obj, e) {
        this.MENU_GRADE = 0;

        this.initForm(obj, e, {
          eachExtend: 1,
          devFlag: false
        });

        this.checkUtils = this._commonExtendUtils.checkUtils();
        this.dateUtils = this._commonExtendUtils.dateUtils();

        // 다국어
        /*
        	var roleGroup = this.utils.getGLIO().roleGroup;
            if (("R00001" in roleGroup) && application.locale != "ko") {
                this.btn_multiLang.set_visible(true);
            }
            */

        var data = this.getOwnerFrame().arguments;
        application.gv_AppTabPath.form.setNavi(data);

        if (this.vscrollbar) {
          this.vscrollbar.set_pos(0);
        }
        if (this.hscrollbar) {
          this.hscrollbar.set_pos(0);
        }

        // 메뉴 권한 변수 저장
        this.MENU_GRADE = parseInt(data.menuGrade);
        try {
          // 메뉴 다국어 메시지 조회
          this.findMultiLangList();
          // 페이지 로드
          var sPageUrl = "XUI::" + data.pgmPathNm + ".xfdl";
          this.div_Work.set_async(false);
          this.div_Work.set_url(sPageUrl);
          this.stc_title.set_text(data.menuNm);

          if (
            data.menuId == "M100779" ||
            data.menuId == "M100780" ||
            data.menuId == "M100781" ||
            data.menuId == "M105312" ||
            data.menuId == "M105313" ||
            data.menuId == "M105314"
          ) {
            this.dsStdInfo.copyData(application.gv_loginFrame.form.setStdInfo());

            this.Div00.form.Div00.form.edt_stdno.set_value(this.dsStdInfo.getColumn(0, "stuno"));
            this.Div00.form.Div00.form.edt_stdNm.set_value(this.dsStdInfo.getColumn(0, "stdNm"));
            this.Div00.form.Div00.form.edt_stdStat.set_value(
              this.dsStdInfo.getColumn(0, "stdStat")
            );
            this.Div00.form.Div00.form.edt_asignDeprtCd.set_value(
              this.dsStdInfo.getColumn(0, "asignDeprtCd")
            );
            this.Div00.form.Div00.form.edt_hy.set_value(this.dsStdInfo.getColumn(0, "hy"));

            this.Div00.form.Div00.set_visible(true);
          } else {
            this.Div00.form.Div00.set_visible(false);
          }

          // 다른 메뉴에서 열었을 경우에 대한 처리
          if (
            this.getOwnerFrame().openCallback &&
            typeof this.div_Work.form[this.getOwnerFrame().openCallback] == "function"
          ) {
            this.div_Work.form[this.getOwnerFrame().openCallback].call(
              this.div_Work.form,
              this.getOwnerFrame().openCallbackParam
            );
          }
        } catch (e) {
          null;
        }
        this.resetScroll();

        // 폼 resize를 위한 처리(2019-10-14)
        this.getOwnerFrame()._state_openstatus = 0;
      };

      // 화면 종료 전 처리(종료 여부 확인 등)
      this.workFrame_onbeforeclose = function (obj, e) {
        if (e.fromobject == "[object Form]") //div가 있을경우 2번타는 현상있음
        {
          var bRetVal = this.fn_formClose();

          if (!bRetVal)
            return "작업중인 자료가 있습니다. \n확인을 누르시면 작업중인 화면이 닫힙니다.";
        }
      };

      this.setMyMenu = function (flag) {
        if (flag == "1") {
          this.btn_favorites.set_cssclass("btn_PF_FavoriteOn");
        }
      };

      // 다국어 조회
      this.findMultiLangList = function () {
        if (application.locale && application.locale != "ko") {
          this.utils.transaction({
            url: "com/MenuCtr/findMesgList.do",
            outDS: "ds_multiLangData=DS_SSTM011",
            arg: "strPgmId=" + this.utils.getMenuInfo("pgmId"),
            async: false,
            callback: function () {}
          });
        }
      };
      // 마이메뉴 설정
      this.btn_favorites_onclick = function (obj, e) {
        this.dsMyMenu.clearData();
        this.dsMyMenu.addRow();
        this.dsMyMenu.set("menuId", this.getOwnerFrame().arguments.menuId);
        if (obj.cssclass == "btn_PF_FavoriteOff") {
          this.dsMyMenu.setRowType(0, Dataset.ROWTYPE_INSERT);
          obj.set_cssclass("btn_PF_FavoriteOn");
        } else {
          this.dsMyMenu.setRowType(0, Dataset.ROWTYPE_DELETE);
          obj.set_cssclass("btn_PF_FavoriteOff");
        }
        this.utils.transaction({
          url: "com/csys/CsysmnCtr/saveMyMenuList.do",
          inDS: "dsCsys228=dsMyMenu:U",
          async: false
        });
      };
      // 다국어 저장
      this.btn_multiLang_onclick = function (obj, e) {
        if (this.ds_multiLangSaveTarget.getRowCount() > 0) {
          this.utils.transaction({
            url: "com/MenuCtr/saveMultiLangList.do",
            inDS: "DS_SSTM011=ds_multiLangSaveTarget:U",
            callback: function () {
              if (this.ds_multiLangSaveTarget.getColumn(0, "pgmId") == "P000000") {
                application.gv_topFrame.form.findMultiLangList();
              }
              this.ds_multiLangData.appendData(this.ds_multiLangSaveTarget, true, true);
              this.ds_multiLangSaveTarget.clearData();
              this.utils.alert("저장되었습니다.");
            }
          });
        } else {
          this.utils.alert("저장할 데이터가 없습니다.");
        }
      };
    });

    // Regist UI Components Event
    this.on_initEvent = function () {
      this.addEventHandler("onload", this.form_onload, this);
      this.addEventHandler("onbeforeclose", this.workFrame_onbeforeclose, this);
      this.addEventHandler("onclose", this.workFrame_onclose, this);
      this.dsParam.addEventHandler("oncolumnchanged", this.dsParam_oncolumnchanged, this);
    };
    this.loadIncludeScript("portalFrame.xfdl");
    this.loadPreloadList();

    // Remove Reference
    obj = null;
  };
})();
