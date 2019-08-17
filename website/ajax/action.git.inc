<?php

require_once('inc/git.php');

$message = $_POST['message'];
$path = '/var/lib/derbynet';
chdir($path);
$repo = Git::open($path);

start_response();
if($message == 'new-branch') {
    $branch_name = $_POST['command'];
    $comments = $_POST['comment'];
    echo "\n <new-branch>" . $branch_name . "</new-branch>\n";
    echo "\n <comments>" . $comments . "</comments>\n";
    $cb = $repo->create_branch ($branch_name);
    $step2 = $repo->checkout($branch_name);
    $step3 = $repo->status(true);
    $step4 = $repo->add('.');
    if (strlen($step4) > 0) {
        $step5 = $repo->commit($comments);
        echo "\n <step5>" . $step5 . "</step5>\n";
    }
    echo "\n <files>" . $step4 . "</files>\n";
    $current_branch = $repo->active_branch();
    echo "\n <active_branch>" . $current_branch . "</active_branch>\n";

}
if($message == 'check-out') {
    echo "\n <check-out/>\n";
    $command = $_POST['command'];
    $results = $repo->checkout($command);
    echo "\n <status>" . $results . "</status>\n";
}
if($message == 'list-branches') {
    $branches = $repo->list_branches(true);
            foreach ($branches as $branch) {
                echo "<branch>".$branch."</branch>";
            }
}

end_response();
?>