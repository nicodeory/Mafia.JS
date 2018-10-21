"use strict";
// @ts-check
/*jshint esversion: 6 */

require('console.table');
var Roles = require('./roles.js');
var Strings = require('./strings/en.js');

class GameSetup {
    constructor() {
        this.setupList = [];
        this.playerRolePool = [];
    }
    static GenerateBasicSetup(players) {
        var setup = new GameSetup();
        var maf_ratio = 0.2;
        var mafPlayers = Math.floor(players*maf_ratio);
        for (let i = 0; i < mafPlayers-1; i++) {
            setup.setupList.push(new Roles.Mafioso());
        }
        setup.setupList.push(new Roles.Sheriff());
        setup.setupList.push(new Roles.Sheriff());
        setup.setupList.push(new Roles.Sheriff());
        setup.setupList.push(new Roles.Sheriff());
        setup.setupList.push(new Roles.Doctor());
        setup.setupList.push(new Roles.Doctor());
        setup.setupList.push(new Roles.Doctor());
        setup.setupList.push(new Roles.Doctor());
        setup.setupList.push(new Roles.Godfather());
        for(let i = 0; i < players-mafPlayers-8; i++) {
            setup.setupList.push(new Roles.Citizen());
        }
        return setup;
    }

    /** Adds a role to the setup. Takes a string. */
    AddRole(role) {
        var roleStr = role.charAt(0).toUpperCase() + role.substr(1);
        var roleInstance;
        var RoleClass = Roles.RoleFactory[roleStr];
        var rlInstance;
        console.log(roleStr);
        console.log(RoleClass);
        if(typeof RoleClass === "function") {
          rlInstance = new RoleClass();
          this.setupList.push(rlInstance);
          console.log(this.setupList);
        }
    }
    RemoveRole(index) {
        this.setupList.splice(index,1);
        console.log(this.setupList);
    }

    PullRoleFromPool() {
        if(this.playerRolePool.length == 0) throw "FATAL ERROR: No roles left to pull.";
        var randIndex = Math.floor(Math.random()*this.playerRolePool.length);
        var role = this.playerRolePool[randIndex];
        this.playerRolePool.splice(randIndex,1);
        return role;
    }

    /** Checks if the setup is valid. */
    CheckValidity(players) {
        if(players < this.setupList.length) return Strings.too_many_roles;
        if(players > this.setupList.length) return Strings.not_enough_roles;
        return true;
    }

    /** Populates the role pool */
    PopulateRolePool() {
        this.setupList.forEach(e => {
            this.playerRolePool.push(e);
        });
    }
}

var RandomNames =  [
    "Valentina Lombardi","Stephano Bruno","Emilio Costello",
    "Giuseppe Giamatti","Luigi DiMarco","Francesca Russo",
    "Silvia Giordano","Pietro Cage","Ercole Greco","Rinaldo Ricci",
    "Giacomo Colombo","Oscar Marino","Tancredo Greco","Leonardo Greco",
    "Luigi Cardinale","Massimo Costello","Allighiero Gallo","Nico Bianchi",
    "Luzio Ricci", "Marco", "Carlo", "Enrico Russo","Romeo Coca", 
    "Armando Coca", "Michelangelo Giorgi","Orfeo", "Giulio Rizzo", "Alessandro", "Lucio the Trustworthy"
];
var PlayerColors = [
    "B4141E","0042FF","1CA7EA",
    "6900A1","EBE129","FE8A0E",
    "168000","CCA6FC","A633BF",
    "525494","168962","753F06",
    "96FF91","464646","E55BB0"
];
/** Returns a colored name tag */
function GetColoredPlayerTag(name,index) { return '<span class="color-small" style="color:#' + PlayerColors[index] + '">' + name + "</span>"; }

class RolePlayer {
    constructor(name, role) {
        this.name = name;
        this.role = role;
        this.alive = true;
        this.deathCause = "";
        this.silenced = false;
        this.jailed = false;
        this.willBeExecuted = false;
        this.afkMarked = false;
        this.nightImmune = false;
        this.roleBlocked = false;
        this.selectedVisit = -1;
        this.visited = -1;
        this.visitedBy = [];
        this.doused = false;
        this.selectedTarget1 = -1;
        this.selectedTarget2 = -1;
        this.LastWill = "";
        this.DeathNote = "";
        this.LeftDeathNote = "";
    }
}

var VoteCategory = Object.freeze({"Lynch":1, "Mafia":2, "Triad":3, "Cult": 4, "Mason": 5});

class VotedPlayer {
    constructor(idx) {
        this.id = idx;
        this.freq = 1;
        this.by = [];
    }
}

class LynchVote {
    constructor(idx, guilt) {
        this.id = idx;
        this.guilty = guilt;
    }
}

class GameState {
    constructor() {
        this.stage = "invalid";
        this.players = [];
        this.dayNumber = 0;
        this.deadPeople = [];
        this.recentlyDeadPeople = [];
        this.Votes_Trial = [];
        this.Votes_Mafia = [];
        this.Votes_Triad = [];
        this.Votes_Cult = [];
        this.Votes_Mason = [];
        this.Votes_Lynch = [];
        this.VoteEnabled = false;
        this.DayDiscussionEnabled = false;
        this.NightDiscussionEnabled = false;
        this.trialPlayer = null;
        this.soonDeadPeople = []; // list of dead people queued for killing - i.e heart attack.
    }
}

