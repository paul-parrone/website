/**
 * Created by Tony on 6/15/2014.
 */


/*
 algorithm: score = [Going in that direction? (+2 or -2)
 + [Can go in that direction? (+2 or -2)]
 + [Just came from there? (+1 or -1)]

 Note: use with most-effective priority manager
 */
var navigateMazeLowVisionBehavior = {
    name: "NavigateMaze",
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
            }
        ],
        thoughts: [
            {
                "name": "moveLeft", "done": false, "onCondition": "isClearToGoLeft"
            },
            {
                "name": "moveUp", "done": false, "onCondition": "isClearToGoUp"
            },
            {
                "name": "moveRight", "done": false, "onCondition": "isClearToGoRight"
            },
            {
                "name": "moveDown", "done": false, "onCondition": "isClearToGoDown"
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
            var score = 0;

            var this_agent = moveArgs.agent;
            if (!this_agent) {
                this_agent = ths._agent;
            }

            var currentDirection = this_agent.recall({ name: "direction" });
            score =  (currentDirection == thisDirection) ? score += 2 : score -= 2;


            this_agent.remember({ name: "direction", fact: thisDirection });
            var trail = this_agent.recall({ name: "trail" });
            var lastDirection = trail[trail.length - 1];
            score = (lastDirection && lastDirection.direction == thisDirection) ? score -= 1 : score += 1;

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
                    var pos = { "x": dimensions.x, "y": dimensions.y, "width": dimensions.width, "height": dimensions.height, color: dimensions.color };
                    dimensionsArray.push({ name: this_agent._name, dimensions: pos });
                    this_agent.onMove(dimensionsArray);
                }

                // add only if changed direction
                if (trail.length > 50) {
                    trail.splice(0, 10);  // clear 10 more as a buffer
                }
                trail.push({ direction: thisDirection, x: dimensions.x, y: dimensions.y});

                score += 2;

                rc = true;
            }
            else {
                score -= 2;
            }

            moveArgs.score = score;

            return rc;
        },
        moveLeft: function (taskExecutionArgs) {
            //console.log("moveLeft\n");
            var moveArgs = {
                agent: taskExecutionArgs.agent,
                task: taskExecutionArgs.task,
                direction: "L",
                check: "isClearToGoLeft", score: 0
            };
            var hasMoved = taskExecutionArgs.agent._tasks.attemptMove(moveArgs);

            if (hasMoved) {
                //console.log("movedLeft\n");
            }

            taskExecutionArgs.evaluation.quality = moveArgs.score;
            taskExecutionArgs.evaluation.performance = moveArgs.score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "moveLeft";
        },
        moveRight: function (taskExecutionArgs) {
            //console.log("moveRight\n");

            var moveArgs = {
                agent: taskExecutionArgs.agent,
                task: taskExecutionArgs.task,
                direction: "R",
                check: "isClearToGoRight", score: 0
            };
            var hasMoved = taskExecutionArgs.agent._tasks.attemptMove(moveArgs);

            if (hasMoved) {
                //console.log("movedRight\n");
            }

            taskExecutionArgs.evaluation.quality = moveArgs.score;
            taskExecutionArgs.evaluation.performance = moveArgs.score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "moveRight";
        },
        moveUp: function (taskExecutionArgs) {
            //console.log("moveUp\n");

            var moveArgs = {
                agent: taskExecutionArgs.agent,
                task: taskExecutionArgs.task,
                direction: "U",
                check: "isClearToGoUp", score: 0
            };
            var hasMoved = taskExecutionArgs.agent._tasks.attemptMove(moveArgs);

            if (hasMoved) {
                //console.log("movedUp\n");
            }

            taskExecutionArgs.evaluation.quality = moveArgs.score;
            taskExecutionArgs.evaluation.performance = moveArgs.score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "moveUp";
        },
        moveDown: function (taskExecutionArgs) {
            //console.log("moveDown\n");

            var moveArgs = {
                agent: taskExecutionArgs.agent,
                task: taskExecutionArgs.task,
                direction: "D",
                check: "isClearToGoDown", score: 0
            };
            var hasMoved = taskExecutionArgs.agent._tasks.attemptMove(moveArgs);

            if (hasMoved) {
                //console.log("movedDown\n");
            }

            taskExecutionArgs.evaluation.quality = moveArgs.score;
            taskExecutionArgs.evaluation.performance = moveArgs.score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "moveDown";
        },
        isClearToGo: function (conditionArgs) {
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
                score -= 2;
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
            var trail = this_agent.recall({ name: "trail" });
            if (trail.length > 0) {
                lastDirection = trail[trail.length - 1];
                if (!lastDirection) {
                    lastDirection = {};
                }
            }

            score = (lastDirection.direction == proposedDirection) ? score -= 1 : score += 1; // Can go in this direction?

            switch (lastDirection.direction) {    // Are going in opposite direction?
                case "L":
                    if (proposedDirection == "R") {score -= 1;}
                    break;
                case "R":
                    if (proposedDirection == "L") {score -= 1;}
                    break;
                case "U":
                    if (proposedDirection == "D") {score -= 1;}
                    break;
                case "D":
                    if (proposedDirection == "U") {score -= 1;}
                    break;
            }

            // Try not go where it has been before
            var proposed = {direction: proposedDirection, x: x, y: y};
            var location = tm_g.findOne(trail, function (item) {
                return item.x == proposed.x && item.y == proposed.y;
            });

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
            var direction = conditionArgs.proposedDirection;

            var check = "";
            switch (direction) {
                case "L":
                    check = "isClearToGoLeft";
                    break;
                case "R":
                    check = "isClearToGoRight";
                    break;
                case "U":
                    check = "isClearToGoUp";
                    break;
                case "D":
                    check = "isClearToGoDown";
                    break;
            }
            var rc = this.isClearToGo(conditionArgs);

            this_agent.remember({ name: check, fact: rc });

            return rc;
        },
        isClearToGoLeft: function(conditionArgs) {
            conditionArgs.proposedDirection = "L";

            return conditionArgs.agent._tasks.isClearToGoInDirection(conditionArgs);
        },
        isClearToGoRight: function(conditionArgs) {
            conditionArgs.proposedDirection = "R";

            return  conditionArgs.agent._tasks.isClearToGoInDirection(conditionArgs);
        },
        isClearToGoUp: function(conditionArgs) {
            conditionArgs.proposedDirection = "U";

            return conditionArgs.agent._tasks.isClearToGoInDirection(conditionArgs);
        },
        isClearToGoDown: function(conditionArgs) {
            conditionArgs.proposedDirection = "D";

            return conditionArgs.agent._tasks.isClearToGoInDirection(conditionArgs);
        }
    }
};
