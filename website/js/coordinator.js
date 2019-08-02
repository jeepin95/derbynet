// Requires dashboard-ajax.js

// Data structure describing each round:
//
// round = { roundid:
//           classname:
//           round: (number)
//           roster_size, racers_passed, racers_unscheduled, racers_scheduled,
//           heats_scheduled, heats_run
//           category: one of ("now-racing", "master-schedule",
//                             "ready-to-race", "not-yet-scheduled",
//                             "done-racing",)
//         }
// (racers_passed = racers_scheduled + racers_unscheduled)
// (master-schedule is applied to a synthesized 'totals' round.)
// (now-racing category is applied to the currently-running round.)
//
// A layout sorts the roundids into bins that determine the order in which they
// should be shown.
//
// layout = {'now-racing': []
//           'ready-to-race': [],
//           'not-yet-scheduled': []
//           'done-racing': [],
//          };
//
// g_rounds_layout records the last layout used, to determine whether the page
// really needs updating.

// Page structure is:
//
// div.double_control_column
//   div.scheduling_control_group      #now-racing-group
// div.control_column_container
//   div.control_column
//     div.control_group.heat_control_group
//       (Controls for racing, including #is-current-racing flipswitch.)
//     div.control_group               #supplemental-control-group
//       div                           #add-new-rounds-button
//       div                           #now-racing-group-buttons
//     div.control_group.timer_control_group
//       #timer_status_icon, other stuff
//     div.control_group.replay_control_group
//       #replay_status_icon, replay controls
//   div.control_column
//     div.master_schedule_group       #master-schedule-group
//     div.scheduling_control_group    #ready-to-race-group
//     div.scheduling_control_group    #not-yet-scheduled-group
//     div.scheduling_control_group    #done-racing-group

// g_current_heat_racers remembers who the racers in the current heat
// are, so the modal for manual heat results can be populated when
// displayed.
g_current_heat_racers = new Array();

// To avoid rewriting (as opposed to updating) round controls constantly,
// keep this signature that gives the roundids in each category, in order.
// We only need to rewrite the round controls when this signature changes.
g_rounds_layout = {'now-racing': ["force a first run"],
                   'ready-to-race': [],
                   'not-yet-scheduled': [],
                   'done-racing': [],
                  };

// Processing a response from coordinator_poll can force the isracing
// flipswitch to change state.  We don't want that change to trigger
// an ajax request to update the database: if we get a little bit out
// of sync with the database, it'll put us into a feedback cycle that
// never ends.
//
// Use this boolean to mark changes induced programmatically, as
// opposed to user input.
g_updating_current_round = false;

// If any of the "new round" modals is open, we don't want to be
// rewriting all the controls.  This boolean tells whether we have the
// modal open.
g_new_round_modal_open = false;

// Each time a polling result arrives, we update this array describing the
// rounds that have completed.  If the user clicks on the "Add New Round"
// button, this array is used to populate both the choose_new_round_modal and
// the new_round_modal dialogs.
g_completed_rounds = [];

// Controls for current racing group:

function handle_isracing_change(event, scripted) {
    if (!g_updating_current_round) {
        $.ajax(g_action_url,
               {type: 'POST',
                data: {action: 'select-heat',
                       now_racing: $("#is-currently-racing").prop('checked') ? 1 : 0},
                success: function(data) { process_coordinator_poll_response(data); }
               });
    }
}
$(function() { $("#is-currently-racing").on("change", handle_isracing_change); });

function handle_skip_heat_button() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'select-heat',
                   heat: 'next'},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_previous_heat_button() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'select-heat',
                   heat: 'prev'},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

// Controls for Replay
function handle_test_replay() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'replay.test'}
           });
}

