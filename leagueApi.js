var key = "";

var LeagueApi = {

	callQueue: {"head": null,
		"tail": null
	},

	startApiCalls: function() {
		setInterval(this.callQueueFront, 1000); // 1 request per second
	},

	callQueueFront: function() {
		var curr = this.callQueue.head;
		if(curr == null) // nothing in queue
			return;
		this.callQueue.head = curr.next;

		apiReq(curr.req, curr.callback);
	},

	addToQueue: function(request, callback) {
		var node = {"req":request, "callback":callback};
		if(this.head == null)
		{
			this.callQueue.head = node;
			this.callQueue.tail = node;
		}
		else
		{
			this.callQueue.tail.next = node; // add to end of list
			this.callQueue.tail = node; // update tail
		}
	},


	// tests the key to see if it works. If it does, callback is called.
	testApiKey: function(key, callback) {
		var testRequest = {"command" : "test", "testKey" : key};
		apiReq(testRequest, callback);
	},

	// mapId : Name
	mapsById: {1: "Summoner's Rift",
		2:	"Summoner's Rift",
		3:	"The Proving Grounds",
		4:	"Twisted Treeline",
		8:	"The Crystal Scar",
		10:	"Twisted Treeline",
		11:	"Summoner's Rift",
		12:	"Howling Abyss"
	},

	getMap: function(mapId) {
		return this.mapsById[mapId];
	},


	// mapId : Name
	specGridMap: {"NA1":"spectator.na.lol.riotgames.com:80",
		"EUW1":"spectator.euw1.lol.riotgames.com:80", 
		"EUN1":"spectator.eu.lol.riotgames.com:8080", 
		"KR":"spectator.kr.lol.riotgames.com:80", 
		"OC1":"spectator.oc1.lol.riotgames.com:80", 
		"BR1":"spectator.br.lol.riotgames.com:80", 
		"LA1":"spectator.la1.lol.riotgames.com:80", 
		"LA2":"spectator.la2.lol.riotgames.com:80", 
		"RU":"spectator.ru.lol.riotgames.com:80", 
		"TR1":"spectator.tr.lol.riotgames.com:80", 
		"PBE1":"spectator.pbe1.lol.riotgames.com:8080"
	},
	getSpecGrid: function(platform){
		return this.specGridMap[platform];
	},

	getChampPortraitUrl: function(championName){
		return "http://ddragon.leagueoflegends.com/cdn/" + LeagueApi.realmVersion.champion + "/img/champion/" + championName + ".png";
	},
	getSpellPortraitUrl: function(spellKey){
		return "http://ddragon.leagueoflegends.com/cdn/" + LeagueApi.realmVersion.summoner + "/img/spell/" + spellKey + ".png";
	},

	realmVersion : {"assigned":false},
	getRealmVersion: function(callback){
		if (!LeagueApi.realmVersion.assigned) {
			var query = {"command" : "getRealmVersion"}
			apiReq(query, function(result) {
				LeagueApi.realmVersion = JSON.parse(result).n;
				LeagueApi.realmVersion.assigned = true;
				if (callback)
					callback(result);
			});
		}
		else if(callback)
			callback(LeagueApi.realmVersion);
	},



	generateSpectatorString: function(matchId, encKey, platform){
		if(platform == null)
			platform = "NA1";
	
		var releaseNum = "0.0.1.103";
		var currExe = "\"C:\\Riot Games\\League of Legends\\RADS\\solutions\\lol_game_client_sln\\releases\\" + releaseNum + "\\deploy\\League of Legends.exe\"";
		var constParams = "\"8394\" \"LoLLauncher.exe\" \"\""; // <"8394" "LoLLauncher.exe" "">
		var lastParam = "\"spectator " + this.getSpecGrid(platform) + " " + encKey + " " + matchId + " " + platform + "\"";
		return currExe + " " + constParams + " " + lastParam;
	},


	// callbacks with an array of 10 most recent games, or null if failure
	getRecentMatches: function(playerId, callback, queue) {
		var query = {"command" : "getRecentMatches", "playerId": playerId};

		var func = (queue) ? this.addToQueue : apiReq;

		func(query, function(resp) {
			if(resp.charAt(0) == '<' || resp == null || resp == false ) // call failed?
			{
				callback(null);
				return;
			}
			var obj = JSON.parse(resp);
			if(obj.summonerId != playerId)
			{
				callback(null);
				return;
			}
			var games = obj.games;
			callback(games);
		});
	},



	//calls back with player info if success
	getPlayerInfo: function(playerName, callback, queue) {
		var query = {"command" : "getPlayerInfo", "playerName": playerName};
		var func = (queue) ? this.addToQueue : apiReq;

		func(query, function(resp) {
			if(resp.charAt(0) == '<' || resp == null || resp == false ) // call failed
				return false;

			var obj = JSON.parse(resp)[playerName]; // {<playername>:{playerinfo}} is how it is laid out
			if(obj != null)
				callback(obj);
		});
	},


	// calls back with player info if success, otherwise calls back with null
	getPlayerInfoById: function(playerId, callback, queue) {
		var query = {"command" : "getPlayerInfoById", "playerId" : playerId};
		var func = (queue) ? this.addToQueue : apiReq;

		func(query, function(resp) {
			if(resp.charAt(0) == '<' || resp == null || resp == false ) // call failed
				callback(null);
			else
			{
				var obj = JSON.parse(resp);
				if(obj[playerId] != null)
					callback(obj);
				else
					callback(null);
			}
		});
	},


	// itemList has objects of key = id, value = {id, description, name, group}
	itemList: {"length":0},
	// populates itemList if it is empty, and callsback with it.
	// will only be queued if (queue == true && itemList is not already populated)
	getItemList: function(callback, queue) {
		var that = this;
		if(this.itemList.length != 0)
			callback(this.itemList);
		else
		{
			var query = {"command" : "getItemList"};
			var func = (queue) ? this.addToQueue : apiReq;

			func(query, function (resp) {
				that.itemList.length = 0;
				var obj = JSON.parse(resp)["data"];
				for(var key in obj) // for each item
				{
					that.itemList[key] = obj[key]; // set id to map to item info.
					that.itemList.length++;
				}
				callback(that.itemList);
			});
		}
	},



	champList: {"length":0},
	// populates champList if it is empty, and callsback with it.
	// will only be queued if (queue == true && champList is not already populated)
	getChampionList: function(callback, queue) {
		var that = this;
		if(this.champList.length != 0)
			callback(this.champList);
		else
		{
			var query = {"command" : "getChampionList"};
			var func = (queue) ? this.addToQueue : apiReq;

			func(query, function (resp) {
				that.champList.length = 0;
				var obj = JSON.parse(resp)["data"];
				for(var key in obj) // for each champion
				{
					that.champList[obj[key].id] = key; // set id to map to champion name
					that.champList.length++;
				}
				callback(that.champList);
			});
		}
	},

	spellNameList: {"length":0},
	spellKeyList: {"length":0},
	// populates spellNameList and spellKeyList with summoner spells if they are empty, and callsback with them.
	// will only be queued if (queue == true && spellLists are not already populated)
	getSpellList: function(callback, queue) {
		var that = this;
		if(this.spellNameList.length != 0)
			callback(this.spellNameList, this.spellKeyList);
		else
		{
			var query = {"command" : "getSpellNameList"};
			var func = (queue) ? this.addToQueue : apiReq;

			func(query, function (resp) {
				that.spellNameList.length = 0;
				that.spellKeyList.length = 0;
				var obj = JSON.parse(resp)["data"];
				for(var key in obj) // for each spell
				{
					if(obj[key].id == null) // skip if it doesn't have an id
						continue;
					that.spellNameList[obj[key].id] = obj[key].name; // set id to map to spell name
					that.spellNameList.length++;
					that.spellKeyList[obj[key].id] = obj[key].key; // set id to map to spell key
					that.spellKeyList.length++;
				}
				callback(that.spellNameList, that.spellKeyList);
			});
		}
	},

	// calls back with match info if player is in game. otherwise calls back with nothing (aka null).
	getCurrentMatch: function(pId, callback, queue) {
		var query = {"command" : "playerCurrentMatchInfo", "playerId" : pId};
		var func = (queue) ? this.addToQueue : apiReq;

		func(query, function(resp){
			if(resp.charAt(0) === '<') // 404 or some error received, usually from not being in game
				callback();
			else
				callback(JSON.parse(resp));
		});
	},

	// calls back with match info if player is in game. otherwise calls back with nothing (aka null).
	getChampInfoById: function(champId, info, callback, queue) {
		var query = {"command" : "champInfoById",
				"champData" : info,
				"champId" : champId};
		var func = (queue) ? this.addToQueue : apiReq;

		func(query, function(resp){
			if(resp.charAt(0) === '<') // 404 or some error received, usually from not being in game
				callback();
			else
				callback(JSON.parse(resp));
		});
	}
	
};

