// Vicinity (start)

TM_gents__Vicinity = function (constructorArgs) {
    this._version = "1.0.0";
    this._subscribers = [];
    this._connections = {};
    this.type = "Vicinity";
    this.onMessage = null;
    this.onError = null;
    this.agents = {};
    this._guid = (constructorArgs.guid) ? constructorArgs.guid : tm_g.generateUUID();
    this._rootPath = (constructorArgs.root) ? constructorArgs.root.toLowerCase() : "http://localhost/vicinity";  // http://localhost:49999/vicinity
    this.vicinities = [];
    this._worker = null;
    this._isChild = constructorArgs.isChild;
    this.name = constructorArgs.name;
    this._realname = (this._isChild) ?
                            this.name :
        ((constructorArgs.realname) ? constructorArgs.realname : constructorArgs.name + "-" + this._guid.substr(0, 8));
    this._vName = this._realname;  // vicinity root name
    this._isProxy = false;
    this._sharedWorker = false;
    this._messageQueue = [];
    this._messageNumber = 0;
    this.type = constructorArgs.vicinityType;
    this.onInit = constructorArgs.onInit;
    this.config = constructorArgs.config;

    if (!tm_g.console) {
        tm_g.logInit();
    }

    if (constructorArgs.worker) {  // proxy
        this._isProxy = true;
        this._worker = constructorArgs.worker.instance;

        if (!constructorArgs.worker.shared) {
            this._worker.onmessage = this.setupHandler();  // bootstrap code
            this._worker.onerror = this.onError;

            this._worker.postMessage({ name: "start", args: { name: this.name, realname: this._realname} });
        }
        else {
            this._worker.port.onmessage = this.setupHandler();  // bootstrap code
            this._worker.port.onerror = this.onError;

            this._worker.port.start();
            this._worker.port.postMessage({ name: "start", args: { name: this.name, realname: this._realname, shared: true} });
        }

    }
    else if (constructorArgs.webworker) { // actual web worker
        // Q: proxyUrl = this.getUrl() for non-shared?
        // TODO: refactor old logic to create proxy Url.  Possibly pass Url from client proxy
        var thisUrl = this.getUrl();
        var indexOfPath = thisUrl.indexOf("@");
        var proxyUrl = constructorArgs.proxyName + thisUrl.substr(indexOfPath);

        this.connect({ connector: { _url: proxyUrl + "/Proxy", getUrl: function () { return this._url; },
            webworker: { instance: self, shared: constructorArgs.webworker.shared, port: constructorArgs.webworker.port },
            proxyName: constructorArgs.proxyName, proxyNickname: constructorArgs.proxyNickname
        }
        });
    }
    else if (constructorArgs.server) {
        if (constructorArgs.server.isHub) {		// server hub
            this._isProxy = true;
            var proxyUrl = constructorArgs.proxyName + "@" + constructorArgs.root;

            this.connect({
                connector: {
                    _url: proxyUrl + "/Proxy",
                    getUrl: function () {
                        return this._url;
                    },
                    server: constructorArgs.server,
                    proxyName: constructorArgs.proxyName,
                    proxyNickname: constructorArgs.proxyNickname,
                    target: constructorArgs.target,
                    source: {
                        name: this.name,
                        realname: this._realname,
                        url: this.getUrl()
                    },
                    config: constructorArgs.config
                }
            });
        }
        else if (constructorArgs.server.isTrueServer) {
            // Do not connect until a connection is made by the client. At that point accept it.
        }
        else if (constructorArgs.server.isTrueServerProxy) {
            this._isProxy = true;
            this._vName = constructorArgs.proxyName;
            var proxyUrl = constructorArgs.proxyName + "@" + constructorArgs.root + "/" + constructorArgs.proxyName;

            this.connect({
                connector: {
                    _url: proxyUrl + "/Stub",
                    getUrl: function () {
                        return this._url;
                    },
                    server: constructorArgs.server,
                    proxyName: constructorArgs.proxyName,
                    proxyNickname: constructorArgs.proxyNickname,
                    target: constructorArgs.target,
                    source: {
                        name: this.name,
                        realname: this._realname,
                        url: this.getUrl()
                    },
                    config: constructorArgs.config
                },
                partner: true
            });
        }
    }
    else {
        if (this.onInit) {	// simulate server initiated init
            this.onInit();
        }
    }
};

// function not prototype on purpose
TM_gents__Vicinity.getVicinity = function(vicinityArgs) {
    var name = vicinityArgs.name;
    var realname = (vicinityArgs.realname) ? vicinityArgs.realname : name;
    var proxyName = vicinityArgs.proxyName;
    var proxyNickname = vicinityArgs.proxyNickname;

    var basename = (this.type) ? this.type.toLowerCase() : "vicinity";

    var vicinityRoot = null;
    if (vicinityArgs.rootPath) {
        vicinityRoot = vicinityArgs.rootPath;
    }
    else {

        if (!TM_gents__Vicinity.root) {
            TM_gents__Vicinity.root = "http://localhost/" + basename;
        }

        // if root does not end in vicinity then add it.
        vicinityRoot = TM_gents__Vicinity.root;
        if (vicinityRoot.match(basename + "$")!= basename) {
            vicinityRoot += "/" + basename;
        }
    }

    var vicinity = null;

    // add port 48888 if a worker process
    if (vicinityArgs.worker) {
        if (vicinityArgs.worker.shared && window.SharedWorker) {
            if (vicinityRoot.indexOf(":48888") == -1) {
                vicinityRoot = vicinityRoot.replace("localhost", "localhost:48888");
            }

            var targetGuid = null;
            var workerName = (vicinityArgs.worker.script == "default") ? "tm-vicinity.js" : vicinityArgs.worker.script;
            var worker = new SharedWorker(workerName);
            vicinity = new TM_gents__Vicinity({ root: vicinityRoot, guid: targetGuid, name: name, realname: realname,
                worker: { instance: worker, script: workerName, shared: true }, vicinityType: "SharedWebWorkerProxyVicinity", onInit: vicinityArgs.onInit
			});   // Note: serves as a proxy
        }
        // add port 49999 if a shared worker process
        else if (!vicinityArgs.worker.shared && window.Worker) {
            if (vicinityRoot.indexOf(":49999") == -1) {
                vicinityRoot = vicinityRoot.replace("localhost", "localhost:49999");
            }

            var targetGuid = null;
            var workerName = (vicinityArgs.worker.script == "default") ? "tm-vicinity.js" : vicinityArgs.worker.script;
            var worker = new Worker(workerName);
            vicinity = new TM_gents__Vicinity({ root: vicinityRoot, guid: targetGuid, name: name, realname: realname,
                worker: { instance: worker, script: workerName }, vicinityType: "WebWorkerProxyVicinity", onInit: vicinityArgs.onInit
			});   // Note: serves as a proxy
        }
    }
    else if (vicinityArgs.webworker && vicinityArgs.webworker.isTrue){	// actual web worker
        if (vicinityRoot.indexOf(":4") == -1) {
            var port = (!vicinityArgs.webworker.isShared) ? "49999" : "48888";
            vicinityRoot = vicinityRoot.replace("localhost", "localhost:" + port);
        }

		var vicinityType = (!vicinityArgs.webworker.isShared) ? "WebWorkerVicinity" : "SharedWebWorkerVicinity";

        vicinity = new TM_gents__Vicinity({
            root: vicinityRoot, guid: vicinityArgs.guid, name: name, realname: realname,
            webworker: {instance: this, shared: vicinityArgs.webworker.isShared, port: vicinityArgs.webworker.port},
            proxyName: proxyName, proxyNickname: proxyNickname, vicinityType: vicinityType, onInit: vicinityArgs.onInit
        });   // Note: serves as a proxy
    }
	else if (vicinityArgs.server) {
		if (vicinityArgs.server.isHub){
			vicinityArgs.root = vicinityRoot; vicinityArgs.vicinityType = "ServerHubProxyVicinity";
			vicinity = new TM_gents__Vicinity(vicinityArgs);   // Note: serves as a proxy
		}
		else if (vicinityArgs.server.isTrueServer){
			vicinityArgs.root = vicinityRoot; vicinityArgs.vicinityType = "ServerVicinity";
			vicinity = new TM_gents__Vicinity(vicinityArgs);
		}
		else if (vicinityArgs.server.isTrueServerProxy){
			vicinityArgs.root = vicinityRoot; vicinityArgs.vicinityType = "ServerProxyVicinity";
			vicinity = new TM_gents__Vicinity(vicinityArgs);   // Note: serves as a proxy
		}
	}


    if (!vicinity) {
        vicinity = new TM_gents__Vicinity({ root: vicinityRoot, name: name, realname: realname, isChild: vicinityArgs.isChild,
			vicinityType: "LocalVicinity", onInit: vicinityArgs.onInit
		});
    }

    vicinity.onAgentPing = vicinityArgs.onAgentPing;

    vicinity.init();

    return vicinity;
};

