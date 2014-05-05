// Copyright 2013 Alexey Dzheksenov. All Rights Reserved.
(function (chrome) {
    "use strict";
    var _lib;
    var _password0;
    var _isInitialized = false;

    function init() {
        var bgPage = chrome.extension.getBackgroundPage();
        if (!bgPage || typeof(bgPage.GetDatabase) != 'function') {
            window.setTimeout(init, 100);
            return;
        }
        _lib = bgPage.GetDatabase();

        if (_lib.isNew()) {
            _lib.createTable('options', ['key', 'value']);
            _lib.createTable('providers', ['name', 'provider']);
            _lib.createTable('urls', ['host', 'urls', 'providerName']);
            _lib.createTable('accounts', ['providerName', 'login', 'securityLevel', 'account', 'lastModified']);

            _lib.insert('options', { key: 'version', value: '1' });
            _lib.insert('options', { key: 'is_auto_login', value: true });
            _lib.insert('options', { key: 'multiple_action', value: 'modal' });
            _lib.insert('options', { key: 'installed_date', value: new Date() });
            _lib.insert('options', { key: 'enhanced_security', value: false });

            _lib.commit();
            _lib = chrome.extension.getBackgroundPage().GetDatabase();
            chrome.tabs.create({'url': chrome.extension.getURL("options.html") } );
        }

        initPassword();
        _isInitialized = true;
    }

    function initPassword() {
        _password0 = getOption('installed_date');
    }

    function isInitialized() {
        return _isInitialized;
    }

    function getUrls(host) {
        var urls = _lib.query('urls', { host: host });
        return urls;
    }

    function checkExist(account) {
        var accs = _lib.query('accounts', { providerName: account.providerName, login: account.elements.login });
        return accs.length == 1;
    }

    function setAccount(account, provider, securityLevel, password) {
        updateProvider(provider);
        if (securityLevel === 0) {
            password = _password0;
        } else if (securityLevel === 1) {
            if (!isPassword1Open()) {
                setPassword1(password);
            } else {
                password = getPassword1();
            }
        }
        account.elements.password = encode(account.elements.password, password);
        _lib.insertOrUpdate('accounts', { providerName: provider.name, login: account.elements.login }, { providerName: provider.name, login: account.elements.login, securityLevel: securityLevel, account: account, lastModified: (new Date()).getTime() });
        _lib.commit();
    }

    function encode(value, password) {
        if (!value) return value;
        return GibberishAES.enc(value, password);
    }

    function decode(value, password) {
        if (!value) return value;
        return GibberishAES.dec(value, password);
    }

    function updateProvider(provider) {
        _lib.insertOrUpdate('providers', { name: provider.name }, { name: provider.name, provider: provider });
        _lib.deleteRows('urls', { providerName: provider.name });
        _lib.commit();
        for (var i = 0; i < provider.forms.length; i++) {
            for (var j = 0; j < provider.forms[i].hosts.length; j++) {
                _lib.insert('urls', { host: provider.forms[i].hosts[j], urls: provider.forms[i].urls, providerName: provider.name });
            }
        }
        _lib.commit();
    }

    function getProvider(providerName) {
        var ps = _lib.query('providers', { name: providerName });
        if (ps.length == 1) {
            return ps[0].provider;
        }
        return null;
    }

    function getProviders() {
        return _lib.query('providers');
    }

    function getAccounts(providerName) {
        var accs;
        if (providerName) {
            accs = _lib.query('accounts', { providerName: providerName });
        } else {
            accs = _lib.query('accounts');
        }
        var res = [];
        for (var i = 0; i < accs.length; i++) {
            res.push(prepareAccount(accs[i].account, accs[i].securityLevel));
        }
        return res;
    }

    function getAccount(providerName, login) {
        var accs = _lib.query('accounts', { providerName: providerName, login: login });
        if (accs.length == 1) {
            return prepareAccount(accs[0].account, accs[0].securityLevel);
        }
        return null;
    }

    function prepareAccount(account, securityLevel) {
        var a = JSON.parse(JSON.stringify(account));
        a.securityLevel = securityLevel;
        if (a.securityLevel === 0) {
            a.elements.password = decode(a.elements.password, _password0);
            a.isPasswordDecrypted = true;
        } else if (a.securityLevel === 1 && isPassword1Open()) {
            a.elements.password = decode(a.elements.password, getPassword1());
            a.isPasswordDecrypted = true;
        } else {
            a.isPasswordDecrypted = false;
            a.i18nPasswordTitle = chrome.i18n.getMessage('set_password' + a.securityLevel + '_dialog_title');
            a.i18nPasswordRequired = chrome.i18n.getMessage('password_required');
            a.i18nPasswordInvalid = chrome.i18n.getMessage('invalid_password');
        }
        return a;
    }

    function deleteAccount(providerName, login) {
        _lib.deleteRows('accounts', { providerName: providerName, login: login });
        _lib.commit();
    }

    function getOption(key) {
        var options = _lib.query('options', { key: key });
        if (options.length == 1) {
            return options[0].value;
        }
        return null;
    }

    function setOption(key, value) {
        _lib.insertOrUpdate('options', { key: key }, { key: key, value: value });
        _lib.commit();
    }

    function getOptions() {
        return _lib.query('options');
    }

    function reEncrypt(oldPassword, newPassword, securityLevel) {
        if (oldPassword) {
            if (!testPassword(oldPassword, securityLevel)) throw 'invalid password';
            var accs = _lib.query('accounts', { securityLevel: securityLevel });
            for (var i = 0; i < accs.length; i++) {
                var pass = decode(accs[i].account.elements.password, oldPassword);
                accs[i].account.elements.password = encode(pass, newPassword);
                _lib.insertOrUpdate('accounts', { providerName: accs[i].providerName, login: accs[i].login }, accs[i]);
            }
            _lib.commit();
        }
        var hash = encode(_password0, newPassword);
        setOption('password_hash_' + securityLevel, hash);
        if (securityLevel === 1) {
            setPassword1(newPassword);
        }
    }

    function clearEnhancedSecurity() {
        setOption('password_hash_1', null);
        setOption('password_hash_2', null);
        _lib.deleteRows('accounts', { securityLevel: 1 });
        _lib.deleteRows('accounts', { securityLevel: 2 });
        _lib.commit();
    }

    function setPassword1(password) {
        var bgPage = chrome.extension.getBackgroundPage();
        if (bgPage) {
            bgPage.setPassword1(password);
        }
    }

    function getPassword1() {
        var bgPage = chrome.extension.getBackgroundPage();
        if (bgPage) {
            return bgPage.getPassword1();
        }
        return null;
    }

    function isPassword1Open() {
        return !!getPassword1();
    }

    function testPassword(password, securityLevel) {
        var hash = getOption('password_hash_' + securityLevel);
        try {
            decode(hash, password);
            if (securityLevel == 1) {
                setPassword1(password);
            }
            return true;
        } catch(e) {
            return false;
        }
    }

    function decodePassword(hash, password, securityLevel) {
        if (securityLevel === 0) {
            password = _password0;
        } else if (securityLevel === 1) {
            if (isPassword1Open()) {
                password = getPassword1();
            }
        }
        var decodedPassword = decode(hash, password);
        if (securityLevel === 1 && !isPassword1Open()) {
            setPassword1(password);
        }
        return decodedPassword;
    }

    window.localService = {
        checkExist: checkExist,
        getUrls: getUrls,
        getProvider: getProvider,
        getProviders: getProviders,
        updateProvider: updateProvider,
        getAccount: getAccount,
        setAccount: setAccount,
        getAccounts: getAccounts,
        deleteAccount: deleteAccount,
        getOption: getOption,
        setOption: setOption,
        getOptions: getOptions,
        reEncrypt: reEncrypt,
        clearEnhancedSecurity: clearEnhancedSecurity,
        isPassword1Open: isPassword1Open,
        testPassword: testPassword,
        decodePassword: decodePassword,
        isInitialized: isInitialized
    };

    window.setTimeout(init);

})(window.chrome);