function show_manual_results_modal() {
    // g_current_heat_racers: lane, name, carnumber, finishtime
    var racer_table = $("#manual_results_modal table");
    racer_table.empty();
    racer_table.append("<tr><th>Lane</th><th>Racer</th><th>Car</th><th>Time</th></tr>");
    var any_results = false;
    for (var i = 0; i < g_current_heat_racers.length; ++i) {
        var racer = g_current_heat_racers[i];
        racer_table.append("<tr><td>" + racer.lane + "</td>"
                           + "<td>" + racer.name + "</td>"
                           + "<td>" + racer.carnumber + "</td>"
                           + "<td><input type='text' size='8'"
                               + " name='lane" + racer.lane + "'" 
                               + " value='" + racer.finishtime + "'/>"
                           + "</td>"
                           + "</tr>");
        if (racer.finishtime) {
            any_results = true;
        }
    }

    if (any_results) {
        $("#discard-results").removeClass("hidden");
    } else {
        $("#discard-results").addClass("hidden");
    }

    show_modal("#manual_results_modal", function(event) {
        handle_manual_results_submit();
        return false;
    });
}

function handle_manual_results_submit( ) {
    close_modal("#manual_results_modal");
    $.ajax(g_action_url,
           {type: 'POST',
            data: $("#manual_results_modal form").serialize(),
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_discard_results_button() {
    close_modal("#manual_results_modal");
    $.ajax(g_action_url,
           {type: 'POST',
            // TODO: There's a risk that the coordinator form gets
            // grossly out of sync with the database, such that the
            // identification of 'current' heat is different from what
            // the user chose.  If current-heat changes while
            // manual-results dialog is open, maybe close the dialog
            // and start over?
            data: {action: 'result.delete',
                   roundid: 'current',
                   heat: 'current'},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

// Controls for racing rounds

function show_schedule_modal(roundid) {
  show_modal("#schedule_modal", function(event) {
    handle_schedule_submit(roundid,
                           $("#schedule_num_rounds").val(),
                           $("input[clicked='true']",
                             $(event.target)).attr("data-race") == 'true');
    return false;
  });
}

// There are two different submit buttons for the schedule_modal, depending on
// whether we want to start racing immediately or not.  mark_clicked() runs as an
// onclick handler so we can distinguish between the two submit buttons.
function mark_clicked(submit_js) {
  $("input[type=submit]", submit_js.parents("form")).removeAttr("clicked");
  submit_js.attr("clicked", "true");
  return true;  // Control now passes to show_schedule_modal's callback,
                // and then handle_schedule_submit
}

function handle_schedule_submit(roundid, rounds, then_race) {
    close_modal("#schedule_modal");
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'schedule.generate',
                   roundid: roundid,
                   nrounds: rounds},
            success: function(data) {
              process_coordinator_poll_response(data);
              if (then_race && data.getElementsByTagName('success').length > 0) {
                handle_race_button(roundid);
              }
            }
           });
}

function handle_reschedule_button(roundid) {
    // TODO: On success... 
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'schedule.reschedule',
                   roundid: roundid}});
}

function handle_race_button(roundid) {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'select-heat',
                   roundid: roundid,
                   heat: 1,
                   now_racing: 1},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_unschedule_button(roundid, classname, round) {
    $("#unschedule_round").text(round);
    $("#unschedule_class").text(classname);
    show_modal("#unschedule_modal", function(event) {
        close_modal("#unschedule_modal");
        $.ajax(g_action_url,
               {type: 'POST',
                data: {action: 'schedule.unschedule',
                       roundid: roundid},
                success: function(data) { process_coordinator_poll_response(data); }
               });
        return false;
    });
}

function handle_delete_round_button(roundid, classname, round) {
    $("#delete_round_round").text(round);
    $("#delete_round_class").text(classname);
    show_modal("#delete_round_modal", function(event) {
        close_modal("#delete_round_modal");
        $.ajax(g_action_url,
               {type: 'POST',
                data: {action: 'roster.delete',
                       roundid: roundid},
                success: function(data) { process_coordinator_poll_response(data); }
               });
        return false;
    });
}

