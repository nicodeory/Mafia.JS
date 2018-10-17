/*jshint esversion: 6 */

var Strings = require('./strings/en.js');

var Roles =  {};

Roles.Faction = Object.freeze({"Town":1, "Mafia":2, "Triad":3, "Cult":4, "Mason":5, "Neutral": 6});
Roles.Category = Object.freeze({"Zero":1, "Government":2, "Investigative":4, "Protective":8,  // TODO: Bitwise flags (multi-categories)
"Power":16, "Deception":32, "Support":64, "Benign": 128, "Evil": 256, "Killing": 512});
Roles.NightAction = Object.freeze({"None":0, "Visit":1, "OnlySelfVisit":2, "Vote":3, "Swap":4, "SoloKill":5, "MafKill":6}); // TODO: Vests? Arsonist ignite? Jailor exe?

// TODO: Convert role names to c("000","str") format and move to strings/en.js
Roles.Role = class {
    constructor() {
        this.name = "Invalid";
        this.faction = Roles.Faction.Neutral;
        this.category = Roles.Category.Zero;
        this.nightAction = Roles.NightAction.None;
        this.detectionImmune = false;
        this.killImmune = false;
        this.canSelfVisit = false;
        this.abilities = [Strings.none];
        this.attributes = [Strings.none];
    }
};


/* TOWN ROLES */
Roles.TownRole = class extends Roles.Role {
    constructor() {
        super();
        this.faction = Roles.Faction.Town;
        this.category = Roles.Category.Zero;
        this.goal = Strings.town_goal
    }
};

Roles.Citizen = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="33CC33">Citizen</c-s>';
        this.category = Roles.Category.Government;
        this.nightAction = Roles.NightAction.OnlySelfVisit;
        this.vestsLeft = 1;
    }
};

Roles.Crier = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="66CC33">Crier</c-s>';
        this.category = Roles.Category.Government;
    }
};

Roles.Doctor = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="00FF00">Doctor</c-s>';
        this.category = Roles.Category.Protective;
        this.nightAction = Roles.NightAction.Visit;
    }
};

Roles.Vigilante = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="88CC00">Vigilante</c-s>';
        this.category = Roles.Category.Killing;
        this.nightAction = Roles.NightAction.Visit;
    }
};

Roles.Sheriff = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="00FF00">Sheriff</c-s>';
        this.category = Roles.Category.Investigative;
        this.nightAction = Roles.NightAction.Visit;
    }
    OnLateVisit(player) {
        if(player.detectionImmune) return "Your target is not suspicious."; // TODO: Framed
        if(player.role instanceof Roles.MafiaRole) {
            if(player.role instanceof Roles.Godfather) return "Your target is not suspicious.";
            return "Your target is a member of the Mafia!";
        }
        if(player.role instanceof Roles.TriadRole) return "Your target is a member of the Triad!";
        else return "Your target is not suspicious.";
    }
};

Roles.Detective = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="00FF44">Detective</c-s>';
        this.category = Roles.Category.Investigative;
        this.nightAction = Roles.NightAction.Visit;
    }
    OnLateVisit(player,plist) {
        if(player.visited == -1) return "Your target did not do anything tonight.";
        return "Your target visited " + plist[player.visited].name + " tonight.";
    }
};

Roles.Lookout = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="44FF00">Lookout</c-s>';
        this.category = Roles.Category.Investigative;
        this.nightAction = Roles.NightAction.Visit;
        this.canSelfVisit = true;
    }
    OnLateVisit(player,plist, myPlayer) {
        if(player.visitedBy.length == 0) return "Your target was not visited by anyone tonight.";
        var msgArr =[];
        player.visitedBy.forEach((i) => {
            if(plist[i] != myPlayer) msgArr.push(plist[i].name + " visited your target tonight.");
        });
        return msgArr;
    }
};

/* MAFIA ROLES */

Roles.MafiaRole = class extends Roles.Role {
    constructor() {
        super();
        this.faction = Roles.Faction.Mafia;
        this.category = Roles.Category.Zero;
        this.goal = Strings.mafia_goal
        this.attributes = ["You can talk with the Mafia at night."]
    }
};

Roles.Mafioso = class extends Roles.MafiaRole {
    constructor() {
        super();
        this.name = '<c-s val="CC0000">Mafioso</c-s>';
        this.category = Roles.Category.Killing;
        this.nightAction = Roles.NightAction.MafKill;
    }
};
Roles.Godfather = class extends Roles.MafiaRole {
    constructor() {
        super();
        this.name = '<c-s val="FF4488">Godfather</c-s>';
        this.category = Roles.Category.Killing;
        this.detectionImmune = true;
        this.killImmune = true;
        this.nightAction = Roles.NightAction.MafKill;
    }
};

/* TRIAD ROLES */
Roles.TriadRole = class extends Roles.Role {
    constructor() {
        super();
        this.faction = Roles.Faction.Triad;
        this.category = Roles.Category.Zero;
        this.goal = Strings.mafia_goal;
        this.attributes = ["You can talk with the Triad at night."]
    }
};
/* NEUTRAL ROLES */


//
Roles.RoleFactory = {
    "Godfather": Roles.Godfather,
    "Mafioso": Roles.Mafioso,
    "Citizen": Roles.Citizen,
    "Doctor": Roles.Doctor,
    "Sheriff": Roles.Sheriff,
    "Detective": Roles.Detective,
    "Lookout": Roles.Lookout,
    "Crier": Roles.Crier,
    "Vigilante": Roles.Vigilante
};

module.exports = Roles;