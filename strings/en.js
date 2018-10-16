/* MAFIA STRINGS FILE - ENGLISH */

var Strings = {};

function c(col, txt) {
    return '<span class="color-small" style="color:#'+col+ '">'+txt+'</span>';
}
/* SETUP */
Strings.too_many_roles = c("DD0000","Too many roles!");
Strings.not_enough_roles = c("DD0000","Not enough roles!");
Strings.you_are = "You are {0}. Your role is {1}.";

Strings.starting = "Starting game...";

/* DAY */
Strings.day = c("FFCC00","DAY {0}");
    // GRAVEYARD
Strings.player_found_dead = "{0} was found dead this morning.";
Strings.killed_again = " Afterwards, he was apparently attacked again...";
Strings.killed_again_suicide = " Afterwards, he apparently killed himself.";
Strings.last_will = "{0}'s Last Will reads: ";
Strings.no_last_will = "{0} doesn't seem to have a last will.";
    // DEATH CAUSES
Strings.cause_mafia = "He was riddled with bullets at close range.";
Strings.cause_suicide = "He apparently killed himself.";

Strings.vote_allowed = "Today's public vote and trial will begin now.";
Strings.lynch_start = "{0} has been voted to trial.";
Strings.lynch_defense = "{0}, you are on trial for conspiracy against the town. What is your defense?";
Strings.lynch_vote = "The town may now vote on the fate of {0}.";
Strings.lynch_approved = "The town has decided to lynch {0}.";
Strings.lynch_denied = "The town has decided to pardon {0}.";
Strings.role_reveal = "{0}'s role was {1}.";
Strings.vote_cancelled = "{0} has cancelled their vote.";
Strings.vote_changed = "{0} has changed their vote.";
Strings.vote_voted = "{0} has voted.";
Strings.day_end = "The day has ended.";
Strings.day_end_lynch = "Unfortunately, it's too late to continue.";

/* NIGHT */
Strings.night = "NIGHT {0}";
Strings.visit_self = "You decide you are going to visit yourself.";
Strings.visit_target = "You decide you are going to visit {0}.";
Strings.vigi_wait_one = c("FF0000","You can't find your gun! You need a day to search your home.");
Strings.mafia_suggest = "{0} suggests to kill {1}.";
Strings.crier_chat = c("66CC33","Crier:") + "{0}";

    // NIGHT SEQUENCE
Strings.night_immune = c("FFFF00","Your target survived your attack! Tonight, he has immunity to conventional attacks.");
Strings.mafia_kill = "You hear shots ring through the streets...";
Strings.mafia_killed = "You were hit by the Mafia.";
Strings.triad_killed = "You were hit by the Triad.";
Strings.vigi_kill = "You hear a tight grouping of shots echoing through the town...";
Strings.vigi_killed = "You were taken out by a Vigilante.";
Strings.afk_kill = "You hear a single shot ring out in the night...";
Strings.afk_killed = "You have committed suicide. Don't be AFK during a game!";
Strings.doctor_attacked = "Your target was attacked tonight!";
Strings.doctor_saved = "You were attacked and left for dead, but a stranger nursed you back to health!";
    // POST NIGHT SEQUENCE
Strings.sheriff_not_suspicious = "Your target is not suspicious.";
Strings.sheriff_mafia = "Your target is a member of the Mafia!";
Strings.sheriff_triad = "Your target is a member of the Triad!";
Strings.detective_no_visit = "Your target did not do anything tonight.";
Strings.detective_visit = "Your target visited {0} tonight.";
Strings.lookout_not_visited = "Your target was not visited by anyone tonight.";
Strings.lookout_visited = "{0} visited your target tonight.";

/* MISCELLANEOUS */
Strings.player_quit = "{0} has quit on life.";
Strings.win_condition_reached = "The game has reached a conclusion...";

module.exports = Strings;