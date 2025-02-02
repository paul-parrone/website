/*
 Copyright © 2014 by Tony Marius

 All rights reserved.
 */

// Memory (start)
TM_gents__Memory = (function (constructorArgs) {
	return function (constructorArgs) {

		this._shortTerm = new TM_gents__ShortTermMemory(20);
		this._behaviorFacts = [];
		this._factRanges = [];
		this._longTerm = constructorArgs.longTerm;

		this._findActualFact = function (factArgs) {
			var name = factArgs.name;
			var behaviorFacts = this._behaviorFacts;
			for (var i=0; i<behaviorFacts.length; i++) {
				var fact = tm_g.findOne(behaviorFacts[i], function (fct) {
					return fct.name == name;
				});
			}


			if (!fact) {
				if (this._longTerm) {
					fact = this._longTerm.getFact(name);
				}
			}

			return fact;
		};

		this.remember = function (name, value) {
			var fact = this._shortTerm.getFact(name);         // find out if location of fact is already known
			if (fact) {
				fact.referrenced++;
				fact.value = value;
				return;
			}

			fact = this._findActualFact({ name: name });       // find actual location for fact
			if (fact) {
				fact.referrenced++;
				this._shortTerm.setFact(name, fact);
			}
			else {
				fact = { name: name, value: value, referrenced: 1 };
				this._shortTerm.setFact(name, fact);
			}

			if (fact.referrenced > 10) {                    // store frequently referrenced items in long-term memory
				if (this._longTerm) {
					this._longTerm.setFact(name, fact);
					fact.referrenced = 1;
				}
			}
		};

		this.recall = function (name) {
			var fact = this._getFact(name);

			if (fact) {
				return fact.value;
			}

			return "??";
		}

		this._getFact = function (name) {
			var fact = this._shortTerm.getFact(name);         // find out if location of fact is already known
			if (fact) {
				fact.referrenced++;
				return fact;
			}

			fact = this._findActualFact({ name: name });       // find actual location for fact
			if (fact) {
				fact.referrenced++;
				this._shortTerm.setFact(name, fact);

				if (fact.referrenced > 10) {                    // store frequently referrenced items in long-term memory
					if (this._longTerm) {
						this._longTerm.setFact(name, fact);
						fact.referrenced = 1;
					}
				}
			}

			return fact;
		};

		this.know = function(name) {
			var fact = this.recall(name);

			if (fact != "??") {
				return true;
			}

			return false;
		};

		this.conclude = function (name) {
			var fact = this._getFact(name);
			var concludeArgs = { name: name, fact: fact };
			return this._conclude(concludeArgs);
		};

		this.learn = function (learnArgs) {
			var ths = this;
			if (learnArgs.facts) {
				this._behaviorFacts.push(learnArgs.facts);

				tm_g.each(learnArgs.facts, function (value, name) { // add each element to short-term memory
					var fact = value;
					fact.referrenced = 1;
					ths._shortTerm.setFact(fact.name, fact);
				}, ths);
			}

			if (learnArgs.factRanges) {
				tm_g.each(learnArgs.factRanges, function (value, name) {
					var range = value;
					ths._factRanges.push(range);
				}, ths);
			}
		};

		this._conclude = function (concludeArgs) {
			// look through ranges to see if a conclusion can be made
			var ths = this;
			var name = concludeArgs.name;
			var range = tm_g.findOne(this._factRanges, function (range) {
				return range.name == name;
			});

			var conclusion = "??";

			if (range) {
				var fact = concludeArgs.fact;
				// go through each element and compare range
				var compareFunc = (range.onCompareRange) ? range.onCompareRange : this.defaultCompareRange;
				var compareArgs = { rangeItem: null, value: fact.value, conclusion: "??" };

				var ths = this;
				tm_g.findOne(range.sections, function (value) {
					var item = value;
					compareArgs.rangeItem = item;
					compareArgs.conclusion = conclusion;
					compareFunc(compareArgs);

					if (compareArgs.conclusion != "??") {
						return true;
					}

					return false;
				}, ths);

				conclusion = compareArgs.conclusion;
			}

			return conclusion;
		};

		this.defaultCompareRange = function (compareArgs) {
			var value = compareArgs.value;
			var rangeItem = compareArgs.rangeItem;

			if (value >= rangeItem.start && value <= rangeItem.end) {
				compareArgs.conclusion = rangeItem.name;
			}
		};

		this.onPreSerializing = function (serializeArgs) {
			return true;
		};

		this.onSerialize = function (serializeArgs) {
			if (this.onPreSerializing({})) {
				var memory = tm_g.stringifyWithFun(this);
				var shortTerm = tm_g.stringifyWithFun(this._shortTerm);

				return {
					memory: memory,
					shortTerm: shortTerm
				};
			}
		};

		this.onDeserialize = function (deserializeArgs) {
			var memory = tm_g.parseWithFun(deserializeArgs.memory);
			var shortTerm = tm_g.parseWithFun(deserializeArgs.shortTerm);

			memory._shortTerm = shortTerm;
			return memory;
		};
	}

})();

// Memory (end)

// Short Term Memory (start)
TM_gents__ShortTermMemory = (function (constructorArgs) {

	return function (constructorArgs) {
		this._cache = [];
		this._cacheLimit = constructorArgs.itemLimit || 20;

		this._removeLeastUsedItems = function () {
			var arr = this._cache.sort(function (first, second) {
				var sts = first.referrenced - second.referrenced;
				if (sts == 0) {  // compare dates next
					sts = first.lastAccessed.getTime() - second.lastAccessed.getTime();
				}
				return sts;
			});

			while (arr.length >= this._cacheLimit) {
				arr.shift;
			}
			this._cache = arr;

			return removedObj;
		};

		this.setFact = function (name, value) {
			var fact = this.getFact(name);

			if (!fact) {
				if (this._cache.length >= this._cacheLimit) {
					this._removeLeastUsedItems();
				}

				fact = value;
				this._cache.push(fact);
			}

			fact.lastAccessed = new Date();

			return fact;
		};

		this.getFact = function (name) {
			var fact = tm_g.findOne(this._cache, function (value) {
				var item = value;

				if (item.name == name) {
					return true;
				}

				return false;
			});

			return fact;
		};
	}
})();

