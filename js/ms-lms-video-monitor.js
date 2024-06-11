

// Function to fetch and display the custom field value using AJAX
function fetchCustomFieldValue(post_data) {
    return new Promise(function(resolve, reject) {
        // Make an AJAX request
        jQuery.ajax({
            url: post_data.ajax_url, // WordPress AJAX URL
            type: 'POST',
            data: {
                action: 'fetch_custom_field_value', // Action to be performed on the server
                post_id: post_data.post_id, // Pass the current post ID to PHP
                field_name: 'must-watch', // Custom field name
                security: post_data.security,
            },
            success: function(response) {
                if (response.success) {
                    // Resolve the promise with the custom field value
                    resolve(response['must-watch']);
                } else {
                    // Reject the promise with an error message
                    reject('Failed to fetch custom field value.');
                }
            },
            error: function(xhr, status, error) {
                // Reject the promise with the error
                reject(error);
            }
        });
    });
}
jQuery(document).ready(function($) {
    if ($('.masterstudy-course-player-navigation__status').length) {
        return;
    }

    var attempts = 0;
    var maxAttempts = 10;
    var interval = 2000; // 2 seconds interval
    $('.masterstudy-course-player-navigation__next .masterstudy-nav-button').css('display', 'none');

    var checkPostData = setInterval(function() {
        if (post_data.post_id && post_data.ajax_url) {
            console.log('post_data:', post_data);
            clearInterval(checkPostData);

            fetchCustomFieldValue(post_data).then(function(enableVideoMonitor) {
                console.log(enableVideoMonitor);
                if (enableVideoMonitor !== 'yes') {
                    $('.masterstudy-course-player-navigation__next .masterstudy-nav-button').css('display', 'block');
                    return; // Exit if video monitor is not enabled
                }

                // Continue with your logic here
                initVideoPlayer();

            }).catch(function(error) {
                console.error('Failed to fetch custom field value:', error);
            });
        } else {
            attempts++;
            console.log('Attempt', attempts, 'post_data not ready yet.');

            if (attempts >= maxAttempts) {
                clearInterval(checkPostData);
                console.error('Failed to get valid post_data after 10 attempts.');
            }
        }
    }, interval);

    function initVideoPlayer() {
        var videoPlayer = $('.masterstudy-course-player-lesson-video iframe'); // Selector for Jetpack VideoPress iframe
        var completeNextButton = $('.masterstudy-course-player-navigation__next .masterstudy-nav-button');
        var remainingTimeDisplay = $('<div class="masterstudy-course-player-lesson remaining-time-display"></div>'); // New element to show remaining time
        var videoLength = 0;
        var watchedDuration = 0;
        var interval;
        var remainingTime = 0;
        var retryCount = 0;
        var maxRetries = 10;
        var retryInterval = 1000; // Retry every 1 second
        var lastRecordedTime = 0;
        var skipThreshold = 5; // Allow skipping only within 5 seconds

        function formatTimeToSeconds(timeString) {
            var timeParts = timeString.split(':');
            var seconds = 0;
            if (timeParts.length === 3) {
                seconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
            } else if (timeParts.length === 2) {
                seconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
            } else {
                seconds = parseInt(timeParts[0]);
            }
            return seconds;
        }

        function formatSecondsToTime(seconds) {
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = Math.floor(seconds % 3600 % 60);
            return (h > 0 ? h + ":" : "") + (m > 9 ? m : "0" + m) + ":" + (s > 9 ? s : "0" + s);
        }

        function updateRemainingTimeDisplay() {
            remainingTimeDisplay.html('<p>(' + formatSecondsToTime(remainingTime) + ' left)</p>');
        }

        function enableNextButton() {
            completeNextButton.css('display', 'block');
            completeNextButton.find('span').text('Complete & Next');
            remainingTimeDisplay.hide(); // Hide the remaining time display when the button is enabled
        }

        function disableNextButton() {
            completeNextButton.css('display', 'none');
            remainingTimeDisplay.show(); // Show the remaining time display when the button is disabled
        }

        function logError(message) {
            console.error('MS LMS Video Monitor Error: ' + message);
        }

        function retrieveVideoLength() {
            var videoElement = videoPlayer.contents().find('video');
            if (videoElement.length) {
                videoLength = videoElement[0].duration;
                if (isNaN(videoLength) || videoLength <= 0) {
                    logError('Invalid video length.');
                } else {
                    remainingTime = videoLength;
                    updateRemainingTimeDisplay();
                }
            } else {
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log('Retrying to retrieve video length... Attempt #' + retryCount);
                    setTimeout(retrieveVideoLength, retryInterval);
                } else {
                    logError('Unable to retrieve valid video length information after ' + maxRetries + ' retries.');
                }
            }
        }

        function checkVideoProgress(currentTime) {
            if (currentTime > watchedDuration) {
                if (currentTime - lastRecordedTime > skipThreshold) {
                    showSkipWarningModal();
                    return;
                }
                watchedDuration = currentTime;
                remainingTime = videoLength - watchedDuration;
                updateRemainingTimeDisplay();
                lastRecordedTime = currentTime;
                if (remainingTime <= 1.5) {
                    clearInterval(interval);
                    enableNextButton();
                }
            }
        }

        function showSkipWarningModal() {
            alert('Please do not skip the video.');
            location.reload();
        }

        function initialize() {
            completeNextButton.after(remainingTimeDisplay); // Insert the remaining time display after the button
            disableNextButton();

            retrieveVideoLength();

            interval = setInterval(function() {
                var videoElement = videoPlayer.contents().find('video');
                if (videoElement.length) {
                    var currentTime = videoElement[0].currentTime;
                    checkVideoProgress(currentTime);
                }
            }, 1000);
        }

        videoPlayer.on('load', function() {
            initialize();
        });

        if (videoPlayer.length) {
            initialize();
        } else {
            if (retryCount < maxRetries) {
                setTimeout(function() {
                    retryCount++;
                    console.log('Retrying... Attempt #' + retryCount);
                    initVideoPlayer();
                }, retryInterval);
            } else {
                logError('Video player not found after ' + maxRetries + ' retries. Ensure the player is loaded and the selector is correct.');
            }
        }
    }
});