TM_gents__Vicinity.prototype.getChildVicinity = function(vicinityArgs) {
    var name = vicinityArgs.name;
    var realname = vicinityArgs.realname;

    if (this.vicinities) {
        var knownvicinity = this.vicinities[name];
        if (knownvicinity) {
            return knownvicinity;
        }
    }

    var parentUrl = this.getUrl();
    vicinityArgs.rootPath = parentUrl.substr(parentUrl.indexOf("@")+1);
    vicinityArgs.isChild = true;

    var vicinity =  TM_gents__Vicinity.getVicinity(vicinityArgs);

    if (this.vicinities) {
        this.vicinities[vicinity._realname] = vicinity;
    }

    this.connect({connector: vicinity});

    return vicinity;
};

// Agent section (start)
TM_gents__Vicinity.prototype.loadEntity = function(name, type, entityArgs, notLive, isRestart) {
    var entity;
    var args = tm_g.cloneWithFunctions(entityArgs);
    var ltype = type.toLowerCase();

    switch (ltype)
    {
        case "agent":
            entity = this.loadAgentByName(name, args, notLive);
            if (isRestart || !entity.isAlive()) {
                entity.restart();
                entity.live();
            }
            break;
    }

    return entity;
};

TM_gents__Vicinity.prototype.loadAgent = function(agentArgs, notLive) {
	return this.loadAgentByName(agentArgs.name, agentArgs, notLive);
};

TM_gents__Vicinity.prototype.loadAgentByName = function(name, agentArgs, notLive) {
    var agt = this.getAgent(name, agentArgs);

    if (!agt.vicinity) {
        agt.vicinity = this;
    }

    if (notLive) {
        return agt;
    }
    else {
        agt.live();
    }

    return agt;
};


TM_gents__Vicinity.prototype.reloadAgent = function(agentArgs, notLive) {
    var name = agentArgs.name;
    var agent = agentArgs.agent;

    if (name) {
        return this.loadAgentByName(name, agentArgs, notLive);
    }
    else if (agent) {
        return this.loadAgentByName(agent._name, agentArgs, notLive);
    }
};

TM_gents__Vicinity.prototype.getAgent = function(name, agentArgs) {
	var agent = this.agents[name];
	if (agent) {
        if (!agent.vicinity) {
            agent.vicinity = this;
        }
		return agent;
	}

    agentArgs.name = name;

	if (typeof(TM_gents_NodeJS) != 'undefined') {
		agent = tm_agent.getAgent(agentArgs);
	}
	else {
		agent = TM_gents__Agent_getAgent(agentArgs);
	}

	this.addAgent(agent);

	agent.vicinity = this;
	this.subscribe({subscriber: agent});
	agent.init();

	if (agent.onArrival) {
	    agent.onArrival();
	}

	return agent;
};


TM_gents__Vicinity.prototype.addAgent = function(agent) {
	agent.vicinity = this;
	this.agents[agent._name] = agent;
};

TM_gents__Vicinity.prototype.findAgent = function(agentArgs) {
    switch(agentArgs.findMethod) {
        case "by-name":
            return this.agents[agentArgs.name];
            break;
    }
};

TM_gents__Vicinity.prototype.removeAgent = function(agent) {
    //agent.vicinity = null;  // TODO - determine if need to set null
    delete this.agents[agent._name];
};

TM_gents__Vicinity.prototype.stopAgents = function() {
    tm_g.each(this.agents, function(value, key) {
        var agent = value;
        agent.terminate();
    })
};

TM_gents__Vicinity.prototype.travelTo = function (travelArgs) {
    var agt = travelArgs.agent;
    // TODO: backup agent

    try {
        var vicinity = agt.vicinity;
        if (agt.onLeaving) {
            agt.onLeaving();
        }

        agt.terminate();

        agt.vicinity = null;
        var agtSer = agt.serialize();

        var to = travelArgs.to;
        if (to.indexOf("@") == -1) {
            to = "all@" + to;

        }
        var msgArgs = {
            header: {
                to: [to],
                ttl: 3,
                type: "agent-arrival"
            },
            "body": {
                "request": agtSer
            }
        };

        vicinity.postMessage({
            name: "msg", args: msgArgs
        });
    }
    catch (err) {
        if (agt) {
            var msg = "unable to transport " + agt._name + "\n\n" + err.message;
            tm_g.console.log(msg);
            if (this.onError) {
                this.onError(msg);
            }
        }

        // reinstate agent
        agt.vicinity = this;
        agt.live();
        return;
    }

    // clear agent tracking
    this.agents[agt._name] = null;
};


TM_gents__Vicinity.prototype.createHere = function(agentArgs) {
	var agt;
	var agtInfo = tm_g.parseWithFun(agentArgs);

	// Create bootstrap agent
	if (typeof(TM_gents_NodeJS) != 'undefined') {
		agt = tm_agent.getAgent(agtInfo);
	}
	else {
		agt = TM_gents__Agent.getAgent(agtInfo);
	}

	this.instantiateAgent(agt);

	return agt;
};


TM_gents__Vicinity.prototype.prepareToSend = function(agentArgs) {
	var agtInfoSer = tm_g.stringifyWithFun(agentArgs);

	return agtInfoSer;
};

TM_gents__Vicinity.prototype.arriveHere = function (agentSer) {
    var agt;
    var boot;

    // Create bootstrap agent
    if (typeof (TM_gents_NodeJS) != 'undefined') {
        boot = new tm_agent.TM_gents__Agent({});
    }
    else {
        boot = new TM_gents__Agent({});
    }

    agt = boot.deserialize(agentSer);

    this.instantiateAgent(agt);

    return agt;
};


TM_gents__Vicinity.prototype.instantiateAgent = function(agt) {
	this.addAgent(agt);

	agt.live();
};

TM_gents__Vicinity.prototype.agentPing = function(agt) {
    if (this.onAgentPing) {
        this.onAgentPing(agt);
    }
};
// Agent section (end)


TM_gents__Vicinity.prototype.getUrl = function() {
    return this._realname + "@" + this._rootPath + "/" + this._vName;
};

