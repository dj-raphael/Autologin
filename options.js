// Copyright 2013 Alexey Dzheksenov. All Rights Reserved.

(function ($, chrome) {
    "use strict";
    var accountsInitialized = false;

    function onTabsActivate(e, ui) {
        switch (ui.newPanel[0].id) {
            case "optionsTab":
                loadOptions();
                break;
            case "accountsTab":
                if (!accountsInitialized) {
                    loadAccouns();
                    accountsInitialized = true;
                }
                break;
            case "onlineTab":
                loadProviders();
                break;
            case "backupTab":
                loadBackup();
                break;
        }

        //cleanup
        $('#password').tooltip('close');
        $('#password2').tooltip('close');
    }

    var tooltipOptions = {
        position: {
            my: "left+15 middle",
            at: "right middle",
            using: function (position, feedback) {
                $(this).css(position);
                $("<div>")
                    .addClass("arrow")
                    .addClass(feedback.vertical)
                    .addClass(feedback.horizontal)
                    .appendTo(this);
            }
        }
    };

    var dialogOptions = {
        autoOpen: false,
        height: 240,
        width: 500,
        modal: true,
        buttons: [
            {
                text: chrome.i18n.getMessage("set"),
                click: function () {
                    var $this = $(this);
                    var valid = $this.data("validateCallback")($this);
                    if (valid) {
                        $this.dialog("close");
                    }
                }
            },
            {
                text: chrome.i18n.getMessage("cancel"),
                click: function () {
                    $(this).dialog("close");
                }
            }],
        close: tooltipHide
    };


    //#region Option tab

    function loadOptions() {
        $('#is_auto_login').prop('checked', localService.getOption("is_auto_login"));
        $('input#' + localService.getOption("multiple_action")).prop('checked', true);
        $('#enhanced_security').prop('checked', localService.getOption("enhanced_security"));
        $("#enhanced_security_fieldset").attr("disabled", !localService.getOption("enhanced_security"));
        if (localService.getOption("password_hash_1")) {
            $("#set_password1").hide();
        } else {
            $("#change_password1").hide();
        }
        if (localService.getOption("password_hash_2")) {
            $("#set_password2").hide();
        } else {
            $("#change_password2").hide();
        }
    }

    function initOptions() {
        $('#is_auto_login').click(function (e) {
            localService.setOption("is_auto_login", $('#is_auto_login').prop('checked'));
        });
        $('input[name=multiple_action]').click(function (e) {
            localService.setOption("multiple_action", e.currentTarget.id);
        });
        $('#enhanced_security').click(function (e) {
            var isCancel = false;
            if (!$('#enhanced_security').prop('checked')) {
                isCancel = !window.confirm(chrome.i18n.getMessage("confirm_cancel_enhanced_security"));
                if (isCancel) {
                    $('#enhanced_security').prop('checked', true);
                } else {
                    localService.clearEnhancedSecurity();
                    accountsInitialized = false;
                    $("#set_password1").show();
                    $("#change_password1").hide();
                    $("#set_password2").show();
                    $("#change_password2").hide();
                }
            }
            if (!isCancel) {
                localService.setOption("enhanced_security", $('#enhanced_security').prop('checked'));
                $("#enhanced_security_fieldset").attr("disabled", !$('#enhanced_security').prop('checked'));
            }
        });

        dialogOptions.height = 230;
        $("#set_password_form").dialog(dialogOptions);
        dialogOptions.height = 260;
        $("#change_password_form").dialog(dialogOptions);
        $("#set_password1").click(function () { showSetDialog(1); });
        $("#set_password2").click(function () { showSetDialog(2); });
        $("#change_password1").click(function () { showChangeDialog(1); });
        $("#change_password2").click(function () { showChangeDialog(2); });
        
        tooltipOptions.content = chrome.i18n.getMessage("invalid_password");
        $('#change_password_old').tooltip(tooltipOptions).showHidePassword({ size: 22 });
        tooltipOptions.content = chrome.i18n.getMessage("password_required");
        $('#change_password_new').tooltip(tooltipOptions).showHidePassword({ size: 22, retypeInput: "#change_password_new2" });
        tooltipOptions.content = chrome.i18n.getMessage("password_not_match");
        $('#change_password_new2').tooltip(tooltipOptions);
        tooltipOptions.content = chrome.i18n.getMessage("password_required");
        $('#input_set_password').tooltip(tooltipOptions).showHidePassword({ size: 22, retypeInput: '#input_set_password2' });
        tooltipOptions.content = chrome.i18n.getMessage("password_not_match");
        $('#input_set_password2').tooltip(tooltipOptions);
        $('#enhanced_security_help').tooltip({
            position: {
                my: "left+5 middle",
                at: "right middle",
            },
            content: '<div style="font-size:70%">' +  chrome.i18n.getMessage('enhanced_security_help') + '</div>'
        }
        );

        $('#backup_export').click(backupExport);
        $('#backup_import').change(backupImport);

    }

    function showSetDialog(securityLevel) {
        $('#input_set_password').tooltip('disable').showHidePassword('hide');
        $('#input_set_password2').tooltip('disable');
        $("#set_password_form").find('input').val("");
        $("#set_password_form")
            .data("securityLevel", securityLevel)
            .data("validateCallback", validateSetDialog)
            .dialog("open")
            .dialog("option", "title", chrome.i18n.getMessage("set_password" + securityLevel + "_dialog_title"));
    }

    function validateSetDialog($dialog) {
        var pass = $dialog.find('#input_set_password').val();
        var pass2 = $dialog.find('#input_set_password2').val();
        var securityLevel = $dialog.data('securityLevel');
        var res = true;
        if (!pass) {
            $('#input_set_password').prop('title', '');
            $('#input_set_password').tooltip('open');
            res = false;
        }
        var type = $dialog.find('#input_set_password')[0].type;
        if ((type == 'password' && pass != pass2) || (type == 'text' && !!pass2 && pass != pass2)) {
            $('#input_set_password2').prop('title', '');
            $('#input_set_password2').tooltip('open');
            res = false;
        }
        if (res) {
            $('#input_set_password').tooltip('disable');
            $('#input_set_password2').tooltip('disable');
            localService.reEncrypt(null, pass, securityLevel);
            $("#set_password" + securityLevel).hide();
            $("#change_password" + securityLevel).show();
            $dialog.find('input').val("");
            return true;
        } else {
            return false;
        }
    }

    function showChangeDialog(securityLevel) {
        $('#change_password_old').tooltip('disable').showHidePassword('hide');
        $('#change_password_new').tooltip('disable').showHidePassword('hide');
        $('#change_password_new2').tooltip('disable');
        $("#change_password_form").find('input').val("");
        $("#change_password_form")
            .data("securityLevel", securityLevel)
            .data("validateCallback", validateChangeDialog)
            .dialog("open")
            .dialog("option", "title", chrome.i18n.getMessage("change_password" + securityLevel + "_dialog_title"));
    }

    function validateChangeDialog($dialog) {
        var oldPwd = $dialog.find('#change_password_old').val();
        var newPwd = $dialog.find('#change_password_new').val();
        var newPwd2 = $dialog.find('#change_password_new2').val();
        var securityLevel = $dialog.data('securityLevel');
        var res = true;
        if (!localService.testPassword(oldPwd, securityLevel)) {
            $('#change_password_old').prop('title', '');
            $('#change_password_old').tooltip('open');
            res = false;
        }
        if (!newPwd) {
            $('#change_password_new').prop('title', '');
            $('#change_password_new').tooltip('open');
            res = false;
        }
        var type = $dialog.find('#change_password_new')[0].type;
        if ((type == 'password' && newPwd != newPwd2) || (type == 'text' && !!newPwd2 && newPwd != newPwd2)) {
            $('#change_password_new2').prop('title', '');
            $('#change_password_new2').tooltip('open');
            res = false;
        }
        if (res) {
            $('#change_password_old').tooltip('disable');
            $('#change_password_new').tooltip('disable');
            $('#change_password_new2').tooltip('disable');
            localService.reEncrypt(oldPwd, newPwd, securityLevel);
            $dialog.find('input').val("");
            return true;
        } else {
            return false;
        }
    }

    function tooltipHide(event, ui) {
        $('#input_set_password').tooltip('close')
        $('#input_set_password2').tooltip('close');
        $('#change_password_old').tooltip('close');
        $('#change_password_new').tooltip('close');
        $('#change_password_new2').tooltip('close');
    }

    //#endregion Option tab

    //#region Accounts Tab

    function loadAccouns() {
        var accs = localService.getAccounts();
        $('#accountsList')
          .find('option')
          .remove();
        accs = accs.sort(function (a, b) { return a.providerName > b.providerName; });
        $(accs).each(function () {
            $("<option value='" + (this.providerName + "#" + this.elements.login).toLowerCase() + "' >" + this.providerName + " " + this.elements.login + "</option>")
                .data("account", this)
                .appendTo('#accountsList');
        });
    }

    function onSelectAccount(e) {
        var $sel = $('#accountsList');
        if ($sel.find('option').length == 0) return;
        if ($sel.val() == $("#accountForm").data("name")) return;
        var account = $('#accountsList').find("option:selected").data("account");
        var provider = localService.getProvider(account.providerName);
        buildForm(provider, "#accountForm", showPasswordCalback);
        var $form = $("#accountForm form");
        $("#level" + account.securityLevel).prop("checked", true);
        $("#securityLevel").buttonset();
        $(provider.elements).each(function () {
            if (this.name == "password" && account.securityLevel !== 0) {
                $form.find("#" + this.name)
                    .prop("placeholder", chrome.i18n.getMessage("encrypted"));
            } else {
                $form.find("#" + this.name).val(account.elements[this.name]);
                $form.find("#" + this.name + '2').val(account.elements[this.name]);
            }
        });
        $form.find("#login").css({ border: 'none' }).prop('readonly', 'readonly');
        $("#saveButton").click(saveAccountForm);
        $form.append($("<button>Delete</button>").click(deleteAccount).css({ clear: "none", marginLeft: "10px" }));
        $("#accountForm").data("name", provider.name);
        $("#accountForm").data("login", account.elements.login);
        $("#accountForm").data("provider", provider);
    }

    function showPasswordCalback(e) {
        var account = $('#accountsList').find("option:selected").data("account");
        var $input = $(e.currentTarget);
        if (account.securityLevel !== 0 && !e.currentTarget.value) {
            showRequestPassword(account.securityLevel, function (slPassword) {
                var pass = account.elements.password;
                if (!account.isPasswordDecrypted) {
                    pass = localService.decodePassword(pass, slPassword);
                }
                $input.val(pass);
                $('#' + e.currentTarget.id + '2').val(pass);
                $input.showHidePassword('show');
            });
            return false;
        } else {
            return true;
        }
    }

    function saveAccountForm() {
        var account = $('#accountsList').find("option:selected").data("account");
        var provider = $('#accountForm').data("provider");

        for (var i in provider.elements) {
            var el = provider.elements[i];
            if (el.type === 'password') {
                var newPwd = $('#password').val();
                var newPwd2 = $('#password2').val();
                var res = true;
                var type = $('#password')[0].type;
                if ((type == 'password' && newPwd != newPwd2) || (type == 'text' && !!newPwd2 && newPwd != newPwd2)) {
                    $('#password2').prop('title', '').tooltip('open');
                    res = false;
                }
                if (res) {
                    $('#password2').tooltip('disable');
                } else {
                    return false;
                }
            }
        }

        var securityLevel = 0;
        if (localService.getOption("enhanced_security")) {
            securityLevel = parseInt($('input[name=securityLevel]:checked', "#accountForm").val());
        }
        $("#accountForm").data("securityLevel", securityLevel);
        if ((securityLevel === 1 && !localService.isPassword1Open()) || securityLevel === 2) {
            showRequestPassword(securityLevel, onRequestedAccountPasswordSet);
        } else {
            saveForm('#accountForm', provider, securityLevel);
            loadAccouns();
        }
        return true;
    }

    function onRequestedAccountPasswordSet(slPassword) {
        var provider = $('#accountForm').data("provider");
        var securityLevel = $('#accountForm').data("securityLevel");
        saveForm('#accountForm', provider, securityLevel, slPassword);
        loadAccouns();
    }

    function deleteAccount() {
        localService.deleteAccount($("#accountForm").data("name"), $('#accountForm').find("input[name='login']").val());
        loadAccouns();
    }



    //#endregion Accounts Tab

    //#region Providers Tab

    function loadProviders() {
        var result = onlineService.loadIndex("", onProvidersLoaded);
    }

    function onProvidersLoaded(data, e) {
        var text = $("#searchText").val();
        $('#providersList')
          .find('option')
          .remove();
        var providers = data
          .sort(function (a, b) { return a.name > b.name; });
        if (text) providers = providers.filter(function (value) { return value.keywords.indexOf(text) >= 0; });
        $(providers).each(function () {
            var $op = $("<option value='" + this.name + "' >" + this.name + "</option>");
            $op.data("provider", this);
            this.option = $op[0];
            $('#providersList').append($op);
        });
        $('#providersList').data("providers", data);
    }

    function onSelectProvider(e) {
        var $sel = $('#providersList');
        if ($sel.find('option').length == 0) return;
        if ($sel.val() == $("#searchForm").data("name")) return;
        var provider = $('#providersList').find("option:selected").data("provider");
        if (!provider.elements) {
            onlineService.loadProvider(provider.file, onLoadProvider, clearForm);
        } else {
            onLoadProvider(provider);
        }
    }

    function onLoadProvider(data) {
        $('#providersList').find("option:selected").data("provider", data);
        buildForm(data, "#searchForm");
        $("#saveButton").click(saveProvidersForm);
    }

    function buildForm(provider, formId, passwordCallback) {
        clearForm();
        //$('#providersList').find("option:selected").data("provider", provider);
        //var $sel = $('#providersList');
        var $form = $("<form>");
        $form.bind("submit", function () { return false; });
        if (localService.getOption("enhanced_security")) {
            $form.append("<label class='left'>" + chrome.i18n.getMessage("security_level") + ": &nbsp;</label>");
            $form.append("<div id='securityLevel'><input type='radio' id='level0' name='securityLevel' value=0 checked /><label for='level0'>0</label><input type='radio' id='level1' name='securityLevel' value=1 /><label for='level1'>1</label><input type='radio' id='level2' name='securityLevel' value=2 /><label for='level2'>2</label></div>");
            if (!localService.getOption("password_hash_1")) $form.find('#level1').prop('disabled', true);
            if (!localService.getOption("password_hash_2")) $form.find('#level2').prop('disabled', true);
        }
        $(provider.elements).each(function () {
            $form.append("<label class='left' for='" + this.name + "'>" + this.description + ": &nbsp;</label>");
            if (this.type === "select") {
                var $sel2 = $("<select id='" + this.name + "' name='" + this.name + "' type='" + this.type + "' />");
                $(this.values).each(function () {
                    $sel2.append("<option value='" + this + "' >" + this + "</option>");
                });
                $form.append($sel2);
            } else if (this.type === "password") {
                $form.append("<input id='" + this.name + "' name='" + this.name + "' type='password' />");
                $form.append("<label class='left'>&nbsp;</label>");
                var retypeInput = $("<input id='" + this.name + "2' name='" + this.name + "2' type='password' />");
                $form.append(retypeInput);
                tooltipOptions.content = chrome.i18n.getMessage("password_required");
                $form.find('#' + this.name).tooltip(tooltipOptions).showHidePassword({ size: 22, retypeInput: retypeInput, onShow: passwordCallback });
                tooltipOptions.content = chrome.i18n.getMessage("password_not_match");
                $form.find('#' + this.name + '2').tooltip(tooltipOptions);
            } else {
                $form.append("<input id='" + this.name + "' name='" + this.name + "' type='" + this.type + "' />");
            }
        });
        $form.append($("<button id='saveButton'>Save</button>"));
        $(formId).empty().append("<h2>" + provider.name + "</h2>").append($form);
        $(formId).data("name", provider.name);
        $(formId).data("provider", provider);
        $("#securityLevel").buttonset();
    }

    function clearForm() {
        $("#searchForm").empty();
        $("#searchForm").data("name", "");
        $("#accountForm").empty();
        $("#accountForm").data("name", "");
    }

    function saveProvidersForm() {
        $('#request_password_input').val('');
        var provider = $('#searchForm').data("provider");
        //validation retype password
        for (var i in provider.elements) {
            var el = provider.elements[i];
            if (el.type === 'password') {
                var newPwd = $('#password').val();
                var newPwd2 = $('#password2').val();
                var res = true;
                if (!newPwd) {
                    $('#password').prop('title', '').tooltip('open');
                    res = false;
                }
                var type = $('#password')[0].type;
                if ((type == 'password' && newPwd != newPwd2) || (type == 'text' && !!newPwd2 && newPwd != newPwd2)) {
                    $('#password2').prop('title', '').tooltip('open');
                    res = false;
                }
                if (res) {
                    $('#password').tooltip('disable');
                    $('#password2').tooltip('disable');
                } else {
                    return false;
                }
            }

        }
        // require sequirity level password
        var securityLevel = 0;
        if (localService.getOption("enhanced_security")) {
            securityLevel = parseInt($('input[name=securityLevel]:checked', "#searchForm").val());
        }
        $("#searchForm").data("securityLevel", securityLevel);
        if ((securityLevel === 1 && !localService.isPassword1Open()) || securityLevel === 2) {
            showRequestPassword(securityLevel, onRequestedPasswordSet);
        } else {
            saveForm('#searchForm', provider, securityLevel, null);
        }
        return true;
    }

    function showRequestPassword(securityLevel, callback) {
        dialogOptions.height = 200;
        $("#request_password_dialog").dialog(dialogOptions);
        $('#request_password_input').val("").tooltip(tooltipOptions).tooltip('disable').showHidePassword();
        $("#request_password_dialog")
            .data("validateCallback", showRequestPasswordValidate)
            .data("successCallback", callback)
            .data("securityLevel", securityLevel)
            .dialog("open")
            .dialog("option", "title", chrome.i18n.getMessage("request_password" + securityLevel + "_dialog_title"));
    }

    function showRequestPasswordValidate() {
        var $input = $('#request_password_input');
        var slPassword = $input.val();
        var securityLevel = $('#request_password_dialog').data("securityLevel");
        if (!slPassword) {
            $input.prop('title', '')
                .tooltip('option', 'content', chrome.i18n.getMessage('password_required'))
                .tooltip('open');
            return false;
        } else {
            if (!localService.testPassword(slPassword, securityLevel)) {
                $input.prop('title', '')
                    .tooltip('option', 'content', chrome.i18n.getMessage('invalid_password'))
                    .tooltip('open');
                return false;
            }
        }
        $("#request_password_dialog").data("successCallback")(slPassword);
        $("#request_password_dialog").dialog("close");
        return true;
    }

    function onRequestedPasswordSet(slPassword) {
        var securityLevel = $('#searchForm').data("securityLevel");
        var provider = $('#searchForm').data("provider");
        saveForm('#searchForm', provider, securityLevel, slPassword);
    }

    function saveForm(formid, provider, securityLevel, slPassword) {
        var account = {
            providerName: provider.name,
            elements: {}
        };
        $(provider.elements).each(function () {
            var $inp;
            if (this.type == "select") {
                $inp = $(formid).find("select[name='" + this.name + "']");
            } else {
                $inp = $(formid).find("input[name='" + this.name + "']");
            }
            account.elements[this.name] = $inp.val();
        });
        //if (localService.checkExist(account)) {
        //    if (window.confirm("This Account Exisit! overwrite?")) {
        //        localService.setAccount(account, provider, securityLevel, password);
        //    }
        //} else {
        localService.setAccount(account, provider, securityLevel, slPassword);
        //}
        accountsInitialized = false;
        window.setTimeout(function () {
            $(formid).empty().append("<br/><br/><br/><div style='text-align:center'>" + chrome.i18n.getMessage("account_saved") + "</div>");
            window.setTimeout(clearForm, 1000);
        });
    }

    //#endregion Providers Tab

    function loadBackup() {
        $('#backupText').val(localStorage.db_storage);
    }

    function backupExport() {
        var blob = new Blob([localStorage.db_storage], { type: "text/plain;charset=utf-8" });
        saveAs(blob, 'autologin.json');
    }

    function backupImport(evt) {
        var files = evt.target.files;
        var file = files[0];
        var reader = new FileReader();
        reader.onload = function () {
            console.log(this.result, JSON.parse(this.result));
            $(evt.target).replaceWith($(evt.target).clone(true));
        }
        reader.readAsText(file);
    }


    function init() {
        $("#tabs").tabs({ active: 0, activate: onTabsActivate });
        $("#searchText").keyup(loadProviders);
        $("#providersList").click(onSelectProvider);
        $("#accountsList").click(onSelectAccount);
        $("#addAccount").click(function () { $('#tabs').tabs('option', 'active', 2); });

        Array.prototype.forEach.call(document.querySelectorAll("*[i18n-message]"),
                                 function (node) {
                                     node.textContent = chrome.i18n.getMessage(node.getAttribute('i18n-message'));
                                 });
        Array.prototype.forEach.call(document.querySelectorAll("*[i18n-message-placeholder]"),
                                 function (node) {
                                     node.placeholder = chrome.i18n.getMessage(node.getAttribute('i18n-message-placeholder'));
                                 });
        Array.prototype.forEach.call(document.querySelectorAll("*[i18n-message-title]"),
                                 function (node) {
                                     node.title = chrome.i18n.getMessage(node.getAttribute('i18n-message-title'));
                                 });
        loadOptions();
        initOptions();
    }

    window.setTimeout(init);
})(jQuery, chrome);