class Game {
    constructor() {
        this.state = new GameState();
        this.setup = new GameSetup();
        this.currTimeout = null;
        this.timeLeft = 0;
        this.lastTimeLeft = -2;
        this.nextState = "";
        this.gameStarted = false;
    }

    /** Starts the game with the specified amount of players */
    Start(players) {
        if (!this.gameStarted) {
            var takenNames = [];
            this.setup.PopulateRolePool();
            for (let i = 0; i < players; i++) {
                var randName;
                do { // take a random name, prevent repetition
                    randName = RandomNames[Math.floor(Math.random() * RandomNames.length)];
                } while(takenNames.indexOf(randName) != -1);
                takenNames.push(randName);
                randName = GetColoredPlayerTag(randName, i);
                var ply = new RolePlayer(randName, this.setup.PullRoleFromPool());
                this.state.players.push(ply);
                server.PopupToPlayer(i, Strings.you_are.format(randName, ply.role.name));
                // TODO: Separate this in time
                var roleInfo = this.GetRoleInfo(ply.role);
                server.SendRoleInfo(i, roleInfo);
            }
            server.OnGameStarted();
            
            this.SendPlayerUpdate();
            this.nextState = "day-start";
            this.timeLeft = 5;
            setInterval(() => { this.TickSecond(); }, 1000);
            server.Broadcast(Strings.starting);
            this.gameStarted = true;
        }
    }

    GetRoleInfo(role) {
        var faction;
        if(role instanceof Roles.TownRole) faction = Strings.town;
        if(role instanceof Roles.MafiaRole) faction = Strings.mafia;
        if(role instanceof Roles.TriadRole) faction = Strings.triad;
        if(role.faction == Roles.Faction.Neutral) faction = Strings.none;
        
        var roleInfo = 
        {
            name: role.name,
            faction: faction,
            abilities: role.abilities,
            attributes: role.attributes,
            goal: role.goal
        }
        return roleInfo;
    }

    GetSimplifiedPlayerList() {
        var plyList = [];
        var p;
        for(let i=0; i < 15; i++)
        {
            if(this.state.players[i] === undefined) {
                p = {
                    name: "",
                    alive: false
                }
            } else {
                p = {
                    name:  this.state.players[i].name,
                    alive: this.state.players[i].alive
                };
            }
           
            plyList.push(p);
        }
        return plyList;
    }
    /** Sends a player list to clients (with only name and alive) */
    SendPlayerUpdate() {
        server.UpdatePlayerList(this.GetSimplifiedPlayerList());
    }

    /** Continues game flow (change phase) */
    ContinueGameFlow(toState) {
        this.state.stage = toState;
        switch (toState) {
            case "day-start":
                this.OnNewDay();
                server.HidePopups();
                this.nextState = "day-discussion";
                this.timeLeft = 5;
                server.Broadcast(Strings.day.format(this.state.dayNumber));
                break;
            case "day-discussion":
                this.state.DayDiscussionEnabled = true;
                server.Broadcast("Players are allowed to discuss.");
                if(this.state.dayNumber == 1) this.nextState = "day-end"; else this.nextState = "day-vote";
                this.timeLeft = 12;
                break;
            case "day-vote":
                this.state.VoteEnabled = true;
                this.state.Votes_Trial = [];
                this.state.Votes_Lynch = [];
                if(this.lastTimeLeft == -2) server.Broadcast(Strings.vote_allowed); else server.Broadcast("Discussion is resumed.");
                this.nextState = "day-end";
                this.timeLeft = this.lastTimeLeft == -2 ? 8 : this.lastTimeLeft;
                break;
            case "day-trial-defense":
                this.state.VoteEnabled = false;
                this.state.DayDiscussionEnabled = false;
                server.Broadcast(Strings.lynch_defense.format(this.state.trialPlayer.name));
                this.timeLeft = 8;
                this.nextState = "day-trial-vote";
                break;
            case "day-trial-vote":
                this.state.Votes_Trial = [];
                this.state.VoteEnabled = true;
                this.state.DayDiscussionEnabled = true;
                server.Broadcast(Strings.lynch_vote.format(this.state.trialPlayer.name));
                this.timeLeft = 10;
                this.nextState = "day-trial-endvote";
                break;
            case "day-trial-endvote":
                this.state.VoteEnabled = false;
                var guilty = this.GetLynchVoteResult();
                if(guilty) {
                    server.Broadcast(Strings.lynch_approved.format(this.state.trialPlayer.name)); // TODO: time for last words
                    //this.nextState = "day-trial-execution";
                    this.state.trialPlayer.alive = false;
                    this.state.trialPlayer.deathCause = "lynch";
                    server.Broadcast(Strings.role_reveal.format(this.state.trialPlayer.name,this.state.trialPlayer.role.name));
                    server.Broadcast(this.state.trialPlayer.name + (this.state.trialPlayer.LastWill == "" ? 
                    " doesn't seem to have a last will." : 
                    "'s Last Will reads: " + this.state.trialPlayer.LastWill));
                    this.SendPlayerUpdate();
                    this.CheckForWinCondition(true);
                    console.log(JSON.stringify(this.state.players)); // TODO: Dead people can still be voted up. WHY
                    this.nextState = "day-end";
                } else {
                    server.Broadcast(Strings.lynch_denied.format(this.state.trialPlayer.name));
                    if(this.lastTimeLeft < 1) {
                        server.Broadcast(Strings.day_end_lynch);
                        this.nextState = "day-end";
                    } else {
                        this.nextState = "day-vote";
                    }
                }
                this.timeLeft = 4;
                break;
            case "day-end":
                this.state.VoteEnabled = false;
                this.state.DayDiscussionEnabled = false;
                server.Broadcast(Strings.day_end);
                this.timeLeft = 2;
                this.nextState = "night-start";
                break;
            case "night-start":
                this.OnNewNight();
                server.Broadcast('<c-s val="00CCFF">NIGHT ' + this.state.dayNumber + "</c-s>"); // TODO: Jailor detain
                this.nextState = "night-discussion";
                this.timeLeft = 3;
                break;
            case "night-discussion":
                this.state.NightDiscussionEnabled = true;
                server.Broadcast("Mafia, Triad, Jailor and Neutral factions may start discussing.");
                this.nextState = "night-sequence";
                this.timeLeft = 15;
                break;
            case "night-sequence":
                this.state.NightDiscussionEnabled = false;
                this.NightSequence();
                break;
            default:
                throw "FATAL ERROR: INVALID STATE";
        }
    }
    /** Substracts one second from the time left. If timer reaches -1, game transitions to the next state. */
    TickSecond() {
        this.timeLeft--;
        //console.log(this.timeLeft);
        if(this.timeLeft < 0) {
            this.ContinueGameFlow(this.nextState);
        }
    }

