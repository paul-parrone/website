/**
 * Created by Tony on 6/15/2014.
 */


/*
 algorithm:

 Note: use with most-effective priority manager
 */
var simpleSpawnBehavior = {
    name: "SimpleSpawn",
    think: {
        facts: [
            {
                "name": "speed", "value": 1
            },
            {
                "name": "direction", "value": "L"
            },
            {
                "name": "dimensions", "value": null
            },
            {
                "name": "trail", "value": []
            },
            {
                "name": "count", "value": 0
            }
        ],
        thoughts: [
            {
                "name": "move", "done": false, "onCondition": "isClearToGo"
            }
        ]
    },
    tasks: {
        attemptMove: function (moveArgs) {
            var task = moveArgs.task;
            var this_agent = moveArgs.agent;
            var thisDirection = moveArgs.direction;
            var check = moveArgs.check;

            var rc = false;

            var this_agent = moveArgs.agent;
            if (!this_agent) {
                this_agent = ths._agent;
            }

            var currentDirection = this_agent.recall({ name: "direction" });
            this_agent.remember({ name: "direction", fact: thisDirection });

            var trail = this_agent.recall({ name: "trail" });
            var lastDirection = trail[trail.length - 1];

            var isClear = this_agent.recall({ name: check });
            if (isClear) {
                var dimensions = this_agent.recall({ name: "dimensions" });
                var speed = this_agent.recall({ name: "speed" });
                switch (thisDirection) {
                    case "L":
                        dimensions.x = dimensions.x - speed;
                        break;
                    case "R":
                        dimensions.x = dimensions.x + speed;
                        break;
                    case "U":
                        dimensions.y = dimensions.y - speed;
                        break;
                    case "D":
                        dimensions.y = dimensions.y + speed;
                        break;
                }

                this_agent.remember({ name: "direction", fact: thisDirection });

                if (this_agent.onMove) {
                    var dimensionsArray = [];
                    var pos = { "x": dimensions.x, "y": dimensions.y, "width": dimensions.width, "height": dimensions.height, "image": "main" };
                    dimensionsArray.push({ name: this_agent._name, dimensions: pos });
                    this_agent.onMove(dimensionsArray);
                }

                // add only if changed direction
                if (trail.length > 80) {
                    trail.splice(0, 10);  // clear 10 more as a buffer
                }
                trail.push({ direction: thisDirection, x: dimensions.x, y: dimensions.y});

                rc = true;
            }

            //moveArgs.score = score;

            return rc;
        },
        move: function (taskExecutionArgs) {
            var this_agent = taskExecutionArgs.agent;
            var currentDirection = this_agent.recall({ name: "direction" });
            var count = this_agent.recall({ name: "count" });
            if (count == "??") {
                count = 0;
            }

            count++;
            if (count % 5 == 0) {
                var dimensions = this_agent.recall({ name: "dimensions" });
                var yMax = this_agent.recall({ name: "yMax" });
                var childDimensions = $.extend({}, dimensions);
                if (childDimensions.y > 1 && childDimensions.y < yMax) {
                    childDimensions.y += 0.1;
                }
                else {
                    childDimensions.y = 1;
                }

                if (Object.keys(this_agent.vicinity.agents).length < 20) {  // only spawn if less than 20 exist
                    var child_agent = this_agent.spawn("",true);
                    child_agent.remember({ name: "dimensions", fact: childDimensions });

                    // get random direction
                    var dirs = "LRUD";
                    index = Math.floor((Math.random() * 3) + 0);  // 0-3 range
                    var dir = dirs[index];
                    child_agent.remember({ name: "direction", fact: dir });
                }

                //count = 0;    // don't reset
            }
            this_agent.remember({ name: "count", fact: count });

            var moveArgs = {
                agent: this_agent,
                task: taskExecutionArgs.task,
                direction: currentDirection,
                check: "isClearToGo", score: 0
            };
            var hasMoved = this_agent._tasks.attemptMove(moveArgs);

            if (hasMoved) {
                //console.log("movedLeft\n");
            }

            taskExecutionArgs.evaluation.quality = moveArgs.score;
            taskExecutionArgs.evaluation.performance = moveArgs.score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "move";
        },
        haveAlreadyBeenThere: function(proposedDirection, x, y, speed, trail) {
            switch (proposedDirection) {
                case "L":
                    x -= speed;
                    break;
                case "R":
                    x += speed;
                    break;
                case "U":
                    y -= speed;
                    break;
                case "D":
                    y += speed;
                    break;
            }
            // Try not go where it has been before
            var proposed = {direction: proposedDirection, x: x, y: y};
            var location = tm_g.findOne(trail, function (item) {
                return item.x == proposed.x && item.y == proposed.y;
            });

            return location;
        },
        haveAlreadyBeenThereMoreThanOnce: function(proposedDirection, x, y, speed, trail) {
            var proposed = {direction: proposedDirection, x: x, y: y};
            var location = tm_g.findAny(trail, function (item) {
                return item.x == proposed.x && item.y == proposed.y;
            });

            return location.length > 1;
        },
        isClear: function (conditionArgs, trail) {
            var ths = conditionArgs.ths;
            var proposedDirection = conditionArgs.proposedDirection;
            var thght = conditionArgs.thought;
            var score = 0;
            var rc = false;

            var this_agent = conditionArgs.agent;
            if (!this_agent) {
                this_agent = ths._agent;
            }

            // based on direction and speed determine if agt will collide with obstacle
            var dimensions = this_agent.recall({ name: "dimensions" });

            var x = dimensions.x;
            var y = dimensions.y;
            var width = dimensions.width;
            var height = dimensions.height;

            if (x == 30 && y == 65 && proposedDirection == "R") {
                debugger;
            }

            var speed = this_agent.recall({ name: "speed" });

            switch (proposedDirection) {
                case "L":
                    x -= speed;
                    break;
                case "R":
                    x += speed;
                    break;
                case "U":
                    y -= speed;
                    break;
                case "D":
                    y += speed;
                    break;
            }

            var xMax = this_agent.recall({ name: "xMax" });
            var yMax = this_agent.recall({ name: "yMax" });

            // handle boundaries
            if ((x <= 0 || x >= xMax) || (y <= 0 || y >= yMax)) {
                score -= 20;
                thght.priority = score;
                return false;
            }

            var item = this_agent.vicinity.grid.getClosestItem(this_agent._name, proposedDirection, x, y, width, height);

            if (item) {
                score -= 3;
                rc = false;
            }
            else {
                score += 3;
                rc = true;
            }

            // if recently went that direction then return false.  check second to last item
            var currentDirection = this_agent.recall({ name: "direction" });
            score = (currentDirection == proposedDirection && !item) ? score += 2 : score -= 1; // Going in direction?

            var lastDirection = currentDirection;

            if (trail.length > 0) {
                lastDirection = trail[trail.length - 1];
                if (!lastDirection) {
                    lastDirection = {};
                }
            }

            lastDirection = lastDirection || {};
            score = (lastDirection.direction == proposedDirection) ? score -= 1 : score += 1; // Can go in this direction?

            score = (location) ? score -= 1 : score += 1;

            thght.priority = score;
            return rc;
        },
        isClearToGoInDirection: function(conditionArgs) {
            var ths = conditionArgs.ths;

            var this_agent = conditionArgs.agent;
            if (!this_agent) {
                this_agent = ths._agent;
            }

            var trail = this_agent.recall({ name: "trail" });
            var speed = this_agent.recall({ name: "speed" });

            var directions = {
                "L": {isClear: false, distance: -1},
                "R": {isClear: false, distance: -1},
                "U": {isClear: false, distance: -1},
                "D": {isClear: false, distance: -1}
                };

            // check all the directions
            conditionArgs.proposedDirection = 'L';
            directions["L"].isClear = this.isClear(conditionArgs, trail);

            conditionArgs.proposedDirection = 'R';
            directions["R"].isClear = this.isClear(conditionArgs, trail);

            conditionArgs.proposedDirection = 'U';
            directions["U"].isClear = this.isClear(conditionArgs, trail);

            conditionArgs.proposedDirection = 'D';
            directions["D"].isClear = this.isClear(conditionArgs, trail);

            // attempt to keep going the current direction
            var currentDirection = this_agent.recall({ name: "direction" });
            var newDirection = currentDirection;
            if (currentDirection) {
                // if not clear then try another direction
                var dimensions = this_agent.recall({ name: "dimensions" });

                // if more than one path is open then find best path TODO
                var numOpen = 0;
                for (var dir in directions) {
                    if (directions[dir].isClear) {
                        numOpen++;
                    }
                }

                // 1 means blocked
                // 2 means in a tunnel
                // 3 and 4 mean a crossroad

                var longestDistance;
                if (numOpen >= 2) {
                    if (numOpen == 2) {  // keep going in direction
                        if (directions["L"].isClear && directions["R"].isClear) {
                            newDirection = currentDirection;
                        }
                        else if (directions["U"].isClear && directions["D"].isClear) {
                            newDirection = currentDirection;
                        }
                        else if (directions["L"].isClear) {
                            if (directions["U"].isClear) {
                                if (!this_agent._tasks.haveAlreadyBeenThere("U", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "U";
                                }
                                else {
                                    newDirection = "L";
                                }
                            }
                            else {
                                if (!this_agent._tasks.haveAlreadyBeenThere("D", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "D";
                                }
                                else {
                                    newDirection = "L";
                                }
                            }
                        }
                        else if (directions["R"].isClear) {
                            if (directions["U"].isClear) {
                                if (!this_agent._tasks.haveAlreadyBeenThere("U", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "U";
                                }
                                else {
                                    newDirection = "R";
                                }
                            }
                            else {
                                if (!this_agent._tasks.haveAlreadyBeenThere("D", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "D";
                                }
                                else {
                                    newDirection = "R";
                                }
                            }
                        }
                        else if (directions["U"].isClear) {
                            if (directions["L"].isClear) {
                                if (!this_agent._tasks.haveAlreadyBeenThere("L", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "L";
                                }
                                else {
                                    newDirection = "U";
                                }
                            }
                            else {
                                if (!this_agent._tasks.haveAlreadyBeenThere("R", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "R";
                                }
                                else {
                                    newDirection = "U";
                                }
                            }
                        }
                        else if (directions["D"].isClear) {
                            if (directions["L"].isClear) {
                                if (!this_agent._tasks.haveAlreadyBeenThere("L", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "L";
                                }
                                else {
                                    newDirection = "D";
                                }
                            }
                            else {
                                if (!this_agent._tasks.haveAlreadyBeenThere("R", dimensions.x, dimensions.y, speed, trail)) {
                                    newDirection = "R";
                                }
                                else {
                                    newDirection = "D";
                                }
                            }
                        }
                    }
                    else {
                        var beenThere = this_agent._tasks.haveAlreadyBeenThere(currentDirection, dimensions.x, dimensions.y, speed, trail);
                        if (directions[currentDirection].isClear && !beenThere) { // if current direction is clear then keep going
                            newDirection = currentDirection;
                        }
                        else {
                            for (var dir in directions) {
                                if (directions[dir].isClear) {
                                    directions[dir].distance = this_agent.vicinity.grid.getDistanceToItem(this_agent._name, dir, dimensions.x, dimensions.y, dimensions.width, dimensions.height);
                                    if (!longestDistance) {
                                        longestDistance = directions[dir].distance;
                                        newDirection = dir;
                                    }
                                    else if (longestDistance < directions[dir].distance) {
                                        var info = this_agent._tasks.haveAlreadyBeenThere(dir, dimensions.x, dimensions.y, speed, trail);
                                        if (!info) {
                                            longestDistance = directions[dir].distance;
                                            newDirection = dir;
                                        }

                                        var thereTwice = this_agent._tasks.haveAlreadyBeenThereMoreThanOnce(dir, dimensions.x, dimensions.y, speed, trail);
                                        if (thereTwice) {
                                            if (this_agent._pulseDuration == this_agent._originalPulseDuration) {
                                                this_agent._pulseDuration = this_agent._originalPulseDuration / 4;    // slow down
                                                this_agent._pulseInterval = 5000;
                                            }

                                        } else {
                                            this_agent._pulseDuration = this_agent._originalPulseDuration;    // speed up
                                            this_agent._pulseInterval = this_agent._originalPulseInterval;
                                        }
                                    }
                                }
                            }
                        }

                    }


                }
                else {
                    switch (currentDirection) {    // Are going in opposite direction?
                        case "L":
                            if (directions[currentDirection].isClear) {
                                newDirection = currentDirection;
                            }
                            else if (directions["R"].isClear) {
                                newDirection = "R";
                            }
                            else if (directions["U"].isClear) {
                                newDirection = "U";
                            }
                            else {
                                newDirection = "D";
                            }
                            break;
                        case "R":
                            if (directions[currentDirection].isClear) {
                                newDirection = currentDirection;
                            }
                            else if (directions["L"].isClear) {
                                newDirection = "L";
                            }
                            else if (directions["U"].isClear) {
                                newDirection = "U";
                            }
                            else {
                                newDirection = "D";
                            }
                            break;
                        case "U":
                            if (directions[currentDirection].isClear) {
                                newDirection = currentDirection;
                            }
                            else if (directions["D"].isClear) {
                                newDirection = "D";
                            }
                            else if (directions["L"].isClear) {
                                newDirection = "L";
                            }
                            else {
                                newDirection = "R";
                            }
                            break;
                        case "D":
                            if (directions[currentDirection].isClear) {
                                newDirection = currentDirection;
                            }
                            else if (directions["U"].isClear) {
                                newDirection = "U";
                            }
                            else if (directions["L"].isClear) {
                                newDirection = "L";
                            }
                            else {
                                newDirection = "R";
                            }
                            break;
                    }
                }
            }



            this_agent.remember({ name: "direction", fact: newDirection });

            // choose opening that is not explored

            // if the path is blocked then backtrack

            return true;
        },
        isClearToGo: function(conditionArgs) {
            return conditionArgs.agent._tasks.isClearToGoInDirection(conditionArgs);
        }
    }
};
