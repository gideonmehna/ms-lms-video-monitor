<?php
/*
Plugin Name: MS LMS Video Monitor 
Description: Ensures a user has watched an entire JetPack video lesson before allowing them to click the "Complete & Next" button.
Version: 1.0
Author: Gideon Mehna
URI: https://elyownsoftware.com
*/

// Enqueue scripts and styles
function ms_lms_video_monitor_testing_assets() {
    wp_enqueue_script('ms-lms-video-monitor', plugin_dir_url(__FILE__) . 'js/ms-lms-video-monitor.js', array('jquery'), '1.0', true);
    $post_id = get_queried_object_id();
    if($post_id == 0){
        $post_id = get_the_ID();
    }
    $post_data = array(
        'ajax_url' => esc_url(admin_url('admin-ajax.php')),
        'post_id' => esc_js($post_id),
        'security' => wp_create_nonce('fetch_custom_field_value_nonce') // Generate nonce
    );
    wp_localize_script('ms-lms-video-monitor', 'post_data', $post_data);
    wp_enqueue_style('ms-lms-video-monitor', plugin_dir_url(__FILE__) . 'css/ms-lms-video-monitor.css', array(), '1.0');
}
add_action('wp_enqueue_scripts', 'ms_lms_video_monitor_testing_assets');

// Add custom fields to lessons
function masterstudy_lms_custom_fields($custom_fields) {
    $video_lesson_custom_fields = array(
        array(
            'type'    => 'radio',
            'name'    => 'must-watch',
            'label'   => __('Must Watch (Students have to watch video)', 'masterstudy-lms-learning-management-system'),
            //'default' => 'yes', // Optional
            'required'=> true,  // Optional
            'custom_html'=> 'Enable Video Monitor. This prevents students from skipping forward a video lesson.',
            'options' => array(
                array(
                    'value' => 'yes',
                    'label' => __('Yes, make this video a Must-Watch', 'masterstudy-lms-learning-management-system'),
                ),
                array(
                    'value' => 'no',
                    'label' => __('No, this video is optional', 'masterstudy-lms-learning-management-system'),
                ),
            ),
        ),
    );

    return array_merge($custom_fields, $video_lesson_custom_fields);
}
add_filter('masterstudy_lms_lesson_custom_fields', 'masterstudy_lms_custom_fields');

// Function to fetch the custom field value
function fetch_custom_field_value_callback() {
    // Verify nonce
    if (!isset($_POST['security']) || !wp_verify_nonce($_POST['security'], 'fetch_custom_field_value_nonce')) {
        wp_send_json_error(array('message' => 'Invalid nonce.'));
        wp_die();
    }

    // Get the post ID and custom field name from the AJAX request
    $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
    $field_name = isset($_POST['field_name']) ? sanitize_text_field($_POST['field_name']) : '';

    if ($post_id && $field_name) {
        // Get the custom field value
        $field_name = 'must-watch';
        $custom_field_value = get_post_meta($post_id, $field_name, true);

        // Prepare the response
        $response = array(
            'success' => true,
            'must-watch' => esc_html($custom_field_value),
        );
    } else {
        $response = array(
            'success' => false,
            'message' => 'Invalid parameters.',
        );
    }

    // Return the JSON response
    wp_send_json($response);

    // Make sure to exit after sending the response
    wp_die();
}

// Register the AJAX handler
add_action('wp_ajax_fetch_custom_field_value', 'fetch_custom_field_value_callback');
add_action('wp_ajax_nopriv_fetch_custom_field_value', 'fetch_custom_field_value_callback'); // Allow non-logged-in users to access the AJAX endpoint