    /** Called when a player quits the game. */
    OnPlayerQuit(pIndex) {
        this.state.soonDeadPeople.push(pIndex);
        server.Broadcast(this.state.players[pIndex].name + " has quit on life.");
        this.state.players[pIndex].name = "(" + this.state.players[pIndex].name + ")";
    }

    /** Checks whether there is a player who already has majority to trial. */
    CheckForTrialMajority(trialVoteArr) {
        this.state.Votes_Trial = trialVoteArr; // replacing with current votes
        var voteMaj = this.GetVoteMajority(this.state.Votes_Trial);
        if(voteMaj != -1) {
            server.Broadcast(this.state.players[voteMaj].name + " has been voted to trial.");
            this.state.trialPlayer = this.state.players[voteMaj];
            this.state.Votes_Lynch = [];
            this.lastTimeLeft = this.timeLeft;
            this.timeLeft = 3;
            this.nextState = "day-trial-defense";
        }
    }

    /** Returns the voted player by majority, -1 if there is no majority left. */
    GetVoteMajority(votedPlayers) { // check for parity in sc2
        console.log(votedPlayers); // TODO: DOESNT WORK
        //return votedPlayers[0].id; // TODO: disable for production!!
        var majority = Math.ceil(this.GetAlivePlayers().length / 2);
        var majorityPlayer = votedPlayers.find(function(x) { return x.freq >= majority;});
        if(majorityPlayer === undefined) return -1; else return majorityPlayer.id;
    }

    /** Returns the number of players currently alive. */
    GetAlivePlayers() {
        return this.state.players.filter((p) => p.alive);
    }

    /** Tries to select the specified player to visit during the night. */
    TrySelectTarget(origin, i) {
        //console.log(this.state.players); // TODO: Crashes sometimes
        
        if(!this.PlayerCanVisit(origin, i)) return false;

        this.state.players[origin].selectedVisit = i;
        if(origin==i) {
            server.SayOnlyToPlayer(origin, "You decide you are going to visit yourself."); // TODO: Strings depending on role e.g vests
        } else { server.SayOnlyToPlayer(origin, "You decide you are going to visit " + this.state.players[i].name + ".");}
        
        console.log("player " + origin + " selected " + i + " for visiting");
        return true;
    }

