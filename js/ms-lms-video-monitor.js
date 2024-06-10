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
        var videoPlayer = null; // Selector for YouTube video players
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

        function initialize() {
            completeNextButton.after(remainingTimeDisplay); // Insert the remaining time display after the button
            disableNextButton();

            function retrieveVideoLength() {
                // ----------------------------------------------------
                var videoLengthText = $('.vjs-duration-display').text() || $('.plyr__time--current').text() || $('.plyr__tooltip').text();
                if (!videoLengthText || videoLengthText === '00:00') {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log('Retrying to retrieve video length... Attempt #' + retryCount);
                        setTimeout(retrieveVideoLength, retryInterval);
                    } else {
                        logError('Unable to retrieve valid video length information after ' + maxRetries + ' retries.');
                    }
                    return;
                }

                videoLength = formatTimeToSeconds(videoLengthText);
                if (isNaN(videoLength) || videoLength <= 0) {
                    logError('Invalid video length: ' + videoLengthText + '. Ensure the time format is valid (hh:mm:ss, mm:ss, or ss).');
                    return;
                }

                remainingTime = videoLength;
                updateRemainingTimeDisplay();
            }

            retrieveVideoLength();
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
            return;
            // var modalHtml = `
            //     <div class="masterstudy-modal">
            //         <div class="masterstudy-modal-content">
            //             <span class="masterstudy-close">&times;</span>
            //             <p>Please do not skip the video.</p>
            //         </div>
            //     </div>
            // `;

            // $('body').append(modalHtml);

            // var modal = $('.masterstudy-modal');
            // var span = $('.masterstudy-close');

            // modal.show();

            // span.on('click', function() {
            //     modal.remove();
            //     location.reload();
            // });

            // $(window).on('click', function(event) {
            //     if ($(event.target).is(modal)) {
            //         modal.remove();
            //         location.reload();
            //     }
            // });
        }

        function initVideoPlayer() {
            videoPlayer = $('.masterstudy-course-player-lesson-video iframe');
            if (videoPlayer.length === 0) {
                if (retryCount < maxRetries) {
                    setTimeout(function() {
                        retryCount++;
                        console.log('Retrying... Attempt #' + retryCount);
                        initVideoPlayer();
                    }, retryInterval);
                } else {
                    logError('Video player not found after ' + maxRetries + ' retries. Ensure the player is loaded and the selector is correct.');
                }
                return;
            } else {
                console.log("Video Player found");
                console.log(videoPlayer);
            }

            initialize();

            videoPlayer.on('load', function() {
                videoPlayer.on('play', function() {
                    interval = setInterval(function() {
                        videoPlayer[0].contentWindow.postMessage({ event: 'infoDelivery', info: { currentTime: true } }, '*');
                    }, 1000);
                });

                videoPlayer.on('pause', function() {
                    clearInterval(interval);
                });

                videoPlayer.on('ended', function() {
                    clearInterval(interval);
                    watchedDuration = videoLength;
                    enableNextButton();
                });
            });

            window.addEventListener('message', function(event) {
                let eventData;

                if (typeof event.data === 'string') {
                    try {
                        eventData = JSON.parse(event.data);
                    } catch (e) {
                        console.error('Failed to parse event data:', e);
                        return;
                    }
                } else {
                    eventData = event.data;
                }

                if (eventData.event === 'infoDelivery' && eventData.info && eventData.info.currentTime) {
                    console.log(eventData.info.currentTime);
                    checkVideoProgress(eventData.info.currentTime);
                }
            });
        }

        initVideoPlayer();
    }
});
