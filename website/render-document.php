<?php
session_start();

// Usage e.g. /derbynet/print.php/racer/car-tags

//  ["DOCUMENT_URI"]=> "/derbynet/pack153/2019/render-document.php/racer/CarTagsDocument"
//  ["SCRIPT_NAME"]=> "/derbynet/pack153/2019/render-document.php"

if (isset($_SERVER['DOCUMENT_URI']) && isset($_SERVER['SCRIPT_NAME']) &&
    substr($_SERVER['DOCUMENT_URI'], 0, strlen($_SERVER['SCRIPT_NAME'])) == $_SERVER['SCRIPT_NAME']) {
  $exploded = explode('/', substr($_SERVER['DOCUMENT_URI'], strlen($_SERVER['SCRIPT_NAME'])));
} else {
  if (isset($_SERVER['PATH_INFO'])) {
    $path_info = $_SERVER['PATH_INFO'];
  } else if (isset($_SERVER['ORIG_PATH_INFO'])) {
    // Rewrite rules e.g. for hosted DerbyNet may leave ORIG_PATH_INFO instead of PATH_INFO
    $path_info = $_SERVER['ORIG_PATH_INFO'];
  } else {
    echo "Debugging \$_SERVER:\n";
    var_export($_SERVER);
    exit(0);
  }

  $exploded = explode('/', $path_info);
}

while ($exploded[0] == '') {
  array_shift($exploded);
}

$inc = array_shift($exploded);

function document_class() {
  global $exploded;
  return $exploded[0];
}

function new_document() {
  $doc_class = document_class();
  return new $doc_class;
}

require_once('print/'.$inc.'.inc');
?>