// if this connection is a not a proxy
TM_gents__Vicinity.prototype.isLocal = function() {
    var url = this.getUrl();	//TODO Change determination logic
    return (url.indexOf(":4") == -1 && url.indexOf("//www.") == -1) || url.indexOf("//localhost/") != -1 || this._isChild;
};


TM_gents__Vicinity.prototype._accept = function(connectionArgs) {
    // TODO: refactor old logic to create proxy Url.  Possibly pass Url from client proxy
    var thisUrl = this.getUrl();
    var indexOfPath = thisUrl.indexOf("@");
    var proxyUrl = connectionArgs.proxyName + thisUrl.substr(indexOfPath);

	if (connectionArgs.webworker) {
		this.connect({connector: {_url: proxyUrl + "/Proxy", getUrl: function() {return this._url;},
			webworker: {instance: self, shared: connectionArgs.webworker.shared, port: connectionArgs.webworker.port},
			proxyName: connectionArgs.proxyName, proxyNickname: connectionArgs.proxyNickname, name: connectionArgs.name }});
	}
	else if (connectionArgs.server.isTrueServer) {
		this.connect({connector: {_url: proxyUrl + "/Proxy", getUrl: function() {return this._url;},
			server: {instance: this, isTrueServer: true, socket: connectionArgs.server.socket },
            config: connectionArgs.config,
			proxyName: connectionArgs.proxyName, proxyNickname: connectionArgs.proxyNickname, name: connectionArgs.name }, partner: true});
	}
	else if (connectionArgs.server.isTrueServerProxy) {
		this.connect({connector: {_url: proxyUrl + "/Proxy", getUrl: function() {return this._url;},
			server: {instance: this, isTrueServerProxy: true, socket: connectionArgs.server.socket, partner: true },
            config: connectionArgs.config,
			proxyName: connectionArgs.proxyName, proxyNickname: connectionArgs.proxyNickname, name: connectionArgs.name }, partner: true});
	}

};

// ex. http://localhost:49999/vicinity/GUID
TM_gents__Vicinity.prototype.connect = function(connectionArgs) {
    var connector = connectionArgs.connector;
    var isPartner = connectionArgs.partner;

    if (connector === this) {  // can't connect to self
        if (this.onError) {
            this.onError("Cannot connect to self");
        }
        return null;
    }

    var connectorUrl = connector.getUrl();
    var thisUrl = this.getUrl();

    var connInfo = this._connections[connectorUrl];
    if (connInfo) {  // already connected then ignore

        if (connInfo.status == "Open") {
            return connInfo;
        }

        connInfo._connector.server.socket.disconnect();  // disconnect old socket

    }

    if (connectorUrl != thisUrl) {  // Note: prevent self subscription
        var connParts = connectorUrl.substr(connectorUrl.indexOf("//") + 2); // Note: expect 2 max colons

        var pathParts = connParts.split("/");   // localhost, etc.
        var hostParts = pathParts[0].split(":");   // localhost:49999
        var hostname = hostParts[0];
        var port = (hostParts.length > 1) ? hostParts[1] : null;
        var conn = null;

        switch (hostname) {
            case "localhost":
                // check if port exists for shared workers, etc.
                // if port and not local connection then act as a proxy or a stub
                if (port && !this.isLocal.call(connector) && !isPartner) {
                    isPartner = true;  // Note: this is a proxy
                    if (port == "49999") {  // special symbolic port for normal webworkers
                        if (connector.webworker) {  // server side
                            conn = new TM_gents__WebWorkerConnection({ "connector": connector, "onReceive": this.onReceive, caller: this });
                        }
                        else {
                            conn = new TM_gents__WebWorkerProxyConnection({ "connector": connector, "onReceive": this.onReceive, caller: this });
                        }
                    }
                    else {
                        if (connector.webworker) {
                            conn = new TM_gents__SharedWebWorkerConnection({ "connector": connector, "onReceive": this.onReceive, caller: this });
                        }
                        else {
                            conn = new TM_gents__SharedWebWorkerProxyConnection({ "connector": connector, "onReceive": this.onReceive, caller: this });
                        }
                    }
                }
                else {
                    conn = new TM_gents__LocalConnection({ "connector": connector, "onReceive": this.onReceive });
                }
                break;
            default:
                if (!this.isLocal.call(connector)) {	// if this connection is a proxy
					if (!isPartner) {
						isPartner = true;  // Note: this is a proxy
						if (connector.server) {
							if (connector.server.isHub) {
								conn  = new TM_gents__ServerHubProxyConnection({ "connector": connector, "onReceive": this.onReceive,
									"onOpen": this._onHubInit, "onError": this.onError, thisVicinity: this
								});
							}
						}
					}
					else {
						if (connector.server) {
							if (connector.server.isTrueServer) {
								conn  = new TM_gents__ServerConnection({ "connector": connector, "onReceive": this.onReceive,
									"onError": this.onError, thisVicinity: this, caller: this
								});
							}
							else if (connector.server.isTrueServerProxy) {
								conn  = new TM_gents__ServerProxyConnection({ "connector": connector, "onReceive": this.onReceive,
									"onOpen": this._onServerInit, "onError": this.onError, thisVicinity: this, caller: this
								});
							}
						}
						else {
							conn = new TM_gents__LocalConnection({ "connector": connector, "onReceive": this.onReceive });
						}
					}

                }
                else {
                    conn = new TM_gents__LocalConnection({ "connector": connector, "onReceive": this.onReceive });
                }
                break;
        }

        // connect to the other side but prevent infinite loop
        if (!isPartner) {
            connector.connect({connector: this, partner: true});
        }

        this.closeStaleConnections();
        conn._lastUsed = new Date();
        this._connections[conn._url] = conn;
    }
    else {
        if (this.onError) {
            this.onError("Cannot connect to self");
        }
    }

    return conn;
};

TM_gents__Vicinity.prototype.closeStaleConnections = function() {
    var now = new Date();
    var newArray = {};
    for (var key in this._connections) {
        conn = this._connections[key];

        var timeDiff = Math.abs(now.getTime() - conn._lastUsed.getTime());
        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (conn.status == "Open" && diffDays <= 1) {
            newArray[conn._url] = conn;
        }
    }
    this._connections = newArray;
};

// preserve this on the callback
TM_gents__Vicinity.prototype.setupHandler = function() {
    var ths = this;
    return function(event) {
        ths._onInit(event);
    }
};

TM_gents__Vicinity.prototype._onInit = function(e) {  // handle init from Stub in Proxy side
    var cmd = (e.data) ? e.data : e;
    var connector = cmd.args.connector;
    connector.getUrl = function() {return this._url;};  // method to meet interface
    connector.worker = this._worker;

    this._updateProxy({args: cmd.args});
    this.connect({connector: connector});  // send a stand-in connector

    if (this.onInit) {
        this.onInit(cmd);
    }
};

TM_gents__Vicinity.prototype._onHubInit = function(e) {  // handle init from Proxy side
    var ths = this.thisVicinity;

    if (ths.onInit) {
        ths.onInit(e);
    }
};

TM_gents__Vicinity.prototype._onServerInit = function(e) {  // handle init from Proxy side
	var ths = this.thisVicinity;

	if (ths.onInit) {
		ths.onInit(e);
	}
};

TM_gents__Vicinity.prototype.onError = function(e) {  // handle init from Stub in Proxy side
};

TM_gents__Vicinity.prototype.subscribe = function(subscriberArgs) {
    //if (!this._isProxy) {
        var subscriber = subscriberArgs.subscriber;
        if (subscriber.name != this._realname) {  // Note: prevent self subscription
            this._subscribers.push(subscriber);
        }
        else {
            if (this.onError) {
                this.onError("Cannot subscribe to self");
            }
        }
//    }
//    else {
//        if (this.onError) {
//            this.onError("Cannot subscribe to proxy");
//        }
//    }
};