    /** Returns true if the player is able to visit his selected target. */
    PlayerCanVisit(origin, i) {
        var originP = this.state.players[origin];
        var targetP = this.state.players[i];
        if (!this.state.NightDiscussionEnabled ||
            i < 0 || i >= this.state.players.length || !originP.alive || !targetP.alive) { // targetP.alive WATCH OUT CORONER
            console.log("can't visit; Invalid vote or invalid time")
            return false;
        }

        //check if person can visit
        if (originP.role.nightAction != Roles.NightAction.None) {
            if (originP.role.nightAction == Roles.NightAction.MafKill) {
                console.log("Cant visit, mafioso" + origin);
                //this.IssueVote(this.state.Votes_Mafia, origin, i);
                return false; // just use the voting system.
            }
            // SELF VISIT CHECK
            if (origin == i && !originP.role.canSelfVisit) {console.log("Cant self-visit" + origin);return false;}
            //Check if person correctly self visited
            if (originP.role.nightAction == Roles.NightAction.OnlySelfVisit) {
                if (origin != i) {console.log("Cant visit anyone other than self"+origin);return false;}
            }
        } else {console.log("Cant visit, no night action"+origin);return false;}

        if (originP.role instanceof Roles.Vigilante && this.state.dayNumber == 1) {
            server.SayOnlyToPlayer(origin, "<c-s val=FF0000>You can't find your gun! You need a day to search your home.</c-s>");
            return false;
        }
        if ((originP.role instanceof Roles.MafiaRole && targetP.role instanceof Roles.MafiaRole) ||
        (originP.role instanceof Roles.TriadRole && targetP.role instanceof Roles.TriadRole)) {console.log("Cant visit other mafias"); return false; }
       
        return true;
    }
    /** Returns the Godfather's kill vote (index). Null if they haven't voted anyone. */
    GetGodfatherVote(factionVoteArray) {
        var vote;
        var godfatherId = this.state.players.findIndex((x)=> x.role instanceof Roles.Godfather);
        if(godfatherId != -1 && !this.state.players[godfatherId].alive)
        {
            vote = factionVoteArray.find((x) => x.by.indexOf(godfatherId) != -1);
        } else return null;
        return vote.id;
    }

    /** Returns the most voted player in a vote list such as Mafia. If there's a draw, selects a random player. */
    GetMostVotes(votedPlayers) {
        var mostVoted;
        var mustResolve = false;
        votedPlayers.forEach((p) =>{
            if(mostVoted === undefined) {
                mostVoted = p;
            } else if (p.freq == mostVoted.freq) mustResolve = true;
            else if (p.freq > mostVoted.freq) {
                mustResolve = false;
                mostVoted = p;
            }
        });
        if (mustResolve) {
            var mostVotedPlayers = [];
            votedPlayers.forEach((p) => {if(p.freq >= mostVoted.freq) mostVotedPlayers.push(p);});
            return mostVotedPlayers[Math.floor(Math.random()*mostVotedPlayers.length)].id;
        } else {
            if(mostVoted === undefined) return -1;
            return mostVoted.id;
        }
    }
    
    /** Returns true if the lynch GUILTY votes are greater than INNOCENT votes. */
    GetLynchVoteResult() {
        var guilty = this.state.Votes_Lynch.filter((x)=> x.guilty).length;
        var inno = this.state.Votes_Lynch.filter((x)=> !x.guilty).length;
        return guilty > inno;
    }

    /** Tries voting and returns true if succeeds. */
    TryVote(vote) {
        if(this.CanVote(vote.from)) {
            if(this.state.stage == "day-trial-vote") {
                if (this.state.players[vote.from] == this.state.trialPlayer) return false; // Trialed players can't vote lol
                if(vote.to == "guilty") this.IssueVote(Roles.Faction.Town, vote.from, 1);
                else if(vote.to == "inno") this.IssueVote(Roles.Faction.Town, vote.from, 0);
                else return false;
            } else if (this.state.stage == "day-vote") {
                if(this.IsVoteValid(vote)) 
                    this.IssueVote(Roles.Faction.Town, vote.from, vote.to);
                else return false;
            } else if (this.state.stage == "night-discussion") {
                if(this.IsVoteValid(vote))
                    this.IssueVote(Roles.Faction.Mafia, vote.from, vote.to); // wait...
            }
        } else {
            console.log("Person literally can't vote")
            return false;
        }
    }
    
    /** Returns true if the vote is valid, within bounds and voted player is alive. */
    IsVoteValid(vote) {
        console.log(vote);
        return vote.to >= 0 && vote.to < 15 && vote.from != vote.to && this.state.players[vote.to].alive;
    }
    /** Returns true if player can vote */
    CanVote(id) {
        if(!this.state.players[id].alive) return false;
        if(this.state.stage == "day-vote" || this.state.stage == "day-trial-vote") return true; // TODO: Lynch vote doesnt work! With a dead player??
        if(this.state.players[id].role instanceof Roles.MafiaRole && this.state.stage == "night-discussion") return true;
        return false;
    }