// Short Term Memory (end)


// Thoughts and Tasks (start)
/*
 Steps
 1. think
 2. do
 3. evaluate
 4. conclude

 TODO
 -- connect internal thoughts to behavior thoughts
 -- connect questions to thoughts
 -- pulse start, pulse end
 -- risks (effects priority)
 -- goals (effects priority)
 */


// Thoughts (start)
TM_gents__Thoughts = (function (constructorArgs) {
	return function (constructorArgs) {

		this._thoughts = [];
		this._onThought = null;
		this._currentThought = null;
		this._maxThoughtId = 0;
		this._conclusionProviders = [];
		this._priorityManager = new TM_gents__PriorityManager();
		this._hasProcessedOnce = false;

		this.organizeThoughts = function (thoughtArgs) {
		};

		this.getThoughts = function () {
			return this._thoughts;
		};

		this.setThoughts = function (agentName, newThoughts, newTasks) {
			var ths = this;
			tm_g.each(newThoughts, function (value, key) {
				var thght = value;
				thght.agentName = agentName;
				thght.evaluation = {};
				thght.response = { status: 200 }; // default
				thght.attemptsTried = 0;

				if (!tm_g.isFunction(thght.onCondition)) {
					thght.onCondition = newTasks[thght.onCondition]; // pull function from tasks
				}

				ths._thoughts.push(thght);
			});

			this._priorityManager.init({items: newThoughts});
		};

		this.getActiveThoughts = function () {
			var data = tm_g.findAny(this.getThoughts(), function (thought) {
				return thought.done == false;
			});

			if (this._hasProcessedOnce) {
				// reorder thoughts based on priority manager
				this._priorityManager.recalibrate({items: data});
			}

			this._thoughts = data;
			return data;
		};

		this.process = function (thoughtProcessArgs) {

			var arr = this.getActiveThoughts();
			this._hasProcessedOnce = true;
			var ths = this;

			// reset processing status
			tm_g.each(arr, function (value, key) {
				var thght = value;
				thght.processed = false;
				thght.executed = false;
				if (!thght.runs) {thght.runs = 0;}

				this._currentThought = thght;
				thoughtProcessArgs.thought = this._currentThought;
				thoughtProcessArgs.thoughts = arr;

				// perform then do success or failure action
				if (thoughtProcessArgs.onThought) {
					thoughtProcessArgs.onThought(value, key);
				}

				ths.processThought(thoughtProcessArgs);

				tm_g.log.info("Thoughts.process.thght: " + thght.name);

			});

			return 0;
		};

		this.processThought = function (thoughtProcessArgs) {
			// go to next thought based on instruction in thought.
			var thght = thoughtProcessArgs.thought;
			var tasks = thoughtProcessArgs.tasks;
			var thghts = thoughtProcessArgs.thoughts;

			thght.processed = true; // mark as processed so won't be pulled again

			if (thght.onCondition) {
				if (thght.onCondition({ thought: thght, ths: this, agent: thoughtProcessArgs.agent })) {
					this._priorityManager.onPassedThoughtCondition({ thought: thght, agent: thoughtProcessArgs.agent });
					tasks.add(thoughtProcessArgs);
					var msg = "Thought.processThought.passedCondition: " + thght.agentName + ": " + " priority: " + thght.priority;
					tm_g.log.info(msg);
					tm_g.console.log(msg);
				}
				else {
					this._priorityManager.onFailedThoughtCondition({ thought: thght, agent: thoughtProcessArgs.agent });
					var msg = "Thought.processThought.failedCondition: " + thght.agentName + ": " + " priority: " + thght.priority;
					tm_g.log.info(msg);
					tm_g.console.log(msg);
				}
			}
			else {
				tasks.add(thoughtProcessArgs);

				if (thght.name != "rest") {
					this._priorityManager.onAddedThought({ thought: thght, agent: thoughtProcessArgs.agent });
				}
			}

			if (thght.name == "rest") {
				this._priorityManager.onRestThought({ thought: thght, agent: thoughtProcessArgs.agent });
				return null;
			}

		};

		this.getNextThought = function (thoughtArgs) {
			var thght = thoughtArgs.current;
			var thghts = thoughtArgs.all;

			// get unprocessed thoughts that are left and take first one
			var data = tm_g.findAny(thghts, function (thought) {
				return thought.processed == false;
			});


			var arr = data;

			return arr[0];
		};

		this.addConclusionProvider = function (conclusionArgs) {
			this._conclusionProviders.push(conclusionArgs);
		};

		this.conclude = function (name) {

			var conclusions = [];

			tm_g.each(this._conclusionProviders, function (value, key) {
				var concludeArgs = value;
				var onConclude = concludeArgs.provider;

				// perform then do success or failure action
				if (onConclude) {
					var conclusion = onConclude.call(concludeArgs.ths, name);
					conclusions.push(conclusion);
				}
			});

			return conclusions.join(",");
		};

		// incorporate thoughts in compartmentalized fashion
		this.learn = function (thoughtArgs) {
			if (thoughtArgs.thoughts) {
				this.setThoughts(this._agentName, thoughtArgs.thoughts, thoughtArgs.tasks);
				this._onThought = thoughtArgs.onThought;
			}

			this.assignIds();

			// TODO: check if set of thoughts exist.  if they do then update if not then add decentralized.
		};

		this.assignIds = function () {
			var id = this._maxThoughtId;
			var thghts = this.getThoughts();

			tm_g.each(thghts, function (value, key) {
				id++;
				var thght = value;
				thght.id = id;
				thght.processed = false;
			});

			this._maxThoughtId = id;
		};

		this.add = function (thoughtArgs) {
			var thght = thoughtArgs.thought;
			var thghts = this.getThoughts();
			thghts.push(thght);

			this._maxThoughtId++;
			thght.id = this._maxThoughtId;
			thght.processed = false;
		};

		this.findThought = function (thoughtFindArgs) {
			var thghts = this.getThoughts();
			var thght = tm_g.findOne(thghts, function (thought) {
				if (thought.name == thoughtFindArgs.name) {
					return true;
				}

				return false;
			});

			return thght;
		};

		this.remove = function (thoughtArgs) {
		};

		this.notice = function (noticeArgs) {
			if (noticeArgs.msg == "arrived") {
				var thght = {
					"name": "onArrived", "done": false, "onSuccess": "next", "onFailure": "next", "attempts": 1, "priority": 1000, "expires": "immediately",
					"arrivedArgs": {
						"from": noticeArgs.from
					}
				};

				var thghts = this.getThoughts();
				thghts.push(thght);
			}
		};

		this.onPreSerializing = function (serializeArgs) {
			return true;
		};

		this.onSerialize = function (obj, prop) {
			var cache = [];
			var serObj = tm_g.stringifyWithFun(obj, function(key, value) {
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

			return serObj;
		};
	}
})();

// Thoughts (end)

// Tasks (start)
TM_gents__Tasks = (function(constructorArgs) {
	return function (constructorArgs) {
		this._tasks = [];
		this._currentTask = null;
		this._cacheTasks = null;
		this._pulse = "end";
		this._beat = 0;
		this._priorityManager = new TM_gents__PriorityManager();
		this._thoughts = null;

		this.init = function(initArgs) {
		};

		this.organizeTasks = function(taskArgs) {
			tm_g.each(arr, function (key, value) {
			});
		};

		this.getTasks = function () {
			return this._tasks;
		};

		this.setTasks = function (value) {
			this._tasks = value;
		};

		this.getActiveTasks = function () {
			var data = tm_g.findAny(this.getTasks(), function (task) {
				return task.done == false;
			});

			data.sort(function (a, b) {
				return b.priority - a.priority;
			});

			return data;
		};

		this.canProcess = function (taskProcessArgs) {
			// only count new pulses
			return taskProcessArgs.pulse == "begin" && this._lastBeat != taskProcessArgs.beat;
		};

		this.processPulse = function (taskProcessArgs) {
			this._pulse = taskProcessArgs.pulse;

			if (this._pulse == "begin") {
				this._lastBeat = this._beat;
				this._beat = taskProcessArgs.beat;
			}
			else if (this._pulse == "end") {
				this._lastBeat = this._beat;
			}
		};

		this.logActiveTasks = function (value, key) {
			var msg = "Tasks.activeTask.name: " + value.agentName + ": " + value.name + "; priority: " + value.priority;
			tm_g.log.info(msg);
			tm_g.console.log(msg);
		};

		this.process = function (taskProcessArgs) {
			this.processPulse(taskProcessArgs);

			this.prepareTasks(taskProcessArgs);

			var tasks = this.getActiveTasks();

			//tm_g.console.log("thoughts: %o", this._agent._memory);

			if (tasks.length > 0) {
				tm_g.each(tasks, this.logActiveTasks);

				// perform then do success or failure action
				if (taskProcessArgs.onTask) {
					tm_g.each(tasks, taskProcessArgs.onTask);
				}

				this.getTopTask(tasks);

				var msg = "process: Tasks.activeTask.name: " + this._currentTask.agentName + ": " + this._currentTask.name + "; priority: " + this._currentTask.priority;
				tm_g.log.info(msg);
				tm_g.console.log(msg);

				taskProcessArgs.task = this._currentTask;
				taskProcessArgs.func = this.findTask(taskProcessArgs.task); // assign method
				taskProcessArgs.attemptsTried = 0;

				this.scheduleTask(taskProcessArgs);
			}

			return 0;
		};

		this.scheduleTask = function (taskProcessArgs) {
			if (taskProcessArgs.agent && taskProcessArgs.agent.isAlive()) {
				// schedule the task
				var ths = this;
				ths.currentTaskNumber = setTimeout(function () {

					var task = ths.processTask(taskProcessArgs);
					ths.nextTask = taskProcessArgs.nextTask;

					if (!taskProcessArgs.hasProcessed) {
						ths.scheduleTask(taskProcessArgs); // try again since nothing happened
					}
					// handle retries
					else if (task) {
						if (task.response && task.response.status != 200) {
							if (task.attemptsTried < taskProcessArgs.task.attempts) {
								ths.scheduleTask(taskProcessArgs);
							}
							else {
								if (ths.onError) {
									ths.onError(task.response.message);
								}
								if (taskProcessArgs.agent.onError) {
									taskProcessArgs.agent.onError({tasks: ths, task: task, message: task.response.message});
								}
							}
						}
						// schedule next task.
						else if (!task.response || task.response.status == 200) {
							task.attemptsTried = 0;  // reset
							if (ths.nextTask != null) {
								ths.scheduleNextTask(taskProcessArgs);
							}
						}
					}
				}, taskProcessArgs.delay);

			}
		};

		this.scheduleNextTask = function (taskProcessArgs) {
			if (taskProcessArgs.nextTask) {
				var msg = "scheduleNextTask: Tasks.activeTask.name: " + this._currentTask.agentName + ": " + taskProcessArgs.nextTask.name + "; priority: " + taskProcessArgs.nextTask.priority;
				tm_g.console.log(msg);

				taskProcessArgs.task = taskProcessArgs.nextTask;
				taskProcessArgs.name = taskProcessArgs.nextTask.name;
				taskProcessArgs.id = taskProcessArgs.nextTask.id;
				taskProcessArgs.func = this.findTask(taskProcessArgs.task); // assign method

				this.scheduleTask(taskProcessArgs);
			}
		};

		this.getTopTask = function (tasks) {
			// go to first task
			this._currentTask = tasks[0];
			if (this._currentTask) {
				var msg = "getTopTask: Tasks.activeTask.name: " + this._currentTask.agentName + ": " + this._currentTask.name + "; priority: " + this._currentTask.priority;
				tm_g.log.info(msg);
				tm_g.console.log(msg);
			}

			return this._currentTask;

		};

		// find actual function
		this.findTask = function (taskFindArgs) {
			return this[taskFindArgs.name];
		};

		// find record
		this.findTaskRecord = function (thoughtFindArgs) {
			var thghts = this.getThoughts();
			var thght = tm_g.findOne(thghts, function (thought) {
				if (thought.name == thoughtFindArgs.name) {
					return true;
				}

				return false;
			});

			return thght;
		};

		this.prepareTasks = function (taskPrepareArgs) {
			if (taskPrepareArgs.pulse == "begin") {
				var tasks = this.getTasks();

				var now = new Date();

				tm_g.each(tasks, function (value, key) {
					var task = value;
					if (!task.isExpired) {
						task.isExpired = false;
						if (task.active.expirees > now) {
							task.done = true;
						}
						else {
							if (task.active.expires) {
								task.isExpired = true;
							}
						}

						if (task.active.reinstates) {
							if (task.active.reinstates <= now) {
								task.done = false;
								tm_g.log.info("Tasks.prepareTasks.now: " + now);
								tm_g.log.info("Tasks.prepareTasks.task.reinstated: " + task.name + " reinstates: " + task.active.reinstates);
							}
						}
					}
					else {
						tm_g.log.info("Tasks.prepareTasks.task.expired: " + task.name + " expired: " + task.active.expires);
					}

				}, now);
			}
		};

		this.processTask = function (taskProcessArgs) {
			var hasError = false;
			var tsk = taskProcessArgs.task;
			var taskExecutionArgs = { agent: taskProcessArgs.agent, task: tsk, evaluation: { performance: null, quality: null }, response: { status: 200} };

			tm_g.log.info("Tasks.processTask.analyze.task: " + tsk.name + " done: " + tsk.done);

			if (!this.canProcess(taskProcessArgs)) {
				taskProcessArgs.nextTask = null;
				return tsk;
			}

			taskProcessArgs.hasProcessed = true;

			if (!tsk.isExpired && !tsk.done) {
				var msg = "Tasks.processTask.task.processing: " + tsk.agentName + ": " + tsk.name;
				tm_g.log.info(msg);
				tm_g.console.log(msg);

				if (tsk.name == "rest") {
					this._priorityManager.onRestTask({ task: tsk, agent: this });
				}

				var func = taskProcessArgs.func;

				if (func) {
					try {
						tsk.executed = true;
						tsk.runs++;

						func(taskExecutionArgs);
						if (taskExecutionArgs.response.status == 200) {
							this.checkOffTask(tsk);
						}
					}
					catch (ex) {
						hasError = true;
						if (this.onError) {
							this.onError(ex);
						}

						tsk.response.status = 501;
						tsk.response.message = ex.message;
						tsk.evaluation.quality = 0;

						console.log(this._agentName + ": Error: " + ex.message);
					}

				}

				tsk.attemptsTried++;
				if (!hasError) {
					tsk.evaluation = taskExecutionArgs.evaluation;
					tsk.response = taskExecutionArgs.response;
				}
			}

			this._thoughts.process({ agent: taskProcessArgs.agent, tasks: this });    // go through thoughts again before processing next task
			var nextTask = this._priorityManager.getTopTask(this.getActiveTasks());

			if (tsk.name == "rest") {
				taskProcessArgs.nextTask = null;
				return taskProcessArgs.nextTask;
			}

			taskProcessArgs.nextTask = nextTask;
			return nextTask;
		};

		this.checkOffTask = function (task) {
			// if task is expired it is no longer processed.
			var expireType = task.active.expireType;
			switch (expireType) {
				case "never":
					break;
				case "inMinutes":
				case "inMilliSeconds":
					this.processExpiration({ task: task, expireType: expireType, active: task.active });
					break;
			}

			// if task was just processed it can be re-instated for processing again.
			if (!task.isExpired) {
				var reinstateType = task.active.reinstateType;
				switch (reinstateType) {
					case "immediately":
						break;
					case "never":
						break;
					case "inMinutes":
					case "inMilliSeconds":
						this.processReinstatement({ task: task, reinstateType: reinstateType, active: task.active });
						task.done = true;
						break;
					default:
						task.done = true;
						break;
				}
			}
			else {
				tm_g.log.info("Tasks.checkOffTask.task.expired: " + task.agentName + ": " + task.name);
			}

			if (task.done) {
				tm_g.log.info("Tasks.checkOffTask.task.done: " + task.agentName + ": " + task.name);
			}

			this._priorityManager.onTaskDone({ task: task, agent: this });
			tm_g.console.log("Tasks.checkOffTask.priority: " + task.agentName + ": " + task.priority + "\n\n");
		};


		this.processExpiration = function (expireArgs) {
			// only support milliseconds at this time
			var expireDate = new Date();
			switch (expireArgs.expireType) {
				case "inMinutes":
					expireDate.setMinutes(expireDate.getMinutes() + expireArgs.active.expire_minutes);
					break;
				case "inMilliSeconds":
					expireDate.setMilliseconds(expireDate.getMilliseconds() + expireArgs.active.expire_milliseconds);
					break;
			}
			expireArgs.task.active.expires = expireDate;
		};

		this.processReinstatement = function (reinstateArgs) {
			// only support milliseconds at this time
			var reinstateDate = new Date();
			switch (reinstateArgs.reinstateType) {
				case "inMinutes":
					reinstateDate.setMinutes(reinstateDate.getMinutes() + reinstateArgs.active.reinstate_minutes);
					break;
				case "inMilliSeconds":
					reinstateDate.setMilliseconds(reinstateDate.getMilliseconds() + reinstateArgs.active.reinstate_milliseconds);
					break;
			}
			reinstateArgs.task.active.reinstates = reinstateDate;

			tm_g.log.info("Tasks.processReinstatement.task.reinstates: " + reinstateArgs.task.name + " reinstates: " + reinstateArgs.task.active.reinstates);
		};

		this.set = function (taskArgs) {
			this.setTasks(taskArgs.tasks);
		};

		this.add = function (taskArgs) {
			var thght = taskArgs.thought;

			// find task if exists
			var tsk = tm_g.findOne(this.getTasks(), function (task) {
				return task.name == thght.name && task.id == thght.id;
			});

			// if task exists then increase the priority
			if (tsk) {
				// if task is done then mark thought as done
				if (tsk.done) {
					thght.done = true;
				}
				else {
					this._priorityManager.onAddedTask({ task: tsk, agent: this });
				}
			}
			else {
				var tasks = this.getTasks();
				tasks.push(thght);
			}
		};

		this.remove = function (taskArgs) {
		};

		this.onArrived = function (arrivedArgs) {
		};

		this.rest = function (restArgs) {
		};

		// add tasks to main agent component
		this.learn = function (learnArgs) {
			if (learnArgs.tasks) {
				var ths = this;
				tm_g.each(learnArgs.tasks, function (task, name) {
					if (learnArgs.onError) {
						task.onError = learnArgs.onError;
					}

					ths[name] = task;
				}, ths);
			}
		};

		this.ask = function (askArgs) {
			var task = askArgs.task;
			var question = task.ask;
			task.agentName = askArgs.agent._agentName;
			task.evaluation = {};
			task.response = { status: 200 }; // default
			task.attemptsTried = 0;
			tm_g.console.log("question: " + question);
		};

		this.onPreSerializing = function (serializeArgs) {
			return true;
		};

		this.onSerialize = function (obj, prop) {

			var cache = [];
			var serObj = tm_g.stringifyWithFun(obj, function(key, value) {
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

			return serObj;
		};
	}
})();
// Tasks (end)

// Goals (start)
TM_gents__Goals = (function(constructorArgs) {
	return function (constructorArgs) {
		this._goals = [];
		this._thoughts = []; // reference


		this.init = function(initArgs) {
		};

		this.getGoals = function () {
			return this._goals;
		};

		this.setGoals = function (value) {
			this._goals = value;
		};

		this.getThoughts = function () {
			return this._thoughts;
		};

		this.setThoughts = function (value) {
			this._thoughts = value;
		};

		this.getActiveGoals = function () {
			var data = tm_g.findAny(this.getGoals(), function (goal) {
				return goal.active == true;
			});

			var arr = data;
			return arr;
		};

		this.analyze = function (analyzeArgs) {
			this.analyzeGoals({ goals: this.getActiveGoals(), onApplyGoal: analyzeArgs.onApplyGoal });
		};

		this.analyzeGoals = function (analyzeArgs) {
			var ths = this;
			tm_g.each(analyzeArgs.goals, function (value, key) {
				ths.applyGoal({ goal: value, onApplyGoal: analyzeArgs.onApplyGoal });
			}, ths)
		};

		this.applyGoal = function (applyArgs) {
			var ths = this;
			var goal = applyArgs.goal;
			var thghts = ths.getThoughts();

			tm_g.each(thghts, function (value, key) {
				var applyGoalArgs = { goal: goal, thought: value };
				if (applyArgs.onApplyGoal) {
					applyargs.onApplyGoal(applyGoalArgs);
				}
				else {
					ths.defaultApplyGoalProcessing(applyGoalArgs);
				}

			}, ths);
		};

		this.defaultApplyGoalProcessing = function (applyGoalArgs) {
			var thght = applyGoalArgs.thought;
			var goal = applyGoalArgs.goal;

			if (goal.category) {
				if (thght.category) {
					if (goal.category.cat1 == thght.category.cat1) {
						if (this._priorityManager) {
							this._priorityManager.onApplyGoal({ thought: thght, goal: goal });
						}
					}
				}
			}
		};

		// add goals to main agent component
		this.acquire = function (acquireArgs) {
			// replace for now
			this.setGoals(acquireArgs.goals);
			this.setThoughts(acquireArgs.thoughts);

			// TODO: check if set of goals exist.  if they do then update if not then add decentralized.
		};

	}
})();

// Goals (end)

// Risks (start)
TM_gents__Risks = (function(constructorArgs) {
	return function (constructorArgs) {
		this._risks = [];
		this._thoughts = []; // reference


		this.init = function(initArgs) {
		};

		this.getRisks = function () {
			return this._risks;
		};

		this.setRisks = function (value) {
			this._risks = value;
		};

		this.getThoughts = function () {
			return this._thoughts;
		};

		this.setThoughts = function (value) {
			this._thoughts = value;
		};

		this.getActiveRisks = function () {
			var data = tm_g.findAny(this.getRisks(), function (risk) {
				return risk.active == true;
			});

			var arr = data;
			return arr;
		};

		this.analyze = function(analyzeArgs) {
			this.analyzeRisks({risks: this.getActiveRisks(), onApplyRisk: analyzeArgs.onApplyRisk});
		};

		this.analyzeRisks = function(analyzeArgs) {
			var ths = this;
			tm_g.each(analyzeArgs.risks, function (value, key) {
				ths.applyRisk({risk: value, onApplyRisk: analyzeArgs.onApplyRisk });
			}, ths)
		};

		this.applyRisk = function(applyArgs) {
			var ths = this;
			var risk = applyArgs.risk;
			var thghts = ths.getThoughts();

			tm_g.each(thghts, function (value, key) {
				var applyRiskArgs = {risk: risk, thought: value};
				if (applyArgs.onApplyRisk) {
					applyargs.onApplyRisk(applyRiskArgs);
				}
				else {
					ths.defaultApplyRiskProcessing(applyRiskArgs);
				}

			}, ths);
		};

		this.defaultApplyRiskProcessing = function(applyRiskArgs) {
			var thght = applyRiskArgs.thought;
			var risk = applyRiskArgs.risk;

			if (risk.category) {
				if (thght.category) {
					if (risk.category.cat1 == thght.category.cat1) {
						if (this._priorityManager) {
							this._priorityManager.onApplyRisk({ thought: thght, risk: risk });
						}

					}
				}
			}
		};


		// add risks to main agent component
		this.obtain = function (acquireArgs) {
			// replace for now
			this.setRisks(acquireArgs.risks);
			this.setThoughts(acquireArgs.thoughts);

			// TODO: check if set of risks exist.  if they do then update if not then add decentralized.
		};

	}
})();

// Risks (end)


// Questions (start)
TM_gents__Questions = (function(constructorArgs) {
	return function (constructorArgs) {
		this._questions = [];
		this._thoughtsObj = null; // reference


		this.init = function(initArgs) {
		};

		this.getQuestions = function () {
			return this._questions;
		};

		this.setQuestions = function (value) {
			this._questions = value;
		};

		this.getThoughts = function () {
			return this._thoughtsObj;
		};

		this.setThoughts = function (value) {
			this._thoughtsObj = value;
		};

		this.analyze = function(analyzeArgs) {
			this.analyzeQuestions({questions: this.getQuestions(), onApplyQuestion: analyzeArgs.onApplyQuestion});
		};

		this.analyzeQuestions = function(analyzeArgs) {
			var ths = this;
			tm_g.each(analyzeArgs.questions, function (value, key) {
				ths.applyQuestion({question: value, onApplyQuestion: analyzeArgs.onApplyQuestion });
			}, ths);
		};

		this.applyQuestion = function(applyArgs) {
			var ths = this;
			var question = applyArgs.question;

			if (!question.answered) {
				var thghts = this.getThoughts();

				var applyQuestionArgs = {question: question, thoughts: thghts};
				if (applyArgs.onApplyQuestion) {
					applyargs.onApplyQuestion(applyQuestionArgs);
				}
				else {
					this.defaultApplyQuestionProcessing(applyQuestionArgs);
				}
			}

		};

		this.defaultApplyQuestionProcessing = function(applyQuestionArgs) {
			var thghts = applyQuestionArgs.thoughts;
			var question = applyQuestionArgs.question;

			var newThought =
			{
				"name": "ask", "done": false, "onCondition": null, "onSuccess": "next", "onFailure": "next", "attempts": 3, "priority": question.priority,
				"active": { "expireType": "never", "expires": null, "reinstateType": "immediately", "reinstates": null },
				"category" : {"cat1" : question.category.cat1 },
				"ask": question.ask
			};
			thghts.add({thought: newThought});
		};


		// add questions to main agent component
		this.obtain = function (acquireArgs) {
			// replace for now
			this.setQuestions(acquireArgs.questions);
			this.setThoughts(acquireArgs.thoughts);

			// TODO: check if set of questions exist.  if they do then update if not then add decentralized.
		};

	}
})();

// Questions (end)
// Thoughts and Tasks (end)



// Agent (start)
// Constructor
TM_gents__Agent = (function (constructorArgs) {
	return function (constructorArgs) {
		this._name = "tm001";
		this._bornOn = new Date();
		this._version = "1.0.0";
		this._memory = null;
		this._thoughts = null;
		this._tasks = null;
		this._goals = null;
		this._risks = null;
		this._behaviors = {};
		this._beats = 0;
		this._beatsSave = 0;
		this._lifespan = null;
		this._pulseInterval = 200;
		this._pulseDuration = 2000;
		this._taskDelay = 200;
        this._lifespanWarnAt = 10;
        this._calledOnTerminate = false;
        this._isRunning = false;

		//this._vicinityInfo = constructorArgs.vicinityInfo;
		this._timerThread = null;
		this._runOnce = false;

        this.onMessage = constructorArgs.onMessage;
		this.onArrival = constructorArgs.onArrival;
		this.onLeaving = constructorArgs.onLeaving;
        this.onTerminate = constructorArgs.onTerminate;
        this.onLifespanWarning = constructorArgs.onTerminate;
        this.onSleep = constructorArgs.onSleep;
        this.onWakeUp = constructorArgs.onWakeUp;

        this.attributes = constructorArgs.attributes;

        this.onMessage = function(messageArgs) {
            if (this.isAlive()) {
                this.notice(messageArgs);
            }
        };

		this.notice = function (eventArgs) {
			if (this.onNotice) {
				this.onNotice(noticeArgs);
			}

			eventArgs.source = this;
			var pkg = { data:  eventArgs };
			this.processReceiveMessage(pkg);
		};

		// basic traits (start)
		this.isAlive = function() {
			if (this._lifespan) {
				if (this._beats > this._lifespan) {

                    if (this.onTerminate) {
                        if (!this._calledOnTerminate) {
                            this._calledOnTerminate = true;
                            this.onTerminate();
                        }
                    }

                    this._isRunning = false;

                    return false;
				}
                else {
                    if (this.onLifespanWarning) {
                        if (this._lifespan - this._beats == this._lifespanWarnAt) {
                            this.onLifespanWarning();
                        }
                    }
                }
			}

			return true;
		};

		this.postMsg = function(messageArgs) {
            if (this.vicinity) {
                this.vicinity.postMessage(messageArgs);
            }
		};

		this.say = function(messageArgs) {
			this.postMsg(messageArgs);
		};

		this.reply = function(originalMessageArgs, text) {
                var msgArgs = {
                    name: "msg",
                    args: {
                        header: {
                            vTo: [originalMessageArgs.header.vFrom],
                            ttl: 5
                        },
                        "body": {
                            "text": text
                        }
                    }
                };

                this.say(msgArgs);
		};

		this.send = function(messageArgs) {

		};

		this.isMyMessage = function(messageArgs) {
            var toList = messageArgs.header.to;
            for (var i = 0; i < toList.length; i++) {
                var to = toList[i];
                var targetName = to.substring(0, to.indexOf("@"));

                if (targetName == this._name) {
                    return true;
                }
                else if (to.indexOf("@") == -1) {    // no vicinity name "all"
                    return true;
                }
                else if (targetName == "all") {
                    return true;
                }
            }

            return false;
		};

		this.show = function (messageArgs) {
			if (this.onShow) {
				this.onShow(messageArgs);
			}
		};

		this.remember = function (rememberArgs) {
			//debugger;
			var name = rememberArgs.name;
			var fact = rememberArgs.fact;
			this._memory.remember(name, fact);

			tm_g.console.log("Agent." + this._name + ".remember.name: " + name + " fact: " + fact);
		};

		this.recall = function(recallArgs) {
			var name = recallArgs.name;
			return this._memory.recall(name);

			//tm_g.console.log("Agent." + this._name + ".recall.name: " + name + " fact: " + fact);
		};

		this.know = function(knowArgs) {
			return this._memory.know(knowArgs.name);
		};

		this.pulse = function (pulseArgs) {
			this._beats++;

			if (this.isAlive()) {
                this._isRunning = true;
				var ths = this;

				var beginPulse = setTimeout(function () {

					var pulseLog = "name: " + ths._name + " begin pulse";
					tm_g.console.log(pulseLog);
					tm_g.log.info(pulseLog);
					ths._thoughts.process({ agent: ths, tasks: ths._tasks });
					ths._tasks.process({ agent: ths, onTask: null, pulse: "begin", beat: ths._beats, delay: ths._taskDelay });
				}, 0);

				var endPulse = setTimeout(function () {

					var pulseLog = "name: " + ths._name + " end pulse";
					tm_g.console.log(pulseLog);
					tm_g.log.info(pulseLog);
					ths._tasks.process({ agent: ths, onTask: null, pulse: "end", beat: ths._beats, delay: ths._taskDelay });

					var beginPulse2 = setTimeout(function () {
						if (!this._runOnce) {
							ths.pulse();
						}
					}, ths._pulseInterval); // minimum length of end -> begin pulse

				}, this._pulseDuration) // minimum length of begin -> end pulse
			}
		};

		this.learnAll = function (behaviorArgs) {
			for (var i=0; i<behaviorArgs.length; i++) {
				var behavior = behaviorArgs[i];
				this.learn(behavior);
			}
		};

		this.learn = function (behaviorArgs) {
			if (behaviorArgs.behavior) {
				var behavior = behaviorArgs.behavior;
				this._behaviors[behavior.name] = behavior;

				if (behavior.onInit) {
					behavior.onInit({ "me": me });
				}

                var thghts = tm_g.clone(behavior.think.thoughts);

				if (behavior.personality) {
					this._goals.acquire({ goals: tm_g.clone(behavior.personality.goals), thoughts: thghts });
					this._goals.analyze({onApplyGoal: null});
					this._risks.obtain({ risks: tm_g.clone(behavior.personality.risks), thoughts: thghts });
					this._risks.analyze({onApplyRisk: null});
				}

				this._memory.learn({ facts: tm_g.clone(behavior.think.facts), factRanges: tm_g.clone(behavior.think.ranges) });
				this._tasks.learn({ tasks: behavior.tasks, onError: behavior.onError });
				this._thoughts.learn({ thoughts: thghts, tasks: this._tasks });
			}
		};

		this.init = function (initArgs) {

			if (initArgs) {
				if (initArgs.name) {
					this._name = initArgs.name;
				}

				this._memory = initArgs.memory;

                if (initArgs.thoughts) {
				    this._thoughts = initArgs.thoughts;
				    this._thoughts._agentName = this._name;
                }

                if (initArgs.tasks) {
				    this._tasks = initArgs.tasks;
				    this._tasks._agentName = this._name;
                }

				if (initArgs.goals) {
					this._goals = initArgs.goals;
				}

				if (initArgs.risks) {
					this._risks = initArgs.risks;
				}

				tm_g.logInit(initArgs.onInitLogger);
			}
			else {
				tm_g.logInit();
			}
		};

		this.rest = function(initArgs) {
		};

		this.live = function (liveArgs) {
			//debugger;
            if (!this._isRunning) {
			    this._beats = this._beatsSave;
			    this.pulse();
            }
		};

        this.sleep = function(sleepArgs) {
            this._isRunning = false;
            if (this.onSleep) {
                this.onSleep();
            }
        };

        this.wakeUp = function(wakeUpArgs) {
            this._isRunning = true;
            if (this.onWakeUp) {
                this.onWakeUp();
            }
        };

		this.terminate = function(terminateArgs) {
            this._isRunning = false;
			this._beatsSave = this._beats;
			this._beats = this._lifespan + 1;

			clearInterval(this._timerThread);
			this.postMsg( {body: {text:":("}} );

            if (this.onTerminate) {
                if (!this._calledOnTerminate) {
                    this._calledOnTerminate = true;
                    this.onTerminate();
                }
            }
		};

        this.restart = function(restartArgs) {
             this._beatsSave = this._beats = 0;

            if (restartArgs && restartArgs.onRestart) {
                restartArgs.onRestart(restartArgs);
            }
        };
		// basic traits (end)

		this.processReceiveMessage = function (event) {
			var messageSent = event.data;

			if (this.onReceiveMessage) {
				this.onReceiveMessage(messageSent);
			}
		};

		this.postMessage = function(eventArgs) {
			this._vicinity.postMessage(eventArgs);
		};

		this.onPreSerializing = function (serializeArgs) {
			this._memory.onPreSerializing(serializeArgs);
			this._thoughts.onPreSerializing(serializeArgs);
			this._tasks.onPreSerializing(serializeArgs);

			return true;
		};

		this.onSerialize = function (obj) {

			var cache = [];
			var serObj = JSON.stringifyWithFun(obj, function(key, value) {
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
			return serObj;
		};

		this.serialize = function () {
			if (this.onPreSerializing({})) {
				var agt = this.onSerialize(this);
				var memory = this._memory.onSerialize();
				var thoughts = this.onSerialize(this._thoughts);
				var tasks = this.onSerialize(this._tasks);
				var goals = this.onSerialize(this._goals);
				var risks = this.onSerialize(this._risks);
				var priMgr = this.onSerialize(this._thoughts._priorityManager);

				return {
					agent: agt,
					memory: memory,
					thoughts: thoughts,
					tasks: tasks,
					goals: goals,
					risks: risks,
					priMgr: priMgr
				};
			}

			return null;
		};


		this.deserialize = function (deserializeArgs) {
			var agt = JSON.parseWithFun(deserializeArgs.agent);
			var memory = new TM_gents__Memory({longTerm: null}).onDeserialize(deserializeArgs.memory);
			var thoughts = JSON.parseWithFun(deserializeArgs.thoughts);
			var tasks = JSON.parseWithFun(deserializeArgs.tasks);
			var goals = JSON.parseWithFun(deserializeArgs.goals);
			var risks = JSON.parseWithFun(deserializeArgs.risks);
			var priMgr = JSON.parseWithFun(deserializeArgs.priMgr);

			agt._memory = memory;

			agt._thoughts = thoughts;
			agt._tasks = tasks;
			agt._tasks._thoughts = agt._thoughts;
			agt._goals = goals;
			agt._risks = risks;

			agt._thoughts._priorityManager = priMgr;
			agt._tasks._priorityManager = priMgr;
			agt._goals._priorityManager = priMgr;
			agt._risks._priorityManager = priMgr;

			agt._beats = agt._beatsSave;	// restore age

			return agt;
		};

		this.spawn = function(name,makeLive) {
			var childAgt = null;
			var childName = name;

			if (this.vicinity) {

				if (!name) {
					var lastChildNum = this.recall({name: "lastChildNum"});
					if (lastChildNum == "??") {
						lastChildNum = 0;
					}
					childName = this._name + "-" + (++lastChildNum);
				}

				var childAgt = tm_g.cloneWithFunctions(this);

				if (!name) {
					this.remember({name: "lastChildNum", fact: lastChildNum});
				}
			}

			// differentiate
			childAgt._isRunning = false;
			childAgt._beats = 0;
			childAgt._bornOn = new Date();
			childAgt._name = childName;
			childAgt._tasks._agentName = childName;
			childAgt._thoughts._agentName = childName;

			var thoughts = childAgt._thoughts._thoughts;
			for (var i=0; i<thoughts.length; i++) {
				thoughts[i].agentName = childName;
			}

			if (makeLive) {
				childAgt.live();
			}

			return childAgt;
		}

		// run init
		this.init(constructorArgs);
	}

})();

TM_gents__Agent_getAgent = function(agentArgs) {
	var name = agentArgs.name;

	var thts = (agentArgs.thoughts) ? agentArgs.thoughts : new TM_gents__Thoughts();
	var tsks = (agentArgs.tasks) ? agentArgs.tasks : new TM_gents__Tasks();
	var mem = (agentArgs.memory) ? agentArgs.memory : new TM_gents__Memory({ longTerm: null });
	var goals = (agentArgs.goals) ? agentArgs.goals : new TM_gents__Goals();
	var risks = (agentArgs.risks) ? agentArgs.risks : new TM_gents__Risks();

	tsks._thoughts = thts;

	var priorityManager;
	if (agentArgs.priorityManager) {	// custom
		priorityManager = agentArgs.priorityManager;
	}
	else if (agentArgs.priorityManagerType) {
		var val = agentArgs.priorityManagerType.toLowerCase();
		priorityManager = TM_gents__PriorityManagerCreate(val);
	}
	else {
		priorityManager = TM_gents__PriorityManagerCreate("round-robin");
	}
	thts._priorityManager = tsks._priorityManager = priorityManager;
	goals._priorityManager = risks._priorityManager = priorityManager;

	var constuctorArgs = { name: agentArgs.name, thoughts: thts, tasks: tsks, memory: mem, goals: goals, risks: risks };
	var agt = new TM_gents__Agent(constuctorArgs);
	agt._runOnce = false;
	agt._lifespan = (agentArgs.lifespan) ? agentArgs.lifespan : 10000;
	if (agentArgs.pulseInterval) {agt._pulseInterval = agentArgs.pulseInterval};
	if (agentArgs.pulseDuration) {agt._pulseDuration = agentArgs.pulseDuration};
	if (typeof(agentArgs.taskDelay) != 'undefined') {agt._taskDelay = agentArgs.taskDelay};
	agt.onShow = agentArgs.onShow;
	agt.onReceiveMessage = agentArgs.onReceiveMessage;
	agt.onError = agentArgs.onError;
    
	agt.onArrival = agentArgs.onArrival;
	agt.onLeaving = agentArgs.onLeaving;
    agt.onTerminate = agentArgs.onTerminate;
    agt.onLifespanWarning = agentArgs.onLifespanWarning;
    agt.onSleep = agentArgs.onSleep;
    agt.onWakeUp = agentArgs.onWakeUp;

	if (agentArgs.behaviors) {
		agt.learnAll(agentArgs.behaviors);
	}

	if (agentArgs.duringBirth){
		agentArgs.duringBirth(agt);
	}

	return agt;
};


/* Node JS (start) */
if (typeof(TM_gents_NodeJS) != 'undefined') {
	module.exports.TM_gents__Agent = TM_gents__Agent;
	module.exports.serialize = TM_gents__Agent.serialize;
	module.exports.deserialize = TM_gents__Agent.deserialize;
	module.exports.getAgent = TM_gents__Agent_getAgent;
}
/* Node JS (end) */

JSON.stringifyWithFun = function (obj,handler) {
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
			x = x.replace("//tm-debugger","debugger");

			a[i]['body'] = [p, x];
		}
	}
	return JSON.stringify(a);
};

JSON.parseWithFun = function(str) {
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
};

// Agent (end)