TM_gents__Vicinity.prototype.onReceive = function(receiveArgs) {
    var cmd = receiveArgs;
    var args = cmd.args;

    switch(cmd.name) {
        case "msg":
            var nextCmd = this._getNextMessage(cmd);

            // reduce TTL
            nextCmd.args.header.ttl--;
            this._fireMessage(nextCmd, "receive");
            break;
        /* obsolete:
        case "init":
            this._updateProxy({args: cmd.args});
            this._onInit(cmd);
            break;
        */
        case "stop":
            TM_gents__Vicinity.stop(cmd.args);
            break;
    }

};

// get next message from queue
TM_gents__Vicinity.prototype._getNextMessage = function(cmd) {
    this._messageQueue.push(cmd);  // add to queue
    cmd.date = new Date();

    //TODO: combine messages, eliminate duplicates etc.
    var nextCmd = this._messageQueue.shift();  // get latest

    return nextCmd;
};

TM_gents__Vicinity.prototype.onMessage = function(messageArgs) {
    this._fireMessage(messageArgs);     // propagate message
};

TM_gents__Vicinity.prototype.postMessage = function(messageArgs) {
    // process locally
    if (this.onMessage) {
        this.onMessage(messageArgs);
    }

    this._fireMessage(messageArgs, "send");
};

TM_gents__Vicinity.prototype.reply = function(originalMessageArgs, response) {
    var msgArgs = {
        name: "msg",
        args: {
            header: {
                vTo: [originalMessageArgs.header.vFrom],
                ttl: 5
            },
            "body": {
                "response": response
            }
        }
    };

    this.postMessage(msgArgs);
};

/* _fireMessage: fire message to local subscribers
 messageArgs: message contents
 */
TM_gents__Vicinity.prototype._fireMessage = function (messageArgs, direction) {
    var cmd = messageArgs;
    var args = cmd.args;
    var sendToSubscribers = true;

    switch (cmd.name) {
        case "msg":
            this._initMessage(args);
            var vTo = args.header.vTo;
            var toList = args.header.to;
            var thisUrl = this.getUrl();
            var messageType = args.header.type;


            //TODO: Cache paths to prevent sending messages to vicinities that are not listed

            // Check absolute address
            sendToSubscribers = (vTo.length <= 0);

            for (var i = 0; i < vTo.length; i++) {
                var vicinityUrl = vTo[i];
                if (vicinityUrl.indexOf(thisUrl) != -1) {
                    sendToSubscribers = true;
                }
            }

            // check logical address "joe@vicinity1"
            if (sendToSubscribers) {
                sendToSubscribers = (toList.length <= 0);

                for (var i = 0; i < toList.length; i++) {
                    var to = toList[i];
                    var vicinityName = to.substr(to.indexOf("@") + 1);

                    if (to.indexOf("@") == -1) {    // no vicinity name "all"
                        sendToSubscribers = true;
                    }
                    else if (thisUrl.indexOf(vicinityName) != -1) { // target vicinity name "all@targetVicinity"
                        sendToSubscribers = true;
                    }
                }
            }

            if (sendToSubscribers) {
                var shouldInstantiate = (direction == "receive") ? true : false;  // true if instantiating an agent

                // send to other observers.  [Note: They can all hear each other]
                for (var i = 0; i < this._subscribers.length; i++) {
                    var subscriber = this._subscribers[i];
                    if (subscriber.onMessage) {
                        var hasProblem = subscriber.onMessage(args, this);
                        if (hasProblem) {
                            shouldInstantiate = false;
                        }
                    }
                }

                if (shouldInstantiate) {
                    switch (messageType) {
                        case "agent-arrival":
                            this.arriveHere(args.body.request);
                            return;             // don't propagate agent                            
                        case "agent-create":
                            this.createHere(args.body.request);
                            return;             // don't propagate agent 
                    }
                }
            }

            if (this._isProxy) {    // if a proxy then alter message so it can propagate
                if (direction == "send") {
                    switch (messageType) {
                        case "agent-create":
                            args.body.request = this.prepareToSend(args.body.request);
                            break;
                    }
                }
                else if (direction == "receive") { // remove vTo entry if a proxy and forward
                    var newvTo = [];
                    for (var i = 0; i < vTo.length; i++) {
                        var vicinityUrl = vTo[i];
                        if (vicinityUrl.indexOf(this.name) == -1) {
                            newvTo.push(vicinityUrl);
                        }
                    }
                    args.header.vTo = newvTo;

                    var lowerThisName = this.name.toLowerCase();
                    var lowerThisRealName = this._realname.toLowerCase();

                    var newTo = [];
                    for (var i = 0; i < toList.length; i++) {   // determine if vicinity should accept message
                        var to = toList[i];
                        var vicinityName = to.substr(to.indexOf("@") + 1);

                        if (lowerThisName == vicinityName.toLowerCase() ||
                            lowerThisRealName == vicinityName.toLowerCase() ||
                            this.isInGroup(vicinityName)) {
                            var t = to.replace("@" + vicinityName, "");
                            newTo.push(t);
                        }
                        else {
                            newTo.push(to);
                        }
                    }
                    args.header.to = newTo;
                }
            }


            // send to connected vicinities if TTL is greater > 0
            if (args.header.ttl > 0 && this._hasConnections()) {

                this._processToAddress(cmd.args);

                for (var key in this._connections) {
                    var conn = this._connections[key];

                    this._updateActivityStatus(conn, cmd.args);

                    if (conn.status == "Open") {
                        // don't send back to sender
                        if (!this._isOrigin(cmd.args, conn._url)) {
                            if (this._isATarget(cmd.args, conn._url, thisUrl)) {
                                var message = this._cloneMessage(cmd);

                                if (message.args.header.trail) {
                                    message.args.header.trail.push(thisUrl);
                                }

                                this._addCheckSum(message);
                                conn.send(message);
                            }
                        }
                    }
                }
            }
            break;
    }
};


// close if idle but reopen if reused.
TM_gents__Vicinity.prototype._updateActivityStatus = function(conn, msg) {
    if (conn._lastUsed) {
        var EXPIRE_LIMIT_HOURS = 24;
        var lastUsed = new Date(conn._lastUsed.getTime());
        var limitDate = lastUsed.addHours(EXPIRE_LIMIT_HOURS);
        var nowDate = new Date();

        if (limitDate < nowDate) {
            if (conn._url.indexOf(msg.header.vFrom)) {
                conn.status = "Open";
            }
            else {
                conn.status = "Closed";
            }
            return;
        }

        conn.status = "Open";
    }
    else {
        conn._lastUsed = new Date();
        conn.status = "Open";
    }

};

TM_gents__Vicinity.prototype._processToAddress = function(messageArgs) {
    // if there is an address in the to: field then if know that connection then
    // fill in vTo (actual address) and only send that connection.
    var header = messageArgs.header;
    var toList = header.to; // Note: "to:" is logical and within vicinity while vTo is actual and vicinity level

    for (var i=0; i<toList.length; i++) {
        var to = toList[i];
        var vicinityNameIndex = to.indexOf("@");

        if (vicinityNameIndex != -1) {
            var vicinityName = to.substr(vicinityNameIndex + 1);

            for (key in this._connections) {
                var conn = this._connections[key];
                if (conn._name == vicinityName) {
                    var alreadyContains = false;
                    var vToList = header.vTo;

                    for (j=0; j<vToList.length; j++) {
                        try {
                            vTo = vToList[j].ToLowerCase();
                            var connUrl = conn._url.ToLowerCase();

                            if (vTo == connUrl) {
                                alreadyContains = true;
                            }
                        }
                        catch (error) {

                        }
                    }
                    if (!alreadyContains) {
                        header.vTo.push(conn._url);
                    }

                }
            }
        }
        /*  Not Supported: messages with just a name or "all" will go to all connected vicinities based on TTL
        else {  // within local vicinity or unknown linked vicinity

        }
        */
    }
};


