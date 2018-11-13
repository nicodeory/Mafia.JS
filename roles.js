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
        this.name_id = "invalid";
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
        this.name_id = "citizen";
        this.category = Roles.Category.Government;
        this.nightAction = Roles.NightAction.OnlySelfVisit;
        this.canSelfVisit = true;
        this.vestsLeft = 1;
    }
};

Roles.Crier = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="66CC33">Crier</c-s>';
        this.name_id = "crier";
        this.category = Roles.Category.Government;
    }
};

Roles.Doctor = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="00FF00">Doctor</c-s>';
        this.name_id = "doctor";
        this.category = Roles.Category.Protective;
        this.nightAction = Roles.NightAction.Visit;
    }
};

Roles.Vigilante = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="88CC00">Vigilante</c-s>';
        this.name_id = "vigilante";
        this.category = Roles.Category.Killing;
        this.nightAction = Roles.NightAction.Visit;
    }
};

Roles.Escort = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="00FF00">Escort</c-s>';
        this.name_id = "escort";
        this.category = Roles.Category.Protective;
        this.nightAction = Roles.NightAction.Visit;
    }
};

Roles.Sheriff = class extends Roles.TownRole {
    constructor() {
        super();
        this.name = '<c-s val="00FF00">Sheriff</c-s>';
        this.name_id = "sheriff";
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
        this.name_id = "detective";
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
        this.name_id = "lookout";
        this.category = Roles.Category.Investigative;
        this.nightAction = Roles.NightAction.Visit;
        this.canSelfVisit = true;
    }
    OnLateVisit(tgt,plist, fromP) {
        if(tgt.visitedBy.length == 0) return "Your target was not visited by anyone tonight.";
        var msgArr =[];
        tgt.visitedBy.forEach((p) => {
            if(p != fromP) msgArr.push(p.name + " visited your target tonight.");
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
// KILLING
Roles.Godfather = class extends Roles.MafiaRole {
    constructor() {
        super();
        this.name = '<c-s val="FF4488">Godfather</c-s>';
        this.name_id = "godfather";
        this.category = Roles.Category.Killing;
        this.detectionImmune = true;
        this.killImmune = true;
        this.nightAction = Roles.NightAction.MafKill;
    }
};

Roles.Mafioso = class extends Roles.MafiaRole {
    constructor() {
        super();
        this.name = '<c-s val="CC0000">Mafioso</c-s>';
        this.name_id = "mafioso";
        this.category = Roles.Category.Killing;
        this.nightAction = Roles.NightAction.MafKill;
    }
};
// SUPPORT
Roles.Blackmailer = class extends Roles.MafiaRole {
    constructor() {
        super();
        this.name = '<c-s val="DD0000">Blackmailer</c-s>';
        this.name_id = "blackmailer";
        this.category = Roles.Category.Support;
        this.nightAction = Roles.NightAction.Visit;
    }
}


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
Roles.DragonHead = class extends Roles.TriadRole {
    constructor() {
        super();
        this.name = '<c-s val="9F8EFF">Dragon Head</c-s>';
        this.name_id = "dragonhead";
        this.category = Roles.Category.Killing;
        this.detectionImmune = true;
        this.killImmune = true;
        this.nightAction = Roles.NightAction.MafKill;
    }
};
Roles.Enforcer = class extends Roles.TriadRole {
    constructor() {
        super();
        this.name = '<c-s val="2851CC">Enforcer</c-s>';
        this.name_id = "enforcer";
        this.category = Roles.Category.Killing;
        this.nightAction = Roles.NightAction.MafKill;
    }
};
/* NEUTRAL ROLES */
Roles.OrderedRoleNames = ["judge","auditor","witchdoctor","massmurderer","amnesiac","executioner","arsonist","witch","jester","survivor","serialkiller",
                       "beguiler","agent","kidnapper","disguiser","blackmailer","janitor","framer","consigliere","consort","godfather","mafioso",
                       "deceiver","vanguard","informant","interrogator","silencer","incensemaster","forger","administrator","liaison","dragonhead","enforcer",
                       "crier","marshall","veteran","lookout","detective","jailor","mayor","bodyguard",
                       "coroner","busdriver","spy","vigilante","escort","investigator","doctor","sheriff","citizen"];

//
Roles.RoleFactory = {
    "Godfather": Roles.Godfather,
    "Mafioso": Roles.Mafioso,
    "Blackmailer": Roles.Blackmailer,
    "Citizen": Roles.Citizen,
    "Doctor": Roles.Doctor,
    "Sheriff": Roles.Sheriff,
    "Detective": Roles.Detective,
    "Lookout": Roles.Lookout,
    "Crier": Roles.Crier,
    "Vigilante": Roles.Vigilante,
    "Escort" : Roles.Escort
};

module.exports = Roles;