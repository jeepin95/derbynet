start_time = -1;
lane1_time = -1;
lane1_place = -1;
lane2_time = -1;
lane2_place = -1;
lane3_time = -1;
lane3_place = -1;
lane4_time = -1;
lane4_place = -1;
lane5_time = -1;
lane5_place = -1;
lane6_time = -1;
lane6_place = -1;

places = [];
times = [];

for (var i = 0; i < lane_count; i++) {
    places.push(-1);
    times.push(-1);
}


currently_racing = false;
current_place = 0;

function start_race() {
    start_time = new Date().getTime();
    current_place = 0;
    console.log("Start Time: ", start_time);
    //$("[id^=btnLane]").prop("disabled", false);

    for (var i = 0; i < lane_count; i++) {
        $("#btnLane" + (i + 1)).val("Lane " + (i + 1)).prop("disabled", false);
    }
    // $("#btnLane1").val("Lane 1");
    // $("#btnLane2").val("Lane 2");
    // $("#btnLane3").val("Lane 3");
    // $("#btnLane4").val("Lane 4");
    // $("#btnLane5").val("Lane 5");
    // $("#btnLane6").val("Lane 6");
    connect_timer();
}

function lane_finish(lane) {
    current_place++;

    times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    places[lane - 1] = current_place;
    $("#btnLane" + (lane)).prop('disabled', true).val('Lane ' + lane + ' (' + places[lane - 1] + ')');

    // if (lane == 1) {
    //     times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    //     places[lane - 1] = current_place;
    //     $("#btnLane1").prop('disabled', true);
    //     $("#btnLane1").val("Lane 1 (" + places[lane - 1] + ")");
    // }
    // if (lane == 2) {
    //     times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    //     places[lane - 1] = current_place;
    //     $("#btnLane2").prop('disabled', true);
    //     $("#btnLane2").val("Lane 2 (" + places[lane - 1] + ")");
    // }
    // if (lane == 3) {
    //     times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    //     places[lane - 1] = current_place;
    //     $("#btnLane3").prop('disabled', true);
    //     $("#btnLane3").val("Lane 3 (" + places[lane - 1] + ")");
    // }
    // if (lane == 4) {
    //     times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    //     places[lane - 1] = current_place;
    //     $("#btnLane4").prop('disabled', true);
    //     $("#btnLane4").val("Lane 4 (" + places[lane - 1] + ")");
    // }
    // if (lane == 5) {
    //     times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    //     places[lane - 1] = current_place;
    //     $("#btnLane5").prop('disabled', true);
    //     $("#btnLane5").val("Lane 5 (" + places[lane - 1] + ")");
    // }
    // if (lane == 6) {
    //     times[lane - 1] = (new Date().getTime() - start_time) / 1000;
    //     places[lane - 1] = current_place;
    //     $("#btnLane6").prop('disabled', true);
    //     $("#btnLane6").val("Lane 6 (" + places[lane - 1] + ")");
    // }

    if (current_place == lane_count) {
        race_results = "Lane 1 = " + places[0] + "<br>Lane 2 = " + places[1] + "<br>Lane 3 = " + places[2] + "<br>Lane 4 = " + places[3] + "<br>Lane 5 = " + places[4] + "<br>Lane 6 = " + places[5];
        $("#raceResults").html(race_results);
        timer_results();
    }
}

function connect_timer() {
    url = './action.php';
    $.ajax({
        url: url,
        type: "POST",
        data: { action: 'timer-message', message: 'IDENTIFIED' },
        success: function(data) {
            console.log('Success: ', data);
        },
        error: function(data) {
            console.warn('Error: ', data);
        }
    })
}

function timer_results() {
    data = {
        action: 'timer-message',
        message: 'FINISHED',
        roundid: 1,
        heat: 1,
        lane1: times[0],
        place1: places[0],
        lane2: times[1],
        place2: places[1],
        lane3: times[2],
        place3: places[2],
        lane4: times[3],
        place4: places[3],
        lane5: times[4],
        place5: places[4],
        lane6: times[5],
        place6: places[5]
    }
    console.log(data);
    url = './action.php';
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