TM_gents__Vicinity.prototype._hasConnections = function() {
    return this._getNumConnections() > 0;
};

TM_gents__Vicinity.prototype._getNumConnections = function() {
    return this._getCount(this._connections);
};

TM_gents__Vicinity.prototype._getCount = function(obj) {
	return Object.keys(obj).length;
};

// returns if a vicinity or group is connected
TM_gents__Vicinity.prototype.targetVicinityIsConnected = function (criteria) {
    var connList = [];

    if (this._isProxy) {
        connList = this.listProxyConnections(criteria);
    }
    else {
        connList = this.listConnections(criteria);
    }

    return connList.length;
};

TM_gents__Vicinity.prototype.isInGroup = function (groupname) {
    if (this.config) {
        var criteriaGroup = groupname.toLowerCase();
        var groups = this.config.groups;

        for (var i = 0; i < groups.length; i++) {
            var group = groups[i].toLowerCase();
            if (group == groupname) {
                return true;
            }
        }

        return false;
    }
};

// Only supports groups filter at this time
// { groups: [group1,group2] }
TM_gents__Vicinity.prototype.listConnections = function (criteria) {
    var connList = [];

    var criteriaType = "default";

    try {
        if (criteria.name.indexOf("groups") != -1) {
            criteriaType = "groups";
        }
        else if (criteria.name.indexOf("name") != -1) {
            criteriaType = "name"
        }

        switch (criteriaType) {
            case "groups":
                var groups = criteria.groups;

                for (key in this._connections) {
                    var conn = this._connections[key];

                    var foundGroup = false;

                    if (conn.type == "LocalConnection") {  // assumes the group of the proxy
                        connList.push(conn._url);
                    }
                    else if (conn._config && conn._config.groups) {
                        var connGroups = conn._config.groups;

                        for (var i = 0; i < groups.length; i++) {
                            var criteriaGroup = groups[i].toLowerCase();

                            for (var j = 0; j < connGroups.length; j++) {
                                var group = connGroups[i].toLowerCase();
                                if (criteriaGroup == group) {
                                    foundGroup = true;
                                    connList.push(conn._url + ";lastAccessed:" + conn.lastUsed.getTime());
                                    break;
                                }
                            }

                            if (foundGroup) {
                                break;
                            }
                        }
                    }

                }
                break;
            case "name":
                var name = criteria.name;

                for (key in this._connections) {
                    var conn = this._connections[key];

                    var connName = conn._name;
                    if (connName.indexOf(name) != -1) {
                        connList.push(conn._url + ";lastAccessed:" + conn.lastUsed.getTime());
                        break;
                    }
                }
                break;
            default:
                break;
        }

    }
    catch (e) {
        // TODO: Handle error
    }

    return connList;

};

TM_gents__Vicinity.prototype.listProxyConnections = function (criteria) {
    for (key in this._connections) {
        var conn = this._connections[key];
        if (conn.type == "TM_gents__ServerHubProxyConnection") {
            return conn.listConnections(criteria);
        }
    }

    return [];
};

// Note: Messages should be light and not carry large objects
TM_gents__Vicinity.prototype._cloneMessage = function (msg) {
    var cache = [];
    var strData = JSON.stringify(msg, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    });
    cache = null;

    return JSON.parse(strData);
};

TM_gents__Vicinity.prototype._addCheckSum = function (msg) {
    var cache = [];
    var strMessage = JSON.stringify(msg, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    });
    cache = null;

    var hashCode = strMessage.hashCode();

    msg.checkSum = hashCode;
};

TM_gents__Vicinity.prototype._initMessage = function(args) {
    if (!args.header) {
        args.header = {};
    }
    var header = args.header;

    if (!header.vFrom) { header.vFrom = this.getUrl(); }    // assign origin if a new message
    if (!header.vTo) { header.vTo = []; }
    if (!header.number) { header.number = 1; header.total = 1; }
    if (!header.id) { header.id = ++this._messageNumber; }
    if (!header.ts) { header.ts = new Date(); }
    if (!header.ttl) {header.ttl = 1}
    if (!header.name ) {header.name = ""}
    if (!header.type ) {header.type = ""}
    if (!header.to ) {header.to = ["all"]}
    if (!header.from ) {header.from = ""}
    if (!header.attachments ) {header.attachments = {}}
    if (!header.name ) {header.name = ""}
    if (!header.priority ) {header.priority = ""}
    if (!header.trail ) {header.trail = []}
    if (!header.number ) {header.number = 1}
    if (!header.total ) {header.total = 1}

    if (!args.body) {
        args.body = {};
    }
    var body = args.body;

    if (!body.params ) {body.params = {}}
    if (!body.request ) {body.request = null}
    if (!body.response ) {body.response = null}
    if (!body.text ) {body.text = null}

    return args;
};

TM_gents__Vicinity.prototype._isOrigin = function(messageArgs, connUrl) {
    var trail = messageArgs.header.trail;
    var origin = messageArgs.header.vFrom;


    if (connUrl.indexOf(origin) != -1) {
        return true;
    }

    if (trail) {
        for (var i=0; i<trail.length; i++) {
            var stop = trail[i];
            if (connUrl.indexOf(stop) != -1) {
                return true;
            }
        }
    }

    return false;
};

// Checks if connection is a target
TM_gents__Vicinity.prototype._isATarget = function(messageArgs, connUrl, urlBase) {
    // Don't send if already part of the trail
    var trail = messageArgs.header.trail;
    for(var j=0; j<trail.length; j++) {
        if (trail[j] == urlBase) {
            return false;
        }
    }

    if (this._isProxy) {
        return true;        // pass through if this is a proxy
    }

    var targets = messageArgs.header.vTo;

    // Check if any of the targets match any of the connections
    if (targets && targets.length > 0) {
        for (var i=0; i<targets.length; i++) {
            var target = targets[i];
            if (connUrl.indexOf(target) != -1) {
                return true;
            }
        }
    }
    else {
        return true;  // default to send to all
    }

    return false;
};


TM_gents__Vicinity.prototype._updateProxy = function(updateArgs) {
    var currentUrl = updateArgs.args.url;

    var newGuid = updateArgs.args.guid;
    this._guid = newGuid;
    this._vName = updateArgs.args.vName;

    var conn = this._connections[currentUrl];
    if (conn) {
        // delete old connection
        delete this._connections[currentUrl];
        conn._url = this.getUrl() + "/Proxy";
        this._connections[conn._url] = conn;
    }
};

TM_gents__Vicinity.prototype._onMessage = function(messageArgs) {
    if (this.onMessage) {
        this.onMessage(messageArgs);
    }
};

TM_gents__Vicinity.prototype.init = function(initArgs) {
};

// Message definition (start)
/*
 var MessageArgs = {
 "header" : {
 "name": null,
 "type": null,
 "ttl": null,
 "to": [],
 "from": null,
 "attachments": [],
 "priority": null,
 "receiptRequired": false
 },
 "body" : {
 "params": {},
 "request": null,
 "response": null,
 "text": null
 }
 };
 */
// Message definition (end)



// Vicinity (end)

