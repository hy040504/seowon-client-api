(function () {
  return function () {
    if (!this._is_form) return;

    var obj = null;

    this.on_create = function () {
      this.set_initvalueid("base");
      this.set_name("saplap0120");
      this.set_titletext("[학부]수강신청공지");
      if (Form == this.constructor) {
        this._setFormPosition(1440, 757);
      }

      // Object(Dataset, ExcelExportObject) Initialize
      obj = new Dataset("DS_LOGINCONFIRM", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl121", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="appcsSchdlCd" type="STRING" size="256"/><Column id="appcsSchdlNm" type="STRING" size="256"/><Column id="beginDt" type="DATE" size="256"/><Column id="endDt" type="DATE" size="256"/><Column id="beginTm" type="STRING" size="256"/><Column id="endTm" type="STRING" size="256"/><Column id="endDate" type="STRING" size="256"/><Column id="aplyFlag" type="STRING" size="256"/><Column id="gopubYn" type="STRING" size="256"/><Column id="remrk" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl121_01", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="appcsSchdlCd" type="STRING" size="256"/><Column id="appcsSchdlNm" type="STRING" size="256"/><Column id="beginDt" type="DATE" size="256"/><Column id="endDt" type="DATE" size="256"/><Column id="beginTm" type="STRING" size="256"/><Column id="endTm" type="STRING" size="256"/><Column id="endDate" type="STRING" size="256"/><Column id="aplyFlag" type="STRING" size="256"/><Column id="gopubYn" type="STRING" size="256"/><Column id="remrk" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsParam", this);
      obj._setContents(
        '<ColumnInfo><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="notcClCd" type="STRING" size="256"/><Column id="atnlcNotcClCd" type="STRING" size="256"/></ColumnInfo><Rows><Row/></Rows>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsUnvfc", this);
      obj._setContents("");
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl121_02", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="appcsSchdlCd" type="STRING" size="256"/><Column id="appcsSchdlNm" type="STRING" size="256"/><Column id="beginDt" type="DATE" size="256"/><Column id="endDt" type="DATE" size="256"/><Column id="beginTm" type="STRING" size="256"/><Column id="endTm" type="STRING" size="256"/><Column id="endDate" type="STRING" size="256"/><Column id="aplyFlag" type="STRING" size="256"/><Column id="gopubYn" type="STRING" size="256"/><Column id="remrk" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl011", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="atnlcNotcClCd" type="STRING" size="256"/><Column id="atnlcNotcNo" type="BigDecimal" size="256"/><Column id="atnlcNotcTitle" type="STRING" size="256"/><Column id="atnlcNotcCtnt" type="STRING" size="256"/><Column id="atnlcNotcEngTitle" type="STRING" size="256"/><Column id="atnlcNotcEngCtnt" type="STRING" size="256"/><Column id="atnlcNotcChnTitle" type="STRING" size="256"/><Column id="atnlcNotcChnCtnt" type="STRING" size="256"/><Column id="nlognNotcYn" type="STRING" size="256"/><Column id="notcBeginDttm" type="STRING" size="256"/><Column id="notcEndDttm" type="STRING" size="256"/><Column id="attflUuid" type="STRING" size="256"/><Column id="attflUuidNm" type="STRING" size="256"/><Column id="atnlcNotcOrd" type="BigDecimal" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="emrgyNotcTrgetYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      obj = new Dataset("dsSapl011_01", this);
      obj.set_useclientlayout("true");
      obj._setContents(
        '<ColumnInfo><Column id="chk" type="STRING" size="256"/><Column id="syy" type="STRING" size="256"/><Column id="smtCd" type="STRING" size="256"/><Column id="atnlcNotcClCd" type="STRING" size="256"/><Column id="atnlcNotcNo" type="BigDecimal" size="256"/><Column id="atnlcNotcTitle" type="STRING" size="256"/><Column id="atnlcNotcCtnt" type="STRING" size="256"/><Column id="atnlcNotcEngTitle" type="STRING" size="256"/><Column id="atnlcNotcEngCtnt" type="STRING" size="256"/><Column id="atnlcNotcChnTitle" type="STRING" size="256"/><Column id="atnlcNotcChnCtnt" type="STRING" size="256"/><Column id="nlognNotcYn" type="STRING" size="256"/><Column id="notcBeginDttm" type="STRING" size="256"/><Column id="notcEndDttm" type="STRING" size="256"/><Column id="attflUuid" type="STRING" size="256"/><Column id="attflUuidNm" type="STRING" size="256"/><Column id="atnlcNotcOrd" type="BigDecimal" size="256"/><Column id="unvfrStdrDeptCd" type="STRING" size="256"/><Column id="emrgyNotcTrgetYn" type="STRING" size="256"/></ColumnInfo>'
      );
      this.addChild(obj.name, obj);

      // UI Components Initialize
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
      obj.set_taborder("0");
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
      obj.set_taborder("1");
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
      obj.set_taborder("2");
      obj.set_text("<b v=\'true>수강신청 안내사항</b>");
      obj.set_usedecorate("true");
      obj.set_cssclass("sta_bid_title5");
      obj.set_color("#ffffff");
      this.addChild(obj.name, obj);

      obj = new Div("Div00", "85", "135", "1290", null, null, "-583", null, null, null, null, this);
      obj.set_taborder("3");
      obj.set_text("Div00");
      obj.set_positionstep("0");
      obj.set_border("10px soild #14ffaa");
      this.addChild(obj.name, obj);

      obj = new Static(
        "sta_bg2",
        "10",
        "10",
        "1260",
        "211",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_cssclass("sta_WFDA_Label02");
      obj.set_taborder("0");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_label6",
        "10",
        "10",
        "240",
        "211",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_text("◈ 수강신청");
      obj.set_cssclass("sta_WFDA_Label01");
      obj.set_taborder("1");
      obj.set_font('normal 700 15px/normal "basefont"');
      obj.set_textAlign("left");
      obj.set_padding("0px 0px 0px 10px");
      obj.set_cursor("pointer");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_bg2_00",
        "10",
        "220",
        "1260",
        "71",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_cssclass("sta_WFDA_Label02");
      obj.set_taborder("2");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_label6_00",
        "10",
        "220",
        "240",
        "71",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_text("◈ 수강신청변경");
      obj.set_cssclass("sta_WFDA_Label01");
      obj.set_taborder("3");
      obj.set_font('normal 700 15px/normal "basefont"');
      obj.set_padding("0px 0px 0px 10px");
      obj.set_textAlign("left");
      obj.set_cursor("pointer");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_bg2_01",
        "10",
        "290",
        "1260",
        "41",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_cssclass("sta_WFDA_Label02");
      obj.set_taborder("4");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_label6_00_00",
        "10",
        "290",
        "1260",
        "41",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_text("◈ 수강신청 공지사항");
      obj.set_cssclass("sta_WFDA_Label01");
      obj.set_taborder("5");
      obj.set_font('normal 700 15px/normal "basefont"');
      obj.set_padding("0px 0px 0px 10px");
      obj.set_textAlign("left");
      obj.set_cursor("pointer");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_bg2_01_00",
        "10",
        "330",
        "1260",
        "41",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_cssclass("sta_WFDA_Label02");
      obj.set_taborder("6");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_label6_00_00_01",
        "10",
        "330",
        "390",
        "41",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_text("◈ 강의시간표조회");
      obj.set_cssclass("sta_WFDA_Label01");
      obj.set_taborder("7");
      obj.set_font('normal 700 15px/normal "basefont"');
      obj.set_padding("0px 0px 0px 10px");
      obj.set_textAlign("left");
      obj.set_cursor("pointer");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_bg2_02",
        "10",
        "370",
        "1260",
        "119",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("8");
      obj.set_text(
        "<b v=\'true>※성적장학금 수혜를 위해서는</b>\r\n졸업학점이 120학점인 학과 1,2,3,4학년은 12학점 이상,\r\n졸업학점이 130학점인 학과 1,2,3학년은  14학점, 4학년은 13학점 이상 이수해야하며,\r\n졸업학점이 140학점인 학과 1,2,3학년은 16학점, 4학년은 15학점 이상 이수해야 합니다.\r\n<b v=\'true>또한 P/F과목을 제외한 등급에 의한 성적부여 과목을\r\n1,2,3학년은 10학점 이상, 4학년은 7학점 이상 이수해야 합니다. [최종학기자 및 초과학기자 제외]</b>"
      );
      obj.set_cssclass("sta_WFDA_Label02");
      obj.set_usedecorate("true");
      obj.set_font('14px/normal "basefont"');
      obj.set_visible("false");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_bg2_02_01",
        "240",
        "493",
        "810",
        "47",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("9");
      obj.set_text(
        "<b v=\'true>서원대학교 교양이수체계(간소화버전)</b>\r\n수강신청 시, 아래 교양이수체계 표를 반드시 참고하여 본인 수강 여부(졸업여건 충족 여부)를 확인하여야 합니다."
      );
      obj.set_usedecorate("true");
      obj.set_font('14px/normal "basefont"');
      obj.set_textAlign("center");
      obj.set_visible("false");
      this.Div00.addChild(obj.name, obj);

      obj = new Grid(
        "Grid00",
        "253",
        "14",
        "1013",
        "203",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_taborder("10");
      obj.set_binddataset("dsSapl121_01");
      obj.set_autofittype("col");
      obj._setContents(
        '<Formats><Format id="default"><Columns><Column size="176"/><Column size="486"/><Column size="350"/></Columns><Rows><Row size="24"/></Rows><Band id="body"><Cell text="bind:appcsSchdlNm"/><Cell col="1" text="bind:endDate"/><Cell col="2" text="bind:remrk"/></Band></Format></Formats>'
      );
      this.Div00.addChild(obj.name, obj);

      obj = new Grid(
        "Grid00_00",
        "253",
        "224",
        "1013",
        "63",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_taborder("11");
      obj.set_binddataset("dsSapl121_02");
      obj.set_autofittype("col");
      obj._setContents(
        '<Formats><Format id="default"><Columns><Column size="176"/><Column size="486"/><Column size="350"/></Columns><Rows><Row size="24"/></Rows><Band id="body"><Cell text="bind:appcsSchdlNm"/><Cell col="1" text="bind:endDate"/><Cell col="2" text="bind:remrk"/></Band></Format></Formats>'
      );
      this.Div00.addChild(obj.name, obj);

      obj = new Grid(
        "Grid01",
        "33",
        "1085",
        "1215",
        "110",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_taborder("12");
      obj.set_autofittype("col");
      obj.set_visible("false");
      obj._setContents(
        '<Formats><Format id="default"><Columns><Column size="100"/><Column size="100"/><Column size="100"/><Column size="258"/><Column size="80"/><Column size="170"/><Column size="90"/><Column size="90"/></Columns><Rows><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="53" band="head"/><Row size="50" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="24" band="head"/><Row size="32" band="head"/><Row size="24" band="head"/></Rows><Band id="head"><Cell text="구분" textAlign="center" background="darkgray"/><Cell col="1" text="대영역" textAlign="center" background="darkgray"/><Cell col="2" text="소영역" textAlign="center" background="darkgray"/><Cell col="3" text="교과목명" textAlign="center" background="darkgray"/><Cell col="4" text="학점" textAlign="center" background="darkgray"/><Cell col="5" text="사범대" textAlign="center" background="darkgray"/><Cell col="6" text="일반대" textAlign="center" background="darkgray"/><Cell col="7" text="미래대" textAlign="center" background="darkgray"/><Cell row="1" rowspan="12" textAlign="center" text="교양&#13;&#10;필수"/><Cell row="1" col="1" rowspan="7" textAlign="center" text="중점교양 및 &#13;&#10;기초학업(공통)"/><Cell row="1" col="2" rowspan="7" textAlign="center"/><Cell row="1" col="3" textAlign="center" text="드림프로젝트"/><Cell row="1" col="4" textAlign="center" text="2"/><Cell row="1" col="5" textAlign="center" text="○"/><Cell row="1" col="6" textAlign="center" text="○"/><Cell row="1" col="7" textAlign="center"/><Cell row="2" col="3" textAlign="center" text="사회봉사ⅰ"/><Cell row="2" col="4" textAlign="center" text="1"/><Cell row="2" col="5" textAlign="center" text="○"/><Cell row="2" col="6" textAlign="center" text="○"/><Cell row="2" col="7" textAlign="center" text="○"/><Cell row="3" col="3" textAlign="center" text="SU인성코칭ⅰ,ⅱ,ⅲ"/><Cell row="3" col="4" textAlign="center" text="각1*3"/><Cell row="3" col="5" textAlign="center" text="○"/><Cell row="3" col="6" textAlign="center" text="○"/><Cell row="3" col="7" textAlign="center" text="○"/><Cell row="4" col="3" textAlign="center" text="SU진로코칭ⅰ,ⅱ,ⅲ"/><Cell row="4" col="4" textAlign="center" text="각1*3"/><Cell row="4" col="5" textAlign="center" text="○"/><Cell row="4" col="6" textAlign="center" text="○"/><Cell row="4" col="7" textAlign="center" text="○"/><Cell row="5" col="3" textAlign="center" text="사고와표현ⅰ - 글쓰기"/><Cell row="5" col="4" textAlign="center" text="2"/><Cell row="5" col="5" textAlign="center" text="○"/><Cell row="5" col="6" textAlign="center" text="○"/><Cell row="5" col="7" textAlign="center"/><Cell row="6" col="3" textAlign="center" text="사고와표현ⅱ - 말하기"/><Cell row="6" col="4" textAlign="center" text="2"/><Cell row="6" col="5" textAlign="center" text="○"/><Cell row="6" col="6" textAlign="center" text="○"/><Cell row="6" col="7" textAlign="center"/><Cell row="7" col="3" textAlign="center" text="영어회화ⅰ"/><Cell row="7" col="4" textAlign="center" text="2"/><Cell row="7" col="5" textAlign="center" text="○"/><Cell row="7" col="6" textAlign="center" text="○"/><Cell row="7" col="7" textAlign="center"/><Cell row="8" col="1" colspan="2" textAlign="center"/><Cell row="8" col="3" colspan="2" textAlign="center" text="이수학점 소계"/><Cell row="8" col="5" textAlign="center" text="15"/><Cell row="8" col="6" textAlign="center" text="15"/><Cell row="8" col="7" textAlign="center" text="7"/><Cell row="9" col="1" rowspan="3" textAlign="center" text="기초학업(계열)&#13;&#10;* 졸업학위기준"/><Cell row="9" col="2" textAlign="center" text="인문∙사회과학"/><Cell row="9" col="3" textAlign="center" text="문학의이해,언어의이해,인간과사회,&#13;&#10;글로벌문화의이해,통계와분석,비판적사고"/><Cell row="9" col="4" rowspan="3" textAlign="center" text="각3학점"/><Cell row="9" col="5" rowspan="3" colspan="3" textAlign="center" text="자기계열의 교과목 1과목(3학점)이수&#13;&#10;+ 타계열의 교과목 1과목(3학점)이수"/><Cell row="10" col="2" textAlign="center" text="자연과학"/><Cell row="10" col="3" textAlign="center" text="일반수학,일반물리학,일반화학,일반생물학,&#13;&#10;과학기술의이해,데이터기반사고"/><Cell row="11" col="2" textAlign="center" text="예체능"/><Cell row="11" col="3" textAlign="center" text="예술의이해,현대사회와문화,창의적사고"/><Cell row="12" col="1" colspan="2" textAlign="center"/><Cell row="12" col="3" colspan="2" textAlign="center" text="이수학점 소계"/><Cell row="12" col="5" textAlign="center" text="6"/><Cell row="12" col="6" textAlign="center" text="6"/><Cell row="12" col="7" textAlign="center" text="6"/><Cell row="13" rowspan="6" textAlign="center" text="교양&#13;&#10;선택"/><Cell row="13" col="1" rowspan="5" textAlign="center" text="균형교양"/><Cell row="13" col="2" colspan="3" textAlign="center" text="문학∙예술∙문화"/><Cell row="13" col="5" rowspan="5" textAlign="center" text="2개 영역에서 &#13;&#10;영역별 1과목 &#13;&#10;이상 이수"/><Cell row="13" col="6" rowspan="5" colspan="2" textAlign="center" text="4개 영역에서&#13;&#10;영역별 1과목&#13;&#10;이상 이수"/><Cell row="14" col="2" colspan="3" textAlign="center" text="역사와철학"/><Cell row="15" col="2" colspan="3" textAlign="center" text="정치∙경제∙사회"/><Cell row="16" col="2" colspan="3" textAlign="center" text="과학과기술"/><Cell row="17" col="2" colspan="3" textAlign="center" text="실용실천"/><Cell row="18" col="1" textAlign="center"/><Cell row="18" col="2" textAlign="center"/><Cell row="18" col="3" colspan="2" textAlign="center" text="이수학점 소계"/><Cell row="18" col="5" textAlign="center" text="4 이상"/><Cell row="18" col="6" textAlign="center" text="19 이상"/><Cell row="18" col="7" textAlign="center" text="17 이상"/><Cell row="19" rowspan="2" colspan="5" textAlign="center" text="교양최소이수학점 합계"/><Cell row="19" col="5" textAlign="center" text="25(23학년도 입학자 부터 27)"/><Cell row="19" col="6" textAlign="center" text="40"/><Cell row="19" col="7" textAlign="center" text="30"/><Cell row="20" col="5" textAlign="center" text="사범대"/><Cell row="20" col="6" textAlign="center" text="일반대"/><Cell row="20" col="7" textAlign="center" text="미래대"/></Band></Format></Formats>'
      );
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static00",
        "35",
        "sta_label6:-90",
        "160",
        "20",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_taborder("13");
      obj.set_usedecorate("true");
      obj.set_text("<b v=\'true>(클릭하여 신청)</b>");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_label6_00_00_01_00",
        "400",
        "330",
        "390",
        "41",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_text("◈ 타학과전공인정과목조회");
      obj.set_cssclass("sta_WFDA_Label01");
      obj.set_taborder("14");
      obj.set_font('normal 700 15px/normal "basefont"');
      obj.set_padding("0px 0px 0px 10px");
      obj.set_textAlign("left");
      obj.set_cursor("pointer");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "sta_label6_00_00_01_00_00",
        "789",
        "330",
        "480",
        "41",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_text("◈ 대치교과목조회");
      obj.set_cssclass("sta_WFDA_Label01");
      obj.set_taborder("15");
      obj.set_font('normal 700 15px/normal "basefont"');
      obj.set_padding("0px 0px 0px 10px");
      obj.set_textAlign("left");
      obj.set_cursor("pointer");
      this.Div00.addChild(obj.name, obj);

      obj = new Static(
        "Static00_00",
        "35",
        "sta_label6_00:-26",
        "160",
        "20",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_taborder("16");
      obj.set_usedecorate("true");
      obj.set_text("<b v=\'true>(클릭하여 신청)</b>");
      this.Div00.addChild(obj.name, obj);

      obj = new WebBrowser(
        "web_notice",
        "13",
        "381",
        "1257",
        "724",
        null,
        null,
        null,
        null,
        null,
        null,
        this.Div00.form
      );
      obj.set_initvalueid("base");
      obj.set_taborder("17");
      obj.set_enable("false");
      obj.set_accessibilityrole("webbrowser");
      this.Div00.addChild(obj.name, obj);

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
      obj.set_taborder("4");
      obj.set_border("0px none");
      obj.set_image("url(\'theme::edu/logo/logo-seowon.png\')");
      obj.set_background("transparent");
      this.addChild(obj.name, obj);

      obj = new Div(
        "div_atnlcNotcCtnt",
        "90",
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
      obj.set_taborder("5");
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
        "57",
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
      obj = new Layout("default", "", 1440, 757, this, function (p) {});
      this.addLayout(obj.name, obj);

      // BindItem Information

      // TriggerItem Information
    };

    this.loadPreloadList = function () {};

    // User Script
    this.addIncludeScript("saplap0100.xfdl", "LIB::libInclude.xjs");
    this.registerScript("saplap0100.xfdl", function () {
      /***************************************************************************************************
       * 화면(명)   : saplap0100 ( [학생]수강신청 공지 )
       * 화면 설명  : [학생]수강신청 공지
       * 작성자     : LEESANGGEUN
       ***************************************************************************************************/
      this.executeIncludeScript("LIB::libInclude.xjs"); /*include "LIB::libInclude.xjs"*/

      // 최초 화면 Load시 처리 할 사항
      this.form_onload = function (obj, e) {
        // 화면 초기화 (필수)
        this.initForm(obj, e);
        this.comboLoad();
        this.componentSetting();

        this.utils.initWebViewer(this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt);

        this.utils.initWebViewer(this.Div00.form.web_notice);

        //학사력 조회
        this.findScomUnvfrSchdlInfo("1", "SAPL00010001", "20000", "", "", "", "", "", ""); // 20000:학부

        //수강신청일정
        this.findRecanList();

        //수강신청공지
        this.findAppcsNotcList("emrgyNotcTrgetYn");

        //수강신청공지
        this.findAppcsNotcList2();
        //
        //
        //
      };
      // 공통코드 처리
      this.comboLoad = function () {};

      // 컴포넌트 셋팅
      this.componentSetting = function () {
        this.popup.make({
          id: "saplap0100_pop01",
          mode: "M",
          title: "대치교과목팝업",
          url: "SCH_SAPLAP::saplap0100_pop01.xfdl",
          width: 800,
          height: 600,
          callback: function (id, data) {}
        });

        this.popup.make({
          id: "saplap0100_pop02",
          mode: "W",
          resize: true,
          title: "개설강좌목록",
          url: "SCH_SAPLAP::saplap0100_pop02.xfdl",
          width: 1150,
          height: 600,
          callback: function (id, data) {}
        });

        this.popup.make({
          id: "saplap0100_pop05",
          mode: "W",
          resize: true,
          title: "대치교과목조회",
          url: "SCH_SAPLAP::saplap0100_pop05.xfdl",
          width: 800,
          height: 600,
          callback: function (id, data) {}
        });

        this.popup.make({
          id: "saplap0100_pop06",
          mode: "W",
          resize: true,
          title: "타학과전공인정과목조회",
          url: "SCH_SAPLAP::saplap0100_pop06.xfdl",
          width: 990,
          height: 650,
          callback: function (id, data) {}
        });

        this.popup.make({
          id: "saplap0100_pop07",
          mode: "M",
          resize: true,
          title: "첨부파일조회",
          url: "SCH_SAPLAP::saplap0100_pop07.xfdl",
          width: 750,
          height: 500,
          callback: function (id, data) {}
        });
      };

      // 수강신청 일정에 따른 로그인 메뉴이동
      this.Div00_sta_label6_onclick = function (obj, e) {
        //100 : 수강신청 로그인 기간
        //220 : 장바구니
        //310 : 수강신청
        //320 : 학부생 대학원교과 수강신청
        //330 : 기타수강신청
        //340 : 수강신청변경
        //345 : 계절수강변경
        //350 : 수강신청취소
        //360 : 학과용수강변경

        //수강신청일정
        this.findRecanList();
        if (this.dsSapl121_01.findRowExpr("aplyFlag == '1'") > -1) {
          this.parent.parent.dsApplyGLIO.setColumn(0, "extCd", "appcs");
          this.parent.parent.div_loginPage.set_url("SCH_SAPLAP::saplap0120.xfdl");
        } else {
          this.utils.alert("수강신청 기간이 아닙니다.");
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
            //수강신청공지사항 조회
            this.findRecanList();
          }
        });
      };

      //수강신청일정 조회
      this.findRecanList = function () {
        this.utils.transaction({
          url: "com/SsoCtr/findAppcsSchdlList.do",
          inDS: "dsParam=dsParam:A",
          outDS: "dsSapl121=dsSapl121",
          callback: function () {
            this.dsSapl121_01.assign(this.dsSapl121);
            this.dsSapl121_02.assign(this.dsSapl121);

            this.dsSapl121_01.filter("appcsSchdlCd != '340' && gopubYn == '1'");
            this.dsSapl121_02.filter("appcsSchdlCd == '340' && gopubYn == '1'");
          }
        });
      };

      //수강신청 변경 기간 로그인
      this.Div00_sta_label6_00_onclick = function (obj, e) {
        //100 : 수강신청 로그인 기간
        //220 : 장바구니
        //310 : 수강신청
        //320 : 학부생 대학원교과 수강신청
        //330 : 기타수강신청
        //340 : 수강신청변경
        //345 : 계절수강변경
        //350 : 수강신청취소
        //360 : 학과용수강변경
        // 	if(this.dsSapl121.findRowExpr("appcsSchdlCd == '100' && aplyFlag == '1'") > -1){
        // 		this.parent.parent.dsApplyGLIO.setColumn(0,"extCd","appcsUpdate");
        // 		this.parent.parent.div_loginPage.set_url("SCH_SAPLAP::saplap0120.xfdl");
        // 		//
        // 	}else {
        // 		this.utils.alert("수강신청변경 기간이 아닙니다.");
        // 	}
        //
        //수강신청일정
        this.findRecanList();

        if (this.dsSapl121_02.findRowExpr("appcsSchdlCd == '340' && aplyFlag == '1'") > -1) {
          this.parent.parent.dsApplyGLIO.setColumn(0, "extCd", "appcsUpdate");

          this.parent.parent.div_loginPage.set_url("SCH_SAPLAP::saplap0120.xfdl");
        } else {
          this.utils.alert("수강신청변경 기간이 아닙니다.");
        }
      };

      this.Div00_sta_label6_00_00_00_00_onclick = function (obj, e) {
        this.popup.saplap0100_pop01.open();
      };

      this.Div00_sta_label6_00_00_01_onclick = function (obj, e) {
        this.popup.saplap0100_pop02.open();
      };

      this.Div00_sta_label6_00_00_onclick = function (obj, e) {
        this.findAppcsNotcList();
        this.findAppcsNotcList2();
      };

      //공지사항 조회
      this.findAppcsNotcList = function (str) {
        //this.dsParam.set("notcClCd","A");
        this.dsParam.set("notcClCd", "I");

        this.utils.transaction({
          url: "com/SsoCtr/findAppcsNotcList.do",
          async: false,
          inDS: "dsParam=dsParam:A",
          outDS: "dsSapl011=dsSapl011",
          callback: function () {
            if (str == "emrgyNotcTrgetYn") {
              if (this.dsSapl011.getColumn(0, "emrgyNotcTrgetYn") == "1") {
                this.div_atnlcNotcCtnt.set_visible(true);
                this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt.setValue(
                  this.dsSapl011.getColumn(0, "atnlcNotcCtnt")
                );
              }
            } else {
              this.div_atnlcNotcCtnt.set_visible(true);
              this.div_atnlcNotcCtnt.form.web_atnlcNotcCtnt.setValue(
                this.dsSapl011.getColumn(0, "atnlcNotcCtnt")
              );
            }
          }
        });
      };

      //하단의 web_notice 부분 조회.
      // 23.12.07 서원대학교 추가사항.
      // AS-IS : 그리드가 하드코딩 되어 있었는데 해당 그리드를 visible = false 처리 함.
      // TO-BE : 수강신청 안내사항(atnlcNotcClCd = "I") 으로 분류된 데이터에 대해서 조회함.
      this.findAppcsNotcList2 = function () {
        this.dsParam.set("notcClCd", "");
        this.dsParam.set("atnlcNotcClCd", "I");

        this.utils.transaction({
          url: "com/SsoCtr/findAppcsNotcList.do",
          async: false,
          inDS: "dsParam=dsParam:A",
          outDS: "dsSapl011_01=dsSapl011",
          callback: function () {
            let _length = this.dsSapl011_01.rowcount;
            let content = "";
            for (var idx = 0; idx < _length; idx++) {
              content += this.dsSapl011_01.getColumn(idx, "atnlcNotcCtnt");
              content += "<br/>";
            }
            this.Div00.form.web_notice.setValue(content);
          }
        });
      };

      this.btn_close_onclick = function (obj, e) {
        this.div_atnlcNotcCtnt.set_visible(false);
      };

      this.btn_fileDown_onclick = function (obj, e) {
        /*
        	this.popup.saplap0100_pop07.setOpts({
        			baseCond : {
        			     fileNo : this.dsSapl011.getColumn(this.dsSapl011.rowposition, "attflUuid")
        			}
        			, callback : function(id, params){

        			}
        		}).open();
        */
        this.commonPopup.fileD.open({
          table: "SCH.SAPL011",
          fileNo: this.dsSapl011.getColumn(this.dsSapl011.rowposition, "attflUuid"),
          callback: function (id, data) {
            if (data && data.fileNo) {
            }
          }
        });
      };

      this.Div00_sta_label6_00_00_01_00_onclick = function (obj, e) {
        //타학과인정과목조회
        this.popup.saplap0100_pop06.open();
      };

      this.Div00_sta_label6_00_00_01_00_00_onclick = function (obj, e) {
        //대치과목조회
        this.popup.saplap0100_pop05.open();
      };
    });

    // Regist UI Components Event
    this.on_initEvent = function () {
      this.addEventHandler("onload", this.form_onload, this);
      this.Div00.form.sta_label6.addEventHandler("onclick", this.Div00_sta_label6_onclick, this);
      this.Div00.form.sta_label6_00.addEventHandler(
        "onclick",
        this.Div00_sta_label6_00_onclick,
        this
      );
      this.Div00.form.sta_label6_00_00.addEventHandler(
        "onclick",
        this.Div00_sta_label6_00_00_onclick,
        this
      );
      this.Div00.form.sta_label6_00_00_01.addEventHandler(
        "onclick",
        this.Div00_sta_label6_00_00_01_onclick,
        this
      );
      this.Div00.form.sta_bg2_02.addEventHandler("onclick", this.Div00_sta_bg2_02_onclick, this);
      this.Div00.form.sta_bg2_02_01.addEventHandler("onclick", this.Div00_sta_bg2_02_onclick, this);
      this.Div00.form.sta_label6_00_00_01_00.addEventHandler(
        "onclick",
        this.Div00_sta_label6_00_00_01_00_onclick,
        this
      );
      this.Div00.form.sta_label6_00_00_01_00_00.addEventHandler(
        "onclick",
        this.Div00_sta_label6_00_00_01_00_00_onclick,
        this
      );
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
      this.dsSapl121.addEventHandler("onrowposchanged", this.dsSapl121_onrowposchanged, this);
      this.dsSapl121.addEventHandler("canrowposchange", this.dsSapl121_canrowposchange, this);
      this.dsSapl121_01.addEventHandler("onrowposchanged", this.dsSapl121_onrowposchanged, this);
      this.dsSapl121_01.addEventHandler("canrowposchange", this.dsSapl121_canrowposchange, this);
      this.dsParam.addEventHandler("oncolumnchanged", this.dsParam_oncolumnchanged, this);
      this.dsSapl121_02.addEventHandler("onrowposchanged", this.dsSapl121_onrowposchanged, this);
      this.dsSapl121_02.addEventHandler("canrowposchange", this.dsSapl121_canrowposchange, this);
      this.dsSapl011.addEventHandler("canrowposchange", this.dsSapl011_canrowposchange, this);
      this.dsSapl011.addEventHandler("onrowposchanged", this.dsSapl011_onrowposchanged, this);
      this.dsSapl011.addEventHandler("oncolumnchanged", this.dsSapl011_oncolumnchanged, this);
      this.dsSapl011_01.addEventHandler("canrowposchange", this.dsSapl011_canrowposchange, this);
      this.dsSapl011_01.addEventHandler("onrowposchanged", this.dsSapl011_onrowposchanged, this);
      this.dsSapl011_01.addEventHandler("oncolumnchanged", this.dsSapl011_oncolumnchanged, this);
    };
    this.loadIncludeScript("saplap0100.xfdl");
    this.loadPreloadList();

    // Remove Reference
    obj = null;
  };
})();
