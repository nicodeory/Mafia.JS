/*jshint esversion: 6 */

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Game = require('./game.js');
 // TODO: Import strings module and put everything there (remaining c-s elements)

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var connections = [];
var recon_passwords = [];
for(let i=0; i<15;i++) recon_passwords.push(null);

/** Resets a bunch of values. */
function ResetValues() {
    connections = [];
    recon_passwords = [];
    for(let i=0; i<15;i++) recon_passwords.push(null);
}
ResetValues();

io.on('connection', function(socket) {
    console.log(socket.id + " connected");
    
    if(GameInstance.gameStarted) {
        socket.emit('cl_passprompt_num'); // TODO: NO PROMPT DIALOG, SIMPLY COMMAND TO REJOIN (dialogs bug out)
    } else {
        ServerInstance.Broadcast("A player has joined!");
    }
    connections.push(socket.id);
    
    socket.on('disconnect', function () {
        if(!GameInstance.gameStarted){
            ServerInstance.Broadcast("A player has disconnected.");
            connections.splice(connections.indexOf(socket.id), 1);
        } else {
            //io.sockets.emit('msg', GameInstance.GetSimplifiedPlayerList(connections.indexOf(socket.id)).name + " disconnected");
            var idx = connections.indexOf(socket.id);
            if (idx >= 0 && idx < GameInstance.state.players.length) {
                if (recon_passwords[idx] == null) GameInstance.OnPlayerQuit(idx);
                else {
                    console.log(GameInstance.GetSimplifiedPlayerList()[idx].name + " (temporarily?) disconnected"); // TODO: Mark as AFK!!
                    connections[idx] = null;
                }
            } else {
                console.log("An spectator disconnected.");
                connections.splice(idx, 1);
            }

        }
    });
    socket.on('chatmsg', function (msg) {
        ParseCommand(msg, connections.indexOf(socket.id));
    });
    /*socket.on('setpassword',function(pass) {
        if (pass == null || pass == "") console.log("Player decided not to specify a password. They won't be able to relog.");
        recon_passwords[connections.indexOf(socket.id)] = pass;
    });*/

    var num;
    socket.on('passprompt_num', function (n) { // TODO: Fix (doesnt work)
        if (!IsPasswordProtected(n)) {
            socket.emit('msg', "<b>You are an spectator. You cannot speak or do any action.</b>");
            console.log("Player refused to relog or introduced an invalid player number.");
        } else {
            num = n;
            socket.emit('cl_passprompt_pass');
        }
    });
    socket.on('passprompt_pass', function (p) {
        if (recon_passwords[num] !== undefined && recon_passwords[num] == p) {
            console.log("Player successfully relogged.");
            connections.splice(connections.indexOf(socket.id),1);
            connections[num] = socket.id; // TODO: RECONNECT ROLE??
            socket.emit('msg', "<c-s val=5ABA1A>You have successfully relogged as player " + (num+1) + ".</c-s>");
        } else {
            socket.emit('msg', "<b>You are an spectator. You cannot speak or do any action.</b>");
            console.log("Player failed to relog.");
        }
    });

    socket.emit("updatePlayers", GameInstance.GetSimplifiedPlayerList());
    socket.emit("recoverMessageLog", ServerInstance.MessageLog);
    socket.emit("updateGraveyard", GameInstance.GetGraveyard());
    socket.emit("possibleroles", ServerInstance.setupRoles);
});


function ParseCommand(msg, idx) {
    if(msg.indexOf("start") == 0 && !GameInstance.gameStarted) {
        StartGame(); 
        return;
    }
    var cmdArg;
    var vote;
    if(msg.indexOf("-vote") == 0 && msg.length > 6 && msg.length < 9) { // -vote 15 -length 7 or 8 // TODO: VOTE GUILTY OR INNO
        cmdArg = parseInt(msg.substr(6,msg.length-6));
        if(!cmdArg) return;
        vote = {
            from: idx,
            to: cmdArg-1
        };
        GameInstance.TryVote(vote);
    } else if (msg.indexOf("-vote") == 0) { // LYNCH VOTE
        if(msg.indexOf("guilty") > -1) {
            vote = {
                from: idx,
                to: "guilty"
            };
            GameInstance.TryVote(vote);
        } else if (msg.indexOf("inno") > -1) {
            vote = {
                from: idx,
                to: "inno"
            };
            GameInstance.TryVote(vote);
        }
    } else if (msg.indexOf("-visit") == 0) { // VISIT
        cmdArg = parseInt(msg.substr(7, msg.length - 7));
        if(cmdArg) GameInstance.TrySelectTarget(idx, cmdArg - 1);
    } else if (msg.indexOf("-setpass") == 0) { // SET RECONNECT PASSWORD
        cmdArg = msg.substr(9, msg.length - 9);
        if (cmdArg != null && cmdArg !== undefined && cmdArg != "") {
            recon_passwords[idx] = cmdArg;
            ServerInstance.SayOnlyToPlayer(idx, "<c-s val=5ABA1A>You have successfully set your password.</c-s>");
        }
    } else if (msg.indexOf("-lw") == 0) { // TODO: Open proper traditional lw dialog
        cmdArg = msg.substr(4, msg.length - 4);
        GameInstance.SetLastWill(idx, cmdArg);
    } else if (msg.indexOf("-addrole") == 0) { // Adds a role to the setup
        cmdArg = msg.substr(9, msg.length - 9);
        GameInstance.setup.AddRole(cmdArg.split(","));
    } else if (msg.indexOf("-removerole") == 0) { // Removes a role from the setup (by index)
        cmdArg = msg.substr(12, msg.length - 12);
        GameInstance.setup.RemoveRole(cmdArg);
    } else {
        // check if message is not a mistyped command!
        if(msg.charAt(0) != "-") GameInstance.TrySpeak(idx, msg);
    }

}