// Connection (start)
TM_gents__LocalConnection = function(constructorArgs) {
    this._connector = constructorArgs.connector;
    this._url = this._connector.getUrl();
    this._lastUsed = null;
    this.status = "Open";
    this.onReceive = constructorArgs.onReceive;
    this.type = "LocalConnection";
    this._name = this._connector.name;
    this._realname = this._connector._realname;
};

TM_gents__LocalConnection.prototype.open = function(openArgs) {
    this.status = "Open";
};

TM_gents__LocalConnection.prototype.send = function(sendArgs) {
    this.lastUsed = new Date();
    if (this._connector.receive) {
        this._connector.receive(sendArgs);
    }
    else {
        this._connector.onReceive(sendArgs);
    }

};

TM_gents__LocalConnection.prototype.receive = function(receiveArgs) {
    if (this.onReceive) {
        this.lastUsed = new Date();
        this.onReceive(receiveArgs);
    }
};

TM_gents__LocalConnection.prototype.onError = function(onErrorArgs) {
    this.status = "Error"
};

TM_gents__LocalConnection.prototype.close = function(closeArgs) {
    this.status = "Closed"
};



TM_gents__WebWorkerConnection = function(constructorArgs) {
    var urlParts = constructorArgs.connector.getUrl().split("@");
    this._connector = constructorArgs.connector;
    this._url = constructorArgs.connector.proxyName + "@" + urlParts[1];
    this._lastUsed = null;
    this.status = "Open";
    this.onReceive = constructorArgs.onReceive;
    this._connector.webworker.instance.onmessage = this.setupHandler();
    this._caller = constructorArgs.caller;
    this.type = "WebWorkerConnection";
    this._name = this._connector.proxyName;
    this._realname = this._name;
};


TM_gents__WebWorkerConnection.prototype.setupHandler = function() {
    var ths = this;
    return function(event) {
        ths._onmessage(event);
    }
};

TM_gents__WebWorkerConnection.prototype._onmessage = function(event) {
        this.receive(event.data);
};

TM_gents__WebWorkerConnection.prototype.open = function(openArgs) {
    this.status = "Open";
};

TM_gents__WebWorkerConnection.prototype.send = function(sendArgs) {
    this.lastUsed = new Date();
    this._connector.webworker.instance.postMessage(sendArgs);
};

TM_gents__WebWorkerConnection.prototype.receive = function(receiveArgs) {
    if (this.onReceive) {
        this.lastUsed = new Date();
        this.onReceive.call(this._caller, receiveArgs);
    }
};

TM_gents__WebWorkerConnection.prototype.onError = function(onErrorArgs) {
    this.status = "Error"
};

TM_gents__WebWorkerConnection.prototype.close = function(closeArgs) {
    this.status = "Closed"
};




TM_gents__WebWorkerProxyConnection = function(constructorArgs) {
    this._connector = constructorArgs.connector;
    this._url = this._connector.getUrl();
    this._lastUsed = null;
    this.status = "Open";
    this.onReceive = constructorArgs.onReceive;
    this._connector.worker.onmessage = this.setupHandler();
    this._caller = constructorArgs.caller;
    this.type = "WebWorkerProxyConnection";
    this._name = this._connector.name;
    this._realname = this._connector.realname;
};

TM_gents__WebWorkerProxyConnection.prototype.setupHandler = function() {
    var ths = this;
    return function(event) {
        ths._onmessage(event);
    }
};

TM_gents__WebWorkerProxyConnection.prototype._onmessage = function(event, ths) {
    this.receive(event.data);
};

TM_gents__WebWorkerProxyConnection.prototype.open = function(openArgs) {
    this.status = "Open";
};

TM_gents__WebWorkerProxyConnection.prototype.send = function(sendArgs) {
    this.lastUsed = new Date();
    this._connector.worker.postMessage(sendArgs);
};

TM_gents__WebWorkerProxyConnection.prototype.receive = function(receiveArgs) {
    if (this.onReceive) {
        this.lastUsed = new Date();
        this.onReceive.call(this._caller, receiveArgs);
    }
};

TM_gents__WebWorkerProxyConnection.prototype.onError = function(onErrorArgs) {
    this.status = "Error"
};

TM_gents__WebWorkerProxyConnection.prototype.close = function(closeArgs) {
    this.status = "Closed"
};



TM_gents__SharedWebWorkerConnection = function(constructorArgs) {
    var urlParts = constructorArgs.connector.getUrl().split("@");
    this._connector = constructorArgs.connector;
    this._url = constructorArgs.connector.proxyName + "@" + urlParts[1];
    this._lastUsed = null;
    this.status = "Open";
    this.onReceive = constructorArgs.onReceive;
    this._connector.webworker.port.onmessage = this.setupHandler();
    this._caller = constructorArgs.caller;
    this.type = "SharedWebWorkerConnection";
    this._realname = this._connector.proxyName;
    this._name = this._connector.proxyNickname;
};


TM_gents__SharedWebWorkerConnection.prototype.setupHandler = function() {
    var ths = this;
    return function(event) {
        ths._onmessage(event);
    }
};

TM_gents__SharedWebWorkerConnection.prototype._onmessage = function(event) {
    this.receive(event.data);
};

TM_gents__SharedWebWorkerConnection.prototype.open = function(openArgs) {
    this.status = "Open";
};

TM_gents__SharedWebWorkerConnection.prototype.send = function(sendArgs) {
    this.lastUsed = new Date();
    this.status = "Open";
    this._connector.webworker.port.postMessage(sendArgs);
};

TM_gents__SharedWebWorkerConnection.prototype.receive = function(receiveArgs) {
    if (this.onReceive) {
        this.lastUsed = new Date();
        this.onReceive.call(this._caller, receiveArgs);
    }
};

TM_gents__SharedWebWorkerConnection.prototype.onError = function(onErrorArgs) {
    this.status = "Error"
};

TM_gents__SharedWebWorkerConnection.prototype.close = function(closeArgs) {
    this.status = "Closed"
};


TM_gents__SharedWebWorkerProxyConnection = function(constructorArgs) {
    this._connector = constructorArgs.connector;
    this._url = this._connector.getUrl();
    this._lastUsed = null;
    this.status = "Open";
    this.onReceive = constructorArgs.onReceive;
    this._connector.worker.port.onmessage = this.setupHandler();
    this._caller = constructorArgs.caller;
    this.type = "SharedWebWorkerProxyConnection";
    this._name = this._connector.name;
    this._realname = this._connector.realname;
};

TM_gents__SharedWebWorkerProxyConnection.prototype.setupHandler = function() {
    var ths = this;
    return function(event) {
        ths._onmessage(event);
    }
};

TM_gents__SharedWebWorkerProxyConnection.prototype._onmessage = function(event, ths) {
    this.receive(event.data);
};

TM_gents__SharedWebWorkerProxyConnection.prototype.open = function(openArgs) {
    this.status = "Open";
};

TM_gents__SharedWebWorkerProxyConnection.prototype.send = function(sendArgs) {
    this.lastUsed = new Date();
    this._connector.worker.port.postMessage(sendArgs);
};

TM_gents__SharedWebWorkerProxyConnection.prototype.receive = function(receiveArgs) {
    if (this.onReceive) {
        this.lastUsed = new Date();
        this.onReceive.call(this._caller, receiveArgs);
    }
};

TM_gents__SharedWebWorkerProxyConnection.prototype.onError = function(onErrorArgs) {
    this.status = "Error"
};

TM_gents__SharedWebWorkerProxyConnection.prototype.close = function(closeArgs) {
    this.status = "Closed"
};





