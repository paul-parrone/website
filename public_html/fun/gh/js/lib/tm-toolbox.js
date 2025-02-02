/*
 Copyright Â© 2014 by Tony Marius

 All rights reserved.
 */
// General Methods (start)
String.prototype.hashCode = function() {
	var hash = 0, i, chr, len;
	if (this.length == 0) return hash;
	for (i = 0, len = this.length; i < len; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

String.prototype.format = function() {
	var formatted = this;
	for (var arg in arguments) {
		formatted = formatted.replace("{" + arg + "}", arguments[arg]);
	}
	return formatted;
};

Date.prototype.addHours = function(h){
	this.setHours(this.getHours()+h);
	return this;
};

if(typeof Object.create !== "function") {
	Object.create = function (o) {
		function F() {}
		F.prototype = o;
		return new F();
	};
}

if(typeof Object.extend !== "function") {
	Object.extend = function (o) {
		for(prop in props) {
			if(props.hasOwnProperty(prop)) {
				obj[prop] = props[prop];
			}
		}
	};
}
// General Methods (end)

// Toolbox (start)
TM_gents__Toolbox = function(constructorArgs) {
};

TM_gents__Toolbox.prototype.clone = function (msg) {
    if (msg) {
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
    }

    return msg;
};

TM_gents__Toolbox.prototype.cloneWithFunctions = function (orig) {
	return jQuery.extend({}, orig);
};

TM_gents__Toolbox.prototype.isFunction = function (obj) {
	return jQuery.isFunction(obj);
};

TM_gents__Toolbox.prototype.findOne = function (arr, compareFunc) {
	if (arr) {
		for (var i = 0; i < arr.length; i++) {
			if (compareFunc(arr[i])) {
				return arr[i];
			}
		}
	}

	return null;
};

TM_gents__Toolbox.prototype.findAny = function (arr, compareFunc) {
	if (arr) {
		var results = [];
		for (var i = 0; i < arr.length; i++) {
			if (compareFunc(arr[i])) {
				results.push(arr[i]);
			}
		}

		return results;
	}

	return null;
};

TM_gents__Toolbox.prototype.remove = function (arr, ele) {
    for(var i=0; i<arr.length; i++) {
        if(arr[i] == ele) {
            arr.splice(i, 1);
            break;
        }
    }

	return arr;
};

TM_gents__Toolbox.prototype.each = function (arr, onEach) {
	if (arr) {
		if (this.isArray(arr)) {
			for (var i = 0; i < arr.length; i++) {
				var value = arr[i];
				onEach(value);
			}
		}
		else {
			for(var key in arr) {
				var value = arr[key];
				onEach(value, key);
			}
		}

		return arr;
	}

	return null;
};

TM_gents__Toolbox.prototype.isArray = function(obj) {
	if (!obj) { return false; }
	try {
		if (!(obj.propertyIsEnumerable("length"))
			&& (typeof obj === "object")
			&& (typeof obj.length === "number")) {
			for (var idx in obj) {
				if (!isNumeric(idx)) { return false; }
			} // for (var idx in object)
			return true;
		} else {
			return false;
		} // if (!(obj.propertyIsEnumerable("length"))...
	} catch (e) {
		return false;
	} // try
}; // isArray()

TM_gents__Toolbox.prototype.logInit = function (onInitLogger) {
	if (onInitLogger) {
		onInitLogger();
	}
	else {
		if (!tm_g.console) {
			tm_g.console = {
				log: function(data) {
				}
			}
		}

		if (!tm_g.log) {
			tm_g.log = {
				info: function(data) {
				}
			}
		}
	}
};

TM_gents__Toolbox.prototype.generateUUID = function(){
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x7|0x8)).toString(16);
	});
	return uuid;
};

