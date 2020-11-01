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

  function recvFormsList(dirIndexHtml) {
    var list = formEl('formsList'), opts = '';
    dirIndexHtml.replace(/<a href="([#-~]+)\.txt">/g, function found(m, n) {
      opts += ('\n  <option>' + n.replace(/[<>&]/g, '') + '</option>');
      return m;
    });
    if (!opts) { throw new Error('Found no forms!\n' + dirIndexHtml); }
    list.innerHTML = opts + '\n';
    list.selectedIndex = 0;
  }

  function requestFormsList() {
    formEl('formsList').innerHTML = '<option>…</option>';
    fetchFileText('local/forms/').then(recvFormsList).then(null, panic);
  }
  formEl('scanForms').onclick = requestFormsList;
  soon(requestFormsList);

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