var ServerClass = class {
    constructor() {
        this.MessageLog = [];
        this.popupsHidden = false;
        this.setupRoles = [];
    }

    Broadcast(msg, channel) {
        console.log(msg);
        this.MessageLog.push(msg); // TODO: Also save personal messages for every individual person
        io.sockets.emit("msg", msg);
    }

    PlayerSay(name, msg){ // TODO: Prevent spam
        var str = name + "> " + msg;
        console.log(str);
        this.MessageLog.push(str);
        io.sockets.emit("msg", str);
    }

    SayOnlyToPlayer(i, msg) {
        io.to(`${connections[i]}`).emit("msg", msg);
    }

    /** Sends a message only to the specified set of players. Optional parameter to indicate if the name should be replaced by YOU. */
    SayOnlyToMultiplePlayers(players, msg, replaceName = true) {
        players.forEach((pI)=> {      
            if(replaceName) io.to(`${connections[pI]}`).emit("msg", this.ReplName_Replace(pI,msg));
            else io.to(`${connections[pI]}`).emit("msg", msg);
        });
    }

    /** Sends role info to a player */
    SendRoleInfo(i, roleInfo) {
        io.to(`${connections[i]}`).emit("roleinfo", roleInfo);
    }

    UpdatePlayerList(players) {
        io.sockets.emit("updatePlayers",players);
    }

    /** Sends graveyard info to players */
    SendGraveyard(graveyard) {
        console.log(graveyard);
        io.sockets.emit("updateGraveyard",graveyard);
    }

    /** Returns the player index that corresponds to a name displayed on a message. */
    ReplName_Index(str, i) {
        var foundName;
        var name;
        var idx;
        for(let i=0; i<GameInstance.state.players.length; i++){
            name = GameInstance.state.players[i].name;
            if(str.indexOf(name) != -1) {
                foundName = name; 
                idx = i;
                break;
            }
        }
        return idx;
    }
    /** Replaces the name in the string for YOU */
    ReplName_Replace(plyIndex, str) {
        var name = GameInstance.state.players[plyIndex].name;
        str = str.replace(name,"<c-s val=EFAD28>You</c-s>");
        return str;
    }

    
    /** Sends a list of the possible roles in this setup. */
    SendPossibleRoles(roles) {
        console.log(roles);
        this.setupRoles = roles;
        io.sockets.emit("possibleroles", roles);
    }

    /** Notifies players with a password they can set to reconnect */
    OnGameStarted() {
        console.log(connections);
        io.sockets.emit("msg", 
        "<c-s val=F47142>Set a password with <c-s val='880000'>-setpass PASS</c-s>.<br/> If you don't set one, your character will die as soon as you leave the game or lose connection.</c-s>");
    }

    PopupBroadcast(txt) {
        io.sockets.emit("popup_show", txt);
        this.popupsHidden = false;
    }

    PopupToPlayer(pl, txt) {
        io.to(`${connections[pl]}`).emit("popup_show", txt);
        this.popupsHidden = false;
    }

    HidePopups() {
        if(!this.popupsHidden) {
            io.sockets.emit("popup_hide");
            this.popupsHidden = true;
        }
    }
};

/** Return if the specified player index has a password defined. */
function IsPasswordProtected(num) {
    return num != null && num !== undefined && num>=0 && num < GameInstance.state.players.length && connections[num] == null &&
        recon_passwords[num] != null && recon_passwords[num] !== undefined && recon_passwords[num] != "";
}

var GameInstance;
var ServerInstance = new ServerClass();

http.listen(3000, function() {
    console.log("Listening on *:3000");
    GameInstance = Game.GameInit(ServerInstance);
});

var GAMEPLAYERS = 0;
function StartGame() {
    var res=GameInstance.setup.CheckValidity(connections.length);
    if(res != true){
        ServerInstance.Broadcast(res);
    } else {
        GAMEPLAYERS = connections.length;
        GameInstance.Start(GAMEPLAYERS);
    }
    
}