TM_gents__Toolbox.prototype.stringifyWithFun = function (obj,handler) {
	var o = JSON.stringify(obj,handler);
	var a = JSON.parse(o); //Get base
	var p, b;
	for (i in obj) {
		if (typeof obj[i] == "function") {
			a[i] = {};
			a[i]['function'] = true;
			var x = obj[i].toString();

			if (x.indexOf("anonymous") == -1) {
				x = x.replace(/NN\/\*\*\/\)/,")")
					.replace(/function\s*\((.*?)\s*\)/,
					function (match, $1, $2, offset, original) {
						p = $1;
						return "";
					})
					.replace(/(\{NN)\s*\{/,"{")
					.replace(/\}NN}$/,"NN}")
					.replace(/NN/g,"\n");
			}
			else {
				x = x.replace(/(\n)|(^ *)/g, "NN")	// remove line breaks
					.replace(/NN\/\*\*\/\)/,")")
					.replace(/function\s*anonymous\s*\((.*?)\s*\)/,     // if anonymous function
					function (match, $1, $2, offset, original) {
						p = $1;
						return "";
					})
					.replace(/^NN\s*{/,"{")
					.replace(/\{(NN)+\s*\{/,"{")
					.replace(/\}NN}$/,"NN}")
					.replace(/NN/g,"\n");
			}

			if (i == "live") {	// support debugging
				x = x.replace("//debugger","debugger");
			}
			x = x.replace("//aig-debugger","debugger");

			a[i]['body'] = [p, x];
		}
	}
	return JSON.stringify(a);

}

TM_gents__Toolbox.prototype.parseWithFun = function(str) {
	var a = JSON.parse(str);
	for (i in a) {
		if (a[i] && a[i].function) {
			var func = a[i];
			var formattedBody = func.body[1].replace("\r\t","\n")
				.replace(/^\s*\{/,"")   // remove beginning and ending braces
				.replace(/\}\s*$/,"");
			a[i] = new Function(func.body[0],formattedBody);
		}
	}
	return a;
}


// PriorityManager (start)
TM_gents__PriorityManager = (function(constructorArgs) {

	return function (constructorArgs) {

		this.type = "TM_gents__PriorityManagerRoundRobin";
		this.increment = 1;
		this.minimum = -500;
		this.maximum = 500;
		this.onMaximumReached = null;
		this.onMinimumReached = null;
		this.currentHigh = 0;
		this.currentLow = 0;

		this.init = function (initArgs) {
			var items = initArgs.items;
			var numItems = items.length;

			// set priority
			for (var i= 0, j= numItems; i<numItems, i++; j--){
				var item = items[i];
				item.priority = j;
			}

			this.minimum = 1;
			this.maximum = numItems;

			// set defaults
			for (var i= 0, j=numItems; i<numItems; i++, j--){
				var item = items[i];
				if (!item.done) {item.done = false;}
				if (!item.attempts) {item.attempts = 3;}
				if (!item.active) {
					item.active = { "expireType": "never", "expires": null, "reinstateType": "immediately", "reinstates": null };
				}
				item.goalScore = 0;
				item.riskScore = 0;
				item.priority = j;
			}
		};

		this.getTopTask = function(items) {
			var data = items.sort(function (a, b) {
				return b.priority > a.priority;
			});

			return data[0];
		};

		this.recalibrate = function (itemArgs) {
			// assume sorted based on priority
			var items = itemArgs.items;
			var numItems = items.length;

			// re-prioritize executed thoughts
			var dataExecuted = this.recalibrateByFilter(items, 1, 0, function (thought) {
				return thought.executed;
			});

			if (dataExecuted.length) {
				// re-prioritize non-executed thoughts
				var dataNotExecuted = this.recalibrateByFilter(items, 0, dataExecuted.length, function (thought) {
					return !thought.executed;
				});
			}

			if (!itemArgs.dontSort) {
				items.sort(function (a, b) {
					return b.priority - a.priority;
				});
			}

			return items;
		};

		this.recalibrateByFilter = function(items, reorderStart, priorityStart, filter) {
			var data = tm_g.findAny(items, filter);

			if (data.length) {
				var numItems = data.length;

				if (reorderStart) {
					var item = data[0];
					item.priority = 1 + priorityStart;
				}

				var maxPriority = numItems + priorityStart;

				// set priority
				for (var i=reorderStart, j=maxPriority; i<numItems; i++, j--){
					var item = data[i];
					item.priority = j;
				}
			}

			return data;
		};

		this.onMaximumReached = function (thoughtArgs) {
		};

		this.increasePriority = function (thoughtArgs, thought, amount) {
		};

		this.decreasePriority = function (thoughtArgs, thought, amount) {
		};

		this.onPassedThoughtCondition = function (thoughtArgs) {
		};

		this.onFailedThoughtCondition = function (thoughtArgs) {
		};

		this.onAddedThought = function (thoughtArgs) {
		};

		this.onRestThought = function (thoughtArgs) {
		};

		this.onTaskDone = function (taskArgs) {
		};

		this.onAddedTask = function (taskArgs) {
		};

		this.onRestTask = function (taskArgs) {
		};

		this.onApplyGoal = function (goalArgs) {
		};

		this.onApplyRisk = function (riskArgs) {
		};
	}

})()

