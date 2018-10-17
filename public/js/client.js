/*jshint esversion: 6 */
$(function () {
    /*var colors = [
        "#B4141E",
        "#0042FF",
        "#1CA7EA",
        "#6900A1",
        "#EBE129",
        "#FE8A0E",
        "#168000",
        "#CCA6FC",
        "#A633BF",
        "#525494",
        "#168962",
        "#753F06",
        "#96FF91",
        "#464646",
        "#E55BB0"
    ];*/
    var socket = io();

    $('form').submit(function () {
        socket.emit('chatmsg', $('#m').val());
        $('#m').val('');
        return false;
    });

    // SOCKET EVENTS
    socket.on('disconnect',function(){
        LogMessage("<c-s val=CC0000>You have lost connection. Reconnect by reloading the page.</c-s>");
    });

    socket.on('msg', function (msg) {
        LogMessage(msg);
    });

    socket.on('popup_show', function(txt) {
        ShowPopup(txt);
    });
    socket.on('popup_hide',function(){
        HidePopup();
    });
    socket.on('updatePlayers', function (plArr) {
        $("#player-list").empty();
        for (let i = 0; i < plArr.length; i++) {
            var p = plArr[i];
            $("#player-list").append('<li>' + (i + 1) + '. '+/*<span style="color:' + colors[i] + '">' +  "<b> "  + */(p.alive ? p.name : "") /*+ "</b></span>"*/);
        }
    });

    socket.on('roleinfo', function(role) {
        $("#role-title").html(role.name);
        $("#role-alignment").html("Alignment: " + role.faction);
        $("#role-abilities ul").empty();
        role.abilities.forEach((ab) => {
            $("#role-abilities ul").append("<li>- "+ab+"</li>")
        })
        $("#role-attributes ul").empty();
        role.attributes.forEach((ab) => {
            $("#role-attributes ul").append("<li>- "+ab+"</li>")
        })
        $("#role-goal").text("Goal: " + role.goal);
    });

    socket.on('recoverMessageLog', function (log) {
        $("#messages").empty();
        log.forEach((m) => { LogMessage(m); });
    });
    socket.on('cl_setpassword', function (number) {
        var pass;
        pass = prompt("You are player " + (number + 1) + ". In order to get back into the game if connection is lost, specify a password.\n"+
            "If you don't specify a password, your character will commit suicide as soon as you lose connection.");
        if (pass == null || pass == "") {
            socket.emit('setpassword', null);
        } else socket.emit('setpassword', pass);
    });

    socket.on('cl_passprompt_num', function () {
        var num = parseInt(
            prompt("The game has already begun.\nIf you have disconnected, type below your player number (1-15).\nClick on Cancel to become an spectator."));
        socket.emit('passprompt_num', num-1);
    });

    socket.on('cl_passprompt_pass', function() {
        var pass = prompt("Type your password.");
        socket.emit('passprompt_pass', pass);
    });

    var userScrollSnapToBottom = true;
    const out = document.getElementById("message-container");
    function LogMessage(msg) {
        // allow 1px inaccuracy by adding 1
        const isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;
        $("#messages").append('<li>' + msg);
        // scroll to bottom if isScrolledToBottom is true
        if (isScrolledToBottom) {
            out.scrollTop = out.scrollHeight - out.clientHeight;
        }
    }

    function ShowPopup(txt) {
        $(".game-popup .popup-content").html(txt);
        $(".game-popup").addClass("game-popup-open");
    }

    function HidePopup() {
        $(".game-popup").removeClass("game-popup-open");
    }
    
    $("#m").focusin(function() {
        //$("#message-container").css({"min-height":"20vh","max-height":"20vh"});
    });
    $("#m").focusout(function() {
        $("#message-container").removeAttr("style");
    });

    toggleOver = false;
    $("#overlay-button-ply").click(function() {
        if(!toggleOver) {
            $(".player-overlay").addClass("overlay-open");
            toggleOver = true;
        } else {
            $(".player-overlay").removeClass("overlay-open");
            toggleOver = false;
        }
        
    });
    window.scrollTo(0, 1);

    $( window ).resize(function() {
       // textheight = Y = (X-A)/(B-A) * (D-C) + C;
      });

});
class ColorTagSmall extends HTMLElement {
    constructor() {
        super();
        if (this.hasAttribute('val')) {
            var col = this.getAttribute('val');
            var str = this.innerHTML;
            this.innerHTML = '<span class="color-small" style="color:#' + col + '">' + str + "</span>";
        }
    }
}
customElements.define('c-s', ColorTagSmall); // Small color tag