function handle_make_changes_button(roundid) {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'select-heat',
                   roundid: roundid,
                   heat: 1,
                   now_racing: 0},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function show_choose_new_round_modal() {
    populate_new_round_modals();

    // There's no submit, or even a form, in this modal; just a bunch
    // of buttons with their own actions
    show_modal("#choose_new_round_modal", function(event) {
        return false;
    });
}

function handle_new_round_chosen(roundid) {
    close_modal_leave_background("#choose_new_round_modal");
    show_new_round_modal(roundid);
}

function show_new_round_modal(roundid) {
    $(".multi_den_only").addClass("hidden");
    $(".single_den_only").removeClass("hidden");
    $("#new_round_modal").removeClass("wide_modal");
    $("#new_round_modal #new_round_roundid").val(roundid);
    show_modal("#new_round_modal", function(event) {
        handle_new_round_submit();
        return false;
    });
}

function handle_new_round_submit(roundid) {
    close_modal("#new_round_modal");
    $.ajax(g_action_url,
           {type: 'POST',
            data: $("#new_round_modal form").serialize(),
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_grand_final_chosen() {
    close_modal_leave_background("#choose_new_round_modal");
    show_grand_final_modal();
}

function show_grand_final_modal() {
    $(".multi_den_only").removeClass("hidden");
    $(".single_den_only").addClass("hidden");
    $("#new_round_modal").addClass("wide_modal");
    // Have to suspend updates to this dialog while it's open
    g_new_round_modal_open = true;
    show_modal("#new_round_modal", function(event) {
        handle_grand_final_submit();
        return false;
    });
}

function handle_grand_final_submit() {
    g_new_round_modal_open = false;
    close_modal("#new_round_modal");

    console.log($("#new_round_modal form").serialize());

    $.ajax(g_action_url,
           {type: 'POST',
            data: $("#new_round_modal form").serialize(),
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function show_replay_settings_modal() {
    show_modal("#replay_settings_modal", function(event) {
        handle_replay_settings_submit();
        return false;
    });
}

function handle_replay_settings_submit() {
    close_modal("#replay_settings_modal");
    $.ajax(g_action_url,
           {type: 'POST',
            data: $("#replay_settings_modal form").serialize(),
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_master_next_up() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'select-heat',
                   heat: 'next-up',
                   now_racing: 0},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

// Parsing for poll.coordinator output

/* <current-heat now-racing= use-master-sched= classid= roundid= round=
                 group= heat= /> */
function parse_current_heat(data) {
    var current_xml = data.getElementsByTagName("current-heat")[0];
    if (!current_xml) {
        return false;
    }
    // NOTE: heats_scheduled gets written in process_coordinator_poll_response
    return {roundid: current_xml.getAttribute('roundid'),
            heat: current_xml.getAttribute('heat'),
            is_racing: current_xml.getAttribute('now-racing') == '1',
            master_schedule: current_xml.getAttribute('use-master-sched') == '1'};
}

function parse_rounds(data) {
    var rounds_xml = data.getElementsByTagName("round");
    var rounds = new Array(rounds_xml.length);
    for (var i = 0; i < rounds_xml.length; ++i) {
        var round_xml = rounds_xml[i];
        rounds[i] = {roundid: 1*round_xml.getAttribute('roundid'),
                     classid: 1*round_xml.getAttribute('classid'),
                     classname: round_xml.getAttribute('class'),
                     round: 1*round_xml.getAttribute('round'),
                     roster_size: 1*round_xml.getAttribute('roster_size'),
                     racers_passed: 1*round_xml.getAttribute('passed'),
                     racers_unscheduled: 1*round_xml.getAttribute('unscheduled'),
                     racers_scheduled: round_xml.getAttribute('passed') - round_xml.getAttribute('unscheduled'),
                     heats_scheduled: 1*round_xml.getAttribute('heats_scheduled'),
                     heats_run: 1*round_xml.getAttribute('heats_run'),
                     category: 'unassigned'};
        rounds[i].category = 
          // May get changed to now-racing for the current round
          rounds[i].heats_scheduled > rounds[i].heats_run ? 'ready-to-race' :
          rounds[i].heats_run > 0 ? 'done-racing' : 'not-yet-scheduled';
    }
    return rounds;
}

function parse_timer_state(data) {
    var tstate_xml = data.getElementsByTagName("timer-state")[0];
    if (tstate_xml) {
        return {status: tstate_xml.textContent,
                icon: tstate_xml.getAttribute('icon'),
                lanes: tstate_xml.getAttribute('lanes')};
    }
}

function parse_replay_state(data) {
    var replay_state_xml = data.getElementsByTagName("replay-state")[0];
    return {status: replay_state_xml.textContent,
            icon: replay_state_xml.getAttribute('icon'),
            connected: replay_state_xml.getAttribute('connected')};
}

function parse_racers(data) {
    var racers_xml = data.getElementsByTagName("racer");
    var racers = new Array(racers_xml.length);
    for (var i = 0; i < racers_xml.length; ++i) {
        racers[i] = {lane: racers_xml[i].getAttribute("lane"),
                     name: racers_xml[i].getAttribute("name"),
                     carnumber: racers_xml[i].getAttribute("carnumber"),
                     finishtime: racers_xml[i].getAttribute("finishtime")};
    }
    return racers;
}

// Generate page contents in response to poll.coordinator output

function update_for_current_round(current) {
    var isracing_checkbox = $("#is-currently-racing");
    if (isracing_checkbox.prop('checked') != current.is_racing) {
        isracing_checkbox.prop('checked', current.is_racing);
        g_updating_current_round = true;
        try {
            isracing_checkbox.trigger("change", true);
        } finally {
            g_updating_current_round = false;
        }
    }
}

function generate_timer_state_group(tstate) {
    $("#timer_status_text").text(tstate.status);
    $("#timer_status_icon").attr('src', tstate.icon);
    if (tstate.lanes != '' && tstate.lanes > 0) {
        $("#lane_count").text(tstate.lanes);
    }
}

function generate_replay_state_group(replay_state) {
    $("#replay_status").text(replay_state.status);
    $("#replay_status_icon").attr('src', replay_state.icon);
    if (replay_state.connected) {
        $("#test_replay").removeClass("hidden");
    } else {
        $("#test_replay").addClass("hidden");
    }
}

// Appends (unpopulated) progress bar structures to the control group.
function emit_progress_bars(control_group) {
    control_group.append("<div class='racers progress'>"
                         + "<div class='bar2'>"
                         + "<div class='bar1'></div>"
                         + "</div>"
                         + "</div>");
    control_group.append("<div class='heats progress'>"
                         + "<div class='bar1'></div>"
                         + "</div>");
}

// Updates progress bars with new progress values
function inject_progress_bars(control_group, round) {
    if (round.roster_size > 0) {
        // bar2 (yellow) = passed
        // bar1 (blue) = scheduled
        // Trouble here will be scheduled-but-no-longer-passed, i.e., scheduled > passed
        var passed = Math.max(round.racers_passed, round.racers_scheduled);
        control_group.find(".racers .bar2").width((100 * passed / round.roster_size) + '%');
        if (passed > 0) {
            control_group.find(".racers .bar1").width((100 * round.racers_scheduled / passed) + '%');
        }
    }

    if (round.heats_scheduled > 0) {
        control_group.find(".heats .bar1").width((100 * round.heats_run / round.heats_scheduled) + '%');
    }
}

// Appends unpopulatd progress text structures to the control group.
//
// collapsible is a string containing space-separated css class names, possibly empty.
function emit_progress_text(control_group, collapsible) {
    control_group.append('<div class="' + collapsible + '">'
               + '<p><span data-name="roster_size"></span> racer(s), '
               + '<span data-name="n_passed"></span> passed, ' 
               + '<span data-name="scheduled"></span> in schedule.<br/>'
               + '<span data-name="n_heats_scheduled"></span> heats scheduled, '
               + '<span data-name="n_heats_run"></span> run.</p>'
               + '</div>');
}

// Injects new progress values into the progress text
function inject_progress_text(control_group, round) {
    control_group.find("[data-name=roster_size]").text(round.roster_size);
    control_group.find("[data-name=n_passed]").text(round.racers_passed);
    control_group.find("[data-name=scheduled]").text(round.racers_scheduled);
    control_group.find("[data-name=n_heats_scheduled]").text(round.heats_scheduled);
    control_group.find("[data-name=n_heats_run]").text(round.heats_run);
}

// Constructs a control group div for this round:
//   div.heat-lineup, only for the current heat
//   div.roundno
//   h3
//   (progress text), collapsible
//   (progress bars)
//   div.collapsible[data-name='buttons']
//
// round = { roundid:
//           classname:
//           round: (number)
//           roster_size, racers_passed, racers_scheduled, heats_scheduled, heats_run
//           category: ("master-schedule", "ready-to-race", "not-yet-scheduled", "done-racing")
//         }
// current = { roundid: }
// timer_state = { lanes: }
//
function generate_scheduling_control_group(round, current, timer_state) {
  var control_group = $("<div data-roundid=\"" + round.roundid + "\" class=\"control_group scheduling_control\"/>");
  var collapsible = " collapsible";
  if (round.roundid == current.roundid) {
    control_group.addClass('current');
    collapsible = "";
    control_group.append("<div class='heat-lineup'></div>");
  }

  control_group.append('<div class="roundno">' + round.round + '</div>');
  control_group.append('<h3>' + (round.roundid == current.roundid ? '' :
                                 '<img data-name="triangle" src="img/triangle_east.png"/>')
                       + round.classname + '</h3>');

  emit_progress_text(control_group, collapsible);
  emit_progress_bars(control_group);

  // Which buttons appear depends on a bunch of the parameters.
  // It should be OK for inject to just rewrite the buttons every time.
  var buttons = $("<div data-name=\"buttons\" class=\"block_buttons" + collapsible + "\"/>");
  buttons.appendTo(control_group);

  // By this rule, changes to n_heats_run and n_heats_scheduled and
  // current.roundid would change the order for the rounds.
  control_group.appendTo("#" + round.category + "-group");

  if (round.roundid != current.roundid) {
    control_group.find(".collapsible").hide();
    control_group.on('click', function() {
      var closed = control_group.find(".collapsible").css("display") == "none";
      // Don't want the current round to collapse like this...

      $("img[data-name=triangle]").attr('src', 'img/triangle_east.png');
      $(".collapsible").slideUp(200);

      if (closed) {
        control_group.find("img[data-name=triangle]").attr('src', 'img/triangle_south.png');
        control_group.find(".collapsible").slideDown(200); 
      }
    });
  }

  inject_into_scheduling_control_group(round, current, timer_state);
}

// Injects new values into an existing scheduling control group.  The
// available control buttons get rewritten entirely.
function inject_into_scheduling_control_group(round, current, timer_state) {
  var control_group = $("[data-roundid=" + round.roundid + "]");

  inject_progress_text(control_group, round);
  inject_progress_bars(control_group, round);

  var buttons = control_group.find("[data-name=buttons]");
  if (round.roundid == current.roundid && round.roundid > 0) {
    buttons = $("#now-racing-group-buttons");
  }
  buttons.empty();

  if (round.roundid == -1) {
    buttons.append('<input type="button" data-enhanced="true"'
                   + ' onclick="handle_master_next_up()" value="Next Up"/>');
  } else {
    if (round.heats_scheduled > 0 && round.heats_run == 0) {
      buttons.append('<input type="button" data-enhanced="true"'
                     + ' onclick="handle_unschedule_button(' + round.roundid
                     + ', \'' + round.classname.replace(/"/g, '&quot;').replace(/'/, "\\'") + '\', '
                     + round.round + ')"'
                     + ' value="Unschedule"/>');
    } else if (round.racers_unscheduled > 0) {
      if (round.heats_run == 0) {
        if (timer_state.lanes != '' && timer_state.lanes > 0) {
          buttons.append('<input type="button" data-enhanced="true"'
                         + ' onclick="show_schedule_modal(' + round.roundid + ')"'
                         + ' value="Schedule"/>');
        } else {
          buttons.append("<p>Can't schedule heats, because the number of lanes hasn\'t" +
                         " been determined.<br/>" +
                         "Enter the number of lanes on the <a href='settings.php'>Settings</a> page.</p>");
        }
      } else if (false /* TODO: Reschedule is not ready for prime time */) {
        buttons.append('<input type="button" data-enhanced="true"' 
                       + ' onclick="handle_reschedule_button(' + round.roundid + ')"'
                       + ' value="Reschedule"/>');
      }
    }

    if (round.heats_scheduled == 0 && round.heats_run == 0 &&
        (round.round > 1 || round.classname == "Grand Finals")) {
      buttons.append('<input type="button" data-enhanced="true"'
                     + ' onclick="handle_delete_round_button(' + round.roundid
                     + ', \'' + round.classname.replace(/"/g, '&quot;').replace(/'/, "\\'") + '\', '
                     + round.round + ')"'
                     + ' value="Delete Round"/>');
    }

    if (round.roundid != current.roundid) {
      // TODO: Don't offer 'race' choice for single roundid under master scheduling
      if (round.heats_run > 0) {
        buttons.append('<input type="button" data-enhanced="true"'
                       + ' onclick="handle_make_changes_button(' + round.roundid + ')"'
                       + ' value="Make Changes"/>');
      } else if (round.heats_scheduled > 0 && round.heats_run < round.heats_scheduled) {
        buttons.append('<input type="button" data-enhanced="true"'
                       + ' onclick="handle_race_button(' + round.roundid + ')"'
                       + ' value="Race"/>');
      }
    }

    // TODO: AND there isn't already a next round or grand finals with
    // finishtimes...
    // TODO: Un-generate a round?  GPRM allows deleting rounds, but
    // apparently not the first round.
    if (false && round.heats_scheduled > 0 && round.heats_run == round.heats_scheduled) {
      buttons.append('<input type="button" data-enhanced="true"'
                     + ' onclick="show_new_round_modal(' + round.roundid + ')"'
                     + ' value="New Round"/>');
    }
  }
}

function generate_current_heat_racers(racers, current) {
    g_current_heat_racers = racers;
    // TODO: Assumes now-racing-group empty?
    if (racers.length > 0) {
        $("#now-racing-group .heat-lineup").prepend("<table>"
                                       + "<tr>" 
                                       + "<th>Lane</th>"
                                       + "<th>Racer</th>"
                                       + "<th>Car</th>"
                                       + "<th>Time</th>" 
                                       + "</tr>"
                                       + "</table>"
                                       + "<h3>Heat " + current.heat + " of "
                                           + current.heats_scheduled + "</h3>"
                                       + "</div>");
        var racers_table = $("#now-racing-group table");
        for (var i = 0; i < racers.length; ++i) {
            racers_table.append('<tr><td>' + racers[i].lane + '</td>'
                                + '<td>' + racers[i].name + '</td>'
                                + '<td>' + racers[i].carnumber + '</td>'
                                + '<td>' + racers[i].finishtime + '</td>'
                                + '</tr>');
        }
    }
}

// For master scheduling, make a synthetic round data structure by calculating
// totals across all the rounds records for the highest round number.  (I.e., if
// there are round 2 rounds, only total them and exclude the round 1 rounds.)
function calculate_totals(rounds) {
  var max_round = -1;
  for (var i = 0; i < rounds.length; ++i) {
    max_round = Math.max(max_round, rounds[i].round);
  }
  
  var total_roster_size = 0;
  var total_racers_passed = 0;
  var total_racers_scheduled = 0;
  var total_heats_scheduled = 0;
  var total_heats_run = 0;
  for (var i = 0; i < rounds.length; ++i) {
    var round = rounds[i];
    if (round.round == max_round) {
      total_roster_size += round.roster_size;
      total_racers_passed += round.racers_passed;
      total_racers_scheduled += round.racers_scheduled;
      total_heats_scheduled += round.heats_scheduled;
      total_heats_run += round.heats_run;
    }
  }
  return {round: max_round,
          roster_size: total_roster_size,
          racers_passed: total_racers_passed,
          racers_scheduled: total_racers_scheduled,
          heats_scheduled: total_heats_scheduled,
          heats_run: total_heats_run};
}

function populate_new_round_modals() {
    var completed_rounds = g_completed_rounds.slice(0);  // Copy the array

    var add_grand_finals = completed_rounds.length > 1;
    var modal = $("#choose_new_round_modal");
    modal.empty();
    var multi_flipswitches = $("#multi_flipswitches");
    multi_flipswitches.empty();
    while (completed_rounds.length > 0) {
        var roundno = completed_rounds[0].round;
        modal.append('<h3>Add Round ' + (roundno + 1) + '</h3>');
        var i = 0;
        while (i < completed_rounds.length) {
            if (completed_rounds[i].round == roundno) {
                var round = completed_rounds[i];
                var button = $('<input type="button" data-enhanced="true"/>');
                button.prop('value', round.classname);
                // Although syntactically it looks like a new round variable is created
                // each time through the loop, it's actually just one variable that's
                // reused/assigned each time.  Capturing that reused variable in the on-click
                // function won't work, so, we need to record the current roundid on
                // the button itself.
                button.prop('data-roundid', round.roundid);
                button.on('click', function(event) {
                  handle_new_round_chosen($(this).prop('data-roundid'));
                });
                modal.append(button);

                var flipswitch_div = $('<div class="flipswitch-div"></div>');
                var label = $('<label for="roundid_' + round.roundid + '"' 
                              + ' class="grand-final-label"'
                              + '></label>');
                label.text(round.classname);
                flipswitch_div.append(label);
                // Writing just the checkbox and then triggering the "create"
                // event seems to work the first time, but subsequent
                // appearances of the modal don't show the jquery-mobile
                // embellishments.
                flipswitch_div.append('<div class="ui-flipswitch ui-shadow-inset' 
                                          + ' ui-bar-inherit ui-flipswitch-active ui-corner-all' 
                                          + ' grand-final-flipswitch">'
                                          + '<a href="#" class="ui-flipswitch-on ui-btn' 
                                          + ' ui-shadow ui-btn-inherit">On</a>'
                                          + '<span class="ui-flipswitch-off">Off</span>'
                                          + '<input type="checkbox"'
                                          + ' data-role="flipswitch"'
                                          + ' id="roundid_' + round.roundid + '"' 
                                          + ' name="roundid_' + round.roundid + '"' 
                                          + ' data-enhanced="true"'
                                          + ' class="ui-flipswitch-input"'
                                          + ' checked="checked"/>'
                                      + '</div>');
                multi_flipswitches.append(flipswitch_div);
                completed_rounds.splice(i, 1);
            } else {
                ++i;
            }
        }
    }
    if (add_grand_finals) {
        modal.append('<h3>Grand Finals</h3>');
        var button = $('<input type="button" data-enhanced="true" value="Grand Finals"/>');
        button.on('click', function(event) { handle_grand_final_chosen(); });
        modal.append(button);
        // Even though we're doing the embellishment explicitly, the create
        // trigger is still needed to make the flipswitches actually do
        // anything.
        multi_flipswitches.trigger("create");
    }
    modal.append('<h3>&nbsp;</h3>');
    modal.append('<input type="button" data-enhanced="true" value="Cancel"'
                 + ' onclick=\'close_modal("#choose_new_round_modal");\'/>');
}

function offer_new_rounds(rounds) {
  if (g_new_round_modal_open) {
    console.log("Skipping offer_new_rounds because g_new_round_modal_open is set");
    return;
  }

  // What we really want to look at is the highest round for each
  // class, and then decide whether that round was completed or not.

  var highest_rounds = {};  // { classid => highest_round }
  for (var i = 0; i < rounds.length; ++i) {
    var round = rounds[i];
    var classid = round.classid;
    if (highest_rounds[classid] ? highest_rounds[classid].round < round.round : true) {
      highest_rounds[classid] = round;
    }
  }

  var completed_rounds = [];
  for (var classid in highest_rounds) {
    var round = highest_rounds[classid];
    if (round.heats_scheduled > 0 && round.heats_scheduled == round.heats_run) {
      completed_rounds.push(round);
    }
  }

  g_completed_rounds = completed_rounds;

  // Show or hide the block with the "Add New Rounds" button
  $("#add-new-rounds-button").toggleClass("hidden", completed_rounds.length == 0);
}

function process_coordinator_poll_response(data) {
  var timer_state = parse_timer_state(data);
  var current = parse_current_heat(data);
  if (!current) {
    console.log("Returning early because no current heat");
    return;
  }
  $("#now-racing-group-buttons").empty();
  update_for_current_round(current);

  var rounds = parse_rounds(data);

  offer_new_rounds(rounds);

  if (current.master_schedule && $("#master-schedule-group .control_group").length == 0) {
    $("#master-schedule-group").empty();
    var totals = calculate_totals(rounds);
    totals.roundid = -1;
    totals.classname = "Interleaved Schedule";
    totals.category = "master-schedule";

    generate_scheduling_control_group(totals, current, timer_state);
  } else if (!current.master_schedule) {
    $("#master-schedule-group").empty();
  }

  var layout = {'now-racing': [],
                'ready-to-race': [],
                'not-yet-scheduled': [],
                'done-racing': [],
               };
  $.each(rounds, function (index, round) {
    if (round.roundid == current.roundid) {
      current.heats_scheduled = round.heats_scheduled;
      round.category = 'now-racing';
    }
    layout[round.category].push(round.roundid);
  });

  // matched will be true if the number and order of rounds hasn't
  // changed from what's displayed.
  var matched = true;
  for (var key in layout) {
    if (layout[key].toString() != g_rounds_layout[key].toString()) {
      matched = false;
    }
  }

  if (matched) {
    // TODO Want to remove everything except data-name="buttons"
    $("#now-racing-group .heat-lineup *").remove();
    $.each(rounds, function (index, round) {
      inject_into_scheduling_control_group(round, current, timer_state);
    });
  } else {
    g_rounds_layout = layout;
    $(".scheduling_control_group").empty();
    $.each(rounds, function (index, round) {
      generate_scheduling_control_group(round, current, timer_state);
    });
  }

  generate_timer_state_group(timer_state);

  generate_replay_state_group(parse_replay_state(data));

  generate_current_heat_racers(parse_racers(data), current);

  // Hide the control group if there's nothing to show
  $("#supplemental-control-group").toggleClass("hidden",
                                               $("#add-new-rounds-button").hasClass("hidden") &&
                                               $("#now-racing-group-buttons").is(":empty"));
}

function coordinator_poll() {
  if (typeof(phantom_testing) == 'undefined' || !phantom_testing) {
    $.ajax(g_action_url,
           {type: 'GET',
            data: {query: 'poll.coordinator'},
            success: function(data) {
              if (typeof(phantom_testing) == 'undefined' || !phantom_testing) {
                process_coordinator_poll_response(data);
              }
            },
           });
  } else {
    console.log("NOT polling");
  }
}


$(function() {
  setInterval(coordinator_poll, 2000);
  coordinator_poll();
});