TM_gents__PriorityManagerRoundRobin = TM_gents__PriorityManager;	// default


TM_gents__PriorityManagerLeastUsed = function() {
	this.type = "TM_gents__PriorityManagerLeastUsed";
};

TM_gents__PriorityManagerLeastUsed.prototype = new TM_gents__PriorityManager();
TM_gents__PriorityManagerLeastUsed.prototype.constructor = TM_gents__PriorityManagerLeastUsed;

TM_gents__PriorityManagerLeastUsed.prototype.recalibrate = function (itemArgs) {
	// assume sorted based on priority
	var items = itemArgs.items;
	var numItems = items.length;

	// re-prioritize executed thoughts
	var dataExecuted = this.recalibrateByFilter(items, 0, 0, function (thought) {
		return thought.executed;
	});

	if (dataExecuted.length) {
		// re-prioritize non-executed thoughts
		var dataNotExecuted = this.recalibrateByFilter(items, 0, dataExecuted.length, function (thought) {
			return !thought.executed;
		});
	}

	if (!itemArgs.dontSort) {
		items.sort(function (a, b) {
			return b.priority - a.priority;
		});
	}

	return items;
};

TM_gents__PriorityManagerLeastUsed.prototype.recalibrateByFilter = function(items, reorderStart, priorityStart, filter) {
	var data = tm_g.findAny(items, filter);

	if (data.length) {
		var numItems = data.length;

		// set priority
		for (var i = reorderStart; i < numItems; i++) {
			var item = data[i];
			item.priority = -item.runs;
		}
	}

	return data;
};


TM_gents__PriorityManagerMostUsed = function() {
	this.type = "TM_gents__PriorityManagerLeastUsed";
};

TM_gents__PriorityManagerMostUsed.prototype = new TM_gents__PriorityManager();
TM_gents__PriorityManagerMostUsed.prototype.constructor = TM_gents__PriorityManagerMostUsed;

TM_gents__PriorityManagerMostUsed.prototype.recalibrate = function (itemArgs) {
	// assume sorted based on priority
	var items = itemArgs.items;
	var numItems = items.length;

	// re-prioritize executed thoughts
	var dataExecuted = this.recalibrateByFilter(items, 0, 0, function (thought) {
		return thought.executed;
	});

	if (dataExecuted.length) {
		// re-prioritize non-executed thoughts
		var dataNotExecuted = this.recalibrateByFilter(items, 0, dataExecuted.length, function (thought) {
			return !thought.executed;
		});
	}

	if (!itemArgs.dontSort) {
		items.sort(function (a, b) {
			return b.priority - a.priority;
		});
	}

	return items;
};

TM_gents__PriorityManagerMostUsed.prototype.recalibrateByFilter = function(items, reorderStart, priorityStart, filter) {
	var data = tm_g.findAny(items, filter);

	if (data.length) {
		var numItems = data.length;

		// set priority
		for (var i = reorderStart; i < numItems; i++) {
			var item = data[i];
			item.priority = item.runs;
		}
	}

	return data;
};



TM_gents__PriorityManagerMostEffective = function() {
	this.type = "TM_gents__PriorityManagerMostEffective";
}

