// Copyright 2013 Alexey Dzheksenov. All Rights Reserved.
(function(chrome) {
    var data = null;
    var counter = 0;
    var dialog = null;
    var dialog2 = null;
    var currentAccount = null;

    chrome.runtime.sendMessage({ method: 'checkHost' }, function(d) {
        if (d && d.accounts) {
            counter = 0;
            data = d;
            window.setTimeout(startLogin, 100);
            if (d.form.activators instanceof Array && d.form.activators.length > 0) window.setTimeout(subscribeActivators, 200);
        }
    });

    function subscribeActivators() {
        for (var i = 0; i < data.form.activators.length; i++) {
            var elelements = document.querySelectorAll(data.form.activators[i]);
            for (var j = 0; j < elelements.length; j++) {
                elelements[j].addEventListener('click', function () { counter = - data.form.activatorTimeout / 100;
                    startLogin();
                });
            }
        }
    }

    function startLogin() {
        if (checkError()) return;
        var p = document.querySelector(data.form.elements[0].query);
        if (data.form.checkVisible && (!p || p.offsetHeight == 0)) {
            if (counter > 2) {
                return;
            } else {
                counter++;
                window.setTimeout(startLogin, 200);
                return;
            }
        } else {
            p = document.querySelector(data.form.other);
            if (p && p.offsetHeight > 0) {
                p.click();
            }
            if (data.isAutoLogin) {
                if (counter > 2) {
                    return;
                } else {
                    counter++;
                    if (data.accounts.length == 1) {
                        login(data.accounts[0], data.form);
                    } else {
                        if (data.multipleAction == 'modal') chooseAccount();
                    }
                }
            }
        }
    }

    function checkError() {
        if (data.form.error) {
            var p = document.querySelector(data.form.error);
            if (!!p && p.offsetHeight == 0) {
                return true;
            }
        }
        return false;
    }

    function login(account, form) {
        var p;
        currentAccount = account;
        if (account.isPasswordDecrypted) {
            for (var i = 0; i < form.elements.length; i++) {
                p = document.querySelector(form.elements[i].query);
                if (p) {
                    p.value = account.elements[form.elements[i].name];
                } else {
                    counter++;
                    window.setTimeout(startLogin, 200);
                    return;
                }
            }
            if (form.submit) {
                document.querySelector(form.submit).click();
            } else {
                p.form.submit();
            }
        } else {
            window.setTimeout(requestPassword);
        }
    }

    function chooseAccount() {
        var css = document.createElement('style');
        css.type = 'text/css';
        var styles = '#autologin_chosser a {color:blue; display:block; width:100%; text-decoration: none}' +
            '#autologin_chosser a:hover {color:red;text-decoration:none;}' +
            '#autologin_chosser td {background:azure}' +
            '#autologin_chosser td:hover {background:white}' +
            '#closeIcon {fill:silver}' +
            '#closeIcon:hover {fill:white}';
        css.appendChild(document.createTextNode(styles));
        document.head.appendChild(css);


        var h = window.innerHeight;
        var fontSize = Math.round(h / (data.accounts.length + 0.7) / 3);
        fontSize = Math.min(Math.max(fontSize, 14), 64);
        var fontSize3 = Math.round(fontSize / 3);
        var top = Math.max(0, window.innerHeight / 2 - fontSize * (data.accounts.length + 1));

        var container = document.createElement('div');
        container.id = 'autologin_chosser';
        container.style.cssText = 'position:fixed; width:100%; height:100%; z-index:100001; top:' + top + 'px; display:table-cell; vertical-align:middle; text-align:center; overflow:auto;';

        var table = '<table align="center" style="display:inline-block;font:' + fontSize + 'px Arial;border-collapse:separate;border-spacing:' + fontSize3 + 'px;" cellspacing=' + fontSize3 + '>' +
            '<tr><th style="font-size:' + (fontSize / 1.5) + 'px; color:azure;"><img src="' + chrome.extension.getURL('images/keys.png') + '" height=' + fontSize + ' style="margin-bottom:-' + (fontSize3) + 'px"/> Autologin choose account:</th></tr>';
        for (var i = 0; i < data.accounts.length; i++) {
            table += '<tr><td nowrap="nowrap" style="border-radius:' + fontSize + 'px;text-align:center;padding:' + fontSize3 + 'px;" >';
            table += '<a href="#" style="font:' + fontSize + 'px Arial;"><nobr>' + data.accounts[i].elements.login + '</nobr></a></td></tr>';
        }
        table += '</table>';
        container.innerHTML = table;


        var shadow = document.createElement('div');
        shadow.style.cssText = 'background-color:black; opacity:0.7; width:100%; height:100%; top:0; position:fixed; z-index:-1;';
        container.insertBefore(shadow, container.firstChild);

        var closeButton = document.createElement('div');
        closeButton.style.cssText = 'width:5%; height:10%; top:0; right:0; position:fixed; cursor:pointer; text-align:right;';
        closeButton.innerHTML = "<svg id='closeIcon' enable-background='new 0 0 512 512' height='100%' version='1.1' viewBox='0 0 512 512' width='100%' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'><path d='M74.966,437.013c-99.97-99.97-99.97-262.065,0-362.037c100.002-99.97,262.066-99.97,362.067,0  c99.971,99.971,99.971,262.067,0,362.037C337.032,536.998,174.968,536.998,74.966,437.013z M391.782,120.227  c-75.001-74.985-196.564-74.985-271.534,0c-75.001,74.985-75.001,196.55,0,271.535c74.97,74.986,196.533,74.986,271.534,0  C466.754,316.775,466.754,195.212,391.782,120.227z M188.124,369.137l-45.251-45.266l67.876-67.877l-67.876-67.876l45.251-45.267  L256,210.743l67.877-67.892l45.25,45.267l-67.876,67.876l67.876,67.877l-45.25,45.266L256,301.245L188.124,369.137z'/></svg>";
        closeButton.onclick = closeDialog;
        container.appendChild(closeButton);

        document.body.appendChild(container);

        dialog = container;
        window.setTimeout(function() {
            var aa = document.querySelectorAll('#autologin_chosser a');
            for (var j = 0; j < aa.length; j++) {
                aa[j].setAttribute('data-i', j);
                aa[j].onclick = onLoginChoose;
            }
        });
    }

    function onLoginChoose(e) {
        var i = e.currentTarget.getAttribute('data-i');
        login(data.accounts[i], data.form);
        return false;
    }

    function closeDialog() {
        document.body.removeChild(document.getElementById('autologin_chosser'));
    }

    function requestPassword() {
        var account = currentAccount;
        var css = document.createElement('style');
        css.type = 'text/css';
        var styles = '#autologin_request a {color:blue; display:block; width:100%; text-decoration: none}' +
            '#autologin_request input[type="password"] {padding:3px}' +
            '#autologin_error1 {color:maroon; background:mistyrose; border-radius:100px; border: 2px solid red; display:none; padding:5px;}' +
            '#closeIcon {fill:silver}' +
            '#closeIcon:hover {fill:white}';
        css.appendChild(document.createTextNode(styles));
        document.head.appendChild(css);

        var h = window.innerHeight;
        var fontSize = Math.round(h / 16);
        fontSize = Math.min(Math.max(fontSize, 14), 64);
        var fontSize2 = Math.round(fontSize / 2);
        fontSize2 = Math.min(Math.max(fontSize2, 10), 64);
        var fontSize3 = Math.round(fontSize / 3);
        var top = Math.max(0, window.innerHeight / 2 - fontSize * 3);

        var container = document.createElement('div');
        container.id = 'autologin_request';
        container.style.cssText = 'position:fixed; width:100%; height:100%; z-index:100001; top:' + top + 'px; display:table-cell; vertical-align:middle; text-align:center; overflow:auto;';

        var table = '<table align="center" style="display:inline-block;font:' + fontSize + 'px Arial;border-collapse:separate;border-spacing:' + fontSize3 + 'px;" cellspacing=' + fontSize3 + '>' +
            '<tr><th style="font-size:' + fontSize2 + 'px; color:azure;"><img src="' + chrome.extension.getURL('images/keys.png') + '" height=' + fontSize + ' style="margin-bottom:-' + (fontSize3) + 'px"/> ' + account.i18nPasswordTitle + ':</th></tr>';
        table += '<tr><td nowrap="nowrap" style="text-align:center;padding:' + fontSize3 + 'px;" >';
        table += '<input style="font:' + fontSize + 'px Arial;border-radius:' + fontSize3 + 'px;padding:' + fontSize3 + 'px;" type="password" id="autologin_password1" />';
        table += '<input style="font:' + fontSize + 'px Arial;border-radius:' + fontSize3 + 'px;padding:' + fontSize3 + 'px;" type="submit" id="autologin_submit1" value="Ok" />';
        table += '</td></tr>';
        table += '<tr><td style="padding: 3px ' + fontSize + 'px;width:100px" >';
        table += '<span id="autologin_error1" style="font:' + fontSize2 + 'px Arial;border-radius:' + fontSize3 + 'px;"></span>';
        table += '</td></tr>';
        table += '</table>';
        container.innerHTML = table;


        var shadow = document.createElement('div');
        shadow.style.cssText = 'background-color:black; opacity:0.7; width:100%; height:100%; top:0; position:fixed; z-index:-1;';
        container.insertBefore(shadow, container.firstChild);

        var closeButton = document.createElement('div');
        closeButton.style.cssText = 'width:5%; height:10%; top:0; right:0; position:fixed; cursor:pointer; text-align:right;';
        closeButton.innerHTML = "<svg id='closeIcon' enable-background='new 0 0 512 512' height='100%' version='1.1' viewBox='0 0 512 512' width='100%' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'><path d='M74.966,437.013c-99.97-99.97-99.97-262.065,0-362.037c100.002-99.97,262.066-99.97,362.067,0  c99.971,99.971,99.971,262.067,0,362.037C337.032,536.998,174.968,536.998,74.966,437.013z M391.782,120.227  c-75.001-74.985-196.564-74.985-271.534,0c-75.001,74.985-75.001,196.55,0,271.535c74.97,74.986,196.533,74.986,271.534,0  C466.754,316.775,466.754,195.212,391.782,120.227z M188.124,369.137l-45.251-45.266l67.876-67.877l-67.876-67.876l45.251-45.267  L256,210.743l67.877-67.892l45.25,45.267l-67.876,67.876l67.876,67.877l-45.25,45.266L256,301.245L188.124,369.137z'/></svg>";
        closeButton.onclick = closeDialog2;
        container.appendChild(closeButton);
        container.querySelector('#autologin_password1').onkeyup = checkEnter;
        container.querySelector('#autologin_submit1').onclick = sendPassword;
        document.body.appendChild(container);
        dialog2 = container;
        window.setTimeout(function() { document.getElementById('autologin_password1').focus(); });
    }

    function closeDialog2() {
        document.body.removeChild(document.getElementById('autologin_request'));
    }

    function checkEnter(e) {
        if (e.keyCode === 13) {
            sendPassword();
        }
    }

    function sendPassword(e) {
        var securityPassword = document.getElementById('autologin_password1').value;
        if (!securityPassword) {
            document.getElementById('autologin_error1').style.display = 'block';
            document.getElementById('autologin_error1').innerText = currentAccount.i18nPasswordRequired;
            return;
        }
        chrome.runtime.sendMessage(
            {
                method: 'decrypt',
                securityPassword: securityPassword,
                securityLevel: currentAccount.securityLevel,
                accountPassword: currentAccount.elements.password
            },
            function(d) {
                if (d && d.password) {
                    currentAccount.elements.password = d.password;
                    currentAccount.isPasswordDecrypted = true;
                    window.setTimeout(function() {
                        closeDialog2();
                        login(currentAccount, data.form);
                    });
                } else if (d && d.error && d.message) {
                    document.getElementById('autologin_error1').style.display = 'block';
                    document.getElementById('autologin_error1').innerText = d.message;
                }
            });
    }

    function checkForm(form) {
        var res = true;
        for (var i = 0; i < form.elements.length; i++) {
            var p = document.querySelector(form.elements[0].query);
            res = res && !!p && p.offsetHeight > 0;
        }
        return res;
    }

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            var res = true;
            if (request.method == 'checkform') {
                res = checkForm(request.form);
            } else if (request.method == 'autologin') {
                login(request.account, request.form);
            }
            sendResponse(res);
        });

})(chrome);