TM_gents__ServerHubProxyConnection = function (constructorArgs) {
    this._connector = constructorArgs.connector;
    this._url = this._connector.getUrl();
    this._lastUsed = null;
    this.status = "Open";
    this.onReceive = constructorArgs.onReceive;
    this._caller = constructorArgs.thisVicinity;
    this.type = "TM_gents__ServerHubProxyConnection";
    this._name = this._connector.source.name;
    this._realname = this._connector.source.realname;
    this._sourceUrl = this._connector.source.url;
    this._id = 0;
    this._recheckDuration = (this._connector.server.recheckDuration) ? this._connector.server.recheckDuration : 10000;  // 10 second default
    this._config = this._connector.config;
    this._hasConnectionIssues = false;

    this._VicinityHome = this._connector.target.root;

    this._setupTargetUrls(this._connector);

    this.open(constructorArgs);
};

// not prototype on purpose for constructor
TM_gents__ServerHubProxyConnection.prototype._setupTargetUrls = function(setupArgs) {
    var target = setupArgs.target;

    if (target.urls) {
        this._VicinityConnect = target.urls.Connect;
        this._VicinitySendMessage = target.urls.SendMessage;
        this._VicinityReceiveMessage = target.urls.ReceiveMessage;
        this._VicinityListConnections = target.urls.ListConnections;
    }
    else {
        this._VicinityConnect = this._VicinityHome + "/Services/VicinityService.asmx/Connect";
        this._VicinitySendMessage = this._VicinityHome + "/Services/VicinityService.asmx/SendMessage";
        this._VicinityReceiveMessage = this._VicinityHome + "/Services/VicinityService.asmx/ReceiveMessage";
        this._VicinityListConnections = this._VicinityHome + "/Services/VicinityService.asmx/ListConnections";
    }

};

TM_gents__ServerHubProxyConnection.prototype.setupHandler = function() {
    var ths = this;
    return function(event) {
        ths._onmessage(event);
    }
};

TM_gents__ServerHubProxyConnection.prototype.open = function (openArgs) {
    this.status = "Open";
    var ths = this;

    try {
        this._sendToService(
            this._VicinityConnect,
            { connectInfo: this._getConnectionInfo() },
            function (successArgs) {  // success
                tm_g.console.log("connect success");
                ths._id = successArgs;
                if (openArgs.onOpen) {
                    openArgs.onOpen(successArgs);
                }

                ths._longPoll();
            },
            function (errorArgs) {     // error
                tm_g.console.log("connect failed");

                this._hasConnectionIssues = true;
                if (openArgs.onError) {
                    openArgs.onError(errorArgs);
                }
            }
        );
    }
    catch (err) {
        tm_g.console.log("connection issue: " + err.description);

        this._hasConnectionIssues = true;
        if (openArgs.onError) {
            openArgs.onError({error: err});
        }
    }
};

TM_gents__ServerHubProxyConnection.prototype._getConnectionInfo = function() {
    var info = "name=" + this._name +
                "&realname=" + this._realname +
                "&url=" + this._sourceUrl;

    if (this._config && this._config.groups) {
        var groupList;
        var groups = this._config.groups;
        if (groups.length > 0) {
            groupList = groups[0];

            for (var i=1; i<groups.length; i++) {
                groupList += "," + groups[i];
            }
        }
        else {
            groupList = "all";
        }

        info += "&groups=" + groupList;
    }

    return info;
};

TM_gents__ServerHubProxyConnection.prototype.listConnections = function (listArgs) {
    var strCriteria = listArgs;
    var ths = this;
    var resendOnFail = (listArgs.resendOnFail != undefined) ? listArgs.resendOnFail : true;
    var connections = [];

    if (this._hasConnectionIssues) {
        return connections;
    }

    this._sendToService(
		this._VicinityListConnections,
		{ criteria: strCriteria },
		function (data) {
		    switch (data) {
		        case "closed":
		            listArgs.resendOnFail = false;
		            ths.open({
		                onOpen: function () {
		                    ths.listConnections(listArgs)
		                },
		                onError: ths.onError
		            });
		            break;
		        default:
		            connections = data;
		            break;
		    }
		},
		this.onError
	);

    return connections;
};


TM_gents__ServerHubProxyConnection.prototype.send = function (sendArgs) {

    if (this._ConnectionIssues) {
        return;
    }

    var strMessage = JSON.stringify(sendArgs);
    var ths = this;
    var resendOnFail = (sendArgs.resendOnFail != undefined) ? sendArgs.resendOnFail : true;

    this._sendToService(
		this._VicinitySendMessage,
		{ message: strMessage, id: this._id },
		function (data) {
		    switch (data) {
		        case "closed":
		            sendArgs.resendOnFail = false;
		            ths.open({
		                onOpen: function () {
		                    ths.send(sendArgs)
		                },
		                onError: ths.onError
		            });
		            break;
		    }
		},
		this.onError
	);
};

TM_gents__ServerHubProxyConnection.prototype.receive = function(receiveArgs) {

    if (this._hasConnectionIssues) {
        return;
    }
    
    var ths = this;

    this._sendToService(
        this._VicinityReceiveMessage,
		{ realname: this._realname, id: this._id },
        function (data) {
            if (data.length > 0) {  // if found data
                tm_g.console.log("receive success");

                for (var i=0; i<data.length; i++) {
                    var cmd = JSON.parse(data[i]);
                    var args = cmd.args;
                    switch (cmd.name) {
                        case "msg":
                            var header = args.header;
                            header.trail.push(ths._url);

                            if (ths.onReceive) {
                                ths.onReceive.call(ths._caller, cmd);
                            }
                            break;
                    }
                }
            }
        },
        this.onError
    );

};


TM_gents__ServerHubProxyConnection.prototype._longPoll = function(receiveArgs) {

    if (this._hasConnectionIssues) {
        return connections;
    }
    
    var ths = this;
    this._pollTimer = setInterval(function() {
            ths.receive(receiveArgs);
    }, this._recheckDuration);
};

TM_gents__ServerHubProxyConnection.prototype.onError = function(onErrorArgs) {
    this.status = "Error"
};

TM_gents__ServerHubProxyConnection.prototype.close = function(closeArgs) {
    this.status = "Closed"
};

TM_gents__ServerHubProxyConnection.prototype._sendToService = function (method, data, onSuccess, onError) {

    if (this._hasConnectionIssues) {
        return connections;
    }

    var cache = [];
    var strData = JSON.stringify(data, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    });
    cache = null;

    $.ajax({
        type: 'POST',
        url: method,
        async: false,
        data: strData,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        error: function (jqXHR, textStatus, errorThrown) {
            tm_g.console.log("Vicinity._sendToService \n\nAn error occurred: status=" + jqXHR.status + "\n\nresponse=" + jqXHR.statusText);
            rc = 0;

            if (onError) {
                onError({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown});
            }
        },
        success: function (data) {
            var jsonData = data.d;
            rc = 1;

            if (onSuccess) {
                onSuccess(jsonData);
            }
        }
    });
};





TM_gents__ServerConnection = function(constructorArgs) {
	var urlParts = constructorArgs.connector.getUrl().split("@");
	this._connector = constructorArgs.connector;
	this._url = constructorArgs.connector.proxyName + "@" + urlParts[1];
	this._lastUsed = null;
	this.status = "Open";
	this.onReceive = constructorArgs.onReceive;
	this._connector.server.socket.on("message", this.setupHandler());
    var ths = this;
    this._connector.server.socket.on("disconnect", function(){
        ths.status = "Closed";
    });
	this._caller = constructorArgs.caller;
	this.type = "ServerConnection";
	this._realname = this._connector.proxyName;
	this._name = this._connector.proxyNickname;
    this._config = this._connector.config;
};


