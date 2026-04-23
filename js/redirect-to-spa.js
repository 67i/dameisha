/**
 * Redirect standalone page access to SPA hash route
 * If a user directly visits xxx.html, redirect to index.html#/xxx
 */
(function() {
    // Only redirect if we're not already inside the SPA (no #app-content means standalone page)
    if (!document.getElementById('app-content')) {
        var routeMap = {
            'index.html': 'home',
            'hotel-detail.html': 'hotel-detail',
            'hotel-list.html': 'hotel-list',
            'vacation-detail.html': 'vacation-detail',
            'exchange-detail.html': 'exchange-detail',
            'authorized-dealer.html': 'authorized-dealer',
            'benefits-detail.html': 'benefits-detail',
            'faq.html': 'faq',
            'contact.html': 'contact',
            'privacy.html': 'privacy',
            'terms.html': 'terms'
        };

        var path = window.location.pathname;
        var fileName = path.split('/').pop();
        var routeName = routeMap[fileName];

        if (routeName && fileName !== 'index.html') {
            var qs = window.location.search ? window.location.search.substring(1) : '';
            var hash = '#/' + routeName + (qs ? '?' + qs : '');
            window.location.replace('./index.html' + hash);
        }
    }
})();