    /** Registers a vote in the corresponding vote pool. toPlayer must be 0/1 if it's a lynch vote.  */
    IssueVote(voteFaction, fromPlayer, toPlayer) { // TODO: Adapt to different faction votes
        console.log("casting vote");
        var voteArray;
        var foundVote;
        var votedPlayer;
        var voteChanged = false;
        var voteCancelled = false;
        if(this.state.stage != "day-trial-vote") {
            switch (voteFaction) { // TODO: cancel vote OR CHANGE VOTE
                case Roles.Faction.Town:
                    server.Broadcast(this.state.players[fromPlayer].name + " votes to put "+ this.state.players[toPlayer].name + " to trial.");
                    voteArray = this.state.Votes_Trial;
                    break;
                case Roles.Faction.Mafia:       // TODO: Same for triad.
                    if(this.state.stage == "night-discussion" && this.state.players[fromPlayer].role instanceof Roles.MafiaRole && 
                    this.state.players[toPlayer].role instanceof Roles.MafiaRole) return; // can't vote for own mafs during the night 
                    voteArray = this.state.Votes_Mafia;     // TODO: If mafioso dies, godfather can't vote!
                    server.Broadcast(this.state.players[fromPlayer].name + " suggests to kill " + this.state.players[toPlayer].name); // TODO: Say to Maf only
                    break;
                default:
                    console.log("Invalid faction.");
                    break;
            }

            if(voteArray.find(function(x){return x.id == toPlayer && x.by.indexOf(fromPlayer) != -1;}) !== undefined) {
                voteCancelled = true;
            }
            for (let i = 0; i < voteArray.length; i++) {
                var x = voteArray[i];
                var byIndex = x.by.indexOf(fromPlayer);
                if (byIndex != -1) {
                    voteArray[i].freq--;
                    x.by.splice(byIndex, 1);
                    if (voteArray[i].freq <= 0) voteArray.splice(i, 1); // remove existing vote if no voters left
                    voteChanged = true;
                }
            }

            if (voteCancelled) { // TODO: SCRAP CURRENT CANCEL SYSTEM AND IMPLEMENT IT WITHIN CLIENT!!!!!
                server.Broadcast(this.state.players[fromPlayer].name + " has cancelled their vote.");
            } else {
                foundVote = voteArray.find(function (x) { return x.id == toPlayer; });
                if (foundVote === undefined) {
                    votedPlayer = new VotedPlayer(toPlayer);
                    votedPlayer.by.push(fromPlayer);
                    voteArray.push(votedPlayer);
                } else {
                    foundVote.freq++;
                    foundVote.by.push(fromPlayer);
                }
            }

            console.table(voteArray);
            if (this.state.stage == "day-vote") this.CheckForTrialMajority(voteArray);
        } else { // day trial vote (1 or 0);
            console.log(this.state.Votes_Lynch);
            foundVote = this.state.Votes_Lynch.find(function (x) { return x.id == fromPlayer; });
            if (foundVote === undefined) {
                var lynchVote = new LynchVote(fromPlayer, toPlayer == 1);
                this.state.Votes_Lynch.push(lynchVote);
            } else {
                if(foundVote.guilty == (toPlayer==1)) voteChanged = true; else voteCancelled = true;
                foundVote.guilty = toPlayer == 1;
            }
            console.table(this.state.Votes_Lynch);
            if(voteCancelled) {
                this.state.Votes_Lynch.splice(this.state.Votes_Lynch.indexOf(foundVote,1));
                server.Broadcast(this.state.players[fromPlayer].name + " has cancelled their vote.");
            } else server.Broadcast(this.state.players[fromPlayer].name + (voteChanged ? " has changed their vote.":" has voted."));
        }        
    }

    /** */

    /** All applicable people become immune for the night */
    UseVests() { // TODO: Assign vests
        this.state.players.filter((x) => x.role instanceof Roles.Citizen).forEach(player => {
            if(player.selectedTarget != -1) { // TODO: Notify player
                player.role.vestsLeft--;
                player.nightImmune = true;
            } // check if player has enough vests
        });
    }
    

    /** Every applicable role checks if they can kill and lets the game know if they succeeded. */
    ExecuteKills() {
        /* --- VIGILANTE --- */
        var vigis = this.state.players.filter((x) => x.role instanceof Roles.Vigilante);
        vigis.forEach((v) => {
            if (v.selectedVisit != -1 && !v.roleBlocked) {
                v.visited = v.selectedVisit;
                if (this.state.players[v.visited].role.nightImmune || this.state.players[v.visited].nightImmune)
                    server.SayOnlyToPlayer(this.state.players.indexOf(v), "Your target survived your attack! Tonight, he has immunity to conventional attacks.");
                else this.ProcessKill(v.visited, "vigi", "");
            }
        });
        /* --- MAFIA --- */
        var playerToKill;
        var godfatherPlr = this.state.players.find((x) => x.role instanceof Roles.Godfather);
        if (godfatherPlr === undefined) { // maybe bug here with ===
            playerToKill = this.GetGodfatherVote(this.state.Votes_Mafia);
            if (playerToKill == null) playerToKill = this.GetMostVotes(this.state.Votes_Mafia);
        } else {
            playerToKill = this.GetMostVotes(this.state.Votes_Mafia);
        }
        if (playerToKill != -1) {
            var mafiosi = this.state.players.filter((x) => x.role instanceof Roles.Mafioso);
            var randMafioso;
            var mafRandIdx;
            if (mafiosi.length > 0) {
                mafRandIdx = Math.floor(Math.random() * mafiosi.length);
                randMafioso = mafiosi[mafRandIdx];
            } else {
                randMafioso = godfatherPlr;
            }
            if (randMafioso !== undefined) {
                if (!randMafioso.roleBlocked) {
                    randMafioso.visited = playerToKill;
                    server.SayOnlyToMultiplePlayers(this.GetPlayerIndicesFromFaction(Roles.Faction.Mafia),
                        randMafioso.name + " went to kill " + this.state.players[playerToKill].name + ".");
                    if (randMafioso.alive) { // see if mafioso was killed first
                        if (this.state.players[playerToKill].nightImmune)
                            server.SayOnlyToPlayer(mafRandIdx, "Your target survived your attack! Tonight, he has immunity to conventional attacks.");
                        else this.ProcessKill(playerToKill, "maf", randMafioso.DeathNote); // TODO: Implement death note
                    }
                } else {console.log("The mafioso is roleblocked and is unable to kill tonight!");}
            } else { console.log("Couldn't find a mafia role to execute the kill tonight!"); }
        } else {
            console.log("The mafia decide not to kill anybody tonight.");
        }


        /* --- AFKERS/SUICIDE --- */
        // TODO: SetTimeout for delays
        // soon dead people
        this.state.soonDeadPeople.forEach(i => {
            console.log(this.state.players[i].name + " is AFK / has left, killing...");
            this.ProcessKill(i, "suicide-afk");
        });
    }

