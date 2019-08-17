url = "./action.php";
// Added for git backupf
function new_branch() {
    command = $("#new_branch").val();
    comment = $("#comment").val();
    data = {
        action: 'git',
        message: 'new-branch',
        command: command,
        comment: comment
    }
    $.ajax({
        url: url,
        type: "POST",
        data: data,
        success: function(data) {
            console.log('Success: ', data);
        },
        error: function(data) {
            console.warn('Error: ', data);
        }
    })
}


function restore_branch() {
    command = $("#old_branch").val();
    data = {
        action: 'git',
        message: 'check-out',
        command: command,
    }
    $.ajax({
        url: url,
        type: "POST",
        data: data,
        success: function(data) {
            console.log('Success: ', data);
        },
        error: function(data) {
            console.warn('Error: ', data);
        }
    })
}