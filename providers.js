// Copyright 2013 Alexey Dzheksenov. All Rights Reserved.
(function() {
    var loadIndex = function(query, callback) {
        if (typeof(query) == "function") {
            callback = query;
            query = null;
        }
        $.ajax({
            url: '/providers/index.json',
            dataType: "json",
            success: callback
        });
    };

    var loadProvider = function(url, onSuccess, onError) {
        $.ajax({
            url: '/providers/' + url,
            dataType: "json",
            success: onSuccess,
            error: onError
        });
    };

    window.onlineService = {
        loadIndex: loadIndex,
        loadProvider: loadProvider
    };
})();