function apiReq(query, callback) {
	if(callback == null && query.callback != null)
		callback = query.callback(); // callback can be set in query object or in this function call.
	else if(callback == null && query.callback == null)
		callback = function(resp) {return;}; // do nothing if no callback

	if(query == null)
		return false;
	if(query.region == null)
		query.region = "na";
	if(query["platform"] == null)
		query["platform"] = "NA1";
	switch(query.command)
	{
		case "getRealmVersion":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/realm?api_key=" + key, function(resp) {
				callback(resp);
			});
			break;
		case "getChampionList":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/champion?champData=info&api_key=" + key, function(resp) {
				callback(resp);
			});
			break;
		case "getItemList":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/item?api_key=" + key, function(resp) {
				callback(resp);
			});
			break;
		case "getSpellNameList":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/summoner-spell?spellData=key&api_key=" + key, function(resp) {
				callback(resp);
			});
			break;
		case "playerCurrentMatchInfo":
			xmlReq("GET", "https://na.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/" + query["platform"] + "/" + query.playerId + "?api_key=" + key, function(resp){
				callback(resp);
			});
			break;
		case "champInfoById":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" 
				+ query.region + "/v1.2/champion/" + query.champId 
				+ "?champData=" + query.champData + "&api_key="
				+ key, function(resp) {
				callback(resp);
			});
			break;
		case "getPlayerInfo":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.4/summoner/by-name/" + query.playerName + "?api_key=" + key, function(resp){
				callback(resp);
			});
			break;
		case "getPlayerInfoById":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.4/summoner/" + query.playerId + "?api_key=" + key, function(resp){
				callback(resp);
			});
			break;
		case "getRecentMatches":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.3/game/by-summoner/" + query.playerId + "/recent?api_key=" + key, function(resp){
				callback(resp);
			});
			break;
		case "test":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/RiotSchmick?api_key=" + query.testKey, function(resp){
				var obj = JSON.parse(resp);
				if(obj != null && obj["riotschmick"] != null)
					callback(true);
				else
					callback(false);
			});
			break;
		default:
			console.log("LeagueApi command " + query.command + " not found");
			break;
	}
	
}