TM_gents__ServerConnection.prototype.setupHandler = function() {
	var ths = this;
	return function(event) {
		ths._onmessage(event);
	}
};

TM_gents__ServerConnection.prototype._onmessage = function(event) {
	this.receive(event);
};

TM_gents__ServerConnection.prototype.open = function(openArgs) {
	this.status = "Open";
};

TM_gents__ServerConnection.prototype.send = function(sendArgs) {
	this.lastUsed = new Date();
	this.status = "Open";
	this._connector.server.socket.emit("message", sendArgs);
};

TM_gents__ServerConnection.prototype.receive = function(receiveArgs) {
	if (this.onReceive) {
		this.lastUsed = new Date();
		this.onReceive.call(this._caller, receiveArgs);
	}
};

TM_gents__ServerConnection.prototype.onError = function(onErrorArgs) {
	this.status = "Error"
};

TM_gents__ServerConnection.prototype.close = function(closeArgs) {
	this.status = "Closed"
};


TM_gents__ServerProxyConnection = function(constructorArgs) {
	this._connector = constructorArgs.connector;
	this._url = this._connector.getUrl();
	this._lastUsed = null;
	this.status = "Open";
	this.onReceive = constructorArgs.onReceive;
	this._caller = constructorArgs.caller;
	this.type = "ServerProxyConnection";
	this._name = this._connector.name;
	this._realname = this._connector.realname;

	this.setupConnection(constructorArgs);
};

TM_gents__ServerProxyConnection.prototype.setupConnection = function(connectionArgs, server) {
	this._connector = connectionArgs.connector;

	var connectInfo = {
		args: {
			name: this._connector.source.name,
			realname: this._connector.source.realname,
			url: this._connector.source.url,
			config: this._connector.config
		}
	};

    this._connector.server = this._connector.server || server;
	this._connector.server.socket = io.connect(connectionArgs.caller._rootPath);
	this._connector.server.socket.emit('start', connectInfo);
	this._connector.server.socket.on("message", this.setupHandler());

    var ths = this;
    this._connector.server.socket.off("disconnect").on("disconnect", function(){
        ths.setupConnection({
            caller: {
                _rootPath: ths._caller._rootPath
            },
            connector: {
                source: {
                    name: connectInfo.args.name,
                    realname: connectInfo.args.realname,
                    url: connectInfo.args.url
                },
                config: connectInfo.args.config

            }
        }, ths._connector.server); //reconnect
    });

    if (connectionArgs.onOpen) {
        connectionArgs.onOpen(this._connector);
    }
};

TM_gents__ServerProxyConnection.prototype.setupHandler = function() {
	var ths = this;
	return function(event) {
		ths._onmessage(event);
	}
};

TM_gents__ServerProxyConnection.prototype._onmessage = function(event, ths) {
	this.receive(event);
};

TM_gents__ServerProxyConnection.prototype.open = function(openArgs) {
	this.status = "Open";
};

TM_gents__ServerProxyConnection.prototype.send = function(sendArgs) {
    if (this.status == "Closed") {

    }

	this.lastUsed = new Date();
	this._connector.server.socket.emit("message", sendArgs);
};

TM_gents__ServerProxyConnection.prototype.receive = function(receiveArgs) {
	if (this.onReceive) {
		this.lastUsed = new Date();
		this.onReceive.call(this._caller, receiveArgs);
	}
};

TM_gents__ServerProxyConnection.prototype.onError = function(onErrorArgs) {
	this.status = "Error"
};

TM_gents__ServerProxyConnection.prototype.close = function(closeArgs) {
	this.status = "Closed"
};

// Connection (end)



// web worker (start)
var TM_gents__Vicinity_Ports = [];
var TM_gents__Vicinity_IsInnited = false;

/* Web Worker (start) */
TM_gents__Vicinity_Startup = function(cmd) {
    var port = cmd.args.port;
    switch(cmd.name) {
        case "start":
            TM_gents__Vicinity.start(cmd.args);
            break;
        case "stop":
            TM_gents__Vicinity.stop(cmd.args);
            break;
    }
};


// init vicinity if in worker process
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {

    self.onmessage = function(e) {
        var cmd = e.data;
        cmd.args.ths = self;
        TM_gents__Vicinity_Startup(cmd);
    }

	importScripts("tm-agent-base.js");

};

TM_gents__Vicinity.start = function(startArgs) {
    var ths = startArgs.ths;

    if (!TM_gents__Vicinity_IsInnited) {
        TM_gents__Vicinity_IsInnited = true;

        importScripts("tm-toolbox.js");

        var vicinityWW = TM_gents__Vicinity.getVicinity({
            name: startArgs.name + "-WW",
            realname: startArgs.realname + "-WW",
            webworker: {
                isTrue: true,
                isShared: false,
                port: startArgs.port
            },
            proxyName: startArgs.name
        });

        vicinityWW.subscribe({subscriber: {
            onMessage: function(messageArgs, vicinity) {
                tm_g.console.log(vicinity.name + ": " + messageArgs.body.text);


                if (messageArgs.body.request == "ping") {

                    vicinity.postMessage(
                        {
                            name: "msg",
                            args: {
                                "header" : {
                                    "name": null,
                                    "type": null,
                                    "ttl": 3,
                                    "to": ["all"],
                                    "from": vicinity.name,
                                    "attachments": [],
                                    "priority": null,
                                    "receiptRequired": false,
                                    "trail": []
                                },
                                "body" : {
                                    "params": {},
                                    "request": null,
                                    "response": "reply",
                                    "text": messageArgs.body.text + "Reply"
                                }
                            }
                        }
                    );
                }

            }
        }});

        ths.postMessage( {      // web worker (self) postMessage
            name: "init",
            args: {
                guid: vicinityWW._guid,
                url: vicinityWW.getUrl(),
                vName: vicinityWW.name,
                connector: {
                    _url: vicinityWW.getUrl() + "/Stub",
                    name: vicinityWW.name,
                    realname: vicinityWW.realname
                }
            }
        });
    }

};


TM_gents__Vicinity.stop = function(startArgs) {

};
/* Web Worker (end) */


/* Node JS (start) */
if (typeof(TM_gents_NodeJS) != 'undefined') {

	TM_gents__Vicinity_start = function(startArgs) {

		if (!TM_gents__Vicinity_IsInnited) {
			TM_gents__Vicinity_IsInnited = true;

			var vicinityServer = TM_gents__Vicinity.getVicinity({
				name: startArgs.name,
				realname: startArgs.realname,
				server: {
					isTrue: true,
					isTrueServer: true
				},
				proxyName: startArgs.name,
				rootPath: startArgs.rootPath
			});

			vicinityServer.subscribe({subscriber: {
				onMessage: function (messageArgs, vicinity) {
				    tm_g.console.log(vicinity.name + ": " + messageArgs.body.text);

					if (messageArgs.body.request == "ping") {

						vicinity.postMessage(
							{
								name: "msg",
								args: {
									"header": {
										"name": null,
										"type": null,
										"ttl": 3,
										"to": ["all"],
										"from": vicinity.name,
										"attachments": [],
										"priority": null,
										"receiptRequired": false,
										"trail": []
									},
									"body": {
										"params": {},
										"request": null,
										"response": "reply",
										"text": messageArgs.body.text + "Reply"
									}
								}
							}
						);
					}

				}
			}});

			return vicinityServer;
		}
	}

	module.exports.start = TM_gents__Vicinity_start;
}
/* Node JS (end) */