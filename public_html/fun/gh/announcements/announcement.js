/* ad logic */
    if (typeof(jQuery) != 'undefined') {
        jQuery(document).ready(function() {
            try {
                var adHTML = jQuery("#ad0001").html();
                jQuery("#gh-announcement").html(adHTML);
                gameConfig.announcements.isLoaded = false;
            }
            catch (err) {

            }

        });
    }