    /** Registers a player as DEAD with a cause and an optional death note. Can still be healed. */
    ProcessKill(pl, cause, dn = "") {
        var player = this.state.players[pl];
        player.LeftDeathNote = dn;
        player.alive = false;
        player.deathCause = cause;
        this.state.recentlyDeadPeople.push(player);
    }

    /** Heals the specified player */
    HealPlayer(i) {
        console.log("Healing player " + i);
        const p = this.state.players[i];
        if (p.alive) return false;
        if(p.deathCause == "suicide-afk") return false; // afkers dont get healed
        this.state.recentlyDeadPeople.splice(this.state.recentlyDeadPeople.indexOf(p),1);
        var playerSTILLdead = this.state.recentlyDeadPeople.indexOf(p) != -1; // if the player was attacked ONCE MORE
        if(!playerSTILLdead) {
            p.alive = true;
            p.deathCause = "";
            p.LeftDeathNote = "";
        }
        return true; // Returns that the target was attacked, even if it's still dead (if multiple attacks)
    }

    /** Notifies dead player if they were truly killed. */
    SendKillMessages() {
        this.state.recentlyDeadPeople.forEach((pl)=> {
            switch (pl.deathCause) {
                case "maf":
                    server.Broadcast("You hear shots ring through the streets..."); // TODO: noise only if immune, show text even with doc
                    server.SayOnlyToPlayer(pl, "You were hit by the Mafia.");
                    break;
                case "vigi":
                    server.Broadcast("You hear a tight grouping of shots echoing through the town...");
                    server.SayOnlyToPlayer(pl, "You were taken out by a Vigilante.");
                    break;
                case "suicide-afk":
                    server.Broadcast("You hear a single shot ring out in the night...");
                    server.SayOnlyToPlayer(pl, "You have committed suicide. Don't be AFK during a game!");
                    break;
                default:
                    console.log("unknown kill cause");
                    break;
            }
        });
    }

    LateVisits() {
        for(let i = 0; i < this.state.players.length;i++) { // First iteration to register every visit so investigative roles work fine
            const p = this.state.players[i]; // from player
            if(p.selectedVisit == -1 || p.roleBlocked) continue;
            p.visited = p.selectedVisit; // TODO: here is where we swap if bd / witch
            const targetP = this.state.players[p.visited];
            targetP.visitedBy.push(i);
            // blackmail here
            if(targetP.silenced) server.SayOnlyToPlayer(p.visited, Strings.you_were_silenced);
        }

        for(let i = 0; i < this.state.players.length;i++){
            const fromPlr = this.state.players[i]; // from player
            if(fromPlr.visited == -1 || fromPlayer.roleBlocked) continue;
            if(!fromPlr.alive) continue;

            const targetP = this.state.players[fromPlr.visited]; // to player
            if(fromPlr.role.category == Roles.Category.Investigative) { // INVESTIGATIVE ROLES  
                var msg = fromPlr.role.OnLateVisit(targetP, this.state.players, fromPlr);
                if(Array.isArray(msg)) {
                    msg.forEach((m) => server.SayOnlyToPlayer(i, m));
                } else {
                    server.SayOnlyToPlayer(i, msg);
                }
                
            }
            if(fromPlr.role instanceof Roles.Doctor) { // NOTIFY TARGET ATTACKED / Cured / revert kill
                var attacked = this.HealPlayer(fromPlr.visited);
                if(attacked) {
                    server.SayOnlyToPlayer(i, "Your target was attacked tonight!");
                    if(this.state.players[fromPlr.visited].alive) 
                        server.SayOnlyToPlayer(fromPlr.visited, "You were attacked and left for dead, but a stranger nursed you back to health!");
                } 
            }
        }
    }

