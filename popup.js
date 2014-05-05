// Copyright 2013 Alexey Dzheksenov. All Rights Reserved.
$(function() {
    "use strict";
    var data = null;
    var tabId = null;
    var currentAccount = null;

    function init() {
        chrome.tabs.query({ active: true, lastFocusedWindow: true },
            function(array_of_Tabs) {
                var tab = array_of_Tabs[0];
                tabId = tab.id;
                var url = tab.url;
                console.log(array_of_Tabs);
                var bgPage = window.chrome.extension.getBackgroundPage();
                data = bgPage.checkHost(url);
                window.setTimeout(buildMenu);
            });
        $('#password1').tooltip(tooltipOptions).showHidePassword({ size: 22 });
        $('#btnOk').click(onEnterPassword);
        $('#btnCancel').click(closeDialog);
    }

    function buildMenu() {
        var $menu = $('#menu');
        var accounts = data.accounts;
        for (var i = 0; i < accounts.length; i++) {
            $('<li><a href="#">' + accounts[i].elements.login + '</a></li>')
                .click(onChooseAccount)
                .data('account', accounts[i])
                .appendTo($menu);
        }
        $('#optionsLink').text(chrome.i18n.getMessage('options'));
        window.setTimeout(buildMenu2);
    }

    function buildMenu2() {
        var width = 0;
        $('#menu li').each(function(e) {
            width = Math.max(this.offsetWidth, width);
        });
        document.body.style.width = (width * 1.4) + 'px';
        $('#menu').menu();
    }

    function onChooseAccount(e) {
        currentAccount = $(e.currentTarget).data('account');
        if (currentAccount.isPasswordDecrypted) {
            sendLoginRequest(currentAccount);
        } else {
            showRequestPassword(currentAccount.securityLevel);
        }
    }

    function sendLoginRequest(account) {
        window.chrome.tabs.sendMessage(tabId,
            {
                method: 'autologin',
                account: account,
                form: data.form
            }, function() { window.close(); });
    }

    function showRequestPassword(securityLevel) {
        $('th').text(chrome.i18n.getMessage('set_password' + securityLevel + '_dialog_title'));
        $('#password1').val('').showHidePassword('hide').focus();
        $('table').show();
        $('#password1').prop('title', '').tooltip('diasble');
        window.setTimeout(function() { $('#password1').focus(); });
    }

    function onEnterPassword(e) {
        if (validatePassword()) {
            sendLoginRequest(currentAccount);
        }
    }

    function validatePassword() {
        var $input = $('#password1');
        var pass = $input.val();
        if (!pass) {
            $input.prop('title', '')
                .tooltip('option', 'content', window.chrome.i18n.getMessage('password_required'))
                .tooltip('open');
            return false;
        } else {
            if (!localService.testPassword(pass, currentAccount.securityLevel)) {
                $input.prop('title', '')
                    .tooltip('option', 'content', window.chrome.i18n.getMessage('invalid_password'))
                    .tooltip('open');
                return false;
            }
        }
        currentAccount.elements.password = localService.decodePassword(currentAccount.elements.password, pass, currentAccount.securityLevel);
        currentAccount.isPasswordDecrypted = true;
        return true;
    }

    function closeDialog() {
        $('#password1').tooltip('close').tooltip('disable');
        $('table').hide();
    }

    var tooltipOptions = {
        position: {
            my: "center bottom",
            at: "center top",
        }
    };

    init();
});