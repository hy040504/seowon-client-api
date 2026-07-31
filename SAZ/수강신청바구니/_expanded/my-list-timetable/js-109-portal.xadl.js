(function () {
  return function () {
    this.on_loadAppVariables = function () {
      var obj = null;
      // global dataobject

      // global dataset
      obj = new Dataset("gds_holiday", this);
      obj._setContents(
        '<ColumnInfo><Column id="hldyDate" type="STRING" size="256"/><Column id="textColor" type="STRING" size="256"/></ColumnInfo>'
      );
      this._addDataset(obj.name, obj);

      obj = new Dataset("gds_viewSession", this);
      obj._setContents(
        '<ColumnInfo><Column id="userGb" type="STRING" size="256"/><Column id="uuid" type="STRING" size="256"/><Column id="userId" type="STRING" size="256"/><Column id="userNm" type="STRING" size="256"/><Column id="persNo" type="STRING" size="256"/><Column id="msg" type="STRING" size="256"/></ColumnInfo>'
      );
      this._addDataset(obj.name, obj);

      obj = new Dataset("gds_baseInfo", this);
      obj._setContents("");
      this._addDataset(obj.name, obj);

      obj = new Dataset("gds_socps", this);
      obj._setContents("");
      this._addDataset(obj.name, obj);

      // global variable

      obj = null;
    };

    // property, event, createMainFrame
    this.on_initApplication = function () {
      // properties
      this.set_id("portal");
      this.set_screenid("portal");

      if (this._is_attach_childframe) return;

      // frame
      var mainframe = this.createMainFrame("mainframe", "0", "0", "1440", "907", null, null, this);
      mainframe.set_showtitlebar("false");
      mainframe.set_showstatusbar("false");
      mainframe.on_createBodyFrame = this.mainframe_createBodyFrame;
      // tray
    };

    this.loadPreloadList = function () {};

    this.mainframe_createBodyFrame = function () {
      var frame0 = new HFrameSet("HFrame", null, null, null, null, null, null, this);
      frame0.set_separatesize("*,1440,*");
      frame0.set_showtitlebar("false");
      frame0.set_showtitleicon("false");
      this.addChild(frame0.name, frame0);
      this.frame = frame0;

      var frame1 = new ChildFrame("leftBlank", null, null, null, null, null, null, "", frame0);
      frame1.set_visible("false");
      frame1.set_showtitleicon("false");
      frame1.set_showtitlebar("false");
      frame0.addChild(frame1.name, frame1);

      var frame2 = new VFrameSet("VFrame", null, null, null, null, null, null, frame0);
      frame2.set_showtitlebar("false");
      frame2.set_showtitleicon("false");
      frame2.set_separatesize("*,0");
      frame0.addChild(frame2.name, frame2);

      var frame3 = new ChildFrame(
        "LoginFrame",
        null,
        null,
        null,
        null,
        null,
        null,
        "COM_FRAME::loginFrame.xfdl",
        frame2
      );
      frame3.set_showtitleicon("false");
      frame3.set_showtitlebar("false");
      frame3.set_dragmovetype("none");
      frame3.set_visible("false");
      frame2.addChild(frame3.name, frame3);
      frame3.set_formurl("COM_FRAME::loginFrame.xfdl");

      var frame4 = new VFrameSet("VMainFrame", null, null, null, null, null, null, frame2);
      frame4.set_separatesize("120,0,*");
      frame4.set_showtitlebar("false");
      frame4.set_showtitleicon("false");
      frame4.set_visible("false");
      frame2.addChild(frame4.name, frame4);

      var frame5 = new ChildFrame(
        "TopFrame",
        null,
        null,
        null,
        null,
        null,
        null,
        "COM_FRAME::topFrame.xfdl",
        frame4
      );
      frame5.set_showtitlebar("false");
      frame5.set_showstatusbar("false");
      frame5.set_dragmovetype("none");
      frame5.set_showtitleicon("false");
      frame4.addChild(frame5.name, frame5);
      frame5.set_formurl("COM_FRAME::topFrame.xfdl");

      var frame6 = new ChildFrame(
        "TabFrame",
        null,
        null,
        null,
        null,
        null,
        null,
        "COM_FRAME::portalTabFrame.xfdl",
        frame4
      );
      frame6.set_showtitlebar("false");
      frame6.set_showtitleicon("false");
      frame6.set_dragmovetype("none");
      frame4.addChild(frame6.name, frame6);
      frame6.set_formurl("COM_FRAME::portalTabFrame.xfdl");

      var frame7 = new HFrameSet("HFrameWork", null, null, null, null, null, null, frame4);
      frame7.set_separatesize("0,*,0");
      frame4.addChild(frame7.name, frame7);

      var frame8 = new ChildFrame("LeftFrame", null, null, null, null, null, null, "", frame7);
      frame8.set_showtitlebar("false");
      frame8.set_showstatusbar("false");
      frame8.set_dragmovetype("none");
      frame7.addChild(frame8.name, frame8);

      var frame9 = new ChildFrame("WorkFrame", null, null, null, null, null, null, "", frame7);
      frame9.set_showtitlebar("false");
      frame9.set_showstatusbar("false");
      frame9.set_dragmovetype("none");
      frame7.addChild(frame9.name, frame9);

      var frame10 = new ChildFrame(
        "RightFrame",
        null,
        null,
        null,
        null,
        null,
        null,
        "COM_FRAME::rightFrame.xfdl",
        frame7
      );
      frame10.set_showtitlebar("false");
      frame10.set_showtitleicon("false");
      frame7.addChild(frame10.name, frame10);
      frame10.set_formurl("COM_FRAME::rightFrame.xfdl");

      var frame11 = new ChildFrame("rightBlank", null, null, null, null, null, null, "", frame0);
      frame11.set_visible("false");
      frame11.set_showtitlebar("false");
      frame11.set_showtitleicon("false");
      frame0.addChild(frame11.name, frame11);
    };

    this.on_initEvent = function () {
      this.addEventHandler("onload", this.Application_onload, this);
      this.mainframe.addEventHandler("onsize", this.setviewport, this);
      this.mainframe.addEventHandler("onactivate", this.setviewport, this);
    };

    // script Compiler
    this.registerScript("portal.xadl", function () {
      /**********************************************************************************
       *  공통  변수, 객체, 상수를 정의
       **********************************************************************************/
      this.ErrorCode;
      this.gv_vFrameSet = ""; //VFrameSet (86,0,*,30)
      this.gv_AppWorkFrameSet = ""; //WorkFrame;
      this.gv_AppTabPath = "";
      this.gv_topFrame = "";
      this.gv_leftFrame = "";
      this.gv_AppBodyFrameSet = "";
      this.gv_AppMainFrame = "";
      this.gv_bottomFrame = "";

      this.Application_onload = function (obj, e) {
        window.application = nexacro.getApplication();
        this.app = "portal";

        var projectDomain = "seowon";
        if (window.location.host.indexOf(projectDomain) < 0) {
          application.mainframe.set_titletext("(로컬) MetaERP 별도로그인");
        } else {
          application.mainframe.set_titletext("서원대학교");
        }

        // frame 변수
        var vFrameSet = this.mainframe.HFrame.VFrame.VMainFrame;

        this.gv_rightFrame = this.mainframe.HFrame.VFrame.VMainFrame.HFrameWork.RightFrame;

        this.gv_vFrameSet = vFrameSet;
        this.gv_topFrame = vFrameSet.TopFrame;

        this.gv_AppBodyFrameSet = vFrameSet.HFrameWork;
        this.gv_leftFrame = this.gv_AppBodyFrameSet.LeftFrame;

        this.gv_AppWorkFrameSet = this.gv_AppBodyFrameSet.WorkFrame;
        this.gv_AppTabPath = vFrameSet.TabFrame;

        this.gv_loginFrame = this.mainframe.HFrame.VFrame.LoginFrame;

        application.url = application.xadl.substr(0, application.xadl.indexOf("/nx"));

        document.getElementsByTagName("iframe")[0].setAttribute("id", "edu_base_iframe");
        document.getElementsByTagName("iframe")[0].setAttribute("name", "edu_base_iframe");
        document.getElementsByTagName("iframe")[0].setAttribute("title", "edu");
        application._nDataType = 2;
        application._isPro = application.url.indexOf(projectDomain) > -1;
        application._doneOnload = true;
        application._multiLangEnrollTerm = false;
        application._forceClose = false;

        application.locale = "ko";
        //임시
        this.gv_leftFrame.form.setLeftMenu = function () {};
        this.gv_leftFrame.form.initFrame = function () {};

        // 백스페이스 뒤로가기 방지
        window.document.onkeydown = function (e) {
          if (e.target.nodeName != "INPUT" && e.target.nodeName != "TEXTAREA") {
            if (e.keyCode === 8) {
              return false;
            }
          }
        };

        this.initPasswordModule();
        this.setviewport();
      };
      this.setviewport = function (mainframe, e) {
        var application = nexacro.getApplication();
        if (mainframe) {
          var workFrame = mainframe.HFrame.VFrame.VMainFrame.HFrameWork.WorkFrame;
          var childFrame = workFrame.ChildFrame;
          if (window.innerWidth > 1440) {
            // 전체 frame 조정
            mainframe.HFrame.set_separatesize("*,1440,*");
            // 업무영역 frame 조정
            mainframe.HFrame.VFrame.VMainFrame.HFrameWork.set_separatesize("0,*,0");
            if (childFrame) childFrame.set_width(1440);
          } else {
            var size = window.innerWidth - 1440;
            var workFrameSize = "";
            if (size >= 100) {
              workFrameSize = "0,*,0";
            } else if (size < 0) {
              workFrameSize = "0,*,0";
            } else {
              workFrameSize = size + ",*,0";
            }
            mainframe.HFrame.VFrame.VMainFrame.HFrameWork.set_separatesize(workFrameSize);
            mainframe.HFrame.set_separatesize("0,*,0");
            if (childFrame) {
              childFrame.set_width(workFrame.width);
              //childFrame.set_width(1340);
            }
          }
          if (childFrame) {
            childFrame.set_height(workFrame.height);

            var divWork = childFrame.form.div_Work;
            if (divWork.form.vscrollbar.max > 0) {
              var size = divWork.form.vscrollbar.height + divWork.form.vscrollbar.max + 15;
              divWork.set_height(size);
            }
            childFrame.form.resetScroll();
          }
        }

        var view = document.getElementsByName("viewport")[0];
        var width = document.body.scrollWidth;
        var initialscale = width / 600 - 0.1;
        if (width > 630 && width < 800) {
          initialscale -= 0.2 * (width / 600);
        } else if (width > 800 && width < 1000) {
          initialscale -= 0.2 * (width / 400);
        } else if (width > 1000) {
          initialscale -= 0.2 * (width / 200);
        }
        if (navigator.userAgent.match(/iPhone/i)) {
          initialscale = 0.265;
        }
        view.content =
          "width=1440, user-scalable=1, initial-scale=" +
          initialscale +
          ", target-densitydpi=device-dpi";
      };

      this.initPasswordModule = function () {
        PT = {};
        PT.text = {};

        /*******************************************************************************
         * Password
         ******************************************************************************/
        PT.text.englishToKorean = (function () {
          var en_h = "rRseEfaqQtTdwWczxvg";
          var reg_h = "[" + en_h + "]";

          var en_b = {
            k: 0,
            o: 1,
            i: 2,
            O: 3,
            j: 4,
            p: 5,
            u: 6,
            P: 7,
            h: 8,
            hk: 9,
            ho: 10,
            hl: 11,
            y: 12,
            n: 13,
            nj: 14,
            np: 15,
            nl: 16,
            b: 17,
            m: 18,
            ml: 19,
            l: 20
          };
          var reg_b = "hk|ho|hl|nj|np|nl|ml|k|o|i|O|j|p|u|P|h|y|n|b|m|l";

          var en_f = {
            "": 0,
            r: 1,
            R: 2,
            rt: 3,
            s: 4,
            sw: 5,
            sg: 6,
            e: 7,
            f: 8,
            fr: 9,
            fa: 10,
            fq: 11,
            ft: 12,
            fx: 13,
            fv: 14,
            fg: 15,
            a: 16,
            q: 17,
            qt: 18,
            t: 19,
            T: 20,
            d: 21,
            w: 22,
            c: 23,
            z: 24,
            x: 25,
            v: 26,
            g: 27
          };
          var reg_f = "rt|sw|sg|fr|fa|fq|ft|fx|fv|fg|qt|r|R|s|e|f|a|q|t|T|d|w|c|z|x|v|g|";

          var reg_exp = new RegExp(
            "(" +
              reg_h +
              ")(" +
              reg_b +
              ")((" +
              reg_f +
              ")(?=(" +
              reg_h +
              ")(" +
              reg_b +
              "))|(" +
              reg_f +
              "))",
            "g"
          );

          var replace = function (str, h, b, f) {
            return String.fromCharCode(en_h.indexOf(h) * 588 + en_b[b] * 28 + en_f[f] + 44032);
          };

          return function (str) {
            return str.replace(reg_exp, replace);
          };
        })();

        PT.text.Password = function (props) {
          this.properties = {
            check: {
              length: 8,
              typeOfCharacter: true,
              dictionary: undefined,
              alphaNumericPattern: true,
              keyboardPattern: false
            },
            dictionary: null,
            fields: null
          };

          this._keyboardLayouts = [
            ["1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"],
            ["!@#$%^&*()_+", "QWERTYUIOP{}|", 'ASDFGHJKL:"', "ZXCVBNM<>?"]
          ];
        };

        PT.text.Password.prototype.compile = function (value) {
          var words = [];
          var lastType = -1;
          var item = "";
          var types = {
            alphaUpper: {
              test: function (v) {
                return "A" <= v && v <= "Z";
              },
              type: 1,
              count: 0
            },
            alphaLower: {
              test: function (v) {
                return "a" <= v && v <= "z";
              },
              type: 1,
              count: 0
            },
            number: {
              test: function (v) {
                return "0" <= v && v <= "9";
              },
              type: 2,
              count: 0
            },
            special: {
              test: function (v) {
                return true;
              },
              type: 3,
              count: 0
            }
          };
          for (var i = 0; i < value.length; i++) {
            for (var k in types) {
              if (types[k].test(value[i])) {
                types[k].count++;
                if (lastType != -1 && lastType != types[k].type) {
                  words.push(item);
                  item = "";
                }
                lastType = types[k].type;
                break;
              }
            }
            item += value[i];
          }
          words.push(item);
          this._parsedInfo = {
            words: words,
            count: {
              alphaUpper: types.alphaUpper.count,
              alphaLower: types.alphaLower.count,
              number: types.number.count,
              special: types.special.count
            }
          };
        };

        PT.text.Password.prototype.test = function (value) {
          this.compile(value);
          for (var key in this.properties.check) {
            if (!this.properties.check[key]) continue;
            var fname = "_test" + key[0].toUpperCase() + key.substr(1);
            if (!this[fname](value)) {
              return {
                result: "fail",
                test: key
              };
            }
          }
          return {
            result: "success"
          };
        };

        PT.text.Password.prototype._testLength = function (value) {
          return value.length >= this.properties.check.length;
        };

        PT.text.Password.prototype._testTypeOfCharacter = function (value) {
          var self = this;
          var numTypes = Object.keys(this._parsedInfo.count).reduce(
            function (acc, key) {
              return acc + (self._parsedInfo.count[key] && 1);
            },
            0,
            this
          );
          return numTypes >= 3; //  value.length < 10 ? (numTypes >= 3) : (numTypes >=2);
        };

        PT.text.Password.prototype._testDictionary = function (value) {
          return true;
        };

        PT.text.Password.prototype._entropy = function (list) {
          var obj = {};
          for (var i = 0; i < list.length; i++) {
            var v = list[i];
            if (obj[v]) {
              obj[v]++;
            } else {
              obj[v] = 1;
            }
          }
          var keys = Object.keys(obj);
          if (keys.length == 1) return 0;
          var denom = Math.log(list.length);
          var sum = 0;
          for (var k in obj) {
            obj[k] /= list.length;
            sum += (-obj[k] * Math.log(obj[k])) / denom;
          }
          return sum;
        };

        PT.text.Password.prototype._testAlphaNumericPattern = function (value) {
          var words = this._parsedInfo.words;

          var dic = {};
          for (var i = 0; i < words.length; i++) {
            if (dic[words[i]]) {
              dic[words[i]]++;
            } else {
              dic[words[i]] = 1;
            }
          }

          for (var k in dic) {
            if (dic[k] > 1) {
              return false;
            }
          }
          return true;
        };

        PT.text.Password.prototype._keyLocation = function (v) {
          var layouts = this._keyboardLayouts;
          for (var k = 0; k < layouts.length; k++) {
            var list = layouts[k];
            for (var r = 0; r < list.length; r++) {
              var c = list[r].indexOf(v);
              if (c != -1) {
                return {
                  type: k,
                  row: r,
                  column: c
                };
              }
            }
          }
          return null;
        };

        PT.text.Password.prototype._testKeyboardPattern = function (value) {
          var words = this._parsedInfo.words;
          for (var i = 0; i < words.length; i++) {
            var chars = words[i];
            if (chars.length <= 3) continue;
            var p, c;
            for (c = 0; c < chars.length; c++) {
              p = this._keyLocation(chars[c]);
              if (p != null) break;
            }
            var list = [];
            for (c = 1; c < chars.length; c++) {
              var p1 = this._keyLocation(chars[c]);
              if (p1 && p.type == p1.type && p.row == p1.row) {
                list.push(Math.abs(p.column - p1.column));
                p = p1;
              } else {
                list = null;
                break;
              }
            }
          }
          return true;
        };
      };
    });
    this.checkLicense("");

    this.loadPreloadList();

    this.loadIncludeScript("portal.xadl");
  };
})();