TM_gents__PriorityManagerMostEffective.prototype = new TM_gents__PriorityManager();
TM_gents__PriorityManagerMostEffective.prototype.constructor = TM_gents__PriorityManagerMostEffective;

TM_gents__PriorityManagerMostEffective.prototype.init = function (initArgs) {
	var items = initArgs.items;
	var numItems = items.length;

	// set priority
	for (var i= 0, j= numItems; i<numItems, i++; j--){
		var item = items[i];
		item.priority = j;
	}

	this.minimum = 1;
	this.maximum = numItems;

	// set defaults
	for (var i= 0, j=numItems; i<numItems; i++, j--){
		var item = items[i];
		if (!item.done) {item.done = false;}
		if (!item.attempts) {item.attempts = 3;}
		if (!item.active) {
			item.active = { "expireType": "never", "expires": null, "reinstateType": "immediately", "reinstates": null };
		}
		item.priority = j;
	}

	this.recalibrateByFilter(items, 0, items.length, function (thought) {
		return thought.id != 0;
	});

	items.sort(function (a, b) {
		return b.priority - a.priority;
	});
};

TM_gents__PriorityManagerMostEffective.prototype.recalibrate = function (itemArgs) {
	// assume sorted based on priority
	var items = itemArgs.items;
	var numItems = items.length;

	// re-prioritize executed thoughts
	var dataExecuted = this.recalibrateByFilter(items, 0, 0, function (thought) {
		return thought.executed;
	});

	if (dataExecuted.length) {
		// re-prioritize non-executed thoughts
		var dataNotExecuted = this.recalibrateByFilter(items, 0, dataExecuted.length, function (thought) {
			return !thought.executed;
		});
	}

	if (!itemArgs.dontSort) {
		items.sort(function (a, b) {
			return b.priority - a.priority;
		});
	}

	return items;
};

TM_gents__PriorityManagerMostEffective.prototype.recalibrateByFilter = function(items, reorderStart, priorityStart, filter) {
	var data = tm_g.findAny(items, filter);

	if (data.length) {
		var numItems = data.length;

		// set priority
		for (var i = reorderStart; i < numItems; i++) {
			var item = data[i];

			item.priority = 0;

			if (item.response && item.response.status != 200) {
				continue;
			}

			if (item.evaluation.quality) {
				item.priority += item.evaluation.quality;
			}
			else {
				item.priority += 5;
			}

			if (item.evaluation.performance) {
				item.priority += item.evaluation.performance;
			}
			else {
				item.priority += 5;
			}

			if (item.goalScore) {
				item.priority += item.goalScore;
			}

			if (item.riskScore) {
				item.priority += item.riskScore;
			}
		}
	}

	return data;
};

TM_gents__PriorityManagerMostEffective.prototype.getTopTask = function(items) {
	this.recalibrate({items: items});

	var data = items.sort(function (a, b) {
		return b.priority > a.priority;
	});

	return data[0];
};

TM_gents__PriorityManagerMostEffective.prototype.onApplyGoal = function (goalArgs) {
	var thght = goalArgs.thought;
	var goal = goalArgs.goal;
	thght.goalScore = goal.priority;
};

TM_gents__PriorityManagerMostEffective.prototype.onApplyRisk = function (riskArgs) {
	var thght = riskArgs.thought;
	var risk = riskArgs.risk;
	thght.riskScore = (risk.severity * risk.likelihood) / 10;
};

TM_gents__PriorityManagerCreate = function(type) {
	var val = type.toLowerCase();
	switch (val) {
		case "most-used":
			priorityManager = new TM_gents__PriorityManagerMostUsed();
			break;
		case "least-used":
			priorityManager = new TM_gents__PriorityManagerLeastUsed();
			break;
		case "most-effective":
			priorityManager = new TM_gents__PriorityManagerMostEffective();
			break;
		case "round-robin":
		default:
			priorityManager = new TM_gents__PriorityManagerRoundRobin();
			break;
	}

	return priorityManager;
};

// PriorityManager (end)



var tm_g = new TM_gents__Toolbox();

if (typeof(TM_gents_NodeJS) != 'undefined') {
	module.exports = tm_g;
}

// Toolbox (end)