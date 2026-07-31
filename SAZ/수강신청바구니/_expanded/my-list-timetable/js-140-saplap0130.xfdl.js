(function () {
  return function () {
    if (!this._is_form) return;

    var obj = null;

    this.on_create = function () {
      this.set_initvalueid("base");
      this.set_name("saplap0130");
      this.set_scrolltype("vertical");
      this.set_titletext("[학생]장바구니수강신청");
      if (Form == this.constructor) {
        this._setFormPosition(1150, 750);
      }

      // Object(Dataset, ExcelExportObject) Initialize
      obj = new Dataset("dsParam", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="cmpsjHyDivCd" type="STRING" size="256"/><Column id="cmpsjDivCd" type="STRING" size="256"/><Column id="serchDiv" type="STRING" size="256"/><Column id="estblCrseDivCd" type="STRING" size="256"/><Column id="cltrDomnCd" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/><Column id="asignDeprtCd" type="STRING" size="256"/><Column id="subjtCd" type="STRING" size="256"/><Column id="corseDvclsNo" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsValidation", this);
      obj._setContents(
        '<ColumnInfo><Column id="compId" type="STRING" size="256"/><Column id="colId" type="STRING" size="256"/><Column id="PK" type="STRING" size="256"/><Column id="notNull" type="STRING" size="256"/><Column id="nLength" type="STRING" size="256"/><Column id="from" type="STRING" size="256"/><Column id="to" type="STRING" size="256"/><Column id="msgId" type="STRING" size="256"/><Column id="expr" type="STRING" size="256"/><Column id="func" type="STRING" size="256"/></ColumnInfo><Rows><Row><Col id="compId">dsParam</Col><Col id="notNull">Y</Col><Col id="colId">beginSyy</Col></Row><Row><Col id="compId">grd_sapl112</Col><Col id="notNull">Y</Col><Col id="colId">sortOrd</Col><Col id="msgId">정렬순서</Col></Row><Row><Col id="compId">grd_sapl112</Col><Col id="notNull">Y</Col><Col id="colId">lessnStdrItemNm</Col><Col id="msgId">기준항목명</Col></Row><Row><Col id="compId">grd_sapl113</Col><Col id="notNull">Y</Col><Col id="colId">lessnStdrItemId</Col><Col id="msgId">기준항목</Col><Col id="PK">Y</Col></Row><Row><Col id="compId">grd_sapl113</Col><Col id="notNull">Y</Col><Col id="colId">lessnStdrItemVal</Col><Col id="msgId">기준항목명</Col><Col id="PK">Y</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull">Y</Col><Col id="colId">applcTrgetDeptCd</Col><Col id="msgId">적용부서</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull"/><Col id="colId">applcTrgetDghtDivCd</Col><Col id="msgId">적용학위과정</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull">Y</Col><Col id="colId">applcTrgetDgriCrseCd</Col><Col id="msgId">적용주야구분</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull">Y</Col><Col id="colId">applcTrgetBeginHy</Col><Col id="msgId">적용시작학년</Col><Col id="nLength">1</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull">Y</Col><Col id="colId">applcTrgetEndHy</Col><Col id="msgId">적용종료학년</Col><Col id="nLength">1</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull">Y</Col><Col id="colId">applcTrgetBeginEntnsSyy</Col><Col id="msgId">적용시작입학년도</Col><Col id="nLength">4</Col></Row><Row><Col id="compId">grd_sapl114</Col><Col id="notNull">Y</Col><Col id="colId">applcTrgetEndEntnsSyy</Col><Col id="msgId">적용종료입학년도</Col><Col id="nLength">4</Col></Row><Row><Col id="compId">grd_sapl115</Col><Col id="colId">lessnStdrItemId</Col><Col id="PK">Y</Col><Col id="notNull">Y</Col><Col id="msgId">기준항목</Col></Row><Row><Col id="compId">grd_sapl115</Col><Col id="colId">lessnStdrItemVal</Col><Col id="PK">Y</Col><Col id="notNull">Y</Col><Col id="msgId">기준항목값</Col></Row><Row><Col id="compId">grd_sapl115</Col><Col id="colId">rpstSubjtCd</Col><Col id="PK">Y</Col><Col id="notNull">Y</Col><Col id="msgId">대표교과목</Col></Row></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSmtCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsLog", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl231", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="subjtCd" type="STRING" size="256"/><Column id="corseDvclsNo" type="STRING" size="256"/><Column id="cmpsjDivCd" type="STRING" size="256"/><Column id="atnlcHy" type="STRING" size="256"/><Column id="abndnYn" type="STRING" size="256"/><Column id="cmpsjCdt" type="BigDecimal" size="256"/><Column id="mjr2DplctCmpsjYn" type="STRING" size="256"/><Column id="mjr3DplctCmpsjYn" type="STRING" size="256"/><Column id="cntcMajorDplctCmpsjYn" type="STRING" size="256"/><Column id="minorDplctCmpsjYn" type="STRING" size="256"/><Column id="ratlcSyy" type="STRING" size="256"/><Column id="ratlcSmtCd" type="STRING" size="256"/><Column id="ratlcSubjtCd" type="STRING" size="256"/><Column id="ratlcCorseDvclsNo" type="STRING" size="256"/><Column id="gschSubjtYn" type="STRING" size="256"/><Column id="exmtNo" type="STRING" size="256"/><Column id="subjtUnvfrStdrDeptCd" type="STRING" size="256"/><Column id="stdntChngLmttYn" type="STRING" size="256"/><Column id="abeekSubjtDivCd" type="STRING" size="256"/><Column id="abeekEssntCmpsjYn" type="STRING" size="256"/><Column id="abeekDsgnCdt" type="BigDecimal" size="256"/><Column id="bchdmCntcSubjtYn" type="STRING" size="256"/><Column id="atnlcDtaDelDispCd" type="STRING" size="256"/><Column id="sameAltntYn" type="STRING" size="256"/><Column id="ddd" type="STRING" size="256"/><Column id="ttRatlcYn" type="STRING" size="256"/></ColumnInfo><Rows><Row/><Row/><Row/><Row/><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsCmpsjDivCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSchrgSttusCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsDgriCrseCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsEstblCrseDivCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsEstblDeprtCd", this);
      obj._setContents(
        '<ColumnInfo><Column id="deptNm" type="STRING" size="256"/><Column id="asignDeprtCd" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsCltrDomnCd", this);
      obj._setContents(
        '<ColumnInfo><Column id="code" type="STRING" size="256"/><Column id="codeNm" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsUnvfc", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSles131", this);
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="cmpsjDivCd" type="STRING" size="256"/><Column id="subjtCd" type="STRING" size="256"/><Column id="corseDvclsNo" type="STRING" size="256"/><Column id="subjtNm" type="STRING" size="256"/><Column id="orgSubjtNm" type="STRING" size="256"/><Column id="estblCrseDivCd" type="STRING" size="256"/><Column id="univCd" type="STRING" size="256"/><Column id="univNm" type="STRING" size="256"/><Column id="estblDeprtCd" type="STRING" size="256"/><Column id="estblDeprtNm" type="STRING" size="256"/><Column id="dghtDivCd" type="STRING" size="256"/><Column id="cmpsjHyDivCd" type="STRING" size="256"/><Column id="cmpsjCdt" type="BigDecimal" size="256"/><Column id="timtbNm" type="STRING" size="256"/><Column id="chrgInstrEmpno" type="STRING" size="256"/><Column id="chrgInstrEmpnm" type="STRING" size="256"/><Column id="appcsPcnt" type="BigDecimal" size="256"/><Column id="appcsLmttPcnt" type="BigDecimal" size="256"/><Column id="atnlcPosblPcnt" type="BigDecimal" size="256"/><Column id="prctsSubjtYn" type="STRING" size="256"/><Column id="srclnLctreYn" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal111" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal112" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal116" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal119" type="STRING" size="256"/><Column id="sesnlNigstDivCd" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="remrk" type="STRING" size="256"/><Column id="sameAltntYn" type="STRING" size="256"/><Column id="ddd" type="STRING" size="256"/><Column id="ttRatlcYn" type="STRING" size="256"/><Column id="hopeAppcsCnt" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsDghtDivCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl221", this);
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="cmpsjDivCd" type="STRING" size="256"/><Column id="subjtCd" type="STRING" size="256"/><Column id="corseDvclsNo" type="STRING" size="256"/><Column id="subjtNm" type="STRING" size="256"/><Column id="orgSubjtNm" type="STRING" size="256"/><Column id="estblCrseDivCd" type="STRING" size="256"/><Column id="univCd" type="STRING" size="256"/><Column id="univNm" type="STRING" size="256"/><Column id="estblDeprtCd" type="STRING" size="256"/><Column id="estblDeprtNm" type="STRING" size="256"/><Column id="dghtDivCd" type="STRING" size="256"/><Column id="cmpsjHyDivCd" type="STRING" size="256"/><Column id="cmpsjCdt" type="BigDecimal" size="256"/><Column id="timtbNm" type="STRING" size="256"/><Column id="chrgInstrEmpno" type="STRING" size="256"/><Column id="chrgInstrEmpnm" type="STRING" size="256"/><Column id="appcsPcnt" type="BigDecimal" size="256"/><Column id="appcsLmttPcnt" type="BigDecimal" size="256"/><Column id="atnlcPosblPcnt" type="BigDecimal" size="256"/><Column id="prctsSubjtYn" type="STRING" size="256"/><Column id="srclnLctreYn" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal111" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal112" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal116" type="STRING" size="256"/><Column id="lessnChoicAttrbItemVal119" type="STRING" size="256"/><Column id="sesnlNigstDivCd" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="remrk" type="STRING" size="256"/><Column id="ttRatlcYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsCmpsjHyDivCd", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsParam2", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="subjtCd" type="STRING" size="256"/><Column id="corseDvclsNo" type="STRING" size="256"/><Column id="ceckTrgetGbn" type="STRING" size="256"/><Column id="hiPass" type="STRING" size="256"/><Column id="ttcMapngNo" type="STRING" size="256"/><Column id="gschSubjtYn" type="STRING" size="256"/><Column id="stdntChngLmttYn" type="STRING" size="256"/><Column id="bchdmCntcSubjtYn" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsReport", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="subjtCd" type="STRING" size="256"/><Column id="gbn" type="STRING" size="256"/><Column id="mlangCd" type="STRING" size="256"/><Column id="reportList" type="STRING" size="256"/><Column id="reportListResult" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsWarnStdr", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsStunoInfo", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="stuno" type="STRING" size="256"/><Column id="stdntNm" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="hy" type="STRING" size="256"/><Column id="cmpsjSecnt" type="STRING" size="256"/><Column id="schrgSttusCd" type="STRING" size="256"/><Column id="schrgSttusNm" type="STRING" size="256"/><Column id="schrgVartnDivCd" type="STRING" size="256"/><Column id="schrgVartnTypeCd" type="STRING" size="256"/><Column id="schrgSttusVartnDt" type="STRING" size="256"/><Column id="deprtNm" type="STRING" size="256"/><Column id="applyCrseCd" type="STRING" size="256"/><Column id="dgriCrseCd" type="STRING" size="256"/><Column id="deptCd" type="STRING" size="256"/><Column id="univCd" type="STRING" size="256"/><Column id="deprtCd" type="STRING" size="256"/><Column id="majorCd" type="STRING" size="256"/><Column id="dghtDivCd" type="STRING" size="256"/><Column id="minCdtNum" type="STRING" size="256"/><Column id="mngtYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      // UI Components Initialize
      obj = new Div("div_search", "10", "5", null, "84", "11", null, null, null, null, null, this);
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_cssclass("div_WFSA_Bg");
      obj.getSetter("user_saveCond").set("");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_search",
        null,
        null,
        "120",
        "50",
        "16",
        "14",
        null,
        null,
        null,
        null,
        this.div_search.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_cssclass("btn_WFSA_Search");
      obj.set_text("조회");
      this.div_search.addChild(obj.name, obj);

      obj = new Static(
        "Static00_00",
        "46",
        "-1",
        "83",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("이수구분");
      obj.set_cssclass("portal");
      this.div_search.addChild(obj.name, obj);

      obj = new Radio(
        "rdo_serchDiv",
        "Static00_00:-2",
        "-1",
        "393",
        "42",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_codecolumn("codecolumn");
      obj.set_datacolumn("datacolumn");
      obj.set_columncount("7");
      obj.set_cssclass("portal");
      var div_search_form_rdo_serchDiv_innerdataset = new nexacro.NormalDataset(
        "div_search_form_rdo_serchDiv_innerdataset",
        obj
      );
      div_search_form_rdo_serchDiv_innerdataset._setContents(
        '<ColumnInfo><Column id="codecolumn" size="256"/><Column id="datacolumn" size="256"/></ColumnInfo><Rows><Row><Col id="codecolumn">0</Col><Col id="datacolumn">전공</Col></Row><Row><Col id="codecolumn">1</Col><Col id="datacolumn">교양</Col></Row><Row><Col id="codecolumn">2</Col><Col id="datacolumn">일반</Col></Row><Row><Col id="codecolumn">4</Col><Col id="datacolumn">교직</Col></Row><Row><Col id="codecolumn">5</Col><Col id="datacolumn">연계</Col></Row><Row><Col id="codecolumn">6</Col><Col id="datacolumn">융합</Col></Row><Row><Col id="datacolumn">기타</Col><Col id="codecolumn">3</Col></Row></Rows>'
      );
      obj.set_innerdataset(div_search_form_rdo_serchDiv_innerdataset);
      obj.set_text("교과목명");
      obj.set_index("0");
      this.div_search.addChild(obj.name, obj);

      obj = new Static(
        "sta_grid",
        "10",
        "div_search:376",
        "217",
        "25",
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
      obj.set_text("수강희망바구니 신청 교과목");
      obj.set_cssclass("sta_WF_Title01");
      this.addChild(obj.name, obj);

      obj = new Grid(
        "grd_sles131",
        "10",
        "div_search:42",
        null,
        "259",
        "11",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_binddataset("dsSles131");
      obj.set_taborder("7");
      obj.set_formatid("Default");
      obj.set_cellsizingtype("col");
      obj.set_autosizingtype("row");
      obj._setContents(
        '<Formats><Format id="Default"><Columns><Column size="40" band="left"/><Column size="80" band="left"/><Column size="80" band="left"/><Column size="200" band="left"/><Column size="60"/><Column size="70"/><Column size="70"/><Column size="70"/><Column size="150"/><Column size="150"/><Column size="70"/><Column size="48"/><Column size="70"/><Column size="350"/><Column size="100"/><Column size="250"/><Column size="70"/><Column size="80"/><Column size="150"/><Column size="150"/></Columns><Rows><Row size="54" band="head"/><Row size="35"/></Rows><Band id="head"><Cell text="순번"/><Cell col="1" text="이수구분"/><Cell col="2" text="교과목코드"/><Cell col="3" text="교과목명"/><Cell col="4" text="수강&#13;&#10;분반"/><Cell col="5" text="제한&#13;&#10;인원"/><Cell col="6" text="희망바구니&#13;&#10;신청인원"/><Cell col="7" text="과정"/><Cell col="8" text="개설대학"/><Cell col="9" text="개설학과"/><Cell col="10" text="주야"/><Cell col="11" text="학년"/><Cell col="12" text="학점"/><Cell col="13" text="강의시간"/><Cell col="14" text="담당교수"/><Cell col="15" text="비고"/><Cell col="16" text="수업&#13;&#10;계획서"/><Cell col="17" text="재수강&#13;&#10;과목여부"/><Cell col="18" text="대치교과목"/><Cell col="19" text="수강신청제한"/></Band><Band id="body"><Cell expr="expr:currow+1" textAlign="center"/><Cell col="1" displaytype="combotext" combocodecol="code" combodatacol="fullNm" combodataset="dsCmpsjDivCd" text="bind:cmpsjDivCd" textAlign="center"/><Cell col="2" text="bind:subjtCd" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="3" text="bind:subjtNm" displaytype="normal" edittype="readonly" editmaxlength="undefined" textareascrolltype="none" textAlign="left"/><Cell col="4" text="bind:corseDvclsNo" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="5" text="bind:appcsLmttPcnt" textAlign="right"/><Cell col="6" textAlign="right" text="bind:hopeAppcsCnt"/><Cell col="7" text="bind:estblCrseDivCd" displaytype="combotext" combodataset="dsEstblCrseDivCd" combocodecol="code" combodatacol="fullNm" textAlign="center"/><Cell col="8" text="bind:univNm" textAlign="left"/><Cell col="9" text="bind:estblDeprtNm"/><Cell col="10" displaytype="combotext" combocodecol="code" combodatacol="fullNm" text="bind:dghtDivCd" combodataset="dsDghtDivCd" textAlign="center"/><Cell col="11" text="bind:cmpsjHyDivCd" textAlign="center" displaytype="combotext" combodataset="dsCmpsjHyDivCd" combocodecol="code" combodatacol="fullNm"/><Cell col="12" text="bind:cmpsjCdt" textAlign="center"/><Cell col="13" text="bind:timtbNm" displaytype="normal" edittype="none" wordWrap="char"/><Cell col="14" text="bind:chrgInstrEmpnm" textAlign="center"/><Cell col="15" text="bind:remrk" wordWrap="char"/><Cell col="16" text="조회" textAlign="center" displaytype="buttoncontrol" cursor="pointer" padding="4px"/><Cell col="17" text="bind:ttRatlcYn" textAlign="center"/><Cell col="18" text="bind:sameAltntYn" textAlign="center" color="blue" cursor="pointer"/><Cell col="19" text="bind:ddd" color="blue" cursor="pointer" textAlign="center"/></Band></Format><Format id="multi"><Columns><Column size="40" band="left"/><Column size="80" band="left"/><Column size="200" band="left"/><Column size="80" band="left"/><Column size="80"/><Column size="76"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="98"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="100"/><Column size="100"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="100"/><Column size="100"/><Column size="100"/><Column size="100"/><Column size="120"/><Column size="80"/><Column size="100"/><Column size="100"/><Column size="76"/><Column size="100"/><Column size="100"/><Column size="100"/><Column size="80"/><Column size="200"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="80"/><Column size="142"/><Column size="120"/><Column size="120"/><Column size="120"/><Column size="120"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/><Column size="60"/></Columns><Rows><Row size="35" band="head"/><Row size="24" band="head"/><Row size="26"/></Rows><Band id="head"><Cell rowspan="2" displaytype="checkboxcontrol" edittype="checkbox" textAlign="center" text="0"/><Cell col="1" rowspan="2" text="교과목코드"/><Cell col="2" rowspan="2" text="교과목명"/><Cell col="3" rowspan="2" text="분반"/><Cell col="4" rowspan="2" text="수업세션"/><Cell col="5" rowspan="2" text="지원과정"/><Cell col="6" rowspan="2" text="배정학과코드"/><Cell col="7" rowspan="2" text="배정학과명"/><Cell col="8" rowspan="2" text="주야구분"/><Cell col="9" rowspan="2" text="이수구분"/><Cell col="10" rowspan="2" text="이수학년"/><Cell col="11" rowspan="2" text="이수학점"/><Cell col="12" rowspan="2" text="이론시수"/><Cell col="13" rowspan="2" text="실습시수"/><Cell col="14" rowspan="2" text="인정시수"/><Cell col="15" rowspan="2" text="수강제한인원수"/><Cell col="16" rowspan="2" text="수강제한인원&#13;&#10;수정금지여부"/><Cell col="17" rowspan="2" text="폐강여부"/><Cell col="18" rowspan="2" text="중복허용종류"/><Cell col="19" rowspan="2" text="실습교과"/><Cell col="20" rowspan="2" text="성적평가방법"/><Cell col="21" rowspan="2" text="성적부여방법"/><Cell col="22" rowspan="2" text="강의평가과목"/><Cell col="23" rowspan="2" text="수업계획서&#13;&#10;입력방법"/><Cell col="24" rowspan="2" text="수업계획서&#13;&#10;최초등록일자"/><Cell col="25" rowspan="2" text="담당교강사"/><Cell col="26" rowspan="2" text="담당교강사명"/><Cell col="27" rowspan="2" text="담당교강사&#13;&#10;등록일자"/><Cell col="28" rowspan="2" text="강좌합반여부"/><Cell col="29" rowspan="2" text="성적입력강좌&#13;&#10;분반번호"/><Cell col="30" rowspan="2" text="계절제전후기"/><Cell col="31" rowspan="2" text="시수무제한유형"/><Cell col="32" rowspan="2" text="융복합/&#13;&#10;캡스톤/&#13;&#10;URDP"/><Cell col="33" rowspan="2" text="비고"/><Cell col="34" colspan="5" text="원어강의"/><Cell col="39" colspan="5" text="팀팀클래스"/><Cell col="44" rowspan="2" text="사이버&#13;&#10;강의"/><Cell col="45" rowspan="2" text="개별지도"/><Cell col="46" rowspan="2" text="팀티칭"/><Cell col="47" rowspan="2" text="목요특강"/><Cell col="48" rowspan="2" text="사제동행&#13;&#10;세미나"/><Cell col="49" rowspan="2" text="사회봉사"/><Cell col="50" rowspan="2" text="1차성적&#13;&#10;확인"/><Cell col="51" rowspan="2" text="최정성적&#13;&#10;확인"/><Cell col="52" rowspan="2" text="학석사&#13;&#10;연계"/><Cell col="53" rowspan="2" text="계약학과"/><Cell col="54" rowspan="2" text="현장실습"/><Cell col="55" rowspan="2" text="업적평가&#13;&#10;제외"/><Cell col="56" rowspan="2" text="공개강좌"/><Cell col="57" rowspan="2" text="등록생성&#13;&#10;제외"/><Cell col="58" rowspan="2" text="플러스&#13;&#10;알파"/><Cell col="59" rowspan="2" text="파일업로드&#13;&#10;허용"/><Cell col="60" rowspan="2" text="인문역량"/><Cell col="61" rowspan="2" text="소통역량"/><Cell col="62" rowspan="2" text="글로벌&#13;&#10;역량"/><Cell col="63" rowspan="2" text="창의역량"/><Cell col="64" rowspan="2" text="전문역량"/><Cell row="1" col="34" text="여부"/><Cell row="1" col="35" text="개발비지급"/><Cell row="1" col="36" text="장려금지급"/><Cell row="1" col="37" text="1.5배지급"/><Cell row="1" col="38" text="언어구분"/><Cell row="1" col="39" text="교과목구분"/><Cell row="1" col="40" text="대표교과코드"/><Cell row="1" col="41" text="대표교과명"/><Cell row="1" col="42" text="대표교과목강좌분반"/><Cell row="1" col="43" text="대표교과목학점"/></Band><Band id="body"><Cell displaytype="checkboxcontrol" edittype="checkbox" textAlign="center" text="bind:chk"/><Cell col="1" text="bind:subjtCd" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="2" text="bind:subjtNm" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="3" text="bind:corseDvclsNo" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="4" text="bind:lessnSessnNo" displaytype="combotext" textAlign="center" editmaxlength="undefined" combocodecol="lessnSessnNo" combodatacol="lessnSessnNm" combodataset="dsLessnSessnNo" textareascrolltype="none"/><Cell col="5" text="bind:applyCrseCd" displaytype="combotext" textAlign="center" combodataset="dsApplyCrseCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="6" text="bind:asignDeprtCd" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="7" text="bind:asignDeprtNm" displaytype="normal" edittype="readonly" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="8" text="bind:dghtDivCd" displaytype="combotext" textAlign="center" combodataset="dsDghtDivCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="9" text="bind:cmpsjDivCd" displaytype="combotext" textAlign="center" combodataset="dsCmpsjDivCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="10" text="bind:cmpsjHyDivCd" displaytype="combotext" textAlign="center" combodataset="dsCmpsjHyDivCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="11" text="bind:cmpsjCdt" displaytype="mask" editmaxlength="NaN" maskeditclipmode="excludespace" maskeditformat="##0.0" maskeditlimitbymask="both" maskedittrimtype="both" textAlign="right" textareascrolltype="none"/><Cell col="12" text="bind:thryHrs" displaytype="mask" editmaxlength="NaN" maskeditclipmode="excludespace" maskeditformat="#,##0.0#" maskeditlimitbymask="both" maskedittrimtype="both" textAlign="right" textareascrolltype="none"/><Cell col="13" text="bind:prctsHrs" displaytype="mask" editmaxlength="NaN" maskeditclipmode="excludespace" maskeditformat="#,##0.0#" maskeditlimitbymask="both" maskedittrimtype="both" textAlign="right" textareascrolltype="none"/><Cell col="14" text="bind:rcognHrs" displaytype="mask" editmaxlength="NaN" maskeditclipmode="excludespace" maskeditformat="#,##0.0#" maskeditlimitbymask="both" maskedittrimtype="both" textAlign="right" textareascrolltype="none"/><Cell col="15" text="bind:appcsLmttPcnt" displaytype="number" editmaxlength="NaN" textAlign="right" textareascrolltype="none"/><Cell col="16" text="bind:appcsLmttNmprModfPrhbtYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="17" text="bind:rmvlcYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="18" text="bind:dplctPermKindCd" displaytype="combotext" textAlign="center" combodataset="dsDplctPermKindCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="19" text="bind:prctsSubjtYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="20" text="bind:gradeEvlMthdCd" displaytype="combotext" textAlign="center" combodataset="dsGradeEvlMthdCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="21" text="bind:gradeAlwncMthdCd" displaytype="combotext" textAlign="center" combodataset="dsGradeAlwncMthdCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="22" text="bind:lctreEvlSubjcDivCd" displaytype="combotext" textAlign="center" combodataset="dsLctreEvlSubjcDivCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="23" text="bind:syllaInputMthdCd" displaytype="combotext" textAlign="center" combodataset="dsSyllaInputMthdCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="24" text="bind:syllaFrstRegDt" displaytype="date" textAlign="center" calendardateformat="yyyy-MM-dd" calendardisplaynulltype="none" textareascrolltype="none"/><Cell col="25" text="bind:chrgInstrEmpno" editmaxlength="NaN" edittype="readonly" textareascrolltype="none"/><Cell col="26" text="bind:chrgInstrEmpno" editmaxlength="NaN" edittype="readonly" textareascrolltype="none"/><Cell col="27" text="bind:chrgInstrRegDt" displaytype="date" textAlign="center" calendardateformat="yyyy-MM-dd" calendardisplaynulltype="none" textareascrolltype="none"/><Cell col="28" text="bind:corseCmbclYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="29" text="bind:gradeInputCorseDvclsNo" textAlign="center" editmaxlength="undefined" textareascrolltype="none"/><Cell col="30" text="bind:sesnlFrmptCd" displaytype="combotext" textAlign="center" combodataset="dsSesnlFrmptCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="31" text="bind:hrsUnlmtTypeCd" displaytype="combotext" textAlign="center" combodataset="dsHrsUnlmtTypeCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="32" text="bind:fuscvCapdsUropDivCd" displaytype="combotext" textAlign="center" combodataset="dsFuscvCapdsUropDivCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="33" text="bind:remrk" edittype="readonly" editmaxlength="NaN" textareascrolltype="none"/><Cell col="34" text="bind:srclnLctreYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="35" text="bind:srclnLctreDevcsPymntYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="36" text="bind:srclnLctreSubsdPymntYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="37" text="bind:srclnLctreM1p5PymntYn" displaytype="checkboxcontrol" textAlign="center" textareascrolltype="none"/><Cell col="38" text="bind:srclnLctreLangDivCd" displaytype="combotext" textAlign="center" combodataset="dsSrclnLctreLangDivCd" combocodecol="code" combodatacol="fullNm" textareascrolltype="none"/><Cell col="39" text="bind:ttcSubjtDivCd" textAlign="center" editmaxlength="undefined" edittype="readonly" textareascrolltype="none"/><Cell col="40" text="bind:ttcRpstSubjtCd" textAlign="center" editmaxlength="undefined" edittype="readonly" textareascrolltype="none"/><Cell col="41" text="bind:ttcRpstSubjtNm" textAlign="center" editmaxlength="undefined" edittype="readonly" textareascrolltype="none"/><Cell col="42" text="bind:ttcRpstSubjtCorseDvclsNo" textAlign="center" editmaxlength="undefined" edittype="readonly" textareascrolltype="none"/><Cell col="43" text="bind:ttcRpstSubjtCdt" editmaxlength="NaN" edittype="readonly" textareascrolltype="none"/><Cell col="44" text="bind:corseYnAttrbItemVal111" displaytype="checkboxcontrol"/><Cell col="45" text="bind:corseYnAttrbItemVal112" displaytype="checkboxcontrol"/><Cell col="46" text="bind:corseYnAttrbItemVal113" displaytype="checkboxcontrol"/><Cell col="47" text="bind:corseYnAttrbItemVal114" displaytype="checkboxcontrol"/><Cell col="48" text="bind:corseYnAttrbItemVal115" displaytype="checkboxcontrol"/><Cell col="49" text="bind:corseYnAttrbItemVal116" displaytype="checkboxcontrol"/><Cell col="50" text="bind:corseYnAttrbItemVal117" displaytype="checkboxcontrol"/><Cell col="51" text="bind:corseYnAttrbItemVal118" displaytype="checkboxcontrol"/><Cell col="52" text="bind:corseYnAttrbItemVal119" displaytype="checkboxcontrol"/><Cell col="53" text="bind:corseYnAttrbItemVal120" displaytype="checkboxcontrol"/><Cell col="54" text="bind:corseYnAttrbItemVal121" displaytype="checkboxcontrol"/><Cell col="55" text="bind:corseYnAttrbItemVal122" displaytype="checkboxcontrol"/><Cell col="56" text="bind:corseYnAttrbItemVal123" displaytype="checkboxcontrol"/><Cell col="57" text="bind:corseYnAttrbItemVal124" displaytype="checkboxcontrol"/><Cell col="58" text="bind:corseYnAttrbItemVal125" displaytype="checkboxcontrol"/><Cell col="59" text="bind:corseYnAttrbItemVal126" displaytype="checkboxcontrol"/><Cell col="60" text="bind:corseYnAttrbItemVal911" displaytype="checkboxcontrol"/><Cell col="61" text="bind:corseYnAttrbItemVal912" displaytype="checkboxcontrol"/><Cell col="62" text="bind:corseYnAttrbItemVal913" displaytype="checkboxcontrol"/><Cell col="63" text="bind:corseYnAttrbItemVal914" displaytype="checkboxcontrol"/><Cell col="64" text="bind:corseYnAttrbItemVal915" displaytype="checkboxcontrol"/></Band></Format></Formats>'
      );
      this.addChild(obj.name, obj);

      obj = new Grid(
        "grd_sapl231",
        "10",
        "grd_sles131:103",
        null,
        "247",
        "11",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_binddataset("dsSapl221");
      obj.set_taborder("2");
      obj.set_formatid("Default");
      obj.set_autosizingtype("row");
      obj._setContents(
        '<Formats><Format id="Default"><Columns><Column size="40" band="left"/><Column size="80" band="left"/><Column size="80" band="left"/><Column size="200" band="left"/><Column size="60"/><Column size="70"/><Column size="80"/><Column size="150"/><Column size="150"/><Column size="70"/><Column size="48"/><Column size="70"/><Column size="350"/><Column size="100"/><Column size="300"/><Column size="0"/></Columns><Rows><Row size="54" band="head"/><Row size="35"/></Rows><Band id="head"><Cell text="순번"/><Cell col="1" text="이수구분"/><Cell col="2" text="교과목코드"/><Cell col="3" text="교과목명"/><Cell col="4" text="수강&#13;&#10;분반"/><Cell col="5" text="과정"/><Cell col="6" text="재수강&#13;&#10;과목여부"/><Cell col="7" text="개설대학"/><Cell col="8" text="개설학과"/><Cell col="9" text="주야"/><Cell col="10" text="학년"/><Cell col="11" text="학점"/><Cell col="12" text="강의시간"/><Cell col="13" text="담당교수"/><Cell col="14" text="비고"/><Cell col="15" text="재수강&#13;&#10;과목여부"/></Band><Band id="body"><Cell textAlign="center" expr="expr:currow+1"/><Cell col="1" text="bind:cmpsjDivCd" displaytype="combotext" textAlign="center" combodataset="dsCmpsjDivCd" combocodecol="code" combodatacol="fullNm"/><Cell col="2" text="bind:subjtCd" cssclass="essential" textAlign="center" editmaxlength="7"/><Cell col="3" text="bind:subjtNm" cssclass="essential" textAlign="left" editmaxlength="7"/><Cell col="4" text="bind:corseDvclsNo" cssclass="essential" textAlign="center" editmaxlength="5"/><Cell col="5" text="bind:estblCrseDivCd" combodataset="dsEstblCrseDivCd" combocodecol="code" combodatacol="fullNm" locale="aa_DJ" displaytype="combotext" textAlign="center"/><Cell col="6" text="bind:ttRatlcYn" textAlign="center"/><Cell col="7" text="bind:univNm"/><Cell col="8" text="bind:estblDeprtNm"/><Cell col="9" text="bind:dghtDivCd" textAlign="center" combodataset="dsDghtDivCd" combocodecol="code" combodatacol="fullNm" displaytype="combotext"/><Cell col="10" text="bind:cmpsjHyDivCd" textAlign="center" displaytype="combotext" combodataset="dsCmpsjHyDivCd" combocodecol="code" combodatacol="fullNm"/><Cell col="11" text="bind:cmpsjCdt" editmaxlength="8" textAlign="center"/><Cell col="12" text="bind:timtbNm" wordWrap="char"/><Cell col="13" text="bind:chrgInstrEmpnm"/><Cell col="14" displaytype="normal" edittype="none" text="bind:remrk" wordWrap="char"/><Cell col="15" text="bind:ttRatlcYn" textAlign="center"/></Band></Format></Formats>'
      );
      this.addChild(obj.name, obj);

      obj = new Div(
        "div_search0",
        "55",
        "37",
        "933",
        "48",
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
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static04",
        "400",
        "5",
        "123",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search0.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("교과목코드/과목명");
      obj.set_cssclass("portal");
      this.div_search0.addChild(obj.name, obj);

      obj = new Static(
        "Static04_00",
        "785",
        "5",
        "60",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search0.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("1");
      obj.set_text("수강분반");
      obj.set_cssclass("portal");
      this.div_search0.addChild(obj.name, obj);

      obj = new Edit(
        "edt_subjtCd",
        "Static04:10",
        "5",
        "217",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search0.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_cssclass("portal");
      this.div_search0.addChild(obj.name, obj);

      obj = new Edit(
        "edt_corseDvclsNo",
        "Static04_00:10",
        "5",
        "67",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search0.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_cssclass("portal");
      this.div_search0.addChild(obj.name, obj);

      obj = new Static(
        "Static04_01",
        "0",
        "5",
        "63",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search0.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("4");
      obj.set_text("개설학과");
      obj.set_cssclass("portal");
      this.div_search0.addChild(obj.name, obj);

      obj = new Combo(
        "cbo_estblDeprtCd",
        "73",
        "5",
        "297",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search0.form
      );
      obj.set_taborder("5");
      obj.set_readonly("false");
      obj.set_cssclass("portal essential");
      obj.set_innerdataset("dsEstblDeprtCd");
      obj.set_codecolumn("asignDeprtCd");
      obj.set_datacolumn("deptNm");
      obj.set_text("");
      obj.set_index("-1");
      this.div_search0.addChild(obj.name, obj);

      obj = new Div(
        "btn_sles131",
        null,
        "99",
        "95",
        "25",
        "11",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.getSetter("user_target").set("grd_sles131");
      obj.getSetter("user_buttonType").set("T");
      obj.set_taborder("8");
      obj.set_url("COM_DIV::commonGridButton.xfdl");
      obj.set_formscrollbarsize("0");
      obj.set_async("false");
      obj.set_text("");
      this.addChild(obj.name, obj);

      obj = new Div(
        "btn_sapl231",
        null,
        "464",
        "95",
        "25",
        "11",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.getSetter("user_target").set("grd_sapl231");
      obj.getSetter("user_buttonType").set("T");
      obj.set_taborder("1");
      obj.set_url("COM_DIV::commonGridButton.xfdl");
      obj.set_formscrollbarsize("0");
      obj.set_async("false");
      obj.set_text("");
      obj.getSetter("user_button").set("btn_schel");
      this.addChild(obj.name, obj);

      obj = new Div(
        "div_search1",
        "1160",
        "273",
        "933",
        "48",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("4");
      obj.set_text("");
      obj.set_visible("false");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static04_01",
        "0",
        "5",
        "63",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search1.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("0");
      obj.set_text("교양영역");
      obj.set_cssclass("portal");
      this.div_search1.addChild(obj.name, obj);

      obj = new Combo(
        "cbo_cltrDomnCd",
        "73",
        "5",
        "297",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search1.form
      );
      obj.set_taborder("1");
      obj.set_readonly("false");
      obj.set_cssclass("portal essential");
      obj.set_innerdataset("dsCltrDomnCd");
      obj.set_codecolumn("code");
      obj.set_datacolumn("codeNm");
      obj.set_text("");
      obj.set_index("-1");
      this.div_search1.addChild(obj.name, obj);

      obj = new Static(
        "Static04",
        "400",
        "5",
        "123",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search1.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("2");
      obj.set_text("교과목코드/과목명");
      obj.set_cssclass("portal");
      this.div_search1.addChild(obj.name, obj);

      obj = new Edit(
        "edt_subjtCd",
        "533",
        "5",
        "217",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search1.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("3");
      obj.set_cssclass("portal");
      this.div_search1.addChild(obj.name, obj);

      obj = new Static(
        "Static04_00",
        "785",
        "5",
        "60",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search1.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("4");
      obj.set_text("수강분반");
      obj.set_cssclass("portal");
      this.div_search1.addChild(obj.name, obj);

      obj = new Edit(
        "edt_corseDvclsNo",
        "855",
        "5",
        "67",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this.div_search1.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("5");
      obj.set_cssclass("portal");
      this.div_search1.addChild(obj.name, obj);

      obj = new Static(
        "sta_grid00",
        "10",
        "div_search:12",
        "217",
        "25",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("6");
      obj.set_text("개설 교과목");
      obj.set_cssclass("sta_WF_Title01");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_aply",
        "38.35%",
        "grd_sles131:22",
        "120",
        "40",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("9");
      obj.set_text("신청▼");
      obj.set_border("3px solid #b2ebf4");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_cancl",
        "btn_aply:22",
        "412",
        "120",
        "40",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("10");
      obj.set_text("취소▲");
      obj.set_border("3px solid #ffa7a7");
      this.addChild(obj.name, obj);

      obj = new Button(
        "btn_schel",
        null,
        "464",
        "90",
        "25",
        "110",
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("11");
      obj.set_text("시간표");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static04",
        "347",
        "458",
        "193",
        "34",
        null,
        null,
        null,
        null,
        null,
        null,
        this
      );
      obj.set_initvalueid("base");
      obj.set_taborder("12");
      obj.set_text("*최대수강가능과목수 :  15");
      obj.set_cssclass("portal");
      this.addChild(obj.name, obj);

      obj = new Static(
        "Static04_00",
        "577",
        "458",
        "363",
        "34",
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
      obj.set_text(" ");
      obj.set_cssclass("portal");
      obj.set_color("blue");
      this.addChild(obj.name, obj);
      // Layout Functions
      //-- Default Layout : this
      obj = new Layout(
        "default",
        "",
        1150,
        750,
        this,
        //-- Layout function
        function (p) {
          var rootobj = p;
          p = rootobj;
          p.set_scrolltype("vertical");
          p.set_titletext("[학생]장바구니수강신청");

          p.div_search.set_taborder("3");
          p.div_search.set_cssclass("div_WFSA_Bg");
          p.div_search.getSetter("user_saveCond").set("");
          p.div_search.set_text("");
          p.div_search.move("10", "5", null, "84", "11", null);

          p.sta_grid.set_taborder("0");
          p.sta_grid.set_text("수강희망바구니 신청 교과목");
          p.sta_grid.set_cssclass("sta_WF_Title01");
          p.sta_grid.move("10", "div_search:376", "217", "25", null, null);

          p.grd_sles131.set_binddataset("dsSles131");
          p.grd_sles131.set_taborder("7");
          p.grd_sles131.set_formatid("Default");
          p.grd_sles131.set_cellsizingtype("col");
          p.grd_sles131.set_autosizingtype("row");
          p.grd_sles131.move("10", "div_search:42", null, "259", "11", null);

          p.grd_sapl231.set_binddataset("dsSapl221");
          p.grd_sapl231.set_taborder("2");
          p.grd_sapl231.set_formatid("Default");
          p.grd_sapl231.set_autosizingtype("row");
          p.grd_sapl231.move("10", "grd_sles131:103", null, "247", "11", null);

          p.div_search0.set_taborder("5");
          p.div_search0.set_text("");
          p.div_search0.move("55", "37", "933", "48", null, null);

          p.btn_sles131.getSetter("user_target").set("grd_sles131");
          p.btn_sles131.getSetter("user_buttonType").set("T");
          p.btn_sles131.set_taborder("8");
          p.btn_sles131.set_url("COM_DIV::commonGridButton.xfdl");
          p.btn_sles131.set_formscrollbarsize("0");
          p.btn_sles131.set_async("false");
          p.btn_sles131.set_text("");
          p.btn_sles131.move(null, "99", "95", "25", "11", null);

          p.btn_sapl231.getSetter("user_target").set("grd_sapl231");
          p.btn_sapl231.getSetter("user_buttonType").set("T");
          p.btn_sapl231.set_taborder("1");
          p.btn_sapl231.set_url("COM_DIV::commonGridButton.xfdl");
          p.btn_sapl231.set_formscrollbarsize("0");
          p.btn_sapl231.set_async("false");
          p.btn_sapl231.set_text("");
          p.btn_sapl231.getSetter("user_button").set("btn_schel");
          p.btn_sapl231.move(null, "464", "95", "25", "11", null);

          p.div_search1.set_taborder("4");
          p.div_search1.set_text("");
          p.div_search1.set_visible("false");
          p.div_search1.move("1160", "273", "933", "48", null, null);

          p.sta_grid00.set_taborder("6");
          p.sta_grid00.set_text("개설 교과목");
          p.sta_grid00.set_cssclass("sta_WF_Title01");
          p.sta_grid00.move("10", "div_search:12", "217", "25", null, null);

          p.btn_aply.set_taborder("9");
          p.btn_aply.set_text("신청▼");
          p.btn_aply.set_border("3px solid #b2ebf4");
          p.btn_aply.move("38.35%", "grd_sles131:22", "120", "40", null, null);

          p.btn_cancl.set_taborder("10");
          p.btn_cancl.set_text("취소▲");
          p.btn_cancl.set_border("3px solid #ffa7a7");
          p.btn_cancl.move("btn_aply:22", "412", "120", "40", null, null);

          p.btn_schel.set_taborder("11");
          p.btn_schel.set_text("시간표");
          p.btn_schel.move(null, "464", "90", "25", "110", null);

          p.Static04.set_taborder("12");
          p.Static04.set_text("*최대수강가능과목수 :  15");
          p.Static04.set_cssclass("portal");
          p.Static04.move("347", "458", "193", "34", null, null);

          p.Static04_00.set_taborder("13");
          p.Static04_00.set_text(" ");
          p.Static04_00.set_cssclass("portal");
          p.Static04_00.set_color("blue");
          p.Static04_00.move("577", "458", "363", "34", null, null);
        }
      );
      this.addLayout(obj.name, obj);

      //-- Normal Layout : this
      obj = new Layout(
        "default0",
        "",
        1150,
        580,
        this,
        //-- Layout function
        function (p) {
          var rootobj = p;
          p = rootobj;
          p.btn_sapl231.move(null, "1049", "112", "34", "0.99%", null);
        }
      );
      this.addLayout(obj.name, obj);

      // BindItem Information
      obj = new BindItem("item4", "div_search00.form.edt_cmmnCd", "value", "dsParam", "cmmnCd");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item5", "div_search00.form.cbo_useYn", "value", "dsParam", "useYn");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item6", "div_search00.form.edt_cmmnCdNm", "value", "dsParam", "cmmnCdNm");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem(
        "item9",
        "div_search1.form.cbo_cmpsjDivCd",
        "value",
        "dsParam",
        "cmpsjDivCd"
      );
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item10", "div_search3.form.edt_subjtNm", "value", "dsParam", "subjtNm");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item11", "div_search3.form.edt_subjtCd", "value", "dsParam", "subjtCd");
      this.addChild(obj.name, obj);
      obj.bind();

      obj = new BindItem("item12", "div_search.form.rdo_serchDiv", "value", "dsParam", "serchDiv");
      this.addChild(obj.name, obj);
      obj.bind();

      // TriggerItem Information
    };

    this.loadPreloadList = function () {
      this._addPreloadList("fdl", "COM_DIV::commonGridButton.xfdl");
    };

    // User Script
    this.addIncludeScript("saplap0130.xfdl", "LIB::libInclude.xjs");
    this.addIncludeScript("saplap0130.xfdl", "LIB::libSch.xjs");
    this.registerScript("saplap0130.xfdl", function () {
      /**********************************************************************************
       * 화면(명)   : saplap0130( [학생]장바구니수강신청 )
       * 화면 설명  : [학생]장바구니수강신청
       * 작성자     : 이상근
       ***************************************************************************************************/
      this.executeIncludeScript("LIB::libInclude.xjs"); /*include "LIB::libInclude.xjs"*/
      this.executeIncludeScript("LIB::libSch.xjs"); /*include "LIB::libSch.xjs"*/

      // 최초 화면 Load시 처리 할 사항
      this.form_onload = function (obj, e) {
        // 화면 초기화 (필수)
        this.initForm(obj, e);
        // 컴포넌트 셋팅
        this.componentSetting();
        // 공통코드처리
        this.comboLoad();

        // 폼클로즈 체크 데이터 셋
        //this.DS_CSYS100.enrollCloseCheck();
      };

      // 공통코드 조회 파라미터 셋팅
      // [DS, 대표코드, 사용여부(T,1,0), 첫행(T,S,X,E), 값(N,B: 코드와 텍스트를 같이 나타냄)]
      this.comboLoad = function () {
        var codeParams = [
          ["dsCmpsjDivCd", "SCUR0100", "1", "X", "N"], //이수구분코드[SCUR0100]
          ["dsSchrgSttusCd", "SSRM0030", "1", "X", "N"], //학적상태코드[SSRM0030]
          ["dsDgriCrseCd", "SSRM0020", "1", "X", "N"], //학위과정코드[SSRM0020]
          ["dsEstblCrseDivCd", "SLES0900", "1", "X", "N"], //개설과정구분코드[SLES0900]
          ["dsDghtDivCd", "CSYS1030", "1", "E", "N"], //주야구분코드[CSYS1030](01:주간, 02:야간, 00:주야간)
          ["dsCmpsjHyDivCd", "SCUR0150", "1", "E", "N"] //이수학년구분코드[SCUR0150]
        ];

        this.utils.comboLoad(codeParams);

        this.dsParam.set("serchDiv", "0");

        var stuno = this.utils.getGLIO(["loginId"]).loginId;
        this.dsParam.set("stuno", stuno);
        this.dsParam.set("ceckTrgetGbn", "H");

        //학사력 조회
        this.findScomUnvfrSchdlInfo("1", "SAPL00010001", "20000", "", "", "", "", "", ""); // 20000:학부

        //개설학과
        this.utils.transaction({
          url: "com/sapl/SaplapCtr/findEstblDeprtList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsEstblDeprtCd=dsEstblDeprtCd",
          callback: function () {
            this.dsEstblDeprtCd.addFirstComboRow("T", "asignDeprtCd", "deptNm");

            //this.dsEstblDeprtCd.filter("asignDeprtCd != null");
            this.dsEstblDeprtCd.filter("asignDeprtCd != null || cmpsjDivCd == '1'");

            var findRow = this.dsEstblDeprtCd.findRow(
              "asignDeprtCd",
              this.dsStunoInfo.get("majorCd") == ""
                ? this.dsStunoInfo.get("deptCd")
                : this.dsStunoInfo.get("majorCd")
            );

            if (findRow < 0) {
              this.div_search0.form.cbo_estblDeprtCd.set_index(0);
            } else {
              this.div_search0.form.cbo_estblDeprtCd.set_index(findRow);
            }

            this.div_search_btn_search_onclick();
          }
        });

        this.utils.transaction({
          url: "com/sapl/SaplapCtr/findCltrDomnList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsCltrDomnCd=dsCltrDomnCd",
          callback: function () {
            this.div_search1.form.cbo_cltrDomnCd.set_index(0);
          }
        });

        this.popup.make({
          id: "saplap0100_pop01",
          mode: "M",
          title: "동일교과목조회",
          url: "SCH_SAPLAP::saplap0100_pop01.xfdl",
          width: 800,
          height: 600,
          callback: function (id, data) {}
        });

        this.popup.make({
          id: "saplap0100_pop04",
          mode: "M",
          title: "수강반제한조회",
          url: "SCH_SAPLAP::saplap0100_pop04.xfdl",
          width: 800,
          height: 800,
          callback: function (id, data) {}
        });
      };

      // 컴포넌트 셋팅
      this.componentSetting = function () {
        // 개설강좌내역 조회
        this.grd_sles131.commonFind.setOpts({
          url: "com/sapl/SaplapCtr/findEstblSubjtGnrlList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsSles131=dsSles131",
          pre: function () {
            if (this.div_search.form.rdo_serchDiv.value != "1") {
              if (this.utils.isValid(this.div_search0.form.edt_subjtCd.value)) {
                if (this.div_search0.form.edt_subjtCd.getLength() < 3) {
                  this.utils.alert("교과목코드/과목명 입력시 3자리 이상 입력하시기 바랍니다.");
                  return false;
                }
              }

              if (this.utils.isValid(this.div_search0.form.edt_corseDvclsNo.value)) {
                if (!this.utils.isValid(this.div_search0.form.edt_subjtCd.value)) {
                  this.utils.alert("수강분반 입력 시 교과목코드/과목명은 필수 입력항목입니다.");
                  return false;
                }
              }
              this.dsParam.set("asignDeprtCd", this.div_search0.form.cbo_estblDeprtCd.value);
              this.dsParam.set("subjtCd", this.div_search0.form.edt_subjtCd.value);
              this.dsParam.set("corseDvclsNo", this.div_search0.form.edt_corseDvclsNo.value);
            } else {
              if (this.utils.isValid(this.div_search1.form.edt_subjtCd.value)) {
                if (this.div_search1.form.edt_subjtCd.getLength() < 3) {
                  this.utils.alert("교과목코드/과목명 입력시 3자리 이상 입력하시기 바랍니다.");
                  return false;
                }
              }

              if (this.utils.isValid(this.div_search1.form.edt_corseDvclsNo.value)) {
                if (!this.utils.isValid(this.div_search1.form.edt_subjtCd.value)) {
                  this.utils.alert("수강분반 입력 시 교과목코드/과목명은 필수 입력항목입니다.");
                  return false;
                }
              }
              this.dsParam.set("asignDeprtCd", this.div_search1.form.cbo_cltrDomnCd.value);
              this.dsParam.set("subjtCd", this.div_search1.form.edt_subjtCd.value);
              this.dsParam.set("corseDvclsNo", this.div_search1.form.edt_corseDvclsNo.value);
            }
          }
        });

        // 장바구니 조회
        this.grd_sapl231.commonFind.setOpts({
          url: "com/sapl/SaplapCtr/findEstblSubjtShpbsList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsSapl221=dsSles131",
          post: function () {
            var aplyCnt = this.dsSapl221.rowcount;
            var totCmpsjCdt = this.dsSapl221.getSum("cmpsjCdt");

            //*신청과목수 :  10       *신청학점 : 30
            this.Static04_00.set_text("*신청과목수 : " + aplyCnt + "		*신청학점 : " + totCmpsjCdt);
          }
        });
      };

      // 조회버튼 클릭 시 처리
      this.div_search_btn_search_onclick = function (obj, e) {
        this.grd_sles131.commonFind();
        this.grd_sapl231.commonFind();
      };

      // 조회 조건 변경 시
      this.dsParam_oncolumnchanged = function (obj, e) {
        if ("serchDiv" == e.columnid) {
          //위치이동.
          this.div_search1.set_left(this.div_search0.left);
          this.div_search1.set_top(this.div_search0.top);
          this.div_search1.set_right(this.div_search0.right);

          if (e.newvalue == "1") {
            this.div_search0.set_visible(false);
            this.div_search1.set_visible(true);
          } else {
            this.div_search0.set_visible(true);
            this.div_search1.set_visible(false);
          }

          if (e.newvalue == "4") {
            this.div_search0.form.cbo_estblDeprtCd.set_enable(false);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "2") {
            this.div_search0.form.cbo_estblDeprtCd.set_enable(false);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "5") {
            this.div_search0.form.cbo_estblDeprtCd.set_enable(true);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "6") {
            this.div_search0.form.cbo_estblDeprtCd.set_enable(true);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "1") {
            this.div_search1.form.cbo_cltrDomnCd.set_index(0);
          } else {
            this.div_search0.form.cbo_estblDeprtCd.set_enable(true);

            var findRow = this.dsEstblDeprtCd.findRow(
              "asignDeprtCd",
              this.dsStunoInfo.get("deptCd")
            );

            if (findRow < 0) {
              this.div_search0.form.cbo_estblDeprtCd.set_index(1);
            } else {
              this.div_search0.form.cbo_estblDeprtCd.set_index(findRow);
            }
          }

          if (e.newvalue == "4") {
            this.dsEstblDeprtCd.filter("asignDeprtCd == null");
            this.div_search0.form.cbo_estblDeprtCd.set_enable(false);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "2") {
            this.dsEstblDeprtCd.filter("asignDeprtCd == null");
            this.div_search0.form.cbo_estblDeprtCd.set_enable(false);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "5") {
            this.dsEstblDeprtCd.filter("asignDeprtCd == null || cmpsjDivCd == '98' ");
            this.div_search0.form.cbo_estblDeprtCd.set_enable(true);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "6") {
            this.dsEstblDeprtCd.filter("asignDeprtCd == null || cmpsjDivCd == '99' ");
            this.div_search0.form.cbo_estblDeprtCd.set_enable(true);
            this.div_search0.form.cbo_estblDeprtCd.set_index(0);
          } else if (e.newvalue == "1") {
            this.div_search1.form.cbo_cltrDomnCd.set_index(0);
          } else {
            this.dsEstblDeprtCd.filter("asignDeprtCd != null || cmpsjDivCd == '1'");
            this.div_search0.form.cbo_estblDeprtCd.set_enable(true);

            var findRow = this.dsEstblDeprtCd.findRow(
              "asignDeprtCd",
              this.dsStunoInfo.get("majorCd") == ""
                ? this.dsStunoInfo.get("deptCd")
                : this.dsStunoInfo.get("majorCd")
            );

            if (findRow < 0) {
              this.div_search0.form.cbo_estblDeprtCd.set_index(1);
            } else {
              this.div_search0.form.cbo_estblDeprtCd.set_index(findRow);
            }
          }

          /*
        		this.div_search0.set_visible(e.newvalue == "0");
        		this.div_search0.set_visible(e.newvalue == "0");
        		this.div_search1.set_visible(e.newvalue == "1");
        		this.div_search1.set_visible(e.newvalue == "1");
        		*/
        }
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
          }
        });
      };

      this.btn_aply_onclick = function (obj, e) {
        //초기화
        this.dsParam2.clearData();
        //대상DS
        var trgetDs = this.dsSles131;
        var thrslCorsCnt = 0,
          tnscmCorsCnt = 0,
          soctySrvcCorsCnt = 0,
          fldprCorsCnt = 0,
          plusCorsCnt = 0;

        if (trgetDs.rowcount <= 0) {
          this.utils.alert("신청 대상이 없습니다.");
          return;
        }

        /* 2021-02-17 전산,교무X -> 학과용수강정정기간check */
        var sDeptCd = this.utils.getGLIO(["deptCd"]).deptCd;
        var currentTime = this.dateUtils.today("yyyymmddHHmi");
        var returnCnt = 0;

        /*
        	if ( sDeptCd != "FE120" && sDeptCd != "FB110" && this.dsParam.get("unvfrStdrDeptCd") == "20000" ) {
        		// 세션부서가 전산(정보시스템팀) X , 교무팀 X --> 수강신청일정(학과용수강정정기간 check)
        		this.utils.transaction({
        			url : "sch/sapl/SaplapCtr/findCorrnPerdList.do"
        			,inDS : "dsParam=dsParam:A"
        			,outDS : "dsSchedule=dsSchedule"
        			,async : false
        			,callback : function() {
        				for ( var i=0; i<this.dsSchedule.rowcount; i++ ) {
        					var tmBindYn = this.dsSchedule.getColumn(i, "tmBindYn");
        					var beginTime = this.dsSchedule.getColumn(i, "beginTime");
        					var endTime = this.dsSchedule.getColumn(i, "endTime");

        					//24시간 진행
        					if ( tmBindYn == "1" ) {
        						if ( currentTime >= beginTime && currentTime < endTime ) {
        							returnCnt+=1;
        						}
        					} else {
        						if ( (currentTime >= beginTime.substr(0, 12) && currentTime < endTime.substr(0,12)) || (currentTime >= beginTime.substr(12, 12) && currentTime < endTime.substr(12,12)) ) {
        							returnCnt+=1;
        						}
        					}
        				}
        			}
        		});
        		if ( returnCnt == 0 ) {
        			this.utils.alert("학과 수강정정기간이 아닙니다.");
        			return false;
        		}
        	}
        */
        //
        //
        //

        this.dsParam2.addRow();

        this.dsParam2.set("syy", trgetDs.get("syy"));
        this.dsParam2.set("smtCd", trgetDs.get("smtCd"));
        this.dsParam2.set("stuno", this.dsParam.get("stuno"));
        this.dsParam2.set("unvfrStdrDeptCd", trgetDs.get("unvfrStdrDeptCd"));
        this.dsParam2.set("subjtCd", trgetDs.get("subjtCd"));
        this.dsParam2.set("corseDvclsNo", trgetDs.get("corseDvclsNo"));
        //this.dsParam2.set("ceckTrgetGbn",  this.mgmtDeptYn=="Y" ? "M" : "D"); //D:학과모드, M:관리자모드
        /*
        	if ( sDeptCd != "FE120" && sDeptCd != "FB110" && this.dsParam.get("unvfrStdrDeptCd") == "20000" ) {
        	  this.dsParam2.set("ceckTrgetGbn",  "D"); //학과
        	} else {
        	  if ( sDeptCd != "36315" && sDeptCd != "30002" && this.dsParam.get("unvfrStdrDeptCd") == "30001" ) {
        		 this.dsParam2.set("ceckTrgetGbn",  "D"); //학과
        	  } else {
        		 this.dsParam2.set("ceckTrgetGbn",  "M"); //M:관리자모드
        	  }
        	}

        */

        if (this.dsStunoInfo.get("mngtYn") == "1") {
          this.dsParam2.set("ceckTrgetGbn", "M"); //관리자
        } else {
          this.dsParam2.set("ceckTrgetGbn", "H"); //학생
        }

        //this.dsParam2.set("ttcMapngNo", trgetDs.get("ttcMapngNo"));
        //this.dsParam2.set("mgmtDeptYn", trgetDs.get("ttcMapngNo"));
        this.dsParam2.set("hiPass", 0);
        this.dsParam2.set("gschSubjtYn", "0"); //대학원교과목여부

        /*
        	if ( "20000" == this.dsSsrm200.get("unvfrStdrDeptCd") && "20000" != trgetDs.get("unvfrStdrDeptCd") ) {
        		//학부생인데 대학원수업을 듣는 경우
        		this.dsParam2.set("gschSubjtYn", "1");  //대학원교과목여부는 'Y'로 초기화
        	} else {
        		this.dsParam2.set("gschSubjtYn", "0");  //대학원교과목여부는 'N'으로 초기화
        	}
        */
        /*
        	if ( "20000" == this.dsSsrm200.get("unvfrStdrDeptCd") && "1" == trgetDs.get("lessnChoicAttrbItemVal119") ) { //LESSN_CHOIC_ATTRB_ITEM_VAL_119
        		//학석사연계과목인 경우
        		if( this.utils.confirm(trgetDs.get("subjtNm") + "은 학석사연계교과목입니다. 학부학점으로 인정 받겠습니까?") ) {
        			this.dsParam2.set("gschSubjtYn", "0");  //대학원교과목여부
        			this.dsParam2.set("bchdmCntcSubjtYn", "1");  //학석사연계교과목여부
        		} else {
        			this.dsParam2.set("gschSubjtYn", "1");  //대학원교과목여부
        			this.dsParam2.set("bchdmCntcSubjtYn", "0");  //학석사연계교과목여부
        		}
        	}
        */
        // 2021-02-15 학생변경불가여부 추가
        //	this.dsParam2.set("stdntChngLmttYn", this.dsParam.get("stdntChngLmttYn"));
        //

        if (this.utils.confirm(trgetDs.get("subjtNm") + " 신청하시겠습니까?")) {
          // 수강신청 대상 체크
          this.utils.transaction({
            url: "com/sapl/SaplapCtr/findSaplHopeAppcsChk.do",
            inDS: "dsParam=dsParam:A",
            error: function (id, code, msg) {
              this.btn_aply.set_enable(false);
              this.btn_cancl.set_enable(false);
            },
            callback: function () {
              //수강신청
              this.utils.transaction({
                url: "com/sapl/SaplapCtr/saveHopeAppcsDtls.do",
                inDS: "dsParam=dsParam2:A",
                timeout: 600,
                error: function (id, code, msg) {
                  if (-30001 > code && this.utils.confirm(msg)) {
                    // -30001과 code의 차이가 hipass번호..
                    this.dsParam2.set("hiPass", Math.abs(code + 30001));
                    this.utils.transaction({
                      url: "com/sapl/SaplapCtr/saveHopeAppcsDtls.do",
                      inDS: "dsParam=dsParam2:A",
                      timeout: 600,
                      error: function (id, code, msg) {
                        if (-30001 > code && this.utils.confirm(msg)) {
                          // -30001과 code의 차이가 hipass번호..
                          this.dsParam2.set("hiPass", Math.abs(code + 30001));
                          this.utils.transaction({
                            url: "com/sapl/SaplapCtr/saveHopeAppcsDtls.do",
                            inDS: "dsParam=dsParam2:A",
                            timeout: 600,
                            error: function (id, code, msg) {
                              if (-30001 > code && this.utils.confirm(msg)) {
                                // -30001과 code의 차이가 hipass번호..
                                this.dsParam2.set("hiPass", Math.abs(code + 30001));
                                //this.saveLctatStatsPrcesList();
                              } else if (code < 0 && code > -30001) {
                                this.utils.alert(msg);
                              }
                            },
                            callback: function () {
                              this.utils.alert("처리되었습니다.");
                              // 수강신청내역 조회
                              this.grd_sapl231.commonFind();
                            }
                          });
                        } else if (code < 0 && code > -30001) {
                          this.utils.alert(msg);
                        }
                      },
                      callback: function () {
                        this.utils.alert("처리되었습니다.");
                        // 수강신청내역 조회
                        this.grd_sapl231.commonFind();
                      }
                    });
                  } else if (code < 0 && code > -30001) {
                    this.utils.alert(msg);
                  }
                },
                callback: function () {
                  this.utils.alert("처리되었습니다.");
                  // 수강신청내역 조회
                  this.grd_sapl231.commonFind();
                }
              });
            }
          });
        }
      };

      this.btn_cancl_onclick = function (obj, e) {
        //초기화
        this.dsParam2.clearData();
        //대상DS
        var trgetDs = this.dsSapl221;
        var thrslCorsCnt = 0,
          tnscmCorsCnt = 0,
          soctySrvcCorsCnt = 0,
          fldprCorsCnt = 0,
          plusCorsCnt = 0;

        if (trgetDs.rowcount <= 0) {
          this.utils.alert("신청취소 대상이 없습니다.");
          return;
        }
        //
        /* 2021-02-17 전산,교무X -> 학과용수강정정기간check */
        var sDeptCd = this.utils.getGLIO(["deptCd"]).deptCd;
        var currentTime = this.dateUtils.today("yyyymmddHHmi");
        var returnCnt = 0;

        this.dsParam2.addRow();

        this.dsParam2.set("syy", trgetDs.get("syy"));
        this.dsParam2.set("smtCd", trgetDs.get("smtCd"));
        this.dsParam2.set("stuno", this.dsParam.get("stuno"));
        this.dsParam2.set("unvfrStdrDeptCd", trgetDs.get("unvfrStdrDeptCd"));
        this.dsParam2.set("subjtCd", trgetDs.get("subjtCd"));
        this.dsParam2.set("corseDvclsNo", trgetDs.get("corseDvclsNo"));

        if (this.utils.confirm(trgetDs.get("subjtNm") + " 신청취소하시겠습니까?")) {
          this.utils.transaction({
            url: "com/sapl/SaplapCtr/saveHopeAppcsDtlsCancl.do",
            inDS: "dsParam=dsParam2:A",
            timeout: 600,
            callback: function () {
              this.utils.alert("처리되었습니다.");
              // 수강신청내역 조회
              this.grd_sapl231.commonFind();
            }
          });
        }
      };

      this.grd_sles131_oncellclick = function (obj, e) {
        if (e.col == 16) {
          var result = "";
          var smtCd = "";

          if (this.dsParam.get("smtCd") == "10") {
            smtCd = "1";
          } else if (this.dsParam.get("smtCd") == "11") {
            smtCd = "2";
          } else if (this.dsParam.get("smtCd") == "20") {
            smtCd = "3";
          } else if (this.dsParam.get("smtCd") == "21") {
            smtCd = "4";
          }
          result =
            this.dsParam.get("syy") +
            "_" +
            smtCd +
            "_" +
            this.dsSles131.getColumn(this.dsSles131.rowposition, "subjtCd") +
            "_" +
            this.dsSles131.getColumn(this.dsSles131.rowposition, "corseDvclsNo");
          window.open(
            "https://ecampus.seowon.ac.kr/crs/creCrsHome/viewHaksaCoursePlanUrl?crsCreCd=" + result
          );

          // 		this.dsReport.setColumn(0, "mlangCd", "ko");
          //
          // 		var result = "";
          //
          // 		result += "'";
          // 		result += this.dsParam.get("syy");
          // 		result += this.dsParam.get("smtCd");
          // 		result += this.dsParam.get("unvfrStdrDeptCd");
          // 		result += this.dsSles131.getColumn(this.dsSles131.rowposition, "subjtCd");
          // 		result += this.dsSles131.getColumn(this.dsSles131.rowposition, "corseDvclsNo");
          // 		result += "'";
          //
          // 		this.dsReport.setColumn(0, "reportListResult", result);
          // 		this.dsReport.setColumn(0, "gbn", "1");
          //
          // 		var filePath;
          //
          // 		if(this.dsParam.get("unvfrStdrDeptCd") == "20000"){
          // 			if(this.dsParam.get("mlangCd") == "ko"){
          // 				filePath = "sch/sles/slesfm/slesfm0340_prn01";
          // 			} else if(this.dsParam.get("mlangCd") == "en"){
          // 				filePath = "sch/sles/slesfm/slesfm0340_prn01_en";
          // 			}
          // 		} else {
          // 			if(this.dsParam.get("mlangCd") == "ko"){
          // 				filePath = "sch/sles/slesfm/slesfm0340_prn02";
          // 			} else if(this.dsParam.get("mlangCd") == "en"){
          // 				filePath = "sch/sles/slesfm/slesfm0340_prn02_en";
          // 			}
          // 		}
          //
          // 		this.utils.callReport({
          // 			 filePath : "sch/sles/slesfm/slesfm0340_prn01"
          // 			,params : this.dsReport
          // 		});
        } else if (e.col == 18) {
          //동일교과목 팝업
          if (this.dsSles131.get("sameAltntYn")) {
            this.popup.saplap0100_pop01
              .setOpts({
                baseCond: {
                  subjtCd: this.dsSles131.get("subjtCd"),
                  subjtNm: this.dsSles131.get("subjtNm")
                },
                callback: function (id, params) {}
              })
              .open();
          }
        } else if (e.col == 19) {
          //수강신청제한 팝업
          if (this.dsSles131.get("ddd")) {
            this.popup.saplap0100_pop04
              .setOpts({
                baseCond: {
                  syy: this.dsParam.get("syy"),
                  smtCd: this.dsParam.get("smtCd"),
                  unvfrStdrDeptCd: this.dsParam.get("unvfrStdrDeptCd"),
                  subjtCd: this.dsSles131.get("subjtCd"),
                  corseDvclsNo: this.dsSles131.get("corseDvclsNo")
                },
                callback: function (id, params) {}
              })
              .open();
          }
        }
      };

      this.btn_schel_onclick = function (obj, e) {
        if (this.dsSapl221.rowcount <= 0) {
          this.utils.alert("시간표 조회할 수강신청 교과목이 없습니다.");
          return;
        }

        var params = {
          filePath: "sch/sapl/saplap/saplap0440_prn03",
          params: {
            syy: this.dsParam.get("syy"),
            smtCd: this.dsParam.get("smtCd"),
            stunoList: this.dsParam.get("stuno")
          },
          useGlio: false,
          checkSearchParam: false
        };
        //
        //
        this.utils.callReport(params);
      };

      this.openMenuCallBack = function (data) {
        if (data && data.get("stuno")) {
          this.dsStunoInfo.copyData(data);
          this.dsParam.set("stuno", data.get("stuno"));
        }
      };

      this.div_search0_edt_subjtCd_onkeyup = function (obj, e) {
        if (e.keycode == 13) {
          this.grd_sles131.commonFind();
          this.grd_sapl231.commonFind();
        }
      };

      this.div_search0_edt_corseDvclsNo_onchanged = function (obj, e) {
        if (e.keycode == 13) {
          this.grd_sles131.commonFind();
          this.grd_sapl231.commonFind();
        }
      };

      this.div_search1_edt_subjtCd_onkeyup = function (obj, e) {
        if (e.keycode == 13) {
          this.grd_sles131.commonFind();
          this.grd_sapl231.commonFind();
        }
      };

      this.div_search1_edt_corseDvclsNo_onkeyup = function (obj, e) {
        if (e.keycode == 13) {
          this.grd_sles131.commonFind();
          this.grd_sapl231.commonFind();
        }
      };
    });

    // Regist UI Components Event
    this.on_initEvent = function () {
      this.addEventHandler("onload", this.form_onload, this);
      this.div_search.form.btn_search.addEventHandler(
        "onclick",
        this.div_search_btn_search_onclick,
        this
      );
      this.div_search.form.rdo_serchDiv.addEventHandler(
        "onitemchanged",
        this.div_search_rdo_serchDiv_onitemchanged,
        this
      );
      this.grd_sles131.addEventHandler("oncellclick", this.grd_sles131_oncellclick, this);
      this.div_search0.form.edt_subjtCd.addEventHandler(
        "onchanged",
        this.div_search_div_search0_edt_asignDeprtCd_onchanged,
        this
      );
      this.div_search0.form.edt_subjtCd.addEventHandler(
        "onkeyup",
        this.div_search0_edt_subjtCd_onkeyup,
        this
      );
      this.div_search0.form.edt_corseDvclsNo.addEventHandler(
        "onchanged",
        this.div_search0_edt_corseDvclsNo_onchanged,
        this
      );
      this.div_search1.form.edt_subjtCd.addEventHandler(
        "onchanged",
        this.div_search_div_search0_edt_asignDeprtCd_onchanged,
        this
      );
      this.div_search1.form.edt_subjtCd.addEventHandler(
        "onkeyup",
        this.div_search1_edt_subjtCd_onkeyup,
        this
      );
      this.div_search1.form.edt_corseDvclsNo.addEventHandler(
        "onkeyup",
        this.div_search1_edt_corseDvclsNo_onkeyup,
        this
      );
      this.btn_aply.addEventHandler("onclick", this.btn_aply_onclick, this);
      this.btn_cancl.addEventHandler("onclick", this.btn_cancl_onclick, this);
      this.btn_schel.addEventHandler("onclick", this.btn_schel_onclick, this);
      this.dsParam.addEventHandler("oncolumnchanged", this.dsParam_oncolumnchanged, this);
      this.dsSles131.addEventHandler("onrowposchanged", this.dsSles131_onrowposchanged, this);
      this.dsSles131.addEventHandler("canrowposchange", this.dsSles131_canrowposchange, this);
      this.dsSapl221.addEventHandler("onrowposchanged", this.dsSles131_onrowposchanged, this);
      this.dsSapl221.addEventHandler("canrowposchange", this.dsSles131_canrowposchange, this);
    };
    this.loadIncludeScript("saplap0130.xfdl");
    this.loadPreloadList();

    // Remove Reference
    obj = null;
  };
})();
