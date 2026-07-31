(function () {
  return function () {
    if (!this._is_form) return;

    var obj = null;

    this.on_create = function () {
      this.set_name("Form_Tab");
      if (Form == this.constructor) {
        this._setFormPosition(1150, 40);
      }

      // Object(Dataset, ExcelExportObject) Initialize
      obj = new Dataset("ds_multiLangData", this);
      obj._setContents(
        '<ColumnInfo><Column id="useYn" type="string" size="32"/><Column id="rowUpdateGb" type="string" size="32"/><Column id="messageKey" type="string" size="32"/><Column id="messageKo" type="string" size="32"/><Column id="messageEn" type="string" size="32"/><Column id="messageZh" type="string" size="32"/><Column id="pgmId" type="string" size="32"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsCsys220", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="menuId" type="STRING" size="256"/><Column id="pgmId" type="STRING" size="256"/><Column id="sysCd" type="STRING" size="256"/><Column id="menuDivCd" type="STRING" size="256"/><Column id="menuNm" type="STRING" size="256"/><Column id="menuEngNm" type="STRING" size="256"/><Column id="menuChnNm" type="STRING" size="256"/><Column id="upperMenuId" type="STRING" size="256"/><Column id="mvmnUrl" type="STRING" size="256"/><Column id="useYn" type="STRING" size="256"/><Column id="dispOrd" type="BigDecimal" size="256"/><Column id="indinUseYn" type="STRING" size="256"/><Column id="addAttrbVal1" type="STRING" size="256"/><Column id="addAttrbVal2" type="STRING" size="256"/><Column id="addAttrbVal3" type="STRING" size="256"/><Column id="menuLevel" type="STRING" size="256"/><Column id="pgmNm" type="STRING" size="256"/><Column id="pgmPathNm" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsDepth3", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="menuId" type="STRING" size="256"/><Column id="pgmId" type="STRING" size="256"/><Column id="sysCd" type="STRING" size="256"/><Column id="menuDivCd" type="STRING" size="256"/><Column id="menuNm" type="STRING" size="256"/><Column id="menuEngNm" type="STRING" size="256"/><Column id="menuChnNm" type="STRING" size="256"/><Column id="upperMenuId" type="STRING" size="256"/><Column id="mvmnUrl" type="STRING" size="256"/><Column id="useYn" type="STRING" size="256"/><Column id="dispOrd" type="BigDecimal" size="256"/><Column id="indinUseYn" type="STRING" size="256"/><Column id="addAttrbVal1" type="STRING" size="256"/><Column id="addAttrbVal2" type="STRING" size="256"/><Column id="addAttrbVal3" type="STRING" size="256"/><Column id="menuLevel" type="STRING" size="256"/><Column id="pgmNm" type="STRING" size="256"/><Column id="pgmPathNm" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsMenu", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="menuId" type="STRING" size="256"/><Column id="pgmId" type="STRING" size="256"/><Column id="sysCd" type="STRING" size="256"/><Column id="menuDivCd" type="STRING" size="256"/><Column id="menuNm" type="STRING" size="256"/><Column id="menuEngNm" type="STRING" size="256"/><Column id="menuChnNm" type="STRING" size="256"/><Column id="upperMenuId" type="STRING" size="256"/><Column id="mvmnUrl" type="STRING" size="256"/><Column id="useYn" type="STRING" size="256"/><Column id="dispOrd" type="BigDecimal" size="256"/><Column id="indinUseYn" type="STRING" size="256"/><Column id="addAttrbVal1" type="STRING" size="256"/><Column id="addAttrbVal2" type="STRING" size="256"/><Column id="addAttrbVal3" type="STRING" size="256"/><Column id="menuLevel" type="STRING" size="256"/><Column id="pgmNm" type="STRING" size="256"/><Column id="pgmPathNm" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      // UI Components Initialize
      obj = new Static("sta_mdi_bg", "0", "0", null, null, "0", "0", null, null, null, null, this);
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_cssclass("sta_mdi_bg");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Edit("edit_focus", "0", "0", "0", "0", null, null, null, null, null, null, this);
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_visible("true");
      obj.set_value("focus");
      obj.set_font("normal 14px/normal basefont");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_home",
        "100",
        "12",
        "18",
        "16",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_cssclass("btn_home");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static01",
        "btn_home:20",
        "12",
        "1",
        "16",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_cssclass("sta_bar");
      this.addChild(obj.name, obj);

      obj = new Combo(
        "cbo_depth3",
        "Static01:20",
        "0",
        "150",
        null,
        null,
        "0",
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("4");
      obj.set_cssclass("cbo_portalNavi");
      obj.set_innerdataset("dsDepth3");
      obj.set_codecolumn("menuId");
      obj.set_datacolumn("menuNm");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static01_00",
        "cbo_depth3:5",
        "12",
        "1",
        "16",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("5");
      obj.set_cssclass("sta_bar");
      this.addChild(obj.name, obj);

      obj = new Combo(
        "cbo_menu",
        "Static01_00:15",
        "0",
        "220",
        null,
        null,
        "0",
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("6");
      obj.set_cssclass("cbo_portalMenu");
      obj.set_innerdataset("dsMenu");
      obj.set_codecolumn("menuId");
      obj.set_datacolumn("menuNm");
      this.addChild(obj.name, obj);
      // Layout Functions
      //-- Default Layout : this
      obj = new Layout("default", "portal", 1150, 40, this, function (p) {});
      obj.set_mobileorientation("landscape");
      this.addLayout(obj.name, obj);

      // BindItem Information

      // TriggerItem Information
    };

    this.loadPreloadList = function () {};

    // User Script
    this.addIncludeScript("portalTabFrame.xfdl", "LIB::libForm.xjs");
    this.addIncludeScript("portalTabFrame.xfdl", "LIB::libComm.xjs");
    this.registerScript("portalTabFrame.xfdl", function () {
      /***************************************************************************************************
       * 화면(명)   :
       * 화면 설명  :
       * 작성자     :
       ***************************************************************************************************/
      this.executeIncludeScript("LIB::libForm.xjs"); /*include "LIB::libForm.xjs"*/
      this.executeIncludeScript("LIB::libComm.xjs"); /*include "LIB::libComm.xjs"*/

      //  01. 최초 화면 Load시 처리 할 사항
      this.form_onload = function (obj, e) {
        this.initForm(obj, e, {
          eachExtend: 1,
          devFlag: false
        });
        this.utils.extendComponent(this.dsDepth3);
        this.utils.extendComponent(this.dsMenu);
      };

      this.setNavi = function (data) {
        return;
        this.dsCsys220.set_filterstr("");
        var row = this.dsCsys220.findRowExpr("menuId=='" + data.upperMenuId + "'");
        var upperMenuId = this.dsCsys220.getColumn(row, "upperMenuId");
        this.dsCsys220.set_filterstr("upperMenuId == '" + upperMenuId + "'");
        this.dsDepth3.copyData(this.dsCsys220, true);

        this.cbo_depth3.set_value(data.upperMenuId);
        this.cbo_depth3_onitemchanged();

        this.cbo_menu.set_value(data.menuId);
      };

      this.setMenuList = function (ds) {
        this.dsCsys220.copyData(ds);
      };
      // 중메뉴 변경시
      this.cbo_depth3_onitemchanged = function (obj, e) {
        this.dsCsys220.set_filterstr("upperMenuId == '" + this.cbo_depth3.value + "'");
        this.dsMenu.copyData(this.dsCsys220, true);
        this.dsMenu.addFirstComboRow("s", "menuId", "menuNm");
        this.cbo_menu.set_index(0);
      };

      this.cbo_menu_onitemchanged = function (obj, e) {
        if (obj.value) {
          this.utils.openMenu(obj.value);
        }
      };

      this.getCurrentChildFrame = function () {
        return nexacro.getApplication().gv_AppWorkFrameSet.ChildFrame;
      };
    });

    // Regist UI Components Event
    this.on_initEvent = function () {
      this.addEventHandler("onload", this.form_onload, this);
      this.cbo_depth3.addEventHandler("onitemchanged", this.cbo_depth3_onitemchanged, this);
      this.cbo_menu.addEventHandler("onitemchanged", this.cbo_menu_onitemchanged, this);
      this.dsCsys220.addEventHandler("onrowposchanged", this.setEnable, this);
      this.dsDepth3.addEventHandler("onrowposchanged", this.setEnable, this);
      this.dsMenu.addEventHandler("onrowposchanged", this.setEnable, this);
    };
    this.loadIncludeScript("portalTabFrame.xfdl");
    this.loadPreloadList();

    // Remove Reference
    obj = null;
  };
})();