    /** Takes care of bus driver, witch and roleblocker actions */
    SwitchesAndRoleblocks() {  // TODO: Do swaps here for early night roles such as killing roles, rblockers etc
        var targetP;
        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            if(p.selectedVisit == -1 || p.roleBlocked) continue; // TODO: Paradoxes & stuff
            if (p.role instanceof Roles.Escort /* || consort*/) {
                p.visited = p.selectedVisit;
                targetP = this.state.players[p.visited];
                targetP.roleBlocked = true;
                server.SayOnlyToPlayer(p.visited, Strings.role_blocked); // TODO: If sk, kill roleblockers! Arso-> douse
            }
        }
    }

    PreKillVisits() {
        var targetP;
        for(let i = 0; i < this.state.players.length;i++){
            const p = this.state.players[i];
            if(p.selectedVisit == -1 || p.roleBlocked) continue;

            if(p.role instanceof Roles.Doctor) { // INVESTIGATIVE ROLES
                p.visited = p.selectedVisit; // TODO: here is where we swap if bd / witch just for doctors tho
               // targetP = this.state.players[p.visited];
                //server.SayOnlyToPlayer(i, "You went to protect " + targetP.name + ".");
            }
            if(p.role instanceof Roles.Blackmailer) {
                p.visited = p.selectedVisit;
                targetP = this.state.players[p.visited];
                targetP.silenced = true;
            }
            
        }
    }

    /** Executes a bunch of actions at the start of every night. */
    OnNewNight() {
        // -- UNSILENCES / UNROLEBLOCKS EVERYONE --
        this.state.players.forEach((p) => {
            p.silenced = false;
            p.roleBlocked = false;
        });
        // -- CHECKS IF MAFIA / TRIAD DONT HAVE KILLING ROLES
        if(this.state.players.find((p) => p.alive && (p.role instanceof Roles.Mafioso || p.role instanceof Roles.Godfather)) === undefined) {
            // if no mafia killing roles left, pick a random mafia member to become mafioso.
            var mafPlayers = this.state.players.filter((p) => p.role instanceof Roles.MafiaRole);
            if(mafPlayers.length > 0) {
                var randIndex = Math.floor(Math.random()*mafPlayers.length);
                server.SayOnlyToPlayer(this.state.players.indexOf(mafPlayers[randIndex]),Strings.became_mafioso);
                this.ChangeRole(mafPlayers[randIndex], new Roles.Mafioso());
            }
        }
        if(this.state.players.find((p) => p.alive && (p.role instanceof Roles.Enforcer || p.role instanceof Roles.DragonHead)) === undefined) {
            // if no triad killing roles left, pick a random triad member to become enforcer.
            var mafPlayers = this.state.players.filter((p) => p.role instanceof Roles.TriadRole);
            if(mafPlayers.length > 0) {
                var randIndex = Math.floor(Math.random()*mafPlayers.length);
                server.SayOnlyToPlayer(this.state.players.indexOf(mafPlayers[randIndex]),Strings.became_enforcer);
                this.ChangeRole(mafPlayers[randIndex], new Roles.Enforcer());
            }
        }
        // ---

    }

    /** Starts the night sequence.*/
    NightSequence() {
        console.log("Night sequence begun. Night ending...");
        this.UseVests();
        this.SwitchesAndRoleblocks();
        this.PreKillVisits();
        this.ExecuteKills();
        this.LateVisits(); // separate late visit for doctor, so sendkillmessages() can go before late visits
        this.SendKillMessages(); // its ok its after late visits because that function already checks if the person is dead.
        this.SendPlayerUpdate(); // TODO: Update here, but hide so its shown after revealing who's dead
        this.timeLeft = 5;
        this.nextState = "day-start";
    }

    /** Resets a bunch of values and reveals the dead every new day. */
    OnNewDay() {
        this.lastTimeLeft = -2;
        this.state.dayNumber++;
        this.state.Votes_Lynch = [];
        this.state.Votes_Mafia = [];
        this.state.Votes_Triad = [];
        this.state.Votes_Cult = [];
        this.state.Votes_Mason = [];
        this.state.VoteEnabled = false;
        this.state.DayDiscussionEnabled = false;
        this.state.NightDiscussionEnabled = false;
        this.state.players.forEach(player => {
            player.visited = -1;
            player.visitedBy = [];
            player.selectedVisit = -1;
            if(player.role instanceof Roles.Citizen) {
                player.nightImmune = false;
            }
        });

        var indicesAlreadyAnnounced = [];
        for (let i = 0; i < this.state.recentlyDeadPeople.length; i++) {
            const p = this.state.recentlyDeadPeople[i];
            if(indicesAlreadyAnnounced.indexOf(i) != -1) continue;
            server.Broadcast(p.name + " was found dead this morning.");
            var deathString = DeathCauses[p.deathCause];
            // check how many repeated deaths
            var repeated = this.state.recentlyDeadPeople.filter((d) => d == p);
            if (repeated.length > 0) {
                // remove the first (it's our death)
                repeated.splice(0, 1);
                repeated.forEach((d) => {
                    if (d.deathCause == "suicide-afk") deathString += " Afterwards, he apparently killed himself.";
                    else deathString += " Afterwards, he was apparently attacked again...";
                });
            }
            server.Broadcast(deathString);
            server.Broadcast(p.name + "'s role was " + p.role.name);
            server.Broadcast(p.LastWill == "" ? p.name + " doesn't seem to have a last will." : p.name + "'s Last Will reads: " + p.LastWill); 
            indicesAlreadyAnnounced.push(i);
        }
        this.state.recentlyDeadPeople = [];

        for(let i=0; i<this.state.soonDeadPeople.length; i++) {
            var idx = this.state.soonDeadPeople[i];
            if(!this.state.players[idx].alive) this.state.soonDeadPeople.splice(i,1);
        }
        server.Broadcast("---");
        this.CheckForWinCondition();
    }

    /** Checks if the game has reached a conclusion. */
    CheckForWinCondition(onlyTown = false) 
    {
        var alivePlayers = this.GetAlivePlayers();
        var conclusion = null;
        if (this.GetPlayerIndicesFromFaction(Roles.Faction.Mafia).length == 0) {
            // No mafias left. TODO: Check for neutrals.
            conclusion = "town";
        } else if (alivePlayers.filter((x) => x.role instanceof Roles.TownRole).length == 0) {
            conclusion = "maf"; // TODO: Triad/Maf tiebreaker + neutrals
        } else if (alivePlayers.length == 2) { /* ONE VS ONE TIEBREAKERS */
            var firstPlr;
            var secondPlr;
            //maf-town
            if (alivePlayers.find((x) => x.role instanceof Roles.MafiaRole) != null) { // take the one mafia // TODO: Make sure != null works
                secondPlr = alivePlayers.find((x) => x.role instanceof Roles.TownRole);
                conclusion = secondPlr.role instanceof Roles.Citizen ? "town" : "maf"; // Citizen wins tiebreakers TODO: Optional
            }
        }

        if(onlyTown && conclusion != "town") return; // i.e in lynch vote only town wins (to allow for plot twists during the night)


        // CONCLUSION MESSAGES
        if (conclusion != null) {
            server.Broadcast("The game has reached a conclusion...");
            switch (conclusion) {
                case "town":
                    server.Broadcast("The <c-s val=00FF00>Town</c-s> has won!");
                    break;
                case "maf":
                    server.Broadcast("The <c-s val=FF0000>Mafia</c-s> have won!");
                    break;
            }
            this.nextState = "GAME-END"; // TODO: IMPLEMENT GAME END STATE
        } // TODO: Properly end the game and restart.
    }

    /** Tries to speak. */
    TrySpeak(playerIdx, msg) {
        if(this.CanSpeak(playerIdx)) {
            var ply = this.state.players[playerIdx];
            if(this.state.NightDiscussionEnabled) {
                if (ply.role instanceof Roles.MafiaRole) {
                    server.SayOnlyToMultiplePlayers(this.GetPlayerIndicesFromFaction(Roles.Faction.Mafia),ply.name+"> "+msg, false);
                } else if (ply.role instanceof Roles.TriadRole) {
                    server.SayOnlyToMultiplePlayers(this.GetPlayerIndicesFromFaction(Roles.Faction.Triad),ply.name+"> "+msg, false);
            /*else if (ply.role instance of Roles.Cultist||witchdoctor, mason...)*/ // !! CRIER / JUDGE LAST (so if they get converted they won't speak)
                } else if (ply.role instanceof Roles.Crier)  {
                    server.Broadcast("<c-s val=66CC33>Crier:</c-s> " + msg);
                }
                
            } else { // This point should be reached only if it's day discussion or if a trialed player speaks during defense.
                if (ply.silenced) server.SayOnlyToPlayer(playerIdx, Strings.error_silenced);
                else server.PlayerSay(ply.name, msg);
            }
        }
    }

    /** Returns true if the player can speak (to any faction) */
    CanSpeak(id) {
        if(id < 0 || id>=this.state.players.length) return false;
        if(this.state.DayDiscussionEnabled || this.state.NightDiscussionEnabled) return true;
        if(this.state.trialPlayer == this.state.players[id] && this.state.stage == "day-trial-defense") return true;
        return false;
    }

    /** Sets the Last Will for the specified player index. */
    SetLastWill(i, msg) {
        this.state.players[i].LastWill = msg;
    }
    /** Changes a player's role to the role specified */
    ChangeRole(ply, role) {
        ply.role = role;
        var index = this.state.players.indexOf(ply);
        var roleInfo = this.GetRoleInfo(ply.role);
        server.SendRoleInfo(index, roleInfo);
    }

    /** Returns the indices of the members of a specific faction. */
    GetPlayerIndicesFromFaction(faction) {
        var pList = this.GetAlivePlayers().filter((x)=> x.role.faction == faction);
        var idList = [];
        pList.forEach((p)=> {
            idList.push(this.state.players.indexOf(p));
        });
        return idList;
    }
}

var DeathCauses = Object.freeze({
"maf":"He was riddled with bullets at close range.",
"suicide-afk":"He apparently killed himself.",
"vigi": "He was shot by a high-caliber gun."
});


var server;

function GameInit(srver) {
    console.log("MAFIA GAME ALPHA - Nicolás de Ory 2018");
    console.log("---------------------------");
    server = srver;
    var game = new Game();
    game.setup = new GameSetup();
    //game.setup = GameSetup.GenerateBasicSetup(15);
    //console.table(game.setup.setupList);
    console.log("The current setup is " + (game.setup.CheckValidity(15) ? "valid" : "not valid") + ".");
    return game;
}


if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined' ? args[number] : match;
      });
    };
  }

module.exports = {
    GameInit: GameInit
};
