<?php session_start(); ?>
<?php
require_once('inc/data.inc');
require_once('inc/banner.inc');
require_once('inc/authorize.inc');
require_permission(SET_UP_PERMISSION);  // TODO: What's the correct permission?
?><!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<title>Manual Timer Page</title>
<?php require('inc/stylesheet.inc'); ?>
<link rel="stylesheet" type="text/css" href="css/jquery.mobile-1.4.2.css"/>
<script type="text/javascript" src="js/jquery.js"></script>
<script type="text/javascript" src="js/jquery-ui-1.10.4.min.js"></script>
<link rel="stylesheet" type="text/css" href="css/coordinator.css"/>
<script type="text/javascript" src="js/mobile-init.js"></script>
<!-- For flipswitch and select elements: -->
<script type="text/javascript" src="js/jquery.mobile-1.4.2.min.js"></script>
<script type="text/javascript" src="js/dashboard-ajax.js"></script>
<script type="text/javascript" src="js/modal.js"></script>
<script type="text/javascript">
    var lane_count = <?php echo get_lane_count(); ?>;
</script>
<script type="text/javascript" src="js/manual-timer.js"></script>
</head>
<body>
<?php make_banner('Manual Timer'); ?>
<?php require_once('inc/ajax-failure.inc'); ?>

Manual timer will allow you to start a race and manually time each lane. 
This is useful for things like Raingutter Regatta.<br/>
Results are submitted once all lanes have finished. Any lanes not currently scheduled
for racing MUST be finished AFTER all scheduled lanes in order to complete the race.
<br/>


<div class="block_buttons">
    <input type="button" data-enhanced="true" value="Start Race" onclick="start_race()"/><br>
</div>

<div class="block_buttons">
<?php
    $lane_count = get_lane_count();
    for($i=0; $i < $lane_count; $i++ ) {
        echo '<input type="button" id="btnLane'.($i+1).'" data-enhanced="true" value="Lane '.($i+1).'" onclick="lane_finish('.($i+1).')" disabled=true></button>';
    }
?>
</div>

<div id="raceResults">

</div>
</body>
</html>
