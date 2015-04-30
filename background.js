// Copyright 2013 Alexey Dzheksenov. All Rights Reserved.

//['http://mail.ru:90/aaa/index.html?a=qqq&gfd=qwwww#99', 'http:', 'http', '//mail.ru:90', 'mail.ru:90', 'mail.ru', '90', '/aaa/index.html', '?a=qqq&gfd=qwwww', 'a=qqq&gfd=qwwww', '#99', '99']
var urlRx = new RegExp('^(([^:/\\?#]+):)?(//(([^:/\\?#]*)(?::([^/\\?#]*))?))?([^\\?#]*)(\\?([^#]*))?(#(.*))?$');
var password1 = null;

function init() {
    if (!localService.isInitialized()) {
        window.setTimeout(init, 100);
    }
    checkUpdates();
    window.chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        var res = {};
        var url = sender.url;
        if (!url) url = sender.tab.url;
        if (request.method == 'checkHost') {
            res.isAutoLogin = localService.getOption('is_auto_login');
            res.multipleAction = localService.getOption('multiple_action');
            var accounts = checkHost(url, sender.tab.id);
            if (res.isAutoLogin) {
                $.extend(res, accounts);
            }
        } else if (request.method == 'decrypt') {
            try {
                res.password = localService.decodePassword(request.accountPassword, request.securityPassword, request.securityLevel);
            } catch (e) {
                res.error = true;
                res.message = window.chrome.i18n.getMessage('invalid_password');
            }
        }
        sendResponse(res);
    }
    );
}

function checkUpdates() {
    var providers = localService.getProviders();
    onlineService.loadIndex('',
        function(data, e) {
            for (var i = 0; i < providers.length; i++) {
                var provider = providers[i].provider;
                if (!provider.version) provider.version = 0;
                for (var j = 0; j < data.length; j++) {
                    if (provider.name == data[j].name && provider.version < data[j].version) {
                        updateProvider(data[j]);
                        data[j] = data[data.length - 1];
                        data.length = data.length - 1;
                        break;
                    }
                }
            }
        }
    );
}

function updateProvider(provider) {
    onlineService.loadProvider(provider.file, function(newProvider) {
        localService.updateProvider(newProvider);
    });
}


function checkHost(url, tabId) {
    var parts = urlRx.exec(url);
    var host = parts[5];
    var pageUrl = parts[7];
    var hosts = localService.getUrls(host);
    for (var i = 0; i < hosts.length; i++) {
        for (var j = 0; j < hosts[i].urls.length; j++) {
            var re = new RegExp(hosts[i].urls[j]);
            if (re.test(pageUrl)) {
                var provider = localService.getProvider(hosts[i].providerName);
                for (var k = 0; k < provider.forms.length; k++) {
                    if (provider.forms[k].hosts.indexOf(host) >= 0 && provider.forms[k].urls.indexOf(hosts[i].urls[j]) >= 0) {
                        var accounts = localService.getAccounts(provider.name);
                        var form = provider.forms[k];
                        window.setTimeout(function() {checkForm(form, tabId)});
                        return { accounts: accounts, form: form };
                    }
                }
                return null;
            }
        }
    }
    return null;
}

function checkForm(form, tabId) {
    window.chrome.tabs.sendMessage(tabId,
        { method: 'checkform', form: form },
        function(result) {
            if (result && tabId) {
                window.chrome.pageAction.show(tabId);
            }
        });
}

function GetDatabase() {
    if (!window.lib || window.lib.isNew()) {
        window.lib = new localStorageDB('storage', chrome.extension.getBackgroundPage().localStorage);
    }
    return window.lib;
}

function setPassword1(password) {
    password1 = password;
}

function getPassword1() {
    return password1;
}


window.setTimeout(init);