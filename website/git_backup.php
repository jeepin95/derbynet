<?php session_start(); ?>
<?php
require_once('inc/data.inc');
require_once('inc/banner.inc');
require_once('inc/authorize.inc');
require_once('inc/git.inc');
#require_once('inc/default-file-path.inc');
require_permission(SET_UP_PERMISSION);  // TODO: What's the correct permission?
?><!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<title>Git Backups</title>
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
<script type="text/javascript" src="js/git.js"></script>
</head>
<body>
<?php make_banner('Manual Timer'); ?>
<?php require_once('inc/ajax-failure.inc'); ?>

Manual timer will allow you to start a race and manually time each lane. 
This is useful for things like Raingutter Regatta.
All lanes must finish before the time is sent to DerbyNet. Lanes not occupied in the heat MUST finish AFTER all lanes in heat.
<?php

$path = '/var/lib/derbynet';
chdir($path);

$repo = Git::open($path);


?>
<div>
<b>New Backup Name:</b> <input id="new_branch"><br/>
<b>Comment:</b> <input id="comment"><br/>
<div class="block_buttons">
    <input type="button" data-enhanced="true" value="New Backup" onclick="new_branch()"/><br>
</div>

</div>

<div>
    <b>Current Branch: </b>
    <?php

    echo $repo->active_branch();
    ?>
<div>
    <b>Current Status</b>
    <?php
    echo $repo->status(true);

    ?>
</div>

<div>
    <b>Branch List</b>
    <ul>
    <?php 
        //$results = $repo->run("log --graph --oneline --decorate --all");
        $results = $repo->run("log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %C(white)%s%C(reset) %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all");
        $branches = explode("\n", $results);
        foreach ($branches as $branch) {
            echo "<li>".$branch."</li>";
        }
    ?>
    </ul>
</div>

<div>
    <b>Restore Branch</b>
    <select id="old_branch">
        <?php
            $branches = $repo->list_branches();
            foreach ($branches as $branch) {
                echo "<option>".$branch."</option>";
            }           
        ?>
    </select>
    <div class="block_buttons">
    <input type="button" data-enhanced="true" value="Restore Branch" onclick="restore_branch()"/><br>
</div>

</body>
</html>
