/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, browser: true */
/* -*- tab-width: 2 -*- */
(function () {
  'use strict';
  function unixtime() { return Math.floor(Date.now() / 1e3); }
  function thisDotSelect() { this.select(); }
  function xDotText(x) { return x.text(); }
  function soon(f) { setTimeout(f, 10); }
  function formEl(name) { return document.forms.gen[name]; }
  function getSelectedItem(l) { return l.options[l.selectedIndex].value; }
  function byId(id) { return (document.getElementById(id) || false); }

  function fetchFileText(url) {
    url = url + '?ts=' + unixtime();
    var opt = { credentials: 'same-origin' };
    return window.fetch(url, opt).then(xDotText, String);
  }

  function setCodeOutput(slot, code) {
    var el = formEl(slot);
    el.value = code;
    el.onfocus = thisDotSelect;
  }

  function panic(err) {
    console.error('Error:', err);
    setCodeOutput('formCode', 'Error: ' + err);
  }

  function scanTxtFileBasenamesInDir(url) {
    return fetchFileText(url).then(function scanDir(html) {
      var files = [];
      html.replace(/<a href="([,-~]+)\.txt">/g, function found(m, n) {
        files.push(m && n.replace(/[<>&]/g, ''));
      });
      if (files.length) {
        files.sort();
        return files;
      }
      throw new Error('Found no text files in ' + url + '!\n\n' + html);
    });
  }

  function recvFormsList(files) {
    var list = formEl('formsList');
    list.innerHTML = '\n' + files.map(function fmt(n) {
      return '    <option>' + n + '</option>\n';
    }).join('');
    list.selectedIndex = 0;
  }

  function requestFormsList() {
    formEl('formsList').innerHTML = '<option>…</option>';
    scanTxtFileBasenamesInDir('local/forms/').then(recvFormsList
      ).then(null, panic);
  }
  formEl('scanForms').onclick = requestFormsList;
  soon(requestFormsList);

  function recvListItems(dt, data) {
    var items = [], fails = [], dd = dt.nextSibling;
    if (!dd) { return; }
    data = data.split(/\n/);
    dt.rawLines = data;
    data.forEach(function parse(ln, idx) {
      ln = ln.trim();
      if (!ln) { return; }
      if (ln.startsWith('#')) { return; }
      try {
        items.push(JSON.parse(ln));
      } catch (jsonErr) {
        if (fails.length < 5) {
          fails.push('<p>invalid JSON in line ' + (idx + 1) + '</p>');
        }
      }
    });
    dd.items = items;
    dd.setAttribute('n', items.length);
    dd.innerHTML = fails.join('\n    ');
    dt.className = (fails.length ? 'failed' : 'ready');
  }

  function requestListItems(dt) {
    function fail(err) {
      dt.className = 'failed';
      return panic(err);
    }
    fetchFileText(dt.firstChild.href).then(recvListItems.bind(null, dt)
      ).then(null, fail);
  }

  function recvListOfLists(files) {
    var lol = byId('knownLists'), el, bfn;
    lol.file2dt = {};
    lol.innerHTML = '\n' + files.map(function fmt(n) {
      return ('    <dt><a href="local/lists/' + n + '.txt" target="_blank">'
        + n + '</a></dt><dd n=0></dd>\n');
    }).join('');
    el = lol.firstChild;
    while (el) {
      el = el.nextSibling;
      if (el && el.tagName && (el.tagName.toLowerCase() === 'dt')) {
        bfn = el.innerText;
        lol.file2dt[bfn] = el;
        soon(requestListItems.bind(null, el));
        el.className = 'fetching';
      }
    }
  }

  function requestListOfLists() {
    byId('knownLists').innerHTML = '<dt class="loading">…</dt><dd></dd>';
    scanTxtFileBasenamesInDir('local/lists/').then(recvListOfLists
      ).then(null, panic);
  }
  formEl('scanLists').onclick = requestListOfLists;
  soon(requestListOfLists);

  function parseArgsList(input) {
    var list = [], key, val, rxKey = /^(\w+):\s*/,
      rxWord = /^([\w~\u00C0-\u00FF]+)(?:\s+|$)/,
      rxSimpleStr = /^"([ !#-\x5B\x5D-\uFFFF]*)"(?:\s+|$)/;
    while (input) {
      input = input.trimLeft();
      key = rxKey.exec(input);
      if (key) {
        input = input.slice(key[0].length);
        key = key[1];
      } else {
        key = list.length;
      }
      val = (rxWord.exec(input) || rxSimpleStr.exec(input));
      if (!val) {
        throw new Error('No value for key ' + key + ': ' + input);
      }
      input = input.slice(val[0].length);
      val = (val[1] || val[2]);
      list[key] = val;
    }
    return list;
  }

  function parseOneFormCmd(ln) {
    var cmd, args, required;
    try {
      ln = ln.trim();
      if (!ln) { return; }
      if (ln.startsWith('#')) { return; }
      cmd = parseOneFormCmd.rx.exec(ln);
      if (!cmd) { throw new Error('??? ' + ln); }
      required = cmd[2];
      args = parseArgsList(ln.slice(cmd[0].length));
      cmd = cmd[1];
      return JSON.stringify([cmd, required, args], 2);
    } catch (err) {
      return '\n<p class="error">' + err + '</p>\n';
    }
  }
  parseOneFormCmd.rx = /^(\w+)(\*?)(?:\s|$)/;

  function recvFormTmpl(tmpl) {
    var code;
    tmpl = tmpl.replace(/\r/g, ''
      ).replace(/\n+ +/g, ' '
      ).split(/\n+/);
    code = tmpl.map(parseOneFormCmd).filter(Boolean).join('\n');
    setCodeOutput('formCode', code);
  }

  formEl('renderForm').onclick = function requestFormsRendering() {
    var formName = getSelectedItem(formEl('formsList')),
      w8plz = 'wird erzeugt…';
    setCodeOutput('formCode', w8plz);
    setCodeOutput('mailTextCode', w8plz);
    setCodeOutput('mailFilesCode', w8plz);
    fetchFileText('local/forms/' + formName + '.txt'
      ).then(recvFormTmpl).then(null, panic);
